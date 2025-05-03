"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { CHARACTER_THRESHOLDS } from "@/lib/character-count";
import { InfoIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CharacterCountProgressProps {
  currentCount: number;
  maxThreshold?: number;
  className?: string;
  showLabels?: boolean;
  showTooltips?: boolean;
}

export function CharacterCountProgress({
  currentCount,
  maxThreshold = CHARACTER_THRESHOLDS.MAX_RECOMMENDED,
  className,
  showLabels = true,
  showTooltips = true,
}: CharacterCountProgressProps) {
  // If there are no knowledge sources, set currentCount to 0
  const actualCount = currentCount || 0;

  // Calculate progress percentage
  const progressPercentage = Math.min(100, (actualCount / maxThreshold) * 100);

  // Calculate threshold percentages
  const basicRagPercentage =
    (CHARACTER_THRESHOLDS.BASIC_RAG / maxThreshold) * 100;
  const reliableRagPercentage =
    (CHARACTER_THRESHOLDS.RELIABLE_RAG / maxThreshold) * 100;
  const fineTuningPercentage =
    (CHARACTER_THRESHOLDS.FINE_TUNING / maxThreshold) * 100;

  // Determine progress color based on thresholds
  let progressColor = "bg-blue-500";
  if (actualCount >= CHARACTER_THRESHOLDS.FINE_TUNING) {
    progressColor = "bg-green-500";
  } else if (actualCount >= CHARACTER_THRESHOLDS.RELIABLE_RAG) {
    progressColor = "bg-yellow-500";
  } else if (actualCount >= CHARACTER_THRESHOLDS.BASIC_RAG) {
    progressColor = "bg-orange-500";
  } else {
    progressColor = "bg-red-500";
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between text-sm">
        <span>
          Characters: {actualCount.toLocaleString()}/
          {maxThreshold.toLocaleString()}
        </span>
        {showTooltips && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <InfoIcon className="h-4 w-4 text-neutral-500" />
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-2 p-2 max-w-xs">
                  <p className="text-xs">Character count thresholds:</p>
                  <ul className="text-xs space-y-1">
                    <li>
                      <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                      &lt; {CHARACTER_THRESHOLDS.BASIC_RAG.toLocaleString()}:
                      Insufficient for RAG
                    </li>
                    <li>
                      <span className="inline-block w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
                      {CHARACTER_THRESHOLDS.BASIC_RAG.toLocaleString()}: Basic
                      RAG
                    </li>
                    <li>
                      <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                      {CHARACTER_THRESHOLDS.RELIABLE_RAG.toLocaleString()}:
                      Reliable RAG
                    </li>
                    <li>
                      <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                      {CHARACTER_THRESHOLDS.FINE_TUNING.toLocaleString()}:
                      Sufficient for fine-tuning
                    </li>
                  </ul>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="relative">
        {/* Progress bar with improved visual clarity */}
        <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${progressColor}`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Threshold markers with labels */}
        <div className="relative h-3">
          <div
            className="absolute top-0 w-0.5 h-3 bg-orange-500"
            style={{ left: `${basicRagPercentage}%` }}
          />

          <div
            className="absolute top-0 w-0.5 h-3 bg-yellow-500"
            style={{ left: `${reliableRagPercentage}%` }}
          />

          <div
            className="absolute top-0 w-0.5 h-3 bg-green-500"
            style={{ left: `${fineTuningPercentage}%` }}
          />
        </div>
      </div>

      {showLabels && (
        <div className="flex justify-between text-xs text-neutral-500 mt-4">
          <div className="flex flex-col items-center">
            <span>0</span>
            <span className="text-[10px]">Start</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-orange-500">
              {CHARACTER_THRESHOLDS.BASIC_RAG.toLocaleString()}
            </span>
            <span className="text-[10px] text-orange-500">Basic</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-yellow-500">
              {CHARACTER_THRESHOLDS.RELIABLE_RAG.toLocaleString()}
            </span>
            <span className="text-[10px] text-yellow-500">Reliable</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-green-500">
              {CHARACTER_THRESHOLDS.FINE_TUNING.toLocaleString()}
            </span>
            <span className="text-[10px] text-green-500">Fine-tuning</span>
          </div>
          <div className="flex flex-col items-center">
            <span>{maxThreshold.toLocaleString()}</span>
            <span className="text-[10px]">Max</span>
          </div>
        </div>
      )}
    </div>
  );
}
