import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/server/db/client";
import {
  hasBasicKnowledgeSources,
  hasReliableKnowledgeSources,
  hasSufficientKnowledgeForFineTuning,
  getKnowledgeRecommendations,
  KNOWLEDGE_THRESHOLDS,
  CHARACTER_THRESHOLDS,
} from "@/lib/knowledge-threshold";
import { getAgentCharacterCountMetrics } from "@/lib/character-count";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: agentId } = params;

    if (!agentId) {
      return NextResponse.json(
        { error: "Agent ID is required" },
        { status: 400 }
      );
    }

    // Check if the agent exists and belongs to the user
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

    // Get knowledge source metrics
    const dataSources = await prisma.dataSource.findMany({
      where: {
        agentId,
        status: "completed",
      },
      include: {
        _count: {
          select: {
            chunks: true,
          },
        },
      },
    });

    // Calculate total chunks
    const totalChunks = dataSources.reduce(
      (sum, source) => sum + source._count.chunks,
      0
    );

    // Check knowledge thresholds
    const hasBasic = await hasBasicKnowledgeSources(agentId);
    const hasReliable = await hasReliableKnowledgeSources(agentId);
    const fineTuningStatus = await hasSufficientKnowledgeForFineTuning(agentId);
    const recommendations = await getKnowledgeRecommendations(agentId);

    // Get character and word count metrics
    const countMetrics = await getAgentCharacterCountMetrics(agentId);

    // Return the knowledge status
    return NextResponse.json({
      status: {
        hasBasicKnowledge: hasBasic,
        hasReliableKnowledge: hasReliable,
        hasSufficientKnowledgeForFineTuning: fineTuningStatus.sufficient,
        hasBasicCharacterCount: countMetrics.hasBasicKnowledge,
        hasReliableCharacterCount: countMetrics.hasReliableKnowledge,
        hasSufficientCharacterCountForFineTuning:
          countMetrics.hasSufficientKnowledgeForFineTuning,
      },
      metrics: {
        sourceCount: dataSources.length,
        chunkCount: totalChunks,
        characterCount: countMetrics.totalCharacters,
        wordCount: countMetrics.totalWords,
        ...fineTuningStatus.metrics,
      },
      thresholds: {
        ...KNOWLEDGE_THRESHOLDS,
        CHARACTER_THRESHOLDS: countMetrics.characterThresholds,
        WORD_THRESHOLDS: countMetrics.wordThresholds,
      },
      countMetrics,
      recommendations: recommendations.recommendations,
      missingTopics: recommendations.missingTopics,
    });
  } catch (error) {
    console.error("Error getting knowledge status:", error);
    return NextResponse.json(
      { error: "Failed to get knowledge status" },
      { status: 500 }
    );
  }
}
