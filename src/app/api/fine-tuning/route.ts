import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/server/db/client";
import {
  createFineTuningJob,
  checkFineTuningStatus,
  cancelFineTuningJob,
} from "@/lib/fine-tuning";
import { getAgentCharacterCountMetrics } from "@/lib/character-count";

export async function GET(req: Request) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const url = new URL(req.url);
    const jobId = url.searchParams.get("jobId");
    const modelConfigId = url.searchParams.get("modelConfigId");
    const status = url.searchParams.get("status");
    const limit = url.searchParams.get("limit")
      ? parseInt(url.searchParams.get("limit")!)
      : 10;
    const offset = url.searchParams.get("offset")
      ? parseInt(url.searchParams.get("offset")!)
      : 0;

    // Build the query
    const query: any = {
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    };

    // Add filters
    if (jobId) {
      query.where.id = jobId;
    }

    if (modelConfigId) {
      query.where.modelConfigId = modelConfigId;
    }

    if (status) {
      query.where.status = status;
    }

    // Include related data
    query.include = {
      modelConfig: {
        include: {
          agent: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    };

    // Get the fine-tuning jobs
    const jobs = await prisma.fineTuningJob.findMany(query);

    // If a specific job is requested, check its status with OpenAI
    if (jobId && jobs.length === 1 && jobs[0].jobId) {
      try {
        const { fineTuningJob, openaiJob } = await checkFineTuningStatus(
          jobs[0].id
        );
        return NextResponse.json(fineTuningJob);
      } catch (error) {
        console.error("Error checking job status:", error);
        // Return the job from the database if we can't check with OpenAI
        return NextResponse.json(jobs[0]);
      }
    }

    // For all jobs, check status of any running or pending jobs
    if (!jobId && jobs.length > 0) {
      const updatedJobs = [...jobs];

      // Find jobs that are running or pending and check their status
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        if (
          (job.status === "running" || job.status === "pending") &&
          job.jobId
        ) {
          try {
            // Check status with OpenAI
            const { fineTuningJob } = await checkFineTuningStatus(job.id);
            updatedJobs[i] = fineTuningJob;
          } catch (error) {
            console.error(`Error checking status for job ${job.id}:`, error);
            // Keep the original job data if we can't check with OpenAI
          }
        }
      }

      return NextResponse.json(updatedJobs);
    }

    return NextResponse.json(jobs);
  } catch (error) {
    console.error("Error fetching fine-tuning jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch fine-tuning jobs" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      modelConfigId,
      baseModel,
      trainingExampleIds,
      validationExampleIds,
      hyperparameters,
    } = body;

    if (!modelConfigId) {
      return NextResponse.json(
        { error: "Model config ID is required" },
        { status: 400 }
      );
    }

    if (!baseModel) {
      return NextResponse.json(
        { error: "Base model is required" },
        { status: 400 }
      );
    }

    // Training examples are optional, but we need to validate them if provided
    if (trainingExampleIds && trainingExampleIds.length === 0) {
      console.log(
        "No training examples provided, will use knowledge sources only"
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

    // Check if the agent has sufficient knowledge for fine-tuning
    const characterMetrics = await getAgentCharacterCountMetrics(
      modelConfig.agent.id
    );

    // Check both character count and word count
    if (!characterMetrics.hasSufficientKnowledgeForFineTuning) {
      // Provide detailed error message with both character and word counts
      return NextResponse.json(
        {
          error: "Insufficient knowledge for fine-tuning",
          details: `Your agent needs at least ${characterMetrics.wordThresholds.FINE_TUNING.toLocaleString()} words of knowledge. Current count: ${characterMetrics.totalWords.toLocaleString()} words.`,
          metrics: characterMetrics,
        },
        { status: 400 }
      );
    }

    console.log("Knowledge validation passed:", {
      wordCount: characterMetrics.totalWords,
      wordThreshold: characterMetrics.wordThresholds.FINE_TUNING,
      characterCount: characterMetrics.totalCharacters,
      characterThreshold: characterMetrics.characterThresholds.FINE_TUNING,
    });

    // Get the agent's knowledge sources
    const knowledgeSources = await prisma.dataSource.findMany({
      where: {
        agentId: modelConfig.agent.id,
        status: "completed",
      },
    });

    // Get the agent's persona for tone rules
    const agent = await prisma.agent.findUnique({
      where: { id: modelConfig.agent.id },
      include: { persona: true },
    });

    // Get the training examples if provided
    let trainingExamples: any[] = [];
    if (trainingExampleIds && trainingExampleIds.length > 0) {
      trainingExamples = await prisma.trainingExample.findMany({
        where: {
          id: { in: trainingExampleIds },
          userId,
        },
      });

      if (trainingExamples.length !== trainingExampleIds.length) {
        return NextResponse.json(
          { error: "One or more training examples not found" },
          { status: 404 }
        );
      }
    }

    // Get the validation examples if provided
    let validationExamples: any[] = [];
    if (validationExampleIds && validationExampleIds.length > 0) {
      validationExamples = await prisma.trainingExample.findMany({
        where: {
          id: { in: validationExampleIds },
          userId,
        },
      });

      if (validationExamples.length !== validationExampleIds.length) {
        return NextResponse.json(
          { error: "One or more validation examples not found" },
          { status: 404 }
        );
      }
    }

    // Create the fine-tuning job with knowledge sources and persona instructions
    const { fineTuningJob, openaiJob } = await createFineTuningJob(
      userId,
      modelConfigId,
      baseModel,
      trainingExamples,
      validationExamples,
      hyperparameters,
      knowledgeSources,
      agent
    );

    // Update the model config status
    await prisma.modelConfig.update({
      where: { id: modelConfigId },
      data: {
        status: "training",
        baseModel,
      },
    });

    return NextResponse.json(fineTuningJob);
  } catch (error) {
    console.error("Error creating fine-tuning job:", error);

    // Get a more specific error message
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to create fine-tuning job";

    // Log the full error for debugging
    console.error("Full error details:", JSON.stringify(error, null, 2));

    // Check for specific error types with improved error messages
    if (errorMessage.includes("API key")) {
      return NextResponse.json(
        {
          error:
            "OpenAI API key is invalid or missing. Please check your configuration.",
          details:
            "Your OpenAI API key may be missing, invalid, or doesn't have permission for fine-tuning.",
        },
        { status: 500 }
      );
    } else if (
      errorMessage.includes("training examples") ||
      errorMessage.includes("examples")
    ) {
      return NextResponse.json(
        {
          error: "No valid training examples available.",
          details:
            "Please add knowledge sources or training examples. The system needs valid examples to create a fine-tuning job.",
        },
        { status: 400 }
      );
    } else if (errorMessage.includes("model")) {
      return NextResponse.json(
        {
          error: "Invalid model specified.",
          details:
            "Please select a valid base model. The model you selected may not support fine-tuning.",
        },
        { status: 400 }
      );
    } else if (
      errorMessage.includes("file") ||
      errorMessage.includes("process")
    ) {
      return NextResponse.json(
        {
          error: "File processing error.",
          details:
            "There was an issue with processing your training files. This could be temporary - please try again in a few minutes.",
        },
        { status: 500 }
      );
    } else if (
      errorMessage.includes("timeout") ||
      errorMessage.includes("timed out")
    ) {
      return NextResponse.json(
        {
          error: "Request timed out.",
          details:
            "The request to OpenAI timed out. This could be due to high server load or large training files. Please try again.",
        },
        { status: 500 }
      );
    }

    // Generic error with the original message for other cases
    return NextResponse.json(
      {
        error: "Failed to create fine-tuning job",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const url = new URL(req.url);
    const jobId = url.searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    // Check if the job exists and belongs to the user
    const job = await prisma.fineTuningJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Fine-tuning job not found" },
        { status: 404 }
      );
    }

    if (job.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Cancel the job if it's still running
    if (["pending", "running"].includes(job.status) && job.jobId) {
      try {
        await cancelFineTuningJob(job.id);
      } catch (error) {
        console.error("Error cancelling job:", error);
        // Continue with deletion even if cancellation fails
      }
    }

    // Delete the job
    await prisma.fineTuningJob.delete({
      where: { id: jobId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting fine-tuning job:", error);
    return NextResponse.json(
      { error: "Failed to delete fine-tuning job" },
      { status: 500 }
    );
  }
}
