import { OpenAI } from "openai";
import { supabase } from "./supabase";
import {
  calculateDataSourceCharacterCount,
  updateAgentTotalCharacterCount,
} from "./character-count";

// Initialize OpenAI client if API key is available
let openai: any = null;

// We'll initialize OpenAI only when needed to avoid errors
const initializeOpenAI = () => {
  if (openai) return openai;

  try {
    // Check if API key is available
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn(
        "OpenAI API key is missing for embeddings. Using fallback implementation."
      );
      return null;
    }

    openai = new OpenAI({ apiKey });
    return openai;
  } catch (error) {
    console.error("Failed to initialize OpenAI client for embeddings:", error);
    return null;
  }
};

/**
 * Generate embeddings for a text using OpenAI's embedding model
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Initialize OpenAI client
    const client = initializeOpenAI();

    if (!client) {
      console.warn(
        "OpenAI client not available for embeddings. Returning empty embedding."
      );
      return [];
    }

    const response = await client.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    // Return empty array instead of throwing
    return [];
  }
}

/**
 * Store document embeddings in Supabase
 */
export async function storeEmbedding(
  documentId: string,
  content: string,
  metadata: Record<string, any> = {}
) {
  try {
    // Check if Supabase client is available
    if (!supabase) {
      console.warn(
        "Supabase client not available. Skipping embedding storage."
      );
      return null;
    }

    // Generate embedding
    const embedding = await generateEmbedding(content);

    // If embedding generation failed, skip storage
    if (!embedding.length) {
      console.warn("Empty embedding generated. Skipping storage.");
      return null;
    }

    // Store in Supabase
    const { data, error } = await supabase.from("document_embeddings").upsert({
      id: documentId,
      content,
      embedding,
      metadata,
      created_at: new Date().toISOString(),
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Error storing embedding:", error);
    // Return null instead of throwing
    return null;
  }
}

/**
 * Perform semantic search using embeddings
 */
export async function semanticSearch(
  query: string,
  filters: Record<string, any> = {},
  limit: number = 5
) {
  try {
    // Check if Supabase client is available
    if (!supabase) {
      console.warn(
        "Supabase client not available. Semantic search is disabled."
      );
      return [];
    }

    // Generate embedding for the query
    const embedding = await generateEmbedding(query);

    // If embedding generation failed, return empty results
    if (!embedding.length) {
      console.warn(
        "Empty embedding generated. Cannot perform semantic search."
      );
      return [];
    }

    // Build the Supabase query
    let supabaseQuery = supabase.rpc("match_documents", {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: limit,
    });

    // Add filters if provided
    if (filters.agentId) {
      supabaseQuery = supabaseQuery.eq("metadata->>agentId", filters.agentId);
    }

    // Execute the query
    const { data, error } = await supabaseQuery;

    if (error) {
      console.error("Error in Supabase query:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error performing semantic search:", error);
    // Return empty array instead of throwing
    return [];
  }
}

/**
 * Process and embed a data source
 */
export async function processDataSource(
  sourceId: string,
  content: string,
  agentId: string,
  sourceType: string,
  chunkSize: number = 1000
) {
  try {
    // Split content into chunks
    const chunks = splitIntoChunks(content, chunkSize);

    // Check if Supabase client is available
    const hasSupabase = !!supabase;

    if (!hasSupabase) {
      console.warn(
        "Supabase client not available. Skipping embedding generation but will still process chunks."
      );
    }

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Only try to store embeddings if Supabase is available
      if (hasSupabase) {
        try {
          await storeEmbedding(`${sourceId}_chunk_${i}`, chunk, {
            sourceId,
            agentId,
            sourceType,
            chunkIndex: i,
            totalChunks: chunks.length,
          });
        } catch (embeddingError) {
          console.error("Error storing embedding for chunk:", embeddingError);
          // Continue processing other chunks even if this one fails
        }
      }
    }

    // Calculate and update character count
    try {
      await calculateDataSourceCharacterCount(sourceId);
      await updateAgentTotalCharacterCount(agentId);
    } catch (countError) {
      console.error("Error updating character counts:", countError);
      // Continue even if character count update fails
    }

    return {
      success: true,
      chunkCount: chunks.length,
      characterCount: content.length,
    };
  } catch (error) {
    console.error("Error processing data source:", error);
    // Return partial success instead of throwing
    return { success: false, error: String(error), chunkCount: 0 };
  }
}

/**
 * Split text into chunks of approximately the specified size
 */
function splitIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];

  // Simple splitting by paragraphs first
  const paragraphs = text.split(/\n\s*\n/);

  let currentChunk = "";

  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed the chunk size, save the current chunk and start a new one
    if (
      currentChunk.length + paragraph.length > chunkSize &&
      currentChunk.length > 0
    ) {
      chunks.push(currentChunk.trim());
      currentChunk = "";
    }

    // Add the paragraph to the current chunk
    currentChunk += paragraph + "\n\n";
  }

  // Add the last chunk if it's not empty
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
