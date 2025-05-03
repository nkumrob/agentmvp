"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Check,
  X,
  Play,
  Pause,
  Eye,
  Trash,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { DetailedProgress } from "./detailed-progress";

interface FineTuningJob {
  id: string;
  jobId: string;
  status: string;
  model: string;
  fineTunedModel: string | null;
  trainingFile: string | null;
  validationFile: string | null;
  hyperparameters: string | null;
  resultMetrics: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  modelConfig: {
    id: string;
    baseModel: string;
    agent: {
      id: string;
      name: string;
    };
  };
}

interface JobListProps {
  jobs: FineTuningJob[];
  onDelete: (id: string) => Promise<void>;
  onSetActive: (jobId: string, modelId: string) => Promise<void>;
  activeModelId?: string | null;
  onRefresh?: () => Promise<void>;
}

export function JobList({
  jobs,
  onDelete,
  onSetActive,
  activeModelId,
  onRefresh,
}: JobListProps) {
  const [viewJob, setViewJob] = useState<FineTuningJob | null>(null);
  const [deleteJob, setDeleteJob] = useState<FineTuningJob | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isSettingActive, setIsSettingActive] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const handleDelete = async () => {
    if (!deleteJob) return;

    setIsDeleting(true);

    try {
      await onDelete(deleteJob.id);
    } catch (error) {
      console.error("Error deleting job:", error);
    } finally {
      setIsDeleting(false);
      setDeleteJob(null);
    }
  };

  const handleSetActive = async (job: FineTuningJob) => {
    if (!job.fineTunedModel || job.status !== "succeeded") return;

    setIsSettingActive(true);

    try {
      await onSetActive(job.modelConfig.id, job.fineTunedModel);
    } catch (error) {
      console.error("Error setting active model:", error);
    } finally {
      setIsSettingActive(false);
    }
  };

  const handleRefresh = async () => {
    if (!onRefresh) return;

    setIsRefreshing(true);

    try {
      await onRefresh();
    } catch (error) {
      console.error("Error refreshing jobs:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "succeeded":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "cancelled":
        return "bg-neutral-100 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-300";
      case "running":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      default:
        return "bg-neutral-100 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "succeeded":
        return <Check className="h-4 w-4" />;
      case "failed":
        return <X className="h-4 w-4" />;
      case "cancelled":
        return <Pause className="h-4 w-4" />;
      case "running":
        return <Play className="h-4 w-4" />;
      case "pending":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      default:
        return null;
    }
  };

  // Progress is now handled by the DetailedProgress component

  if (jobs.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500">
        <p>No fine-tuning jobs found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {onRefresh && (
        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              "Refresh Jobs"
            )}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {jobs.map((job) => (
          <Card key={job.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base">
                    {job.modelConfig?.agent?.name || "Unknown Agent"} -{" "}
                    {job.model}
                  </CardTitle>
                  <CardDescription>
                    Created{" "}
                    {formatDistanceToNow(new Date(job.createdAt), {
                      addSuffix: true,
                    })}
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(job.status)}>
                  <span className="flex items-center">
                    {getStatusIcon(job.status)}
                    <span className="ml-1">{job.status}</span>
                  </span>
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="space-y-3">
                <DetailedProgress
                  status={job.status}
                  createdAt={job.createdAt}
                  updatedAt={job.updatedAt}
                  completedAt={job.completedAt}
                  trainingFile={job.trainingFile}
                  validationFile={job.validationFile}
                  resultMetrics={job.resultMetrics}
                />

                {job.fineTunedModel && (
                  <div className="text-sm">
                    <span className="font-medium">Fine-tuned Model:</span>{" "}
                    <code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
                      {job.fineTunedModel}
                    </code>
                    {job.fineTunedModel === activeModelId && (
                      <Badge className="ml-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                        Active
                      </Badge>
                    )}
                  </div>
                )}

                {job.hyperparameters && (
                  <div className="text-sm">
                    <span className="font-medium">Hyperparameters:</span>{" "}
                    {Object.entries(JSON.parse(job.hyperparameters)).map(
                      ([key, value]) => (
                        <Badge key={key} variant="outline" className="mr-1">
                          {key}: {value}
                        </Badge>
                      )
                    )}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <div className="flex space-x-2 ml-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewJob(job)}
                >
                  <Eye className="h-4 w-4 mr-1" /> Details
                </Button>

                {job.status === "succeeded" && job.fineTunedModel && (
                  <Button
                    variant={
                      job.fineTunedModel === activeModelId
                        ? "outline"
                        : "default"
                    }
                    size="sm"
                    onClick={() => handleSetActive(job)}
                    disabled={
                      isSettingActive || job.fineTunedModel === activeModelId
                    }
                  >
                    {isSettingActive ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-1" />
                    )}
                    {job.fineTunedModel === activeModelId
                      ? "Active"
                      : "Set Active"}
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteJob(job)}
                >
                  <Trash className="h-4 w-4 mr-1" /> Delete
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* View Job Dialog */}
      <Dialog
        open={!!viewJob}
        onOpenChange={(open) => !open && setViewJob(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Fine-tuning Job Details</DialogTitle>
            <DialogDescription>
              Created{" "}
              {viewJob &&
                formatDistanceToNow(new Date(viewJob.createdAt), {
                  addSuffix: true,
                })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 mb-4">
                <h4 className="text-sm font-medium mb-2">Progress</h4>
                {viewJob && (
                  <DetailedProgress
                    status={viewJob.status}
                    createdAt={viewJob.createdAt}
                    updatedAt={viewJob.updatedAt}
                    completedAt={viewJob.completedAt}
                    trainingFile={viewJob.trainingFile}
                    validationFile={viewJob.validationFile}
                    resultMetrics={viewJob.resultMetrics}
                  />
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium mb-1">Base Model</h4>
                <p>{viewJob?.model}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-1">Agent</h4>
                <p>{viewJob?.modelConfig?.agent?.name || "Unknown Agent"}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-1">Job ID</h4>
                <p className="text-xs font-mono">{viewJob?.jobId}</p>
              </div>

              {viewJob?.fineTunedModel && (
                <div className="col-span-2">
                  <h4 className="text-sm font-medium mb-1">Fine-tuned Model</h4>
                  <code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded block">
                    {viewJob.fineTunedModel}
                  </code>
                </div>
              )}

              {viewJob?.hyperparameters && (
                <div className="col-span-2">
                  <h4 className="text-sm font-medium mb-1">Hyperparameters</h4>
                  <div className="bg-neutral-50 dark:bg-neutral-900 p-3 rounded-md">
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(
                        JSON.parse(viewJob.hyperparameters),
                        null,
                        2
                      )}
                    </pre>
                  </div>
                </div>
              )}

              {viewJob?.resultMetrics && (
                <div className="col-span-2">
                  <h4 className="text-sm font-medium mb-1">Training Metrics</h4>
                  <div className="bg-neutral-50 dark:bg-neutral-900 p-3 rounded-md">
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(
                        JSON.parse(viewJob.resultMetrics),
                        null,
                        2
                      )}
                    </pre>
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium mb-1">Created</h4>
                <p>{viewJob && new Date(viewJob.createdAt).toLocaleString()}</p>
              </div>

              {viewJob?.completedAt && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Completed</h4>
                  <p>{new Date(viewJob.completedAt).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewJob(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteJob}
        onOpenChange={(open) => !open && setDeleteJob(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Fine-tuning Job</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this fine-tuning job? This action
              cannot be undone.
              {deleteJob?.status === "succeeded" &&
                deleteJob?.fineTunedModel && (
                  <p className="mt-2 text-red-600">
                    Note: This will not delete the fine-tuned model from OpenAI.
                  </p>
                )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteJob(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
