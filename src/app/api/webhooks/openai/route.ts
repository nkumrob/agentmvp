import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { checkFineTuningStatus } from "@/lib/fine-tuning";

/**
 * OpenAI Webhook endpoint to receive real-time status updates
 * 
 * Configure this webhook in your OpenAI dashboard:
 * https://platform.openai.com/settings/webhooks
 * 
 * Webhook URL: https://your-domain.com/api/webhooks/openai
 * Events to receive: fine-tuning.job.created, fine-tuning.job.succeeded, fine-tuning.job.failed, etc.
 */
export async function POST(req: Request) {
  try {
    // Verify webhook signature if needed
    // const signature = req.headers.get("openai-signature");
    // if (!verifySignature(signature, await req.text())) {
    //   return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    // }

    // Parse the webhook payload
    const payload = await req.json();
    console.log("Received OpenAI webhook:", JSON.stringify(payload, null, 2));

    // Extract event type and data
    const eventType = payload.type;
    const data = payload.data;

    if (!eventType || !data) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }

    // Handle fine-tuning job events
    if (eventType.startsWith("fine-tuning.job.")) {
      await handleFineTuningJobEvent(eventType, data);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing OpenAI webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}

/**
 * Handle fine-tuning job events from OpenAI
 */
async function handleFineTuningJobEvent(eventType: string, data: any) {
  try {
    const openaiJobId = data.id;
    if (!openaiJobId) {
      console.error("No job ID in webhook data");
      return;
    }

    // Find the corresponding job in our database
    const job = await prisma.fineTuningJob.findFirst({
      where: { jobId: openaiJobId },
    });

    if (!job) {
      console.error(`No matching job found for OpenAI job ID: ${openaiJobId}`);
      return;
    }

    console.log(`Processing ${eventType} for job ${job.id} (OpenAI ID: ${openaiJobId})`);

    // Update the job status based on the event type
    switch (eventType) {
      case "fine-tuning.job.created":
        await prisma.fineTuningJob.update({
          where: { id: job.id },
          data: {
            status: "running",
            resultMetrics: JSON.stringify({
              openaiStatus: data.status,
              openaiEvent: eventType,
              timestamp: new Date().toISOString(),
            }),
          },
        });
        break;

      case "fine-tuning.job.succeeded":
        // Get the full job details from OpenAI to get the fine-tuned model ID
        const { fineTuningJob } = await checkFineTuningStatus(job.id);
        
        // Update the model config to use the fine-tuned model
        if (fineTuningJob.fineTunedModel) {
          await prisma.modelConfig.update({
            where: { id: job.modelConfigId },
            data: {
              activeModelId: fineTuningJob.fineTunedModel,
              status: "completed",
            },
          });
        }
        break;

      case "fine-tuning.job.failed":
      case "fine-tuning.job.cancelled":
        await prisma.fineTuningJob.update({
          where: { id: job.id },
          data: {
            status: eventType === "fine-tuning.job.failed" ? "failed" : "cancelled",
            completedAt: new Date(),
            resultMetrics: JSON.stringify({
              openaiStatus: data.status,
              openaiEvent: eventType,
              error: data.error || "Unknown error",
              timestamp: new Date().toISOString(),
            }),
          },
        });
        break;

      default:
        // For other events, just sync the job status
        await checkFineTuningStatus(job.id);
        break;
    }
  } catch (error) {
    console.error(`Error handling fine-tuning job event ${eventType}:`, error);
  }
}
