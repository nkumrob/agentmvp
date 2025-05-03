import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/server/db/client";
import { generateChatCompletion } from "@/lib/model-providers";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chatId = params?.id;

    if (!chatId) {
      return NextResponse.json(
        { error: "Chat ID is required" },
        { status: 400 }
      );
    }

    // Check if chat exists and belongs to user
    const chat = await prisma.chat.findUnique({
      where: {
        id: chatId,
      },
      include: {
        agent: true,
      },
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    if (chat.agent.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get messages for chat
    const messages = await prisma.message.findMany({
      where: {
        chatId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chatId = params?.id;

    if (!chatId) {
      return NextResponse.json(
        { error: "Chat ID is required" },
        { status: 400 }
      );
    }

    // Check if chat exists and belongs to user
    const chat = await prisma.chat.findUnique({
      where: {
        id: chatId,
      },
      include: {
        agent: true,
      },
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    if (chat.agent.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { content, role } = body;

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    if (!role || !["user", "assistant"].includes(role)) {
      return NextResponse.json(
        { error: "Valid role is required" },
        { status: 400 }
      );
    }

    // Create new message
    const message = await prisma.message.create({
      data: {
        content,
        role,
        chatId,
      },
    });

    // If this is a user message, generate an AI response
    if (role === "user") {
      try {
        // Start timing for response time analytics
        const startTime = Date.now();

        // Get the chat to find the agent and model config
        const chat = await prisma.chat.findUnique({
          where: { id: chatId },
          include: {
            agent: {
              include: {
                persona: true,
                modelConfig: true,
              },
            },
          },
        });

        if (!chat || !chat.agent) {
          throw new Error("Chat or agent not found");
        }

        // Get the agent ID for analytics
        const agentId = chat.agent.id;

        // Get or create model config if it doesn't exist
        let modelConfig = chat.agent.modelConfig;

        if (!modelConfig) {
          // Create default model config
          modelConfig = await prisma.modelConfig.create({
            data: {
              baseModel: "gpt-3.5-turbo",
              provider: "openai",
              temperature: 0.7,
              maxTokens: 1000,
              status: "pending",
              agentId,
            },
          });
        }

        // Import OpenAI utilities
        const openai = (await import("@/utils/openai")).default;
        const { createSystemPrompt, retrieveRelevantChunks, extractCitations } =
          await import("@/utils/openai");

        // Get previous messages for context
        const previousMessages = await prisma.message.findMany({
          where: { chatId },
          orderBy: { createdAt: "asc" },
          take: 10, // Limit to last 10 messages for context
        });

        // Retrieve relevant chunks from data sources
        const relevantChunks = await retrieveRelevantChunks(
          content,
          chat.agent.id,
          prisma
        );

        // Create data sources info string
        let dataSourcesInfo = null;
        if (relevantChunks.length > 0) {
          dataSourcesInfo = relevantChunks
            .map(
              (chunk, index) =>
                `${index + 1}. ${chunk.source}: ${chunk.content.substring(
                  0,
                  100
                )}...`
            )
            .join("\n");
        }

        // Create system prompt based on agent persona
        const systemPrompt = createSystemPrompt(
          chat.agent.name,
          chat.agent.description,
          chat.agent.persona?.toneRules,
          dataSourcesInfo
        );

        // Format previous messages for OpenAI
        const formattedMessages = [
          { role: "system", content: systemPrompt },
          ...previousMessages.map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          })),
          { role: "user", content },
        ];

        // If we have relevant chunks, add them as context
        if (relevantChunks.length > 0) {
          const contextMessage = {
            role: "system" as const,
            content: `Relevant information from knowledge sources:\n\n${relevantChunks
              .map(
                (chunk, index) =>
                  `Source: ${chunk.source}\nContent: ${chunk.content}`
              )
              .join(
                "\n\n"
              )}\n\nUse this information to answer the user's question. Include citations in the format [Source: relevant text] when you use information from these sources.`,
          };

          // Insert context before the user's message
          formattedMessages.splice(
            formattedMessages.length - 1,
            0,
            contextMessage
          );
        }

        // Use the model config to generate a response
        const completion = await generateChatCompletion(
          formattedMessages,
          modelConfig
        );

        // Extract the response content
        const responseContent =
          completion.content || "I'm sorry, I couldn't generate a response.";

        // Extract citations from the response
        const { cleanContent, citations } = extractCitations(responseContent);

        // Create AI response in the database
        const aiResponse = await prisma.message.create({
          data: {
            content: cleanContent,
            role: "assistant",
            chatId,
            citations: citations.length > 0 ? JSON.stringify(citations) : null,
          },
        });

        // Calculate response time
        const responseTime = Date.now() - startTime;

        // Update analytics with response time
        try {
          // Get existing analytics
          const existingAnalytics = await prisma.analytics.findFirst({
            where: {
              agentId,
            },
          });

          let updatedAnalytics;

          if (existingAnalytics) {
            // Calculate new average response time
            const currentAvg = existingAnalytics.responseTime || responseTime;
            const currentCount = existingAnalytics.queryCount || 0;
            const newAvg =
              (currentAvg * currentCount + responseTime) / (currentCount + 1);

            // Update analytics
            updatedAnalytics = await prisma.analytics.update({
              where: {
                id: existingAnalytics.id,
              },
              data: {
                queryCount: {
                  increment: 1,
                },
                responseTime: newAvg,
              },
            });
          } else {
            // Create new analytics
            updatedAnalytics = await prisma.analytics.create({
              data: {
                agentId,
                queryCount: 1,
                responseTime,
              },
            });
          }

          // Emit socket event for real-time updates
          try {
            // @ts-ignore - Access the global socket.io server
            const io = (global as any).__io;
            if (io) {
              // Emit to the agent's room
              io.to(`agent:${agentId}`).emit(
                "analytics_update",
                updatedAnalytics
              );
              io.to(`agent:${agentId}`).emit("new_message", {
                agentId,
                chatId,
                messageId: aiResponse.id,
              });
            }
          } catch (socketError) {
            console.error("Error emitting socket event:", socketError);
          }
        } catch (analyticsError) {
          console.error("Error updating analytics:", analyticsError);
          // Continue even if analytics update fails
        }

        // Return both messages
        return NextResponse.json([message, aiResponse]);
      } catch (error) {
        console.error("Error generating AI response:", error);

        // Create a fallback response
        const aiResponse = await prisma.message.create({
          data: {
            content:
              "I'm sorry, I encountered an error while processing your request. Please try again later.",
            role: "assistant",
            chatId,
          },
        });

        // Return both messages
        return NextResponse.json([message, aiResponse]);
      }
    }

    return NextResponse.json(message);
  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}
