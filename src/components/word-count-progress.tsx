"use client";

import { Progress } from "@/components/ui/progress";
import { InfoIcon, Zap } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { WORD_THRESHOLDS } from "@/lib/character-count";

interface WordCountProgressProps {
  currentCount: number;
  maxThreshold?: number;
  className?: string;
  showLabels?: boolean;
  showTooltips?: boolean;
  showStrength?: boolean;
}

export function WordCountProgress({
  currentCount,
  maxThreshold = WORD_THRESHOLDS.MAX_RECOMMENDED,
  className,
  showLabels = true,
  showTooltips = true,
  showStrength = true,
}: WordCountProgressProps) {
  // If there are no knowledge sources, set currentCount to 0
  const actualCount = currentCount || 0;

  // Calculate progress percentage
  const progressPercentage = Math.min(100, (actualCount / maxThreshold) * 100);

  // Calculate threshold percentages
  const basicRagPercentage = (WORD_THRESHOLDS.BASIC_RAG / maxThreshold) * 100;
  const reliableRagPercentage =
    (WORD_THRESHOLDS.RELIABLE_RAG / maxThreshold) * 100;
  const fineTuningPercentage =
    (WORD_THRESHOLDS.FINE_TUNING / maxThreshold) * 100;
  const excellentFineTuningPercentage =
    (WORD_THRESHOLDS.EXCELLENT_FINE_TUNING / maxThreshold) * 100;

  // Determine progress color based on thresholds
  let progressColor = "bg-blue-500";
  if (actualCount >= WORD_THRESHOLDS.EXCELLENT_FINE_TUNING) {
    progressColor = "bg-indigo-500";
  } else if (actualCount >= WORD_THRESHOLDS.FINE_TUNING) {
    progressColor = "bg-green-500";
  } else if (actualCount >= WORD_THRESHOLDS.RELIABLE_RAG) {
    progressColor = "bg-yellow-500";
  } else if (actualCount >= WORD_THRESHOLDS.BASIC_RAG) {
    progressColor = "bg-orange-500";
  } else {
    progressColor = "bg-red-500";
  }

  // Determine fine-tuning strength
  let strengthVariant = "weak";
  let strengthLabel = "Weak";

  if (actualCount >= WORD_THRESHOLDS.EXCELLENT_FINE_TUNING) {
    strengthVariant = "excellent";
    strengthLabel = "Excellent";
  } else if (actualCount >= WORD_THRESHOLDS.FINE_TUNING * 1.2) {
    strengthVariant = "strong";
    strengthLabel = "Strong";
  } else if (actualCount >= WORD_THRESHOLDS.FINE_TUNING) {
    strengthVariant = "moderate";
    strengthLabel = "Moderate";
  } else if (actualCount >= WORD_THRESHOLDS.RELIABLE_RAG) {
    strengthVariant = "weak";
    strengthLabel = "Weak";
  } else {
    strengthVariant = "weak";
    strengthLabel = "Insufficient";
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center text-sm">
        <div className="flex items-center gap-2">
          <span>
            Words: {actualCount.toLocaleString()}/
            {maxThreshold.toLocaleString()}
          </span>
          {showStrength && actualCount >= WORD_THRESHOLDS.RELIABLE_RAG && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-neutral-500">
                Fine-tuning strength:
              </span>
              <Badge
                variant={strengthVariant}
                className="flex items-center gap-1"
              >
                <span>{strengthLabel}</span>
                {strengthVariant === "excellent" && <Zap className="h-3 w-3" />}
              </Badge>
            </div>
          )}
        </div>
        {showTooltips && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <InfoIcon className="h-4 w-4 text-neutral-500" />
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-2 p-2 max-w-xs">
                  <p className="text-xs">Word count thresholds:</p>
                  <ul className="text-xs space-y-1">
                    <li>
                      <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                      &lt; {WORD_THRESHOLDS.BASIC_RAG.toLocaleString()}:
                      Insufficient for RAG
                    </li>
                    <li>
                      <span className="inline-block w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
                      {WORD_THRESHOLDS.BASIC_RAG.toLocaleString()}: Basic RAG
                    </li>
                    <li>
                      <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                      {WORD_THRESHOLDS.RELIABLE_RAG.toLocaleString()}: Reliable
                      RAG
                    </li>
                    <li>
                      <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                      {WORD_THRESHOLDS.FINE_TUNING.toLocaleString()}: Minimum
                      for fine-tuning
                    </li>
                    <li>
                      <span className="inline-block w-3 h-3 bg-indigo-500 rounded-full mr-2"></span>
                      {WORD_THRESHOLDS.EXCELLENT_FINE_TUNING.toLocaleString()}:
                      Excellent fine-tuning
                    </li>
                  </ul>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="relative mt-2">
        {/* Progress bar with improved visual clarity */}
        <div className="h-3 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden shadow-inner">
          {/* Colored sections for the background */}
          <div className="absolute inset-0 w-full h-full flex">
            <div className="h-full flex-1 bg-red-500 opacity-10"></div>
            <div className="h-full flex-1 bg-orange-500 opacity-10"></div>
            <div className="h-full flex-1 bg-yellow-500 opacity-10"></div>
            <div className="h-full flex-1 bg-green-500 opacity-10"></div>
            <div className="h-full flex-1 bg-indigo-500 opacity-10"></div>
          </div>

          {/* Actual progress bar */}
          <div
            className={`h-full ${progressColor} relative z-10 transition-all duration-500 ease-in-out`}
            style={{
              width: `${progressPercentage}%`,
              boxShadow: "0 0 8px rgba(0, 0, 0, 0.2) inset",
            }}
          />
        </div>

        {/* Threshold markers */}
        <div className="relative h-5">
          {/* Basic RAG threshold */}
          <div
            className="absolute top-0 flex flex-col items-center"
            style={{
              left: `${basicRagPercentage}%`,
              transform: "translateX(-50%)",
            }}
          >
            <div className="w-1 h-4 bg-orange-500 rounded-b-sm" />
            <div className="w-2 h-1 bg-orange-500 rounded-full mt-0.5" />
          </div>

          {/* Reliable RAG threshold */}
          <div
            className="absolute top-0 flex flex-col items-center"
            style={{
              left: `${reliableRagPercentage}%`,
              transform: "translateX(-50%)",
            }}
          >
            <div className="w-1 h-4 bg-yellow-500 rounded-b-sm" />
            <div className="w-2 h-1 bg-yellow-500 rounded-full mt-0.5" />
          </div>

          {/* Fine-tuning threshold */}
          <div
            className="absolute top-0 flex flex-col items-center"
            style={{
              left: `${fineTuningPercentage}%`,
              transform: "translateX(-50%)",
            }}
          >
            <div className="w-1 h-4 bg-green-500 rounded-b-sm" />
            <div className="w-2 h-1 bg-green-500 rounded-full mt-0.5" />
          </div>

          {/* Excellent threshold */}
          <div
            className="absolute top-0 flex flex-col items-center"
            style={{
              left: `${excellentFineTuningPercentage}%`,
              transform: "translateX(-50%)",
            }}
          >
            <div className="w-1 h-4 bg-indigo-500 rounded-b-sm" />
            <div className="w-2 h-1 bg-indigo-500 rounded-full mt-0.5" />
          </div>
        </div>
      </div>

      {showLabels && (
        <div className="flex justify-between text-xs text-neutral-500 mt-6">
          <div className="grid grid-cols-6 w-full">
            {/* Start */}
            <div className="flex flex-col items-center">
              <span className="font-medium">0</span>
              <span className="text-[10px] opacity-70">Start</span>
            </div>

            {/* Basic RAG */}
            <div className="flex flex-col items-center">
              <span className="font-medium text-orange-500">
                {WORD_THRESHOLDS.BASIC_RAG.toLocaleString()}
              </span>
              <span className="text-[10px] text-orange-500">Basic</span>
            </div>

            {/* Reliable RAG */}
            <div className="flex flex-col items-center">
              <span className="font-medium text-yellow-500">
                {WORD_THRESHOLDS.RELIABLE_RAG.toLocaleString()}
              </span>
              <span className="text-[10px] text-yellow-500">Reliable</span>
            </div>

            {/* Fine-tuning */}
            <div className="flex flex-col items-center">
              <span className="font-medium text-green-500">
                {WORD_THRESHOLDS.FINE_TUNING.toLocaleString()}
              </span>
              <span className="text-[10px] text-green-500">Minimum</span>
            </div>

            {/* Excellent */}
            <div className="flex flex-col items-center">
              <span className="font-medium text-indigo-500">
                {WORD_THRESHOLDS.EXCELLENT_FINE_TUNING.toLocaleString()}
              </span>
              <span className="text-[10px] text-indigo-500">Excellent</span>
            </div>

            {/* Max */}
            <div className="flex flex-col items-center">
              <span className="font-medium">
                {maxThreshold.toLocaleString()}
              </span>
              <span className="text-[10px] opacity-70">Max</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
