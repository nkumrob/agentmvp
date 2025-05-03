import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/server/db/client";
import { generateTrainingExamplesFromKnowledge } from "@/lib/knowledge-threshold";
import { generateGPTExamplesFromKnowledge } from "@/lib/gpt-example-generator";
import { createTrainingExample } from "@/lib/fine-tuning";

export async function POST(
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

    // Parse request body
    const body = await req.json();
    const { count = 10, useGPT = true } = body;

    // Generate training examples from knowledge sources
    let examples = [];

    if (useGPT && process.env.OPENAI_API_KEY) {
      // Use GPT-based generator if API key is available
      console.log("Using GPT-based example generator");
      examples = await generateGPTExamplesFromKnowledge(agentId, count);

      // Fall back to basic generator if GPT fails
      if (examples.length === 0) {
        console.log("Falling back to basic example generator");
        examples = await generateTrainingExamplesFromKnowledge(agentId, count);
      }
    } else {
      // Use basic generator
      console.log("Using basic example generator");
      examples = await generateTrainingExamplesFromKnowledge(agentId, count);
    }

    if (examples.length === 0) {
      return NextResponse.json(
        { error: "No knowledge sources available to generate examples" },
        { status: 400 }
      );
    }

    // Save the generated examples to the database
    const savedExamples = [];
    for (const example of examples) {
      try {
        const savedExample = await createTrainingExample(
          userId,
          example.messages,
          "auto-generated",
          ["knowledge-source", `agent-${agentId}`]
        );
        savedExamples.push(savedExample);
      } catch (error) {
        console.error("Error saving training example:", error);
      }
    }

    return NextResponse.json({
      success: true,
      generatedCount: examples.length,
      savedCount: savedExamples.length,
      examples: savedExamples,
    });
  } catch (error) {
    console.error("Error generating training examples:", error);
    return NextResponse.json(
      { error: "Failed to generate training examples" },
      { status: 500 }
    );
  }
}
