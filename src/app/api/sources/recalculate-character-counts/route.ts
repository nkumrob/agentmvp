import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { updateAgentTotalCharacterCount } from "@/lib/character-count";

export async function POST(req: Request) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all data sources for the user
    const agents = await prisma.agent.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    const results = [];

    // Process each agent
    for (const agent of agents) {
      const dataSources = await prisma.dataSource.findMany({
        where: {
          agentId: agent.id,
        },
      });

      const agentResults = {
        agentId: agent.id,
        agentName: agent.name,
        sources: [],
        totalBefore: 0,
        totalAfter: 0,
      };

      // Calculate total before
      const agentBefore = await prisma.agent.findUnique({
        where: {
          id: agent.id,
        },
        select: {
          totalCharacterCount: true,
        },
      });
      
      agentResults.totalBefore = agentBefore?.totalCharacterCount || 0;

      // Process each data source
      for (const source of dataSources) {
        const contentLength = source.content ? source.content.length : 0;
        
        // Only update if the character count is different
        if (source.characterCount !== contentLength) {
          await prisma.dataSource.update({
            where: {
              id: source.id,
            },
            data: {
              characterCount: contentLength,
            },
          });

          agentResults.sources.push({
            sourceId: source.id,
            sourceName: source.name,
            before: source.characterCount,
            after: contentLength,
            difference: contentLength - (source.characterCount || 0),
          });
        }
      }

      // Update the agent's total character count
      await updateAgentTotalCharacterCount(agent.id);

      // Calculate total after
      const agentAfter = await prisma.agent.findUnique({
        where: {
          id: agent.id,
        },
        select: {
          totalCharacterCount: true,
        },
      });
      
      agentResults.totalAfter = agentAfter?.totalCharacterCount || 0;

      results.push(agentResults);
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Error recalculating character counts:", error);
    return NextResponse.json(
      { error: "Failed to recalculate character counts" },
      { status: 500 }
    );
  }
}
