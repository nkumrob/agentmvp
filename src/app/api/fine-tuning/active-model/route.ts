import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/server/db/client";
import { setActiveModel } from "@/lib/fine-tuning";

export async function POST(req: Request) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { modelConfigId, fineTunedModelId } = body;

    if (!modelConfigId) {
      return NextResponse.json(
        { error: "Model config ID is required" },
        { status: 400 }
      );
    }

    // Check if the model config exists and belongs to the user
    const modelConfig = await prisma.modelConfig.findUnique({
      where: { id: modelConfigId },
      include: { agent: true },
    });

    if (!modelConfig) {
      return NextResponse.json(
        { error: "Model config not found" },
        { status: 404 }
      );
    }

    if (modelConfig.agent.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // If a fine-tuned model ID is provided, check if it exists
    if (fineTunedModelId) {
      const job = await prisma.fineTuningJob.findFirst({
        where: {
          modelConfigId,
          fineTunedModel: fineTunedModelId,
          status: "succeeded",
        },
      });

      if (!job) {
        return NextResponse.json(
          { error: "Fine-tuned model not found" },
          { status: 404 }
        );
      }
    }

    // Set the active model
    const updatedModelConfig = await setActiveModel(
      modelConfigId,
      fineTunedModelId
    );

    return NextResponse.json(updatedModelConfig);
  } catch (error) {
    console.error("Error setting active model:", error);
    return NextResponse.json(
      { error: "Failed to set active model" },
      { status: 500 }
    );
  }
}
