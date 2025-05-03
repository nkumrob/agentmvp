import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAgentCharacterCountMetrics } from "@/lib/character-count";

/**
 * Debug endpoint to get detailed knowledge source information
 */
export async function GET(request: Request) {
  try {
    // Get the agent ID from the query parameters
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");

    if (!agentId) {
      return NextResponse.json(
        { error: "Agent ID is required" },
        { status: 400 }
      );
    }

    // Get the agent with its data sources
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        dataSources: {
          where: { status: "completed" },
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // Get detailed metrics
    const metrics = await getAgentCharacterCountMetrics(agentId);

    // Return the debug information
    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        totalCharacterCount: agent.totalCharacterCount,
        totalWordCount: agent.totalWordCount || 0,
      },
      dataSources: agent.dataSources.map(source => ({
        id: source.id,
        name: source.name,
        sourceType: source.sourceType,
        characterCount: source.characterCount,
        wordCount: source.wordCount || 0,
        status: source.status,
        updatedAt: source.updatedAt,
      })),
      metrics,
      rawResponse: {
        countMetrics: metrics,
        charactersBySource: metrics.charactersBySource,
      }
    });
  } catch (error) {
    console.error("Error in knowledge sources debug endpoint:", error);
    return NextResponse.json(
      { error: "Failed to get knowledge sources debug information" },
      { status: 500 }
    );
  }
}
