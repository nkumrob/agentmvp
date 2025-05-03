import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/server/db/client";
import { processDataSource } from "@/lib/embeddings";
import {
  calculateDataSourceCharacterCount,
  updateAgentTotalCharacterCount,
} from "@/lib/character-count";
import {
  extractContent,
  detectSourceTypeFromUrl,
  detectSourceTypeFromFile,
} from "@/lib/content-extractors";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agentId = params?.id;

    if (!agentId) {
      return NextResponse.json(
        { error: "Agent ID is required" },
        { status: 400 }
      );
    }

    // Check if agent exists and belongs to user
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

    // Get data sources for agent
    const dataSources = await prisma.dataSource.findMany({
      where: {
        agentId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(dataSources);
  } catch (error) {
    console.error("Error fetching data sources:", error);
    return NextResponse.json(
      { error: "Failed to fetch data sources" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agentId = params?.id;

    if (!agentId) {
      return NextResponse.json(
        { error: "Agent ID is required" },
        { status: 400 }
      );
    }

    // Check if agent exists and belongs to user
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

    const body = await req.json();
    let { name, sourceType, sourceUrl, content } = body;

    // Generate a default name if not provided
    if (!name) {
      if (sourceType === "youtube" || sourceType === "url") {
        name = sourceUrl || `Source (${new Date().toLocaleDateString()})`;
      } else {
        name = `Source (${new Date().toLocaleDateString()})`;
      }
    }

    if (!sourceType) {
      return NextResponse.json(
        { error: "Source type is required" },
        { status: 400 }
      );
    }

    // Create data source
    const dataSource = await prisma.dataSource.create({
      data: {
        name,
        sourceType,
        sourceUrl,
        content,
        agentId,
        status: "pending", // Initial status
      },
    });

    // Process the data source in the background
    (async () => {
      try {
        let extractedContent;
        let processedContent;
        let chunks = [];

        // Process based on source type
        if (sourceType === "text" && content) {
          // For text content, use it directly
          extractedContent = {
            content,
            title: name,
            characterCount: content.length,
            sourceType: "text",
          };
        } else if (sourceType === "url" && sourceUrl) {
          // For URLs, detect the actual source type (website, YouTube, etc.)
          const detectedType = detectSourceTypeFromUrl(sourceUrl);

          // Extract content based on the detected type
          extractedContent = await extractContent(detectedType, sourceUrl, {
            url: sourceUrl,
          });

          // Update the source type if it was detected as something more specific
          if (detectedType !== "url") {
            await prisma.dataSource.update({
              where: { id: dataSource.id },
              data: { sourceType: detectedType },
            });
          }
        } else if (sourceType === "youtube" && sourceUrl) {
          // For YouTube URLs, extract the transcript
          extractedContent = await extractContent("youtube", sourceUrl);
        } else if (["pdf", "image", "audio"].includes(sourceType) && content) {
          // For binary content (provided as base64), convert to buffer and extract
          const buffer = Buffer.from(content, "base64");
          extractedContent = await extractContent(sourceType, buffer, {
            filename: name,
          });
        } else {
          throw new Error(
            `Unsupported source type or missing required data: ${sourceType}`
          );
        }

        // Import the content cleaner for validation only
        const { isContentClean } = await import(
          "@/lib/content-extractors/content-cleaner"
        );

        // Store the extracted content (already cleaned by the extractor)
        processedContent = extractedContent.content;

        // Validate content quality
        if (!isContentClean(processedContent)) {
          console.warn(
            `Content quality check failed for source ${dataSource.id}. Content may be low quality.`
          );
          // We'll still proceed, but log the warning
        }

        // Ensure the character count is accurate by using the actual content length
        const accurateCharacterCount = processedContent.length;

        // Calculate content quality metrics
        const wordCount = processedContent.split(/\s+/).length;
        const avgWordLength = processedContent.length / wordCount;
        const paragraphCount = processedContent.split("\n\n").length;

        // Log content quality metrics
        console.log(`Source ${dataSource.id} quality metrics:
          - Character count: ${accurateCharacterCount}
          - Word count: ${wordCount}
          - Average word length: ${avgWordLength.toFixed(2)}
          - Paragraph count: ${paragraphCount}
        `);

        // Update the data source with the extracted content and word count
        await prisma.dataSource.update({
          where: { id: dataSource.id },
          data: {
            content: processedContent,
            name: extractedContent.title || name, // Use extracted title if available
            characterCount: accurateCharacterCount,
            wordCount: wordCount, // Save the word count
          },
        });

        // Log word count information for debugging
        console.log(`Source ${dataSource.id} word count: ${wordCount}`);

        // Log character count information for debugging
        console.log(
          `Source ${dataSource.id} character count: ${accurateCharacterCount} (reported by extractor: ${extractedContent.characterCount})`
        );

        // Log a warning if there's a significant difference between reported and actual count
        if (
          Math.abs(
            accurateCharacterCount - (extractedContent.characterCount || 0)
          ) > 100
        ) {
          console.warn(
            `Character count discrepancy for source ${dataSource.id}: ` +
              `Reported by extractor: ${extractedContent.characterCount}, ` +
              `Actual content length: ${accurateCharacterCount}`
          );
        }

        // Process the content for embeddings
        try {
          const result = await processDataSource(
            dataSource.id,
            processedContent,
            agentId,
            sourceType
          );

          if (!result.success) {
            console.warn(
              `Partial success processing data source: ${result.error}`
            );
          }
        } catch (processingError) {
          console.error(
            "Error processing data source for embeddings:",
            processingError
          );
          // Continue with the rest of the function even if embedding fails
        }

        // Create chunks in the database
        chunks = processedContent
          .split("\n\n")
          .filter((p) => p.trim().length > 0);

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          await prisma.chunk.create({
            data: {
              content: chunk,
              dataSourceId: dataSource.id,
              metadata: JSON.stringify({
                type: "paragraph",
                index: i,
                hasEmbedding: true,
              }),
            },
          });
        }

        // Update the data source status
        await prisma.dataSource.update({
          where: { id: dataSource.id },
          data: { status: "completed" },
        });

        // Update the agent's total character count
        await updateAgentTotalCharacterCount(agentId);

        console.log(
          `Processed ${sourceType} data source ${dataSource.id} with ${chunks.length} chunks, ${wordCount} words, and ${accurateCharacterCount} characters`
        );
      } catch (error) {
        console.error("Error processing data source:", error);

        // Update the data source status to failed
        await prisma.dataSource.update({
          where: {
            id: dataSource.id,
          },
          data: {
            status: "failed",
          },
        });
      }
    })();

    return NextResponse.json(dataSource);
  } catch (error) {
    console.error("Error creating data source:", error);
    return NextResponse.json(
      { error: "Failed to create data source" },
      { status: 500 }
    );
  }
}
