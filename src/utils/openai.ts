import { OpenAI } from "openai";
import { semanticSearch } from "@/lib/embeddings";

// Initialize the OpenAI client with the API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default openai;

// Helper function to create a system prompt based on agent persona and data sources
export const createSystemPrompt = (
  agentName: string,
  agentDescription: string | null,
  personaToneRules: any | null,
  dataSourcesInfo: string | null
) => {
  let systemPrompt = `You are ${agentName}`;

  if (agentDescription) {
    systemPrompt += `, ${agentDescription}`;
  }

  systemPrompt += `. You are a helpful AI assistant that provides accurate and relevant information.`;

  // Add persona tone rules if available
  if (personaToneRules) {
    let toneRulesStr = "";
    try {
      // If it's a string that contains JSON, parse it
      if (typeof personaToneRules === "string") {
        const parsedRules = JSON.parse(personaToneRules);
        toneRulesStr = Object.entries(parsedRules)
          .map(([key, value]) => `- ${key}: ${value}`)
          .join("\n");
      }
      // If it's already an object
      else if (typeof personaToneRules === "object") {
        toneRulesStr = Object.entries(personaToneRules)
          .map(([key, value]) => `- ${key}: ${value}`)
          .join("\n");
      }

      if (toneRulesStr) {
        systemPrompt += `\n\nWhen responding, follow these tone guidelines:\n${toneRulesStr}`;
      }
    } catch (e) {
      // If parsing fails, use the string directly
      if (typeof personaToneRules === "string") {
        systemPrompt += `\n\nWhen responding, follow these tone guidelines: ${personaToneRules}`;
      }
    }
  }

  // Add information about available data sources
  if (dataSourcesInfo) {
    systemPrompt += `\n\nYou have access to the following knowledge sources:\n${dataSourcesInfo}`;
  }

  // Add instructions for citations
  systemPrompt += `\n\nWhen providing information from knowledge sources, include citations in your response.
If you don't know the answer or don't have relevant information in your knowledge sources, say so clearly.
Do not make up information or citations.`;

  return systemPrompt;
};

// Helper function to extract citations from the response
export const extractCitations = (content: string) => {
  const citations: Array<{ source: string; text: string }> = [];

  // Simple regex pattern to find citations in the format [Source: text]
  const citationRegex = /\[(.*?):(.*?)\]/g;
  let match;

  while ((match = citationRegex.exec(content)) !== null) {
    if (match.length >= 3) {
      citations.push({
        source: match[1].trim(),
        text: match[2].trim(),
      });
    }
  }

  // Clean up the content by removing citation markers
  const cleanContent = content.replace(citationRegex, "").trim();

  return { cleanContent, citations };
};

// Helper function to retrieve relevant chunks from data sources
export const retrieveRelevantChunks = async (
  query: string,
  agentId: string,
  prisma: any
) => {
  try {
    // First try semantic search with vector embeddings
    try {
      const searchResults = await semanticSearch(query, { agentId }, 5);

      if (searchResults && searchResults.length > 0) {
        return searchResults.map((result) => ({
          source: result.metadata?.sourceId || "Unknown Source",
          content: result.content,
        }));
      }
    } catch (error) {
      console.error("Error performing semantic search:", error);
      // Fall back to keyword search if semantic search fails
    }

    // Fallback to keyword search
    const dataSources = await prisma.dataSource.findMany({
      where: {
        agentId,
        status: "completed",
      },
      include: {
        chunks: true,
      },
    });

    // For now, we'll use a simple keyword matching approach as fallback
    const keywords = query.toLowerCase().split(/\s+/);

    const relevantChunks: Array<{ content: string; source: string }> = [];

    for (const dataSource of dataSources) {
      for (const chunk of dataSource.chunks) {
        const chunkContent = chunk.content.toLowerCase();

        // Check if any keyword is in the chunk
        const isRelevant = keywords.some(
          (keyword) => keyword.length > 3 && chunkContent.includes(keyword)
        );

        if (isRelevant) {
          relevantChunks.push({
            content: chunk.content,
            source: dataSource.name,
          });
        }
      }
    }

    // Limit to top 5 most relevant chunks to avoid context length issues
    return relevantChunks.slice(0, 5);
  } catch (error) {
    console.error("Error retrieving relevant chunks:", error);
    return [];
  }
};
