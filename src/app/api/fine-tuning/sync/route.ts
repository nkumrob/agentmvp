import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { checkFineTuningStatus } from "@/lib/fine-tuning";

/**
 * API endpoint to sync a single fine-tuning job with OpenAI
 * This is used for real-time status updates
 */
export async function GET(req: Request) {
  try {
    // Get the job ID from the query string
    const url = new URL(req.url);
    const jobId = url.searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    // Get the job from the database
    const job = await prisma.fineTuningJob.findUnique({
      where: { id: jobId },
      include: {
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
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Check the job status with OpenAI
    const { fineTuningJob, openaiJob } = await checkFineTuningStatus(jobId);

    // Return the updated job
    return NextResponse.json({
      job: fineTuningJob,
      openaiStatus: openaiJob.status,
      lastChecked: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error syncing fine-tuning job:", error);
    return NextResponse.json(
      { error: "Failed to sync fine-tuning job" },
      { status: 500 }
    );
  }
}
