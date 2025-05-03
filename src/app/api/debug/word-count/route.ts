import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAgentCharacterCountMetrics, recalculateAllCharacterCounts } from "@/lib/character-count";

/**
 * Debug endpoint to get word count information for an agent
 * This helps diagnose issues with word count aggregation
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

    // Calculate totals directly from data sources
    const totalCharacterCount = agent.dataSources.reduce(
      (total, source) => total + (source.characterCount || 0),
      0
    );
    
    const totalWordCount = agent.dataSources.reduce(
      (total, source) => total + (source.wordCount || 0),
      0
    );

    // Check if there's a discrepancy between the agent's stored totals and calculated totals
    const characterCountDiscrepancy = 
      Math.abs(agent.totalCharacterCount - totalCharacterCount);
    
    const wordCountDiscrepancy = 
      Math.abs((agent.totalWordCount || 0) - totalWordCount);

    // Return the debug information
    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        storedTotalCharacterCount: agent.totalCharacterCount,
        storedTotalWordCount: agent.totalWordCount || 0,
      },
      calculatedTotals: {
        characterCount: totalCharacterCount,
        wordCount: totalWordCount,
      },
      discrepancies: {
        characterCount: characterCountDiscrepancy,
        wordCount: wordCountDiscrepancy,
      },
      dataSources: agent.dataSources.map(source => ({
        id: source.id,
        name: source.name,
        sourceType: source.sourceType,
        characterCount: source.characterCount,
        wordCount: source.wordCount || 0,
        updatedAt: source.updatedAt,
      })),
      metrics,
    });
  } catch (error) {
    console.error("Error in word count debug endpoint:", error);
    return NextResponse.json(
      { error: "Failed to get word count debug information" },
      { status: 500 }
    );
  }
}

/**
 * Debug endpoint to recalculate word counts for an agent
 */
export async function POST(request: Request) {
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

    // Recalculate all character and word counts
    const result = await recalculateAllCharacterCounts(agentId);

    // Get the updated agent
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

    // Return the updated information
    return NextResponse.json({
      success: true,
      recalculatedTotals: result,
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
        updatedAt: source.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Error recalculating word counts:", error);
    return NextResponse.json(
      { error: "Failed to recalculate word counts" },
      { status: 500 }
    );
  }
}
