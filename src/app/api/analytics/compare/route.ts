import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/server/db/client";

export async function GET(req: Request) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const url = new URL(req.url);
    const agentIds = url.searchParams.get("agentIds");

    if (!agentIds) {
      return NextResponse.json(
        { error: "Agent IDs are required" },
        { status: 400 }
      );
    }

    // Parse agent IDs
    const agentIdArray = agentIds.split(",");

    // Check if all agents belong to the user
    const agents = await prisma.agent.findMany({
      where: {
        id: {
          in: agentIdArray,
        },
      },
    });

    // Check if all requested agents were found
    if (agents.length !== agentIdArray.length) {
      return NextResponse.json(
        { error: "One or more agents not found" },
        { status: 404 }
      );
    }

    // Check if all agents belong to the user
    const unauthorizedAgents = agents.filter(
      (agent) => agent.userId !== userId
    );
    if (unauthorizedAgents.length > 0) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get analytics for all agents
    const analytics = await prisma.analytics.findMany({
      where: {
        agentId: {
          in: agentIdArray,
        },
      },
    });

    // Get additional data for each agent
    const agentData = await Promise.all(
      agents.map(async (agent) => {
        // Get chat count
        const chatCount = await prisma.chat.count({
          where: {
            agentId: agent.id,
          },
        });

        // Get message count
        const messageCount = await prisma.message.count({
          where: {
            chat: {
              agentId: agent.id,
            },
          },
        });

        // Get feedback data
        const feedbackMessages = await prisma.message.findMany({
          where: {
            chat: {
              agentId: agent.id,
            },
            feedback: {
              not: null,
            },
          },
          select: {
            feedback: true,
          },
        });

        // Calculate average satisfaction
        const totalFeedback = feedbackMessages.reduce(
          (sum, msg) => sum + (msg.feedback || 0),
          0
        );
        const avgSatisfaction =
          feedbackMessages.length > 0
            ? totalFeedback / feedbackMessages.length
            : null;

        // Get agent analytics
        const agentAnalytics = analytics.find(
          (a) => a.agentId === agent.id
        ) || {
          queryCount: 0,
          responseTime: null,
          satisfactionScore: null,
        };

        return {
          id: agent.id,
          name: agent.name,
          description: agent.description,
          queryCount: agentAnalytics.queryCount || 0,
          responseTime: agentAnalytics.responseTime,
          satisfactionScore: avgSatisfaction || agentAnalytics.satisfactionScore,
          chatCount,
          messageCount,
          feedbackCount: feedbackMessages.length,
        };
      })
    );

    return NextResponse.json(agentData);
  } catch (error) {
    console.error("Error comparing analytics:", error);
    return NextResponse.json(
      { error: "Failed to compare analytics" },
      { status: 500 }
    );
  }
}
