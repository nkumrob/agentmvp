"use client";

import { useState, useEffect } from "react";
import { JobList } from "./job-list";
import { Loader2 } from "lucide-react";

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

interface RealTimeJobListProps {
  initialJobs: FineTuningJob[];
  modelConfigId: string;
  agentId: string;
}

export function RealTimeJobList({
  initialJobs,
  modelConfigId,
  agentId,
}: RealTimeJobListProps) {
  const [jobs, setJobs] = useState<FineTuningJob[]>(initialJobs);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [pollingInterval, setPollingInterval] = useState<number | null>(null);
  const [pollingFrequency, setPollingFrequency] = useState<number>(30000); // 30 seconds default

  // Function to fetch all jobs
  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/fine-tuning?modelConfigId=${modelConfigId}`
      );
      if (response.ok) {
        const data = await response.json();
        // Make sure data.jobs exists before using it
        if (data && Array.isArray(data.jobs)) {
          setJobs(data.jobs);
          setLastRefreshed(new Date());

          // Adjust polling frequency based on job statuses
          updatePollingFrequency(data.jobs);
        } else {
          console.error("Invalid response format: jobs array not found", data);
          // Use current jobs for polling frequency
          updatePollingFrequency(jobs);
        }
      } else {
        console.error("Failed to fetch jobs");
        // Use current jobs for polling frequency
        updatePollingFrequency(jobs);
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
      // Use current jobs for polling frequency
      updatePollingFrequency(jobs);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to sync a single job
  const syncJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/fine-tuning/sync?jobId=${jobId}`);
      if (response.ok) {
        const data = await response.json();

        // Update the job in the local state
        setJobs((prevJobs) =>
          prevJobs.map((job) => (job.id === jobId ? data.job : job))
        );

        setLastRefreshed(new Date());
        return data.job;
      } else {
        console.error("Failed to sync job");
        return null;
      }
    } catch (error) {
      console.error("Error syncing job:", error);
      return null;
    }
  };

  // Function to update polling frequency based on job statuses
  const updatePollingFrequency = (currentJobs: FineTuningJob[] | undefined) => {
    // If currentJobs is undefined or empty, use default polling frequency
    if (!currentJobs || currentJobs.length === 0) {
      setPollingFrequency(30000); // Default to 30 seconds
      return;
    }

    if (currentJobs.some((job) => job.status === "running")) {
      setPollingFrequency(10000); // 10 seconds for running jobs
    } else if (currentJobs.some((job) => job.status === "pending")) {
      setPollingFrequency(30000); // 30 seconds for pending jobs
    } else {
      setPollingFrequency(60000); // 1 minute for completed jobs
    }
  };

  // Initial fetch when component mounts
  useEffect(() => {
    // Fetch jobs on mount
    fetchJobs().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set up polling
  useEffect(() => {
    // Initial update of polling frequency
    updatePollingFrequency(jobs);

    // Set up polling interval
    const interval = window.setInterval(async () => {
      // Make sure jobs is defined and not empty
      if (!jobs || jobs.length === 0) {
        // If no jobs, do a full refresh
        fetchJobs().catch(console.error);
        return;
      }

      // Get jobs that are in progress
      const jobsInProgress = jobs.filter(
        (job) => job.status === "pending" || job.status === "running"
      );

      if (jobsInProgress.length > 0) {
        // Sync each job in progress individually for more real-time updates
        for (const job of jobsInProgress) {
          await syncJob(job.id);
        }
      } else {
        // If no jobs are in progress, do a full refresh less frequently
        fetchJobs().catch(console.error);
      }
    }, pollingFrequency);

    setPollingInterval(interval);

    // Clean up on unmount
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollingFrequency]); // Only depend on pollingFrequency to avoid infinite loops

  // Handle deleting a job
  const handleDeleteJob = async (id: string) => {
    try {
      const response = await fetch(`/api/fine-tuning?jobId=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchJobs();
      } else {
        console.error("Failed to delete job");
      }
    } catch (error) {
      console.error("Error deleting job:", error);
    }
  };

  // Handle setting the active model
  const handleSetActiveModel = async (
    modelConfigId: string,
    fineTunedModelId: string
  ) => {
    try {
      const response = await fetch("/api/fine-tuning/active-model", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          modelConfigId,
          fineTunedModelId,
        }),
      });

      if (response.ok) {
        await fetchJobs();
      } else {
        console.error("Failed to set active model");
      }
    } catch (error) {
      console.error("Error setting active model:", error);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          {pollingInterval && (
            <div className="text-xs text-neutral-500 flex items-center">
              <span className="relative mr-2">
                <span className="absolute top-0 left-0 w-2 h-2 bg-green-500 rounded-full animate-ping opacity-75"></span>
                <span className="relative w-2 h-2 bg-green-500 rounded-full inline-block"></span>
              </span>
              Auto-refreshing every {pollingFrequency / 1000}s • Last updated{" "}
              {lastRefreshed.toLocaleTimeString()}
            </div>
          )}
        </div>
        {isLoading && (
          <div className="text-xs text-neutral-500 flex items-center">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Refreshing...
          </div>
        )}
      </div>

      <JobList
        jobs={jobs}
        onDelete={handleDeleteJob}
        onSetActive={handleSetActiveModel}
        activeModelId={
          jobs.find((job) => job.modelConfig.id === modelConfigId)
            ?.fineTunedModel || null
        }
        onRefresh={fetchJobs}
        onRefreshJob={syncJob}
      />
    </div>
  );
}
