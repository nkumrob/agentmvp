import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/server/db/client";
import { checkFineTuningStatus } from "@/lib/fine-tuning";
import { openai } from "@/lib/openai";

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

    // Get all jobs regardless of status
    const jobs = await prisma.fineTuningJob.findMany({
      where: {
        userId: userId || undefined,
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

    console.log(`Found ${jobs.length} jobs to sync with OpenAI`);

    // Check each job's status
    const updatedJobs = [];
    for (const job of jobs) {
      try {
        // Skip jobs that don't have an OpenAI job ID
        if (!job.jobId) {
          console.log(`Job ${job.id} doesn't have an OpenAI job ID, skipping`);

          // Check if the job has been pending for too long (more than 10 minutes)
          const jobCreatedAt = new Date(job.createdAt).getTime();
          const currentTime = Date.now();
          const jobAgeInMinutes = (currentTime - jobCreatedAt) / (1000 * 60);

          if (jobAgeInMinutes > 10 && job.status === "pending") {
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

        console.log(`Syncing job ${job.id} (${job.jobId}) with OpenAI`);

        try {
          // Check if the job exists in OpenAI
          const openaiJob = await openai.fineTuning.jobs.retrieve(job.jobId);

          // If the job exists, check its status
          const { fineTuningJob } = await checkFineTuningStatus(job.id);
          updatedJobs.push(fineTuningJob);

          console.log(
            `Successfully synced job ${job.id} with OpenAI, status: ${fineTuningJob.status}`
          );
        } catch (openaiError: any) {
          console.error(
            `Error retrieving job from OpenAI: ${openaiError.message}`
          );

          // If the job doesn't exist in OpenAI, mark it as failed
          if (openaiError.message.includes("No such fine-tuning job")) {
            console.log(
              `Job ${job.id} doesn't exist in OpenAI, marking as failed`
            );

            const failedJob = await prisma.fineTuningJob.update({
              where: { id: job.id },
              data: {
                status: "failed",
                completedAt: new Date(),
                resultMetrics: JSON.stringify({
                  error:
                    "Job not found in OpenAI. It may have been deleted or never created successfully.",
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
        }
      } catch (error) {
        console.error(`Error syncing job ${job.id}:`, error);
      }
    }

    return NextResponse.json({
      message: `Synced ${updatedJobs.length} jobs with OpenAI`,
      updatedJobs,
    });
  } catch (error) {
    console.error("Error syncing fine-tuning jobs with OpenAI:", error);
    return NextResponse.json(
      { error: "Failed to sync fine-tuning jobs with OpenAI" },
      { status: 500 }
    );
  }
}
