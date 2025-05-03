import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/server/db/client";
import { generateStreamingChatCompletion } from "@/lib/streaming";
import {
  createSystemPrompt,
  retrieveRelevantChunks,
  extractCitations,
} from "@/utils/openai";

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400", // 24 hours
    },
  });
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

    const { id } = params;
    const chatId = id;

    if (!chatId) {
      return NextResponse.json(
        { error: "Chat ID is required" },
        { status: 400 }
      );
    }

    // Get the chat to find the agent and model config
    const chat = await prisma.chat.findUnique({
      where: {
        id: chatId,
      },
      include: {
        agent: {
          include: {
            persona: true,
            modelConfig: true,
          },
        },
      },
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Check if the user owns the agent
    if (chat.agent.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Parse the request body
    const body = await req.json();
    const { content, role = "user" } = body;

    if (!content) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    // Create the user message
    const message = await prisma.message.create({
      data: {
        content,
        role,
        chatId,
      },
    });

    // Set up streaming response
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Start the response with headers that ensure proper streaming
    const response = new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform, must-revalidate",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Prevents Nginx from buffering the response
        "Access-Control-Allow-Origin": "*", // Allow cross-origin requests
        "Access-Control-Allow-Credentials": "true", // Allow credentials
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Transfer-Encoding": "chunked", // Ensure chunked transfer encoding
        "Keep-Alive": "timeout=120", // Keep connection alive for 2 minutes
      },
    });

    // Process in background
    (async () => {
      try {
        // Get previous messages for context
        const previousMessages = await prisma.message.findMany({
          where: {
            chatId,
          },
          orderBy: {
            createdAt: "asc",
          },
          take: 10, // Limit to recent messages for context
        });

        // Get relevant chunks from data sources
        const relevantChunks = await retrieveRelevantChunks(
          content,
          agentId,
          prisma
        );

        // Create a system prompt based on agent configuration
        const systemPrompt = createSystemPrompt(
          chat.agent.name,
          chat.agent.description || "",
          chat.agent.persona?.toneRules || null,
          relevantChunks.length > 0
            ? `Information from your knowledge base:\n${relevantChunks
                .map((chunk) => `- ${chunk.content} [Source: ${chunk.source}]`)
                .join("\n")}`
            : null
        );

        // Format messages for the API
        const formattedMessages = [
          { role: "system", content: modelConfig.systemPrompt || systemPrompt },
          ...previousMessages.map((msg) => ({
            role: msg.role as "user" | "assistant" | "system",
            content: msg.content,
          })),
        ];

        // Record start time for analytics
        const startTime = Date.now();

        // Generate streaming completion
        const modelStream = await generateStreamingChatCompletion(
          formattedMessages,
          modelConfig
        );

        // Initialize variables to collect the full response
        let fullContent = "";
        let citations: Array<{ source: string; text: string }> = [];

        // Stream chunks to the client
        for await (const chunk of modelStream) {
          if (chunk.content) {
            // Send the chunk to the client
            await writer.write(
              encoder.encode(
                `data: ${JSON.stringify({
                  content: chunk.content,
                  fullContent: chunk.fullContent,
                  done: chunk.done,
                })}\n\n`
              )
            );
          }

          // Update the full content
          fullContent = chunk.fullContent;

          // If this is the last chunk, extract citations
          if (chunk.done) {
            // Extract citations using the utility function
            const { cleanContent, citations: extractedCitations } =
              extractCitations(fullContent);
            fullContent = cleanContent;
            citations = extractedCitations;
          }
        }

        // Save the complete AI response to the database
        const aiResponse = await prisma.message.create({
          data: {
            content: fullContent,
            role: "assistant",
            chatId,
            metadata:
              citations.length > 0 ? JSON.stringify({ citations }) : null,
          },
        });

        // Calculate response time
        const responseTime = Date.now() - startTime;

        // Update analytics with response time
        try {
          // Get existing analytics
          const existingAnalytics = await prisma.analytics.findFirst({
            where: {
              agentId: chat.agent.id,
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
                agentId: chat.agent.id,
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
              io.to(`agent:${chat.agent.id}`).emit(
                "analytics_update",
                updatedAnalytics
              );
              io.to(`agent:${chat.agent.id}`).emit("new_message", {
                agentId: chat.agent.id,
                chatId,
                messageId: aiResponse.id,
              });
            }
          } catch (socketError) {
            console.error("Error emitting socket event:", socketError);
          }
        } catch (analyticsError) {
          console.error("Error updating analytics:", analyticsError);
        }

        // Send completion message
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              done: true,
              messageId: aiResponse.id,
            })}\n\n`
          )
        );
      } catch (error) {
        console.error("Streaming error:", error);

        // Create a fallback message in the database
        try {
          await prisma.message.create({
            data: {
              content:
                "I'm sorry, there was an error generating a response. Please try again.",
              role: "assistant",
              chatId,
            },
          });
        } catch (dbError) {
          console.error("Failed to create fallback message:", dbError);
        }

        // Send error message to client
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              error: "An error occurred during streaming",
              content:
                "I'm sorry, there was an error generating a response. Please try again.",
              done: true,
            })}\n\n`
          )
        );
      } finally {
        try {
          await writer.close();
        } catch (closeError) {
          console.error("Error closing stream writer:", closeError);
        }
      }
    })();

    return response;
  } catch (error) {
    console.error("Error creating streaming message:", error);
    return NextResponse.json(
      { error: "Failed to create streaming message" },
      { status: 500 }
    );
  }
}
