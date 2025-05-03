"use client";

import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, AlertCircle, Clock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DetailedProgressProps {
  status: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  trainingFile?: string | null;
  validationFile?: string | null;
  resultMetrics?: string | null;
}

export function DetailedProgress({
  status,
  createdAt,
  updatedAt,
  completedAt,
  trainingFile,
  validationFile,
  resultMetrics,
}: DetailedProgressProps) {
  const [progressValue, setProgressValue] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<
    string | null
  >(null);
  const [elapsedTime, setElapsedTime] = useState<string | null>(null);

  // Define the stages of fine-tuning
  const stages = [
    { id: "created", label: "Job Created", complete: true },
    { id: "files_uploaded", label: "Files Uploaded", complete: !!trainingFile },
    { id: "queued", label: "In Queue", complete: status !== "created" },
    {
      id: "running",
      label: "Training",
      complete: ["succeeded", "failed", "cancelled"].includes(status),
    },
    {
      id: "completed",
      label: "Completed",
      complete: ["succeeded", "failed", "cancelled"].includes(status),
    },
  ];

  // Calculate current stage
  const getCurrentStage = () => {
    if (status === "created") return 0;
    if (status === "pending") return 2;
    if (status === "running") return 3;
    if (["succeeded", "failed", "cancelled"].includes(status)) return 4;
    return 0;
  };

  // Parse result metrics to get progress information if available
  const getProgressFromMetrics = () => {
    if (!resultMetrics) return null;

    try {
      const metrics = JSON.parse(resultMetrics);

      // Return the entire metrics object for more comprehensive information
      return metrics;
    } catch (error) {
      console.error("Error parsing result metrics:", error);
      return null;
    }
  };

  // Get OpenAI status from metrics if available
  const getOpenAIStatus = () => {
    const metrics = getProgressFromMetrics();
    return metrics?.openaiStatus || null;
  };

  // Calculate progress percentage based on stages, status, and metrics
  useEffect(() => {
    const currentStage = getCurrentStage();
    const baseProgress = (currentStage / (stages.length - 1)) * 100;

    // Get the full metrics object
    const metrics = getProgressFromMetrics();

    // Get OpenAI status for more accurate information
    const openaiStatus = getOpenAIStatus();

    // For running status, use real progress data if available, otherwise simulate
    if (status === "running") {
      // If we have progress data from the API, use it
      if (metrics) {
        // Check for progress information in different formats
        if (metrics.progress?.percent) {
          // Use the percent directly if available
          setProgressValue(Math.min(60 + metrics.progress.percent * 0.3, 90));

          // Update estimated time based on progress
          if (metrics.progress.percent < 100) {
            const startTime = new Date(createdAt).getTime();
            const now = new Date().getTime();
            const elapsed = now - startTime;
            const estimatedTotalTime =
              (elapsed / metrics.progress.percent) * 100;
            const remainingMs = estimatedTotalTime - elapsed;
            const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));

            setEstimatedTimeRemaining(`~${remainingMinutes} minutes remaining`);
          } else {
            setEstimatedTimeRemaining("Finalizing...");
          }
        } else if (metrics.progress?.epochPercent) {
          // Use epoch progress if available
          setProgressValue(
            Math.min(60 + metrics.progress.epochPercent * 0.3, 90)
          );

          setEstimatedTimeRemaining(
            `Epoch ${metrics.progress.currentEpoch}/${metrics.progress.totalEpochs} (${metrics.progress.epochPercent}%)`
          );
        } else if (metrics.progress?.stepPercent) {
          // Use step progress if available
          setProgressValue(
            Math.min(60 + metrics.progress.stepPercent * 0.3, 90)
          );

          setEstimatedTimeRemaining(
            `Step ${metrics.progress.currentStep}/${metrics.progress.totalSteps} (${metrics.progress.stepPercent}%)`
          );
        } else if (metrics.currentEpoch) {
          // Direct epoch information
          const epochPercent = Math.round(
            (metrics.currentEpoch / metrics.totalEpochs) * 100
          );
          setProgressValue(Math.min(60 + epochPercent * 0.3, 90));
          setEstimatedTimeRemaining(
            `Epoch ${metrics.currentEpoch}/${metrics.totalEpochs} (${epochPercent}%)`
          );
        } else if (metrics.latestEvents && metrics.latestEvents.length > 0) {
          // Try to extract progress from latest events
          const latestEvent = metrics.latestEvents[0];
          if (latestEvent.message) {
            // Show the latest event message as status
            setEstimatedTimeRemaining(latestEvent.message);

            // Try to extract percentage from message
            const percentMatch = latestEvent.message.match(/(\d+)%/);
            if (percentMatch) {
              const percent = parseInt(percentMatch[1]);
              setProgressValue(Math.min(60 + percent * 0.3, 90));
            } else {
              simulateProgress();
            }
          } else {
            simulateProgress();
          }
        } else {
          // Fall back to simulated progress
          simulateProgress();
        }
      } else {
        // No progress data, simulate progress
        simulateProgress();
      }

      // Format elapsed time
      const startTime = new Date(createdAt).getTime();
      const now = new Date().getTime();
      const elapsed = now - startTime;
      const elapsedMinutes = Math.floor(elapsed / (60 * 1000));
      const elapsedHours = Math.floor(elapsedMinutes / 60);

      if (elapsedHours > 0) {
        setElapsedTime(`${elapsedHours}h ${elapsedMinutes % 60}m`);
      } else {
        setElapsedTime(`${elapsedMinutes}m`);
      }
    } else if (status === "succeeded") {
      setProgressValue(100);

      // Show metrics summary if available
      if (metrics?.metrics) {
        const summary = [];
        if (metrics.metrics.train_loss) {
          summary.push(`Loss: ${metrics.metrics.train_loss.toFixed(4)}`);
        }
        if (metrics.metrics.train_mean_token_accuracy) {
          summary.push(
            `Accuracy: ${(
              metrics.metrics.train_mean_token_accuracy * 100
            ).toFixed(2)}%`
          );
        }

        if (summary.length > 0) {
          setEstimatedTimeRemaining(`Training metrics: ${summary.join(", ")}`);
        } else {
          setEstimatedTimeRemaining(null);
        }
      } else {
        setEstimatedTimeRemaining(null);
      }

      // Calculate total time taken
      if (completedAt) {
        const startTime = new Date(createdAt).getTime();
        const endTime = new Date(completedAt).getTime();
        const totalMinutes = Math.floor((endTime - startTime) / (60 * 1000));
        const hours = Math.floor(totalMinutes / 60);

        if (hours > 0) {
          setElapsedTime(`${hours}h ${totalMinutes % 60}m`);
        } else {
          setElapsedTime(`${totalMinutes}m`);
        }
      }
    } else if (status === "failed") {
      setProgressValue(baseProgress);

      // Show error message if available
      if (metrics?.error) {
        setEstimatedTimeRemaining(`Error: ${metrics.error}`);
      } else {
        setEstimatedTimeRemaining("Failed");
      }

      // Calculate time until failure
      if (completedAt) {
        const startTime = new Date(createdAt).getTime();
        const endTime = new Date(completedAt).getTime();
        const totalMinutes = Math.floor((endTime - startTime) / (60 * 1000));
        const hours = Math.floor(totalMinutes / 60);

        if (hours > 0) {
          setElapsedTime(`${hours}h ${totalMinutes % 60}m`);
        } else {
          setElapsedTime(`${totalMinutes}m`);
        }
      }
    } else if (status === "cancelled") {
      setProgressValue(baseProgress);
      setEstimatedTimeRemaining("Cancelled");

      // Calculate time until cancellation
      if (completedAt) {
        const startTime = new Date(createdAt).getTime();
        const endTime = new Date(completedAt).getTime();
        const totalMinutes = Math.floor((endTime - startTime) / (60 * 1000));
        const hours = Math.floor(totalMinutes / 60);

        if (hours > 0) {
          setElapsedTime(`${hours}h ${totalMinutes % 60}m`);
        } else {
          setElapsedTime(`${totalMinutes}m`);
        }
      }
    } else {
      setProgressValue(baseProgress);

      // For pending status, show more detailed information
      if (status === "pending") {
        if (openaiStatus) {
          // Show the actual OpenAI status
          switch (openaiStatus) {
            case "validating_files":
              setEstimatedTimeRemaining("Validating files...");
              break;
            case "queued":
              setEstimatedTimeRemaining("Waiting in queue...");
              break;
            case "preparing":
              setEstimatedTimeRemaining("Preparing training job...");
              break;
            default:
              setEstimatedTimeRemaining(`Status: ${openaiStatus}`);
          }
        } else {
          setEstimatedTimeRemaining("Waiting in queue...");
        }
      } else {
        setEstimatedTimeRemaining(null);
      }
    }
  }, [status, createdAt, updatedAt, completedAt, resultMetrics]);

  // Helper function to simulate progress
  const simulateProgress = () => {
    const startTime = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const elapsed = now - startTime;

    // Estimate total time (typical fine-tuning takes ~30-60 minutes)
    const estimatedTotalTime = 45 * 60 * 1000; // 45 minutes in milliseconds

    // Calculate progress within the "running" stage (between 60% and 90%)
    const runningProgress =
      Math.min(elapsed / estimatedTotalTime, 0.9) * 30 + 60;

    setProgressValue(Math.min(runningProgress, 90));

    // Calculate estimated time remaining
    if (elapsed < estimatedTotalTime) {
      const remainingMs = estimatedTotalTime - elapsed;
      const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
      setEstimatedTimeRemaining(`~${remainingMinutes} minutes`);
    } else {
      setEstimatedTimeRemaining("Finalizing...");
    }
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "succeeded":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "cancelled":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300";
      case "running":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "pending":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      default:
        return "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300";
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "succeeded":
        return <Check className="h-4 w-4" />;
      case "failed":
        return <X className="h-4 w-4" />;
      case "cancelled":
        return <AlertCircle className="h-4 w-4" />;
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      default:
        return null;
    }
  };

  // Get OpenAI status for display
  const openaiStatus = getOpenAIStatus();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(status)}>
            <span className="flex items-center">
              {getStatusIcon(status)}
              <span className="ml-1 capitalize">{status}</span>
            </span>
          </Badge>

          {/* Show OpenAI status if available and different from app status */}
          {openaiStatus && openaiStatus !== status && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs">
                    <span className="flex items-center">
                      <span className="capitalize">{openaiStatus}</span>
                    </span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>OpenAI API Status</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {elapsedTime && (
            <span className="text-sm text-neutral-500">
              {status === "succeeded" ? "Completed in: " : "Time elapsed: "}
              {elapsedTime}
            </span>
          )}
        </div>

        {estimatedTimeRemaining && (
          <span className="text-sm text-neutral-500 max-w-[50%] truncate">
            {estimatedTimeRemaining}
          </span>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span>{Math.round(progressValue)}%</span>
        </div>
        <Progress value={progressValue} className="h-2" />
      </div>

      {/* Show error details for failed jobs */}
      {status === "failed" && resultMetrics && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
          {(() => {
            try {
              const metrics = JSON.parse(resultMetrics);
              return metrics.error ? (
                <p>Error: {metrics.error}</p>
              ) : (
                <p>The job failed. Check the OpenAI dashboard for details.</p>
              );
            } catch (e) {
              return (
                <p>The job failed. Check the OpenAI dashboard for details.</p>
              );
            }
          })()}
        </div>
      )}

      {/* Show training metrics for succeeded jobs */}
      {status === "succeeded" && resultMetrics && (
        <div className="text-sm text-green-600 bg-green-50 dark:bg-green-900/20 p-2 rounded">
          {(() => {
            try {
              const metrics = JSON.parse(resultMetrics);
              if (metrics.metrics) {
                const items = [];
                if (metrics.metrics.train_loss) {
                  items.push(`Loss: ${metrics.metrics.train_loss.toFixed(4)}`);
                }
                if (metrics.metrics.train_mean_token_accuracy) {
                  items.push(
                    `Accuracy: ${(
                      metrics.metrics.train_mean_token_accuracy * 100
                    ).toFixed(2)}%`
                  );
                }
                return items.length > 0 ? (
                  <p>Training metrics: {items.join(", ")}</p>
                ) : (
                  <p>Training completed successfully.</p>
                );
              }
              return <p>Training completed successfully.</p>;
            } catch (e) {
              return <p>Training completed successfully.</p>;
            }
          })()}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <TooltipProvider>
          {stages.map((stage, index) => (
            <Tooltip key={stage.id}>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      getCurrentStage() >= index
                        ? stage.complete
                          ? "bg-green-500"
                          : "bg-blue-500"
                        : "bg-neutral-200 dark:bg-neutral-700"
                    }`}
                  >
                    {stage.complete && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div
                    className="h-0.5 w-16 bg-neutral-200 dark:bg-neutral-700 mt-2 hidden sm:block"
                    style={{
                      display: index === stages.length - 1 ? "none" : "",
                    }}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{stage.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>
    </div>
  );
}
