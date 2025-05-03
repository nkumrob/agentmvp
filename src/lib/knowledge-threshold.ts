/**
 * Knowledge source threshold system
 * This module provides functions to check if an agent has sufficient knowledge sources
 * to provide quality responses and recommendations for fine-tuning.
 */

import { PrismaClient } from "@prisma/client";
import { semanticSearch } from "./embeddings";
import { CHARACTER_THRESHOLDS, WORD_THRESHOLDS } from "./character-count";

// Initialize Prisma client
const prisma = new PrismaClient();

// Minimum thresholds for different operations
export const KNOWLEDGE_THRESHOLDS = {
  // Minimum number of knowledge sources for basic RAG
  BASIC_RAG: 1,

  // Minimum number of knowledge sources for reliable RAG
  RELIABLE_RAG: 3,

  // Minimum number of knowledge sources for fine-tuning
  FINE_TUNING: 5,

  // Minimum number of chunks across all knowledge sources for fine-tuning
  MIN_CHUNKS_FOR_FINE_TUNING: 20,

  // Minimum word count per knowledge source to be considered substantial
  MIN_WORDS_PER_SOURCE: 500,
};

// Export thresholds for convenience
export { CHARACTER_THRESHOLDS, WORD_THRESHOLDS };

/**
 * Check if an agent has sufficient knowledge sources for basic RAG
 */
export async function hasBasicKnowledgeSources(
  agentId: string
): Promise<boolean> {
  const count = await prisma.dataSource.count({
    where: {
      agentId,
      status: "completed",
    },
  });

  return count >= KNOWLEDGE_THRESHOLDS.BASIC_RAG;
}

/**
 * Check if an agent has sufficient knowledge sources for reliable RAG
 */
export async function hasReliableKnowledgeSources(
  agentId: string
): Promise<boolean> {
  const count = await prisma.dataSource.count({
    where: {
      agentId,
      status: "completed",
    },
  });

  return count >= KNOWLEDGE_THRESHOLDS.RELIABLE_RAG;
}

/**
 * Check if an agent has sufficient knowledge sources for fine-tuning
 */
export async function hasSufficientKnowledgeForFineTuning(
  agentId: string
): Promise<{
  sufficient: boolean;
  metrics: {
    sourceCount: number;
    chunkCount: number;
    wordCount: number;
    characterCount: number;
    sufficientSources: boolean;
    sufficientChunks: boolean;
    sufficientCharacters: boolean;
  };
}> {
  // Get the agent with its total word and character counts
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      totalCharacterCount: true,
      totalWordCount: true,
    },
  });

  // Get all completed knowledge sources for the agent
  const sources = await prisma.dataSource.findMany({
    where: {
      agentId,
      status: "completed",
    },
    include: {
      chunks: true,
    },
  });

  // Calculate metrics
  const sourceCount = sources.length;
  const chunkCount = sources.reduce(
    (total, source) => total + source.chunks.length,
    0
  );
  const characterCount = agent?.totalCharacterCount || 0;
  // Use the stored word count if available, otherwise calculate it
  const wordCount =
    agent?.totalWordCount ||
    sources.reduce((total, source) => {
      // Count words in the content if available
      if (source.content) {
        return total + source.content.split(/\s+/).filter(Boolean).length;
      }
      // Otherwise count words in chunks
      return (
        total +
        source.chunks.reduce((chunkTotal, chunk) => {
          return (
            chunkTotal +
            (chunk.content
              ? chunk.content.split(/\s+/).filter(Boolean).length
              : 0)
          );
        }, 0)
      );
    }, 0);

  // Check if thresholds are met
  const sufficientSources = sourceCount >= KNOWLEDGE_THRESHOLDS.FINE_TUNING;
  const sufficientChunks =
    chunkCount >= KNOWLEDGE_THRESHOLDS.MIN_CHUNKS_FOR_FINE_TUNING;
  // Use word count as the primary metric for fine-tuning
  const sufficientWords = wordCount >= WORD_THRESHOLDS.FINE_TUNING;
  // Keep character count check for backward compatibility
  const sufficientCharacters =
    characterCount >= CHARACTER_THRESHOLDS.FINE_TUNING;

  return {
    // Use word count as the primary metric for determining if fine-tuning is possible
    sufficient: sufficientSources && sufficientChunks && sufficientWords,
    metrics: {
      sourceCount,
      chunkCount,
      wordCount,
      characterCount,
      sufficientSources,
      sufficientChunks,
      sufficientWords,
      sufficientCharacters, // Keep for backward compatibility
    },
  };
}

/**
 * Generate training examples from knowledge sources
 * This creates question-answer pairs based on the agent's knowledge sources
 */
export async function generateTrainingExamplesFromKnowledge(
  agentId: string,
  count: number = 10
): Promise<Array<{ messages: any[] }>> {
  // Get all completed knowledge sources for the agent with substantial content
  const sources = await prisma.dataSource.findMany({
    where: {
      agentId,
      status: "completed",
    },
    include: {
      chunks: true,
    },
  });

  // Filter sources to only include those with substantial content
  const validSources = sources.filter((source) => {
    // Skip sources with no content or very little content
    if (
      !source.content ||
      source.content.trim() === "" ||
      (source.wordCount && source.wordCount < 100)
    ) {
      return false;
    }

    // Skip sources with no chunks or only empty chunks
    if (!source.chunks || source.chunks.length === 0) {
      return false;
    }

    // Check if there's at least one valid chunk with substantial content
    const hasValidChunk = source.chunks.some(
      (chunk) => chunk.content && chunk.content.trim().length >= 100
    );

    return hasValidChunk;
  });

  if (validSources.length === 0) {
    console.log(
      "No valid sources with substantial content found for generating examples"
    );
    return [];
  }

  // Get the agent's persona for tone and style
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { persona: true },
  });

  const toneRules = agent?.persona?.toneRules
    ? typeof agent.persona.toneRules === "string"
      ? agent.persona.toneRules
      : JSON.stringify(agent.persona.toneRules)
    : "";

  // Generate training examples
  const examples: Array<{ messages: any[] }> = [];

  // Track used content to avoid duplicates
  const usedContentHashes = new Set<string>();

  // Shuffle sources to get more variety
  const shuffledSources = [...validSources].sort(() => Math.random() - 0.5);

  console.log(
    `Found ${validSources.length} valid sources for generating examples`
  );

  // Create examples from each source
  for (const source of shuffledSources) {
    // Skip if no chunks with content (should never happen due to filtering)
    if (source.chunks.length === 0) continue;

    // Shuffle chunks to get more variety
    const shuffledChunks = [...source.chunks].sort(() => Math.random() - 0.5);

    // Create examples based on chunks
    for (let i = 0; i < shuffledChunks.length && examples.length < count; i++) {
      const chunk = shuffledChunks[i];

      // Skip empty chunks or chunks with minimal content
      if (!chunk.content || chunk.content.trim().length < 100) {
        console.log(
          `Skipping chunk with insufficient content (length: ${
            chunk.content ? chunk.content.trim().length : 0
          })`
        );
        continue;
      }

      // Create a simple hash of the content to avoid duplicates
      const contentHash = hashString(chunk.content.trim().substring(0, 100));
      if (usedContentHashes.has(contentHash)) {
        console.log(`Skipping duplicate content (hash: ${contentHash})`);
        continue;
      }
      usedContentHashes.add(contentHash);

      console.log(
        `Using chunk from source: ${source.name} (${
          chunk.content.trim().length
        } chars)`
      );

      // Create a question based on the chunk content
      const question = generateQuestionFromChunk(chunk.content);

      // Create a more natural answer that incorporates the chunk content
      const answer = generateAnswerFromChunk(
        chunk.content,
        source.name,
        agent?.name || "AI Assistant"
      );

      // Add the example
      examples.push({
        messages: [
          {
            role: "system",
            content: `You are ${agent?.name || "an AI assistant"}. ${
              agent?.description || ""
            } ${toneRules}`,
          },
          { role: "user", content: question },
          { role: "assistant", content: answer },
        ],
      });

      // Break if we have enough examples
      if (examples.length >= count) break;
    }
  }

  return examples;
}

/**
 * Simple string hashing function to detect duplicate content
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
}

/**
 * Generate an answer from a chunk of text
 * Creates a more natural-sounding answer that incorporates the content
 */
function generateAnswerFromChunk(
  chunkContent: string,
  sourceName: string,
  agentName: string
): string {
  // Clean up the content
  const cleanContent = chunkContent.trim();

  // Create intro phrases
  const introductions = [
    "Based on my knowledge,",
    "According to the information I have,",
    "From what I understand,",
    "Here's what I know about this topic:",
    "I can share the following information:",
    "Let me explain this for you:",
    "Here's an explanation:",
    "I'd be happy to help with that.",
    "Great question!",
    "That's an interesting topic.",
  ];

  // Create conclusion phrases
  const conclusions = [
    `This information comes from ${sourceName}.`,
    `I found this in ${sourceName}.`,
    `The source for this is ${sourceName}.`,
    `This is based on content from ${sourceName}.`,
    `Hope this helps! The information is from ${sourceName}.`,
    `Let me know if you need more details. This comes from ${sourceName}.`,
    `Is there anything specific about this you'd like me to elaborate on? (Source: ${sourceName})`,
    `I can provide more details if needed. This information is from ${sourceName}.`,
  ];

  // Select random intro and conclusion
  const randomIntro =
    introductions[Math.floor(Math.random() * introductions.length)];
  const randomConclusion =
    conclusions[Math.floor(Math.random() * conclusions.length)];

  // Format the content to be more readable
  // Break into paragraphs if it's long
  let formattedContent = cleanContent;
  if (cleanContent.length > 200) {
    // Try to break into 2-3 paragraphs at sentence boundaries
    const sentences = cleanContent.split(/[.!?]\s+/);
    if (sentences.length > 3) {
      const paragraphSize = Math.ceil(sentences.length / 3);
      formattedContent = "";
      for (let i = 0; i < sentences.length; i++) {
        formattedContent += sentences[i] + ". ";
        if ((i + 1) % paragraphSize === 0 && i < sentences.length - 1) {
          formattedContent += "\n\n";
        }
      }
    }
  }

  // Construct the final answer
  return `${randomIntro}\n\n${formattedContent}\n\n${randomConclusion}`;
}

/**
 * Generate a question from a chunk of text
 * This is a more sophisticated implementation that tries to create
 * more natural and varied questions based on the content
 */
function generateQuestionFromChunk(chunkContent: string): string {
  // Clean up the content
  const cleanContent = chunkContent.trim();

  // Extract key information
  const sentences = cleanContent.split(/[.!?]\s+/);
  const firstSentence = sentences[0] || "";
  const lastSentence = sentences[sentences.length - 1] || "";

  // Extract potential topics (nouns and noun phrases)
  const words = cleanContent
    .split(/\s+/)
    .filter(
      (word) =>
        word.length > 3 &&
        ![
          "the",
          "and",
          "for",
          "with",
          "that",
          "this",
          "these",
          "those",
        ].includes(word.toLowerCase())
    );

  // Get a random word to use as a topic
  const randomTopic =
    words.length > 0 ? words[Math.floor(Math.random() * words.length)] : "";

  // Create a condensed summary (first 50 chars)
  const shortSummary =
    cleanContent.substring(0, 50).trim() +
    (cleanContent.length > 50 ? "..." : "");

  // Different question templates
  const questionTemplates = [
    `Can you explain "${shortSummary}"?`,
    `What can you tell me about ${randomTopic}?`,
    `I'm interested in learning about "${firstSentence.substring(
      0,
      50
    )}..." Can you elaborate?`,
    `Could you provide more information on this topic: "${shortSummary}"?`,
    `I read something about ${randomTopic}. What more should I know?`,
    `What are the key points about "${shortSummary}"?`,
    `How would you explain "${shortSummary}" to someone new to the topic?`,
    `Can you summarize what's important about ${randomTopic}?`,
    `What's the significance of "${shortSummary}"?`,
    `I need to understand more about "${shortSummary}". Can you help?`,
  ];

  // Select a random template
  const randomTemplate =
    questionTemplates[Math.floor(Math.random() * questionTemplates.length)];

  // If we couldn't extract good information, fall back to a generic question
  if (!shortSummary && !randomTopic) {
    return "Can you tell me more about this topic?";
  }

  return randomTemplate;
}

/**
 * Get knowledge source recommendations for an agent
 * This suggests additional knowledge sources that would be beneficial
 */
export async function getKnowledgeRecommendations(agentId: string): Promise<{
  hasRecommendations: boolean;
  recommendations: string[];
  missingTopics: string[];
}> {
  // Get the agent details
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      dataSources: {
        where: { status: "completed" },
      },
    },
  });

  if (!agent) {
    return {
      hasRecommendations: false,
      recommendations: [],
      missingTopics: [],
    };
  }

  // Extract topics from agent description and name
  const agentTopics = extractTopics(`${agent.name} ${agent.description || ""}`);

  // Extract topics from existing knowledge sources
  const existingTopics = new Set<string>();
  for (const source of agent.dataSources) {
    const sourceTopics = extractTopics(
      source.name + " " + (source.content || "")
    );
    sourceTopics.forEach((topic) => existingTopics.add(topic));
  }

  // Find missing topics
  const missingTopics = agentTopics.filter(
    (topic) => !existingTopics.has(topic)
  );

  // Generate recommendations
  const recommendations = [
    ...missingTopics.map((topic) => `Add knowledge sources about "${topic}"`),
  ];

  // Add general recommendations based on knowledge source count and character count
  if (agent.dataSources.length < KNOWLEDGE_THRESHOLDS.RELIABLE_RAG) {
    recommendations.push(
      `Add at least ${
        KNOWLEDGE_THRESHOLDS.RELIABLE_RAG - agent.dataSources.length
      } more knowledge sources for reliable responses`
    );
  }

  if (agent.dataSources.length < KNOWLEDGE_THRESHOLDS.FINE_TUNING) {
    recommendations.push(
      `Add at least ${
        KNOWLEDGE_THRESHOLDS.FINE_TUNING - agent.dataSources.length
      } more knowledge sources before fine-tuning`
    );
  }

  // Get the agent's word count
  const totalWordCount = agent.totalWordCount || 0;

  // Add word count recommendations
  if (totalWordCount < WORD_THRESHOLDS.BASIC_RAG) {
    recommendations.push(
      `Add more content to reach at least ${WORD_THRESHOLDS.BASIC_RAG.toLocaleString()} words for basic RAG`
    );
  } else if (totalWordCount < WORD_THRESHOLDS.RELIABLE_RAG) {
    recommendations.push(
      `Add more content to reach at least ${WORD_THRESHOLDS.RELIABLE_RAG.toLocaleString()} words for reliable RAG`
    );
  } else if (totalWordCount < WORD_THRESHOLDS.FINE_TUNING) {
    recommendations.push(
      `Add more content to reach at least ${WORD_THRESHOLDS.FINE_TUNING.toLocaleString()} words before fine-tuning`
    );
  } else if (totalWordCount < WORD_THRESHOLDS.EXCELLENT_FINE_TUNING) {
    recommendations.push(
      `Add more content to reach at least ${WORD_THRESHOLDS.EXCELLENT_FINE_TUNING.toLocaleString()} words for excellent fine-tuning results`
    );
  }

  return {
    hasRecommendations: recommendations.length > 0,
    recommendations,
    missingTopics,
  };
}

/**
 * Extract potential topics from text
 * This is a simple implementation - in a production system, you would use
 * a more sophisticated approach like NER or topic modeling
 */
function extractTopics(text: string): string[] {
  // Simple implementation: extract nouns and noun phrases
  // In a real system, you would use NLP techniques
  const words = text.toLowerCase().split(/\\s+/);
  const topics = new Set<string>();

  // Extract single words (potential topics)
  for (const word of words) {
    // Skip short words and common stop words
    if (word.length < 4 || ["the", "and", "for", "with"].includes(word))
      continue;

    topics.add(word);
  }

  return Array.from(topics);
}
