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
    
    // Parse query parameters for filtering
    const url = new URL(req.url);
    const format = url.searchParams.get('format') || 'csv';
    const startDate = url.searchParams.get('startDate') ? new Date(url.searchParams.get('startDate') as string) : null;
    const endDate = url.searchParams.get('endDate') ? new Date(url.searchParams.get('endDate') as string) : null;
    const dataSourceId = url.searchParams.get('dataSourceId');
    const messageType = url.searchParams.get('messageType');
    const topic = url.searchParams.get('topic');

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
      // Default to last 30 days for export
      fromDate.setDate(today.getDate() - 30);
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
    
    // Get all messages for the export
    const messages = await prisma.message.findMany({
      where: messageWhereClause,
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        chat: true,
      },
    });
    
    // Format data based on requested format
    if (format === 'csv') {
      // Generate CSV
      const headers = ['Date', 'Chat ID', 'Message Type', 'Content', 'Citations'];
      const rows = messages.map(message => [
        message.createdAt.toISOString(),
        message.chatId,
        message.role,
        message.content.replace(/"/g, '""'), // Escape quotes
        message.citations || '',
      ]);
      
      // Add summary row
      rows.unshift([
        'Summary',
        '',
        '',
        '',
        '',
      ]);
      rows.unshift([
        'Agent Name',
        agent.name,
        '',
        '',
        '',
      ]);
      rows.unshift([
        'Total Chats',
        chatCount.toString(),
        '',
        '',
        '',
      ]);
      rows.unshift([
        'Total Messages',
        messageCount.toString(),
        '',
        '',
        '',
      ]);
      rows.unshift([
        'Query Count',
        analytics?.queryCount.toString() || '0',
        '',
        '',
        '',
      ]);
      rows.unshift([
        'Avg Response Time',
        analytics?.responseTime?.toString() || '0',
        'ms',
        '',
        '',
      ]);
      
      // Convert to CSV string
      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');
      
      // Return CSV file
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="agent-${agentId}-analytics.csv"`,
        },
      });
    } else if (format === 'json') {
      // Return JSON data
      return NextResponse.json({
        agent: {
          id: agent.id,
          name: agent.name,
          description: agent.description,
        },
        summary: {
          queryCount: analytics?.queryCount || 0,
          responseTime: analytics?.responseTime || 0,
          chatCount,
          messageCount,
        },
        messages: messages.map(message => ({
          id: message.id,
          date: message.createdAt,
          chatId: message.chatId,
          role: message.role,
          content: message.content,
          citations: message.citations,
        })),
      });
    } else {
      return NextResponse.json(
        { error: "Unsupported export format" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error exporting analytics:", error);
    return NextResponse.json(
      { error: "Failed to export analytics" },
      { status: 500 }
    );
  }
}
