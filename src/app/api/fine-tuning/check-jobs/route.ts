import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/server/db/client";
import { checkFineTuningStatus } from "@/lib/fine-tuning";

export async function GET(req: Request) {
  try {
    const { userId } = getAuth(req);

    // This endpoint can be called by a user or by a scheduled task
    // If called by a user, verify authentication
    if (
      req.headers.get("x-api-key") !== process.env.INTERNAL_API_KEY &&
      !userId
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all pending and running jobs
    const jobs = await prisma.fineTuningJob.findMany({
      where: {
        status: {
          in: ["pending", "running"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
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

    console.log(`Found ${jobs.length} pending or running jobs to check`);

    // Check each job's status
    const updatedJobs = [];
    for (const job of jobs) {
      try {
        console.log(
          `Checking status for job ${job.id} (${
            job.jobId || "no OpenAI ID yet"
          })`
        );

        // Skip jobs that don't have an OpenAI job ID yet
        if (!job.jobId) {
          console.log(
            `Job ${job.id} doesn't have an OpenAI job ID yet, skipping`
          );

          // Check if the job has been pending for too long (more than 10 minutes)
          const jobCreatedAt = new Date(job.createdAt).getTime();
          const currentTime = Date.now();
          const jobAgeInMinutes = (currentTime - jobCreatedAt) / (1000 * 60);

          if (jobAgeInMinutes > 10) {
            console.log(
              `Job ${job.id} has been pending for ${jobAgeInMinutes.toFixed(
                1
              )} minutes, marking as failed`
            );

            // Update the job status to failed
            const failedJob = await prisma.fineTuningJob.update({
              where: { id: job.id },
              data: {
                status: "failed",
                completedAt: new Date(),
                resultMetrics: JSON.stringify({
                  error:
                    "Job creation timed out. The job was not created successfully with OpenAI.",
                }),
              },
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

            updatedJobs.push(failedJob);
          }

          continue;
        }

        // Check status with OpenAI
        const { fineTuningJob } = await checkFineTuningStatus(job.id);
        updatedJobs.push(fineTuningJob);

        // If the job succeeded, set it as the active model
        if (
          fineTuningJob.status === "succeeded" &&
          fineTuningJob.fineTunedModel
        ) {
          console.log(`Job ${job.id} succeeded, setting as active model`);

          // Update the model config to use the fine-tuned model
          await prisma.modelConfig.update({
            where: { id: job.modelConfigId },
            data: {
              activeModelId: fineTuningJob.fineTunedModel,
              status: "completed",
            },
          });
        }
      } catch (error) {
        console.error(`Error checking status for job ${job.id}:`, error);
      }
    }

    return NextResponse.json({
      message: `Checked ${jobs.length} jobs`,
      updatedJobs,
    });
  } catch (error) {
    console.error("Error checking fine-tuning jobs:", error);
    return NextResponse.json(
      { error: "Failed to check fine-tuning jobs" },
      { status: 500 }
    );
  }
}
