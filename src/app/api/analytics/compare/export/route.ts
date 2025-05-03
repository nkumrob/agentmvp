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
    const format = url.searchParams.get("format") || "csv";

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

    // Format data based on requested format
    if (format === "csv") {
      // Generate CSV
      const headers = ["Metric", ...agents.map(agent => agent.name)];
      
      // Create rows for each metric
      const metrics = [
        "Total Queries",
        "Avg. Response Time (ms)",
        "Satisfaction Score",
        "Total Chats",
        "Total Messages",
        "Feedback Received"
      ];
      
      const rows = metrics.map(metric => {
        const row = [metric];
        
        agentData.forEach(agent => {
          if (metric === "Total Queries") {
            row.push(agent.queryCount.toString());
          } else if (metric === "Avg. Response Time (ms)") {
            row.push(agent.responseTime ? Math.round(agent.responseTime).toString() : "N/A");
          } else if (metric === "Satisfaction Score") {
            row.push(agent.satisfactionScore 
              ? (Math.round(agent.satisfactionScore * 10) / 10).toFixed(1) 
              : "N/A");
          } else if (metric === "Total Chats") {
            row.push(agent.chatCount.toString());
          } else if (metric === "Total Messages") {
            row.push(agent.messageCount.toString());
          } else if (metric === "Feedback Received") {
            row.push(agent.feedbackCount.toString());
          }
        });
        
        return row;
      });
      
      // Convert to CSV string
      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');
      
      // Return CSV file
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="agent-comparison-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    } else if (format === "json") {
      // Return JSON data
      return NextResponse.json(agentData);
    } else {
      return NextResponse.json(
        { error: "Unsupported export format" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error exporting comparison:", error);
    return NextResponse.json(
      { error: "Failed to export comparison" },
      { status: 500 }
    );
  }
}
