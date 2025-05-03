import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/server/db/client";
import { generateEmbedding, storeEmbedding } from "@/lib/embeddings";

export async function POST(req: Request) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { text, documentId, metadata } = body;

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    try {
      // Generate embedding
      const embedding = await generateEmbedding(text);

      // Check if embedding was generated successfully
      if (!embedding || embedding.length === 0) {
        console.warn(
          "Failed to generate embedding or OpenAI API key not configured"
        );
        return NextResponse.json(
          {
            success: false,
            documentId,
            error:
              "Failed to generate embedding. OpenAI API key may not be configured.",
          },
          { status: 200 }
        ); // Still return 200 to not break the client
      }

      // Return the embedding
      return NextResponse.json({
        success: true,
        documentId,
        embedding,
      });
    } catch (embeddingError) {
      console.error("Error in embedding generation:", embeddingError);
      return NextResponse.json(
        {
          success: false,
          documentId,
          error: "Error generating embedding",
        },
        { status: 200 }
      ); // Still return 200 to not break the client
    }
  } catch (error) {
    console.error("Error generating embedding:", error);
    return NextResponse.json(
      { error: "Failed to generate embedding" },
      { status: 500 }
    );
  }
}
