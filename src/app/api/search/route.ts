import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/server/db/client";
import { semanticSearch } from "@/lib/embeddings";

export async function GET(req: Request) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const url = new URL(req.url);
    const query = url.searchParams.get("query");
    const agentId = url.searchParams.get("agentId");
    const limit = url.searchParams.get("limit")
      ? parseInt(url.searchParams.get("limit")!)
      : 5;

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Build filters
    const filters: Record<string, any> = {};
    if (agentId) {
      // Verify the user has access to this agent
      const agent = await prisma.agent.findUnique({
        where: {
          id: agentId,
        },
      });

      if (!agent || agent.userId !== userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      filters.agentId = agentId;
    }

    try {
      // Perform semantic search
      const results = await semanticSearch(query, filters, limit);
      return NextResponse.json(results);
    } catch (searchError) {
      console.error("Error in semantic search:", searchError);

      // Fall back to basic search if semantic search fails
      try {
        // Get chunks from the database using basic filtering
        const chunks = await prisma.chunk.findMany({
          where: {
            dataSource: {
              agentId: agentId || undefined,
            },
            content: {
              contains: query,
            },
          },
          include: {
            dataSource: true,
          },
          take: limit,
        });

        // Format results to match semantic search format
        const formattedResults = chunks.map((chunk) => ({
          id: chunk.id,
          content: chunk.content,
          metadata: {
            sourceId: chunk.dataSourceId,
            sourceName: chunk.dataSource.name,
          },
          similarity: 0.5, // Default similarity score for basic search
        }));

        return NextResponse.json(formattedResults);
      } catch (fallbackError) {
        console.error("Error in fallback search:", fallbackError);
        return NextResponse.json([]);
      }
    }
  } catch (error) {
    console.error("Error performing semantic search:", error);
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
}
