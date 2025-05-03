"use client";

import { useState } from "react";
import { CustomProgress } from "@/components/ui/custom-progress";
import { WORD_THRESHOLDS } from "@/lib/character-count";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WordCountProgressProps {
  currentCount: number;
  showLabels?: boolean;
  showTooltips?: boolean;
  showStrength?: boolean;
  className?: string;
}

export function WordCountProgressSimplified({
  currentCount,
  showLabels = true,
  showTooltips = true,
  showStrength = true,
  className = "",
}: WordCountProgressProps) {
  // Define thresholds
  const basicRagThreshold = WORD_THRESHOLDS.BASIC_RAG;
  const reliableRagThreshold = WORD_THRESHOLDS.RELIABLE_RAG;
  const fineTuningThreshold = WORD_THRESHOLDS.FINE_TUNING;
  const excellentFineTuningThreshold = WORD_THRESHOLDS.EXCELLENT_FINE_TUNING;
  const maxThreshold = WORD_THRESHOLDS.EXCELLENT_FINE_TUNING * 2;

  // Calculate progress percentage using a simpler, more direct approach
  // This ensures the progress bar accurately reflects the current count
  // relative to the fine-tuning threshold

  // Calculate progress as a percentage of the fine-tuning threshold
  // with a cap at 100%
  let progressPercentage = 0;

  if (currentCount >= excellentFineTuningThreshold) {
    // If we've reached excellent fine-tuning, show 80-100%
    const excessPercentage = Math.min(
      20,
      ((currentCount - excellentFineTuningThreshold) /
        (maxThreshold - excellentFineTuningThreshold)) *
        20
    );
    progressPercentage = 80 + excessPercentage;
  } else if (currentCount >= fineTuningThreshold) {
    // If we've reached fine-tuning threshold, show 60-80%
    progressPercentage =
      60 +
      ((currentCount - fineTuningThreshold) /
        (excellentFineTuningThreshold - fineTuningThreshold)) *
        20;
  } else if (currentCount >= reliableRagThreshold) {
    // If we've reached reliable RAG threshold, show 40-60%
    progressPercentage =
      40 +
      ((currentCount - reliableRagThreshold) /
        (fineTuningThreshold - reliableRagThreshold)) *
        20;
  } else if (currentCount >= basicRagThreshold) {
    // If we've reached basic RAG threshold, show 20-40%
    progressPercentage =
      20 +
      ((currentCount - basicRagThreshold) /
        (reliableRagThreshold - basicRagThreshold)) *
        20;
  } else {
    // Below basic threshold, show 0-20%
    progressPercentage = (currentCount / basicRagThreshold) * 20;
  }

  // Ensure the percentage is between 0 and 100
  const clampedProgressPercentage = Math.max(
    0,
    Math.min(100, progressPercentage)
  );

  // Determine progress color and strength label based on thresholds
  let progressColor = "bg-red-500";
  let strengthLabel = "Insufficient";
  let strengthTextColor = "text-red-500";

  if (currentCount >= excellentFineTuningThreshold) {
    progressColor = "bg-indigo-500";
    strengthLabel = "Excellent";
    strengthTextColor = "text-indigo-500";
  } else if (currentCount >= fineTuningThreshold) {
    progressColor = "bg-green-500";
    strengthLabel = "Good";
    strengthTextColor = "text-green-500";
  } else if (currentCount >= reliableRagThreshold) {
    progressColor = "bg-yellow-500";
    strengthLabel = "Moderate";
    strengthTextColor = "text-yellow-500";
  } else if (currentCount >= basicRagThreshold) {
    progressColor = "bg-orange-500";
    strengthLabel = "Basic";
    strengthTextColor = "text-orange-500";
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Word count and strength indicator */}
      <div className="flex justify-between items-center">
        <div className="text-sm font-medium">
          {currentCount.toLocaleString()} words
        </div>
        {showStrength && (
          <div className="flex items-center">
            <div className={`text-sm font-medium ${strengthTextColor}`}>
              {strengthLabel}
            </div>
            {showTooltips && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="ml-1">
                      <Info className="h-4 w-4 text-neutral-400" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-2 text-sm">
                      <p>
                        <strong>Word count thresholds:</strong>
                      </p>
                      <ul className="space-y-1">
                        <li>
                          <span className="text-orange-500 font-medium">
                            Basic ({basicRagThreshold.toLocaleString()} words):
                          </span>{" "}
                          Minimal knowledge for basic responses
                        </li>
                        <li>
                          <span className="text-yellow-500 font-medium">
                            Moderate ({reliableRagThreshold.toLocaleString()}{" "}
                            words):
                          </span>{" "}
                          Sufficient for reliable responses
                        </li>
                        <li>
                          <span className="text-green-500 font-medium">
                            Good ({fineTuningThreshold.toLocaleString()} words):
                          </span>{" "}
                          Minimum threshold for fine-tuning
                        </li>
                        <li>
                          <span className="text-indigo-500 font-medium">
                            Excellent (
                            {excellentFineTuningThreshold.toLocaleString()}{" "}
                            words):
                          </span>{" "}
                          Ideal for high-quality fine-tuning
                        </li>
                      </ul>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}
      </div>

      {/* Simple progress bar */}
      <CustomProgress
        value={clampedProgressPercentage}
        className="h-2"
        indicatorClassName={progressColor}
      />

      {/* Optional labels */}
      {showLabels && (
        <div className="flex justify-between items-center text-xs text-neutral-500 mt-1">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-orange-500 mr-1"></div>
            <span>{WORD_THRESHOLDS.BASIC_RAG.toLocaleString()}</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-yellow-500 mr-1"></div>
            <span>{WORD_THRESHOLDS.RELIABLE_RAG.toLocaleString()}</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
            <span>{WORD_THRESHOLDS.FINE_TUNING.toLocaleString()}</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-indigo-500 mr-1"></div>
            <span>
              {WORD_THRESHOLDS.EXCELLENT_FINE_TUNING.toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
