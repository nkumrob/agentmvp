import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/server/db/client";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const agentId = id;

    if (!agentId) {
      return NextResponse.json(
        { error: "Agent ID is required" },
        { status: 400 }
      );
    }

    // Parse query parameters for advanced filtering
    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate")
      ? new Date(url.searchParams.get("startDate") as string)
      : null;
    const endDate = url.searchParams.get("endDate")
      ? new Date(url.searchParams.get("endDate") as string)
      : null;
    const dataSourceId = url.searchParams.get("dataSourceId");
    const messageType = url.searchParams.get("messageType");
    const topic = url.searchParams.get("topic");

    // Check if agent exists and belongs to user
    const agent = await prisma.agent.findUnique({
      where: {
        id: agentId,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get analytics for agent
    const analytics = await prisma.analytics.findFirst({
      where: {
        agentId,
      },
    });

    if (!analytics) {
      // If no analytics exist yet, create a default entry
      const newAnalytics = await prisma.analytics.create({
        data: {
          agentId,
          queryCount: 0,
        },
      });

      return NextResponse.json(newAnalytics);
    }

    // Get additional analytics data

    // Get total number of chats
    const chatCount = await prisma.chat.count({
      where: {
        agentId,
      },
    });

    // Get total number of messages
    const messageCount = await prisma.message.count({
      where: {
        chat: {
          agentId,
        },
      },
    });

    // Get daily query counts based on date range
    const today = new Date();
    let fromDate = new Date(today);
    let toDate = new Date(today);

    // Default to last 7 days if no date range is specified
    if (startDate && endDate) {
      fromDate = startDate;
      toDate = endDate;
    } else {
      // Default to last 7 days
      fromDate.setDate(today.getDate() - 7);
    }

    // Set end of day for toDate
    toDate.setHours(23, 59, 59, 999);

    // Build where clause for message filtering
    const messageWhereClause: any = {
      role: messageType || "user", // Filter by message type if specified
      chat: {
        agentId,
      },
      createdAt: {
        gte: fromDate,
        lte: toDate,
      },
    };

    // Add data source filter if specified
    if (dataSourceId) {
      messageWhereClause.citations = {
        contains: dataSourceId,
      };
    }

    // Add topic filter if specified
    if (topic) {
      messageWhereClause.content = {
        contains: topic,
      };
    }

    const dailyMessages = await prisma.message.groupBy({
      by: ["createdAt"],
      where: messageWhereClause,
      _count: {
        id: true,
      },
    });

    // Format daily messages into a usable format
    // Calculate number of days in the date range
    const daysDiff =
      Math.ceil(
        (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
    const numDays = Math.min(daysDiff, 90); // Cap at 90 days to prevent excessive data

    const dailyQueryCounts = Array.from({ length: numDays }, (_, i) => {
      const date = new Date(toDate);
      date.setDate(toDate.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const formattedDate = date.toISOString().split("T")[0];
      const count = dailyMessages.find(
        (msg) =>
          new Date(msg.createdAt).toISOString().split("T")[0] === formattedDate
      );

      return {
        date: formattedDate,
        count: count ? count._count.id : 0,
      };
    }).reverse();

    // Get data sources for filtering options
    const dataSources = await prisma.dataSource.findMany({
      where: {
        agentId,
        status: "completed",
      },
      select: {
        id: true,
        name: true,
        sourceType: true,
      },
    });

    // Get top topics from messages (for filtering options)
    // This is a simplified approach - in a real app, you'd use NLP or predefined topics
    const topTopics: Record<string, number> = {};
    const messages = await prisma.message.findMany({
      where: {
        chat: {
          agentId,
        },
        role: "user",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100, // Limit to recent messages
    });

    // Extract potential topics from messages (simple approach)
    messages.forEach((message) => {
      const words = message.content
        .split(/\s+/)
        .filter((word) => word.length > 5) // Only consider longer words as potential topics
        .map((word) => word.replace(/[^\w]/g, "")) // Remove non-word characters
        .filter((word) => word.length > 0);

      // Count occurrences
      words.forEach((word) => {
        if (!topTopics[word]) {
          topTopics[word] = 0;
        }
        topTopics[word]++;
      });
    });

    // Get top 10 topics
    const topics = Object.entries(topTopics)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic]) => topic);

    // Return analytics with additional data
    return NextResponse.json({
      ...analytics,
      chatCount,
      messageCount,
      dailyQueryCounts,
      dataSources,
      topics,
      filters: {
        startDate: fromDate.toISOString(),
        endDate: toDate.toISOString(),
        dataSourceId,
        messageType,
        topic,
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
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

    const { id } = params;
    const agentId = id;

    if (!agentId) {
      return NextResponse.json(
        { error: "Agent ID is required" },
        { status: 400 }
      );
    }

    // Check if agent exists and belongs to user
    const agent = await prisma.agent.findUnique({
      where: {
        id: agentId,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { queryCount, responseTime, satisfactionScore, contentGaps } = body;

    // Get existing analytics
    const existingAnalytics = await prisma.analytics.findFirst({
      where: {
        agentId,
      },
    });

    if (existingAnalytics) {
      // Update existing analytics
      const updatedAnalytics = await prisma.analytics.update({
        where: {
          id: existingAnalytics.id,
        },
        data: {
          queryCount: queryCount !== undefined ? queryCount : undefined,
          responseTime: responseTime !== undefined ? responseTime : undefined,
          satisfactionScore:
            satisfactionScore !== undefined ? satisfactionScore : undefined,
          contentGaps:
            contentGaps !== undefined ? JSON.stringify(contentGaps) : undefined,
        },
      });

      return NextResponse.json(updatedAnalytics);
    } else {
      // Create new analytics
      const newAnalytics = await prisma.analytics.create({
        data: {
          agentId,
          queryCount: queryCount || 0,
          responseTime,
          satisfactionScore,
          contentGaps: contentGaps ? JSON.stringify(contentGaps) : undefined,
        },
      });

      return NextResponse.json(newAnalytics);
    }
  } catch (error) {
    console.error("Error updating analytics:", error);
    return NextResponse.json(
      { error: "Failed to update analytics" },
      { status: 500 }
    );
  }
}

// Helper endpoint to increment query count
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const agentId = id;

    if (!agentId) {
      return NextResponse.json(
        { error: "Agent ID is required" },
        { status: 400 }
      );
    }

    // Check if agent exists and belongs to user
    const agent = await prisma.agent.findUnique({
      where: {
        id: agentId,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get existing analytics
    const existingAnalytics = await prisma.analytics.findFirst({
      where: {
        agentId,
      },
    });

    if (existingAnalytics) {
      // Increment query count
      const updatedAnalytics = await prisma.analytics.update({
        where: {
          id: existingAnalytics.id,
        },
        data: {
          queryCount: {
            increment: 1,
          },
        },
      });

      return NextResponse.json(updatedAnalytics);
    } else {
      // Create new analytics with query count 1
      const newAnalytics = await prisma.analytics.create({
        data: {
          agentId,
          queryCount: 1,
        },
      });

      return NextResponse.json(newAnalytics);
    }
  } catch (error) {
    console.error("Error incrementing query count:", error);
    return NextResponse.json(
      { error: "Failed to increment query count" },
      { status: 500 }
    );
  }
}
