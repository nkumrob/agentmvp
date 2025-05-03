import { prisma } from "@/server/db/client";
import { checkFineTuningStatus } from "@/lib/fine-tuning";

/**
 * Scheduled task to sync all fine-tuning jobs with OpenAI
 * This should be called regularly by a cron job or similar mechanism
 */
export async function syncAllFineTuningJobs() {
  try {
    console.log("Starting scheduled sync of all fine-tuning jobs");

    // Get all jobs that are not completed
    const jobs = await prisma.fineTuningJob.findMany({
      where: {
        status: {
          in: ["pending", "running"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`Found ${jobs.length} active jobs to sync with OpenAI`);

    // Check each job's status
    const updatedJobs = [];
    for (const job of jobs) {
      try {
        // Skip jobs that don't have an OpenAI job ID yet
        if (!job.jobId) {
          console.log(`Job ${job.id} doesn't have an OpenAI job ID yet, skipping`);

          // Check if the job has been pending for too long (more than 10 minutes)
          const jobCreatedAt = new Date(job.createdAt).getTime();
          const currentTime = Date.now();
          const jobAgeInMinutes = (currentTime - jobCreatedAt) / (1000 * 60);

          if (jobAgeInMinutes > 10) {
            console.log(
              `Job ${job.id} has been pending for ${jobAgeInMinutes.toFixed(1)} minutes, marking as failed`
            );

            // Update the job status to failed
            const failedJob = await prisma.fineTuningJob.update({
              where: { id: job.id },
              data: {
                status: "failed",
                completedAt: new Date(),
                resultMetrics: JSON.stringify({
                  error: "Job creation timed out. The job was not created successfully with OpenAI.",
                  timestamp: new Date().toISOString(),
                }),
              },
            });

            updatedJobs.push(failedJob);
          }

          continue;
        }

        console.log(`Syncing job ${job.id} (${job.jobId}) with OpenAI`);

        // Check status with OpenAI
        const { fineTuningJob, openaiJob } = await checkFineTuningStatus(job.id);
        updatedJobs.push(fineTuningJob);

        // If the job succeeded, set it as the active model
        if (
          fineTuningJob.status === "succeeded" &&
          fineTuningJob.fineTunedModel &&
          !job.completedAt // Only update if not already completed
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
        console.error(`Error syncing job ${job.id}:`, error);
      }
    }

    console.log(`Synced ${updatedJobs.length} jobs with OpenAI`);
    return updatedJobs;
  } catch (error) {
    console.error("Error in scheduled sync of fine-tuning jobs:", error);
    throw error;
  }
}

/**
 * Scheduled task to clean up stale fine-tuning jobs
 * This should be called less frequently, perhaps once a day
 */
export async function cleanupStaleFineTuningJobs() {
  try {
    console.log("Starting cleanup of stale fine-tuning jobs");

    // Find jobs that have been pending for more than 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const staleJobs = await prisma.fineTuningJob.findMany({
      where: {
        status: "pending",
        createdAt: {
          lt: oneDayAgo,
        },
        completedAt: null,
      },
    });

    console.log(`Found ${staleJobs.length} stale jobs to clean up`);

    // Mark stale jobs as failed
    for (const job of staleJobs) {
      await prisma.fineTuningJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          completedAt: new Date(),
          resultMetrics: JSON.stringify({
            error: "Job was pending for more than 24 hours and was automatically marked as failed.",
            timestamp: new Date().toISOString(),
          }),
        },
      });
    }

    console.log(`Cleaned up ${staleJobs.length} stale jobs`);
    return staleJobs;
  } catch (error) {
    console.error("Error cleaning up stale fine-tuning jobs:", error);
    throw error;
  }
}
