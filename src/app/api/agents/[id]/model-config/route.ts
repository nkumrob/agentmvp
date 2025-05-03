import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/server/db/client";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const agentId = id;

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

    // Get the model config
    const modelConfig = await prisma.modelConfig.findUnique({
      where: {
        agentId,
      },
    });

    if (!modelConfig) {
      return NextResponse.json(
        { error: "Model config not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(modelConfig);
  } catch (error) {
    console.error("Error fetching model config:", error);
    return NextResponse.json(
      { error: "Failed to fetch model config" },
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

    const { id } = params;
    const agentId = id;

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

    // Check if a model config already exists
    const existingConfig = await prisma.modelConfig.findUnique({
      where: {
        agentId,
      },
    });

    if (existingConfig) {
      return NextResponse.json(
        { error: "Model config already exists" },
        { status: 400 }
      );
    }

    // Parse the request body
    const body = await req.json();
    const {
      baseModel,
      status,
      provider,
      temperature,
      maxTokens,
      topP,
      frequencyPenalty,
      presencePenalty,
      systemPrompt,
    } = body;

    // Create the model config
    const modelConfig = await prisma.modelConfig.create({
      data: {
        baseModel: baseModel || "gpt-3.5-turbo",
        status: status || "pending",
        provider: provider || "openai",
        temperature: temperature !== undefined ? temperature : 0.7,
        maxTokens: maxTokens !== undefined ? maxTokens : 1000,
        topP: topP !== undefined ? topP : null,
        frequencyPenalty:
          frequencyPenalty !== undefined ? frequencyPenalty : null,
        presencePenalty: presencePenalty !== undefined ? presencePenalty : null,
        systemPrompt: systemPrompt || null,
        agentId,
      },
    });

    return NextResponse.json(modelConfig);
  } catch (error) {
    console.error("Error creating model config:", error);
    return NextResponse.json(
      { error: "Failed to create model config" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const agentId = id;

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

    // Check if the model config exists
    const existingConfig = await prisma.modelConfig.findUnique({
      where: {
        agentId,
      },
    });

    if (!existingConfig) {
      return NextResponse.json(
        { error: "Model config not found" },
        { status: 404 }
      );
    }

    // Parse the request body
    const body = await req.json();
    const {
      baseModel,
      status,
      activeModelId,
      provider,
      temperature,
      maxTokens,
      topP,
      frequencyPenalty,
      presencePenalty,
      systemPrompt,
    } = body;

    // Update the model config
    const modelConfig = await prisma.modelConfig.update({
      where: {
        agentId,
      },
      data: {
        ...(baseModel && { baseModel }),
        ...(status && { status }),
        ...(activeModelId !== undefined && { activeModelId }),
        ...(provider && { provider }),
        ...(temperature !== undefined && { temperature }),
        ...(maxTokens !== undefined && { maxTokens }),
        ...(topP !== undefined && { topP }),
        ...(frequencyPenalty !== undefined && { frequencyPenalty }),
        ...(presencePenalty !== undefined && { presencePenalty }),
        ...(systemPrompt !== undefined && { systemPrompt }),
      },
    });

    return NextResponse.json(modelConfig);
  } catch (error) {
    console.error("Error updating model config:", error);
    return NextResponse.json(
      { error: "Failed to update model config" },
      { status: 500 }
    );
  }
}
