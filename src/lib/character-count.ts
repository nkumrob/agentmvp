import { prisma } from "@/lib/prisma";

// Character count thresholds
export const CHARACTER_THRESHOLDS = {
  // Minimum characters for basic RAG
  BASIC_RAG: 1000,

  // Minimum characters for reliable RAG
  RELIABLE_RAG: 5000,

  // Minimum characters for fine-tuning
  FINE_TUNING: 10000,

  // Maximum recommended characters
  MAX_RECOMMENDED: 15000,
};

// Word count thresholds
export const WORD_THRESHOLDS = {
  // Minimum words for basic RAG
  BASIC_RAG: 500,

  // Minimum words for reliable RAG
  RELIABLE_RAG: 2000,

  // Minimum words for fine-tuning
  FINE_TUNING: 10000,

  // Maximum recommended words
  MAX_RECOMMENDED: 20000,

  // Excellent fine-tuning threshold
  EXCELLENT_FINE_TUNING: 15000,
};

/**
 * Helper function to count words in a string
 */
export function countWords(text: string): number {
  if (!text) return 0;
  // Split by whitespace and filter out empty strings
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Calculate character and word counts for a data source
 */
export async function calculateDataSourceCharacterCount(
  dataSourceId: string
): Promise<{ characterCount: number; wordCount: number }> {
  try {
    // Get the data source
    const dataSource = await prisma.dataSource.findUnique({
      where: { id: dataSourceId },
      include: { chunks: true },
    });

    if (!dataSource) {
      throw new Error(`Data source with ID ${dataSourceId} not found`);
    }

    let characterCount = 0;
    let wordCount = 0;

    // If the data source has content, count its characters and words
    if (dataSource.content) {
      // Clean the content to ensure accurate counts
      const cleanedContent = dataSource.content.replace(/\s+/g, " ").trim();
      characterCount = cleanedContent.length;
      wordCount = countWords(cleanedContent);
    } else if (dataSource.chunks.length > 0) {
      // Otherwise, sum up the counts of all chunks
      // Make sure we don't double-count by using a Set for unique content
      const uniqueChunkContent = new Set();

      dataSource.chunks.forEach((chunk) => {
        if (chunk.content) {
          uniqueChunkContent.add(chunk.content.replace(/\s+/g, " ").trim());
        }
      });

      // Calculate totals from unique chunks
      const uniqueChunks = Array.from(uniqueChunkContent) as string[];
      characterCount = uniqueChunks.reduce(
        (total, content) => total + content.length,
        0
      );
      wordCount = uniqueChunks.reduce(
        (total, content) => total + countWords(content),
        0
      );
    }

    // Update the data source with the calculated counts
    await prisma.dataSource.update({
      where: { id: dataSourceId },
      data: {
        characterCount,
        wordCount, // Add this field to the schema
      },
    });

    return { characterCount, wordCount };
  } catch (error) {
    console.error("Error calculating data source counts:", error);
    throw error;
  }
}

/**
 * Update total character and word counts for an agent
 */
export async function updateAgentTotalCharacterCount(
  agentId: string
): Promise<{ totalCharacterCount: number; totalWordCount: number }> {
  try {
    // Get all data sources for the agent
    const dataSources = await prisma.dataSource.findMany({
      where: {
        agentId,
        status: "completed", // Only count completed sources
      },
    });

    // Calculate total character count
    const totalCharacterCount = dataSources.reduce(
      (total, source) => total + (source.characterCount || 0),
      0
    );

    // Calculate total word count
    const totalWordCount = dataSources.reduce(
      (total, source) => total + (source.wordCount || 0),
      0
    );

    // Update the agent with the total counts
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        totalCharacterCount,
        totalWordCount, // Add this field to the schema
      },
    });

    return { totalCharacterCount, totalWordCount };
  } catch (error) {
    console.error("Error updating agent total counts:", error);
    throw error;
  }
}

/**
 * Get character and word count metrics for an agent
 */
export async function getAgentCharacterCountMetrics(agentId: string): Promise<{
  totalCharacters: number;
  totalWords: number;
  charactersBySource: Array<{
    sourceId: string;
    sourceName: string;
    sourceType: string;
    characters: number;
    words: number;
  }>;
  characterThresholds: typeof CHARACTER_THRESHOLDS;
  wordThresholds: typeof WORD_THRESHOLDS;
  hasBasicKnowledge: boolean;
  hasReliableKnowledge: boolean;
  hasSufficientKnowledgeForFineTuning: boolean;
}> {
  try {
    // Get the agent with its data sources
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        dataSources: {
          where: { status: "completed" },
          orderBy: { characterCount: "desc" },
        },
      },
    });

    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }

    // Map data sources to count objects
    const charactersBySource = agent.dataSources.map((source) => ({
      sourceId: source.id,
      sourceName: source.name,
      sourceType: source.sourceType,
      characters: source.characterCount || 0,
      words: source.wordCount || 0,
    }));

    // Log the sources for debugging
    console.log("Character count metrics - sources:", charactersBySource);

    // Get total counts
    const totalCharacters = agent.totalCharacterCount || 0;
    const totalWords = agent.totalWordCount || 0;

    // Check if character count thresholds are met
    const hasBasicKnowledge = totalCharacters >= CHARACTER_THRESHOLDS.BASIC_RAG;
    const hasReliableKnowledge =
      totalCharacters >= CHARACTER_THRESHOLDS.RELIABLE_RAG;
    const hasSufficientKnowledgeForFineTuning =
      totalCharacters >= CHARACTER_THRESHOLDS.FINE_TUNING;

    // Check if word count thresholds are met (alternative way to check)
    const hasBasicKnowledgeByWords = totalWords >= WORD_THRESHOLDS.BASIC_RAG;
    const hasReliableKnowledgeByWords =
      totalWords >= WORD_THRESHOLDS.RELIABLE_RAG;
    const hasSufficientKnowledgeForFineTuningByWords =
      totalWords >= WORD_THRESHOLDS.FINE_TUNING;

    return {
      totalCharacters,
      totalWords,
      charactersBySource,
      characterThresholds: CHARACTER_THRESHOLDS,
      wordThresholds: WORD_THRESHOLDS,
      // Use word count thresholds as the primary measure
      hasBasicKnowledge: hasBasicKnowledgeByWords,
      hasReliableKnowledge: hasReliableKnowledgeByWords,
      hasSufficientKnowledgeForFineTuning:
        hasSufficientKnowledgeForFineTuningByWords,
    };
  } catch (error) {
    console.error("Error getting agent count metrics:", error);
    throw error;
  }
}

/**
 * Recalculate character and word counts for all data sources of an agent
 */
export async function recalculateAllCharacterCounts(
  agentId: string
): Promise<{ totalCharacters: number; totalWords: number }> {
  try {
    // Get all data sources for the agent
    const dataSources = await prisma.dataSource.findMany({
      where: { agentId },
    });

    // Recalculate counts for each data source
    for (const source of dataSources) {
      await calculateDataSourceCharacterCount(source.id);
    }

    // Update the agent's total counts
    const totals = await updateAgentTotalCharacterCount(agentId);

    return {
      totalCharacters: totals.totalCharacterCount,
      totalWords: totals.totalWordCount,
    };
  } catch (error) {
    console.error("Error recalculating all counts:", error);
    throw error;
  }
}
