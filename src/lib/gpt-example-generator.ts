import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";

// Initialize Prisma client
const prisma = new PrismaClient();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate training examples from knowledge sources using GPT
 * This creates high-quality question-answer pairs based on the agent's knowledge sources
 */
export async function generateGPTExamplesFromKnowledge(
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

    return true;
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
    if (!source.content || source.content.trim().length < 100) continue;

    // Create a simple hash of the content to avoid duplicates
    const contentHash = hashString(source.content.trim().substring(0, 100));
    if (usedContentHashes.has(contentHash)) {
      console.log(`Skipping duplicate content (hash: ${contentHash})`);
      continue;
    }
    usedContentHashes.add(contentHash);

    console.log(
      `Using source: ${source.name} (${source.content.trim().length} chars)`
    );

    try {
      // Generate examples using GPT
      const gptExamples = await generateExamplesWithGPT(
        source.content,
        source.name,
        agent?.name || "AI Assistant",
        toneRules,
        Math.min(3, Math.ceil(count / validSources.length)) // Generate 1-3 examples per source
      );

      // Add the examples
      examples.push(...gptExamples);

      // Break if we have enough examples
      if (examples.length >= count) break;
    } catch (error) {
      console.error("Error generating examples with GPT:", error);
    }
  }

  return examples;
}

/**
 * Generate examples using GPT
 */
async function generateExamplesWithGPT(
  content: string,
  sourceName: string,
  agentName: string,
  toneRules: string,
  count: number
): Promise<Array<{ messages: any[] }>> {
  // Truncate content if it's too long
  const truncatedContent = content.length > 8000 
    ? content.substring(0, 8000) + "..." 
    : content;

  const systemPrompt = `You are an AI assistant that creates training examples for fine-tuning language models.
Based on the provided content, generate ${count} different question-answer pairs that would be useful for training.
Each question should be something a user might genuinely ask about the content.
Each answer should be comprehensive, accurate, and reflect the information in the content.

Content from: ${sourceName}

${truncatedContent}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Please generate ${count} question-answer pairs based on this content. Format each pair as:
Q1: [Question]
A1: [Answer]

Q2: [Question]
A2: [Answer]

And so on. Make the questions diverse and representative of what users might ask about this content.`,
        },
      ],
      temperature: 0.7,
    });

    const gptResponse = response.choices[0]?.message?.content || "";
    
    // Parse the response to extract question-answer pairs
    const examples = parseQAPairs(gptResponse, agentName, toneRules);
    
    return examples;
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    return [];
  }
}

/**
 * Parse question-answer pairs from GPT response
 */
function parseQAPairs(
  gptResponse: string,
  agentName: string,
  toneRules: string
): Array<{ messages: any[] }> {
  const examples: Array<{ messages: any[] }> = [];
  
  // Split by Q1:, Q2:, etc.
  const pairs = gptResponse.split(/Q\d+:/);
  
  // Skip the first element if it's empty (usually is)
  for (let i = 1; i < pairs.length; i++) {
    const pair = pairs[i].trim();
    
    // Split the pair into question and answer
    const parts = pair.split(/A\d+:/);
    
    if (parts.length >= 2) {
      const question = parts[0].trim();
      const answer = parts[1].trim();
      
      if (question && answer) {
        examples.push({
          messages: [
            {
              role: "system",
              content: `You are ${agentName}. ${toneRules}`,
            },
            { role: "user", content: question },
            { role: "assistant", content: answer },
          ],
        });
      }
    }
  }
  
  return examples;
}

/**
 * Create a simple hash of a string
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
