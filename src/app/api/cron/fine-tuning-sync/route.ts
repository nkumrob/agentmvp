import { NextResponse } from "next/server";
import { syncAllFineTuningJobs, cleanupStaleFineTuningJobs } from "@/lib/scheduled-tasks";

/**
 * Endpoint to trigger fine-tuning job synchronization
 * This can be called by an external cron service like Vercel Cron Jobs
 * 
 * Example cron schedule:
 * - Sync jobs: Every 5 minutes
 * - Cleanup stale jobs: Once a day at midnight
 */
export async function GET(req: Request) {
  try {
    // Verify the request is authorized
    const apiKey = req.headers.get("x-api-key");
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const url = new URL(req.url);
    const task = url.searchParams.get("task") || "sync";

    // Execute the requested task
    if (task === "sync") {
      const updatedJobs = await syncAllFineTuningJobs();
      return NextResponse.json({
        success: true,
        message: `Synced ${updatedJobs.length} fine-tuning jobs with OpenAI`,
      });
    } else if (task === "cleanup") {
      const staleJobs = await cleanupStaleFineTuningJobs();
      return NextResponse.json({
        success: true,
        message: `Cleaned up ${staleJobs.length} stale fine-tuning jobs`,
      });
    } else {
      return NextResponse.json(
        { error: "Invalid task. Use 'sync' or 'cleanup'." },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error executing cron task:", error);
    return NextResponse.json(
      { error: "Failed to execute cron task" },
      { status: 500 }
    );
  }
}
