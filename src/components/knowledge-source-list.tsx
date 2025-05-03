"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2,
  FileText,
  Link as LinkIcon,
  Youtube,
  File,
  Image,
  FileAudio,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { WORD_THRESHOLDS } from "@/lib/character-count";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface KnowledgeSourceListProps {
  agentId: string;
}

interface KnowledgeSource {
  sourceId: string; // Changed from id to sourceId to match API response
  sourceName: string; // Changed from name to sourceName to match API response
  sourceType: string;
  characters: number;
  words: number;
}

export function KnowledgeSourceList({ agentId }: KnowledgeSourceListProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (agentId) {
      fetchKnowledgeSources();
    }
  }, [agentId]);

  const fetchKnowledgeSources = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/agents/${agentId}/knowledge-status`);

      if (response.ok) {
        const data = await response.json();

        // Log the entire response for debugging
        console.log("Knowledge status response:", data);

        // Try to get the sources from different possible locations in the response
        let sourcesData = [];

        if (data.countMetrics?.charactersBySource) {
          sourcesData = data.countMetrics.charactersBySource;
          console.log("Using countMetrics.charactersBySource");
        } else if (data.characterMetrics?.charactersBySource) {
          sourcesData = data.characterMetrics.charactersBySource;
          console.log("Using characterMetrics.charactersBySource");
        } else {
          // Fallback to fetching directly from the debug endpoint
          console.log(
            "No sources found in response, fetching from debug endpoint"
          );
          const debugResponse = await fetch(
            `/api/debug/knowledge-sources?agentId=${agentId}`
          );
          if (debugResponse.ok) {
            const debugData = await debugResponse.json();
            console.log("Debug data:", debugData);

            // Map the data sources to the expected format
            sourcesData = debugData.dataSources.map((source) => ({
              sourceId: source.id,
              sourceName: source.name,
              sourceType: source.sourceType,
              characters: source.characterCount,
              words: source.wordCount || 0,
            }));
          }
        }

        setSources(sourcesData);
      } else {
        setError("Failed to fetch knowledge sources");
      }
    } catch (err) {
      console.error("Error fetching knowledge sources:", err);
      setError("An error occurred while fetching knowledge sources");
    } finally {
      setIsLoading(false);
    }
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType.toLowerCase()) {
      case "text":
        return <FileText className="h-4 w-4" />;
      case "url":
        return <LinkIcon className="h-4 w-4" />;
      case "youtube":
        return <Youtube className="h-4 w-4" />;
      case "pdf":
        return <File className="h-4 w-4" />;
      case "image":
        return <Image className="h-4 w-4" />;
      case "audio":
        return <FileAudio className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  // Helper function to get progress bar color based on word count
  const getProgressColorClass = (wordCount: number) => {
    if (wordCount >= WORD_THRESHOLDS.EXCELLENT_FINE_TUNING) {
      return "bg-indigo-500";
    } else if (wordCount >= WORD_THRESHOLDS.FINE_TUNING) {
      return "bg-green-500";
    } else if (wordCount >= WORD_THRESHOLDS.RELIABLE_RAG) {
      return "bg-yellow-500";
    } else if (wordCount >= WORD_THRESHOLDS.BASIC_RAG) {
      return "bg-orange-500";
    } else {
      return "bg-red-500";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Sources</CardTitle>
          <CardDescription>Loading knowledge sources...</CardDescription>
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
          <CardTitle>Knowledge Sources</CardTitle>
          <CardDescription>
            There was an error loading knowledge sources
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (sources.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Sources</CardTitle>
          <CardDescription>No knowledge sources found</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-500">
            Add knowledge sources to improve your agent's responses.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Knowledge Sources</CardTitle>
        <CardDescription>
          {sources.length} {sources.length === 1 ? "source" : "sources"} with a
          total of{" "}
          {sources
            .reduce((sum, source) => sum + (source.words || 0), 0)
            .toLocaleString()}{" "}
          words
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sources.map((source) => (
            <div key={source.sourceId} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  {getSourceIcon(source.sourceType)}
                  <span className="ml-2 font-medium">{source.sourceName}</span>
                </div>
                <Badge variant="outline">{source.sourceType}</Badge>
              </div>
              <div className="mt-2 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className="text-sm font-medium">
                    {(source.words || 0).toLocaleString()} words
                  </div>
                  <button
                    className="inline-flex items-center justify-center rounded-full w-5 h-5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 transition-colors"
                    onClick={() => {
                      // Show tooltip info in an alert for better visibility
                      alert(
                        `Source: ${source.sourceName}\nType: ${
                          source.sourceType
                        }\nWord Count: ${(
                          source.words || 0
                        ).toLocaleString()}\nCharacter Count: ${(
                          source.characters || 0
                        ).toLocaleString()}`
                      );
                    }}
                  >
                    <Info className="h-3 w-3 text-neutral-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
