"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  AlertCircle,
  CheckCircle,
  Info,
  FileText,
  Zap,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { WORD_THRESHOLDS } from "@/lib/character-count";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface KnowledgeStatusProps {
  agentId: string;
  onGenerateExamples?: (examples: any[]) => void;
}

export function KnowledgeStatus({
  agentId,
  onGenerateExamples,
}: KnowledgeStatusProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (agentId) {
      fetchKnowledgeStatus();
    }
  }, [agentId]);

  const fetchKnowledgeStatus = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/agents/${agentId}/knowledge-status`);

      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      } else {
        setError("Failed to fetch knowledge status");
      }
    } catch (err) {
      console.error("Error fetching knowledge status:", err);
      setError("An error occurred while fetching knowledge status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateExamples = async () => {
    if (!status?.status?.hasBasicKnowledge) {
      toast({
        title: "Insufficient knowledge sources",
        description:
          "Add at least one knowledge source before generating examples.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/agents/${agentId}/generate-examples`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          count: 10,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        toast({
          title: "Examples generated",
          description: `Successfully generated ${data.savedCount} training examples from your knowledge sources.`,
        });

        if (onGenerateExamples) {
          onGenerateExamples(data.examples);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to generate examples");

        toast({
          title: "Failed to generate examples",
          description:
            errorData.error || "An error occurred while generating examples.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error generating examples:", err);
      setError("An error occurred while generating examples");

      toast({
        title: "Error",
        description: "An error occurred while generating examples.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Source Status</CardTitle>
          <CardDescription>Checking knowledge source status...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Source Status</CardTitle>
          <CardDescription>
            There was an error checking knowledge source status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button onClick={fetchKnowledgeStatus}>Retry</Button>
        </CardFooter>
      </Card>
    );
  }

  if (!status) {
    return null;
  }

  const { metrics, thresholds, recommendations, characterMetrics } = status;

  // Calculate progress percentages
  const sourceProgress = Math.min(
    100,
    (metrics.sourceCount / thresholds.FINE_TUNING) * 100
  );
  const chunkProgress = Math.min(
    100,
    (metrics.chunkCount / thresholds.MIN_CHUNKS_FOR_FINE_TUNING) * 100
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Knowledge Source Status</CardTitle>
        <CardDescription>
          {status.status.hasSufficientKnowledgeForFineTuning
            ? "Your agent has sufficient knowledge for fine-tuning"
            : status.status.hasReliableKnowledge
            ? "Your agent has reliable knowledge but could benefit from more sources for fine-tuning"
            : status.status.hasBasicKnowledge
            ? "Your agent has basic knowledge but needs more sources for reliable responses"
            : "Your agent needs knowledge sources to provide accurate responses"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Knowledge Sources</span>
              <span className="text-neutral-500">
                {metrics.sourceCount} / {thresholds.FINE_TUNING} recommended
              </span>
            </div>
            <Progress value={sourceProgress} />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <div className="flex items-center">
                <span>Knowledge Chunks</span>
                <button
                  className="ml-1 inline-flex items-center justify-center rounded-full w-5 h-5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 transition-colors"
                  onClick={() => {
                    alert(
                      "Knowledge Chunks\n\n" +
                        "Knowledge chunks are segments of your knowledge sources that have been processed for retrieval.\n\n" +
                        "Each knowledge source is divided into smaller chunks to improve retrieval accuracy and enable more precise answers.\n\n" +
                        "More chunks generally means more detailed knowledge is available to your agent."
                    );
                  }}
                >
                  <Info className="h-3 w-3 text-neutral-500" />
                </button>
              </div>
              <span className="text-neutral-500">
                {metrics.chunkCount} / {thresholds.MIN_CHUNKS_FOR_FINE_TUNING}{" "}
                recommended
              </span>
            </div>
            <Progress value={chunkProgress} />
          </div>

          {/* Show word count (primary metric) */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Word Count</span>
              <span className="text-neutral-500">
                {(metrics.wordCount || 0).toLocaleString()} words
              </span>
            </div>
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span
                    className={`text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full ${
                      metrics.wordCount >= WORD_THRESHOLDS.EXCELLENT_FINE_TUNING
                        ? "text-indigo-600 bg-indigo-200"
                        : metrics.wordCount >= WORD_THRESHOLDS.FINE_TUNING
                        ? "text-green-600 bg-green-200"
                        : metrics.wordCount >= WORD_THRESHOLDS.RELIABLE_RAG
                        ? "text-yellow-600 bg-yellow-200"
                        : metrics.wordCount >= WORD_THRESHOLDS.BASIC_RAG
                        ? "text-orange-600 bg-orange-200"
                        : "text-red-600 bg-red-200"
                    }`}
                  >
                    {metrics.wordCount >= WORD_THRESHOLDS.EXCELLENT_FINE_TUNING
                      ? "Excellent for Fine-tuning"
                      : metrics.wordCount >= WORD_THRESHOLDS.FINE_TUNING
                      ? "Good for Fine-tuning"
                      : metrics.wordCount >= WORD_THRESHOLDS.RELIABLE_RAG
                      ? "Reliable for RAG"
                      : metrics.wordCount >= WORD_THRESHOLDS.BASIC_RAG
                      ? "Basic for RAG"
                      : "Insufficient"}
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-4 text-xs flex rounded bg-neutral-200 dark:bg-neutral-700">
                <div
                  style={{
                    width: `${Math.min(
                      100,
                      (metrics.wordCount / WORD_THRESHOLDS.FINE_TUNING) * 100
                    )}%`,
                  }}
                  className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                    metrics.wordCount >= WORD_THRESHOLDS.EXCELLENT_FINE_TUNING
                      ? "bg-indigo-500"
                      : metrics.wordCount >= WORD_THRESHOLDS.FINE_TUNING
                      ? "bg-green-500"
                      : metrics.wordCount >= WORD_THRESHOLDS.RELIABLE_RAG
                      ? "bg-yellow-500"
                      : metrics.wordCount >= WORD_THRESHOLDS.BASIC_RAG
                      ? "bg-orange-500"
                      : "bg-red-500"
                  }`}
                >
                  {metrics.wordCount >= WORD_THRESHOLDS.BASIC_RAG && (
                    <span className="px-2 py-1 font-semibold">
                      {Math.round(
                        (metrics.wordCount / WORD_THRESHOLDS.FINE_TUNING) * 100
                      )}
                      %
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-between text-xs text-neutral-500 mt-2">
                <div>
                  <span>0</span>
                </div>
                <div>
                  <span>
                    Minimum for fine-tuning:{" "}
                    {WORD_THRESHOLDS.FINE_TUNING.toLocaleString()} words
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {recommendations && recommendations.length > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Recommendations</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                {recommendations.map((rec, index) => (
                  <li key={index} className="text-sm">
                    {rec}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {status.status.hasBasicKnowledge && (
          <div className="pt-2">
            <Button
              onClick={handleGenerateExamples}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Examples...
                </>
              ) : (
                "Generate Training Examples from Knowledge"
              )}
            </Button>
            <p className="text-xs text-neutral-500 mt-2">
              This will create training examples based on your knowledge sources
              for fine-tuning.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
