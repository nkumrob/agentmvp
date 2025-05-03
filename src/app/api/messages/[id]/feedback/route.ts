import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/server/db/client";

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
    const messageId = id;

    if (!messageId) {
      return NextResponse.json(
        { error: "Message ID is required" },
        { status: 400 }
      );
    }

    // Get the message
    const message = await prisma.message.findUnique({
      where: {
        id: messageId,
      },
      include: {
        chat: {
          include: {
            agent: true,
          },
        },
      },
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Check if the user owns the agent
    if (message.chat.agent.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse the request body
    const body = await req.json();
    const { feedback, feedbackComment } = body;

    // Validate feedback score
    if (typeof feedback !== "number" || feedback < 1 || feedback > 5) {
      return NextResponse.json(
        { error: "Feedback must be a number between 1 and 5" },
        { status: 400 }
      );
    }

    // Update the message with feedback
    const updatedMessage = await prisma.message.update({
      where: {
        id: messageId,
      },
      data: {
        feedback,
        feedbackComment,
      },
    });

    // Update the agent's satisfaction score
    const agentId = message.chat.agent.id;

    // Get all feedback for this agent
    const feedbackMessages = await prisma.message.findMany({
      where: {
        chat: {
          agentId,
        },
        feedback: {
          not: null,
        },
      },
      select: {
        feedback: true,
      },
    });

    // Calculate average satisfaction score
    const totalFeedback = feedbackMessages.reduce(
      (sum, msg) => sum + (msg.feedback || 0),
      0
    );
    const avgSatisfaction =
      feedbackMessages.length > 0
        ? totalFeedback / feedbackMessages.length
        : null;

    // Update analytics with new satisfaction score
    const analytics = await prisma.analytics.findFirst({
      where: {
        agentId,
      },
    });

    let updatedAnalytics;

    if (analytics) {
      updatedAnalytics = await prisma.analytics.update({
        where: {
          id: analytics.id,
        },
        data: {
          satisfactionScore: avgSatisfaction,
        },
      });
    } else {
      updatedAnalytics = await prisma.analytics.create({
        data: {
          agentId,
          satisfactionScore: avgSatisfaction,
        },
      });
    }

    // Emit socket event for real-time updates
    try {
      // @ts-ignore - Access the global socket.io server
      const io = (global as any).__io;
      if (io) {
        // Emit to the agent's room
        io.to(`agent:${agentId}`).emit("analytics_update", updatedAnalytics);
        io.to(`agent:${agentId}`).emit("new_feedback", {
          agentId,
          messageId,
          feedback,
        });
      }
    } catch (socketError) {
      console.error("Error emitting socket event:", socketError);
    }

    return NextResponse.json(updatedMessage);
  } catch (error) {
    console.error("Error submitting feedback:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}
