"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export default function SourceContentTest() {
  const [sources, setSources] = useState<any[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [sourceContent, setSourceContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);
  const [agentId, setAgentId] = useState("");
  const [agents, setAgents] = useState<any[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [originalContent, setOriginalContent] = useState<string>("");
  const [isCleaningContent, setIsCleaningContent] = useState(false);

  // Fetch all agents
  useEffect(() => {
    const fetchAgents = async () => {
      setIsLoadingAgents(true);
      try {
        const response = await fetch("/api/agents");
        if (response.ok) {
          const data = await response.json();
          setAgents(data);
        }
      } catch (error) {
        console.error("Error fetching agents:", error);
      } finally {
        setIsLoadingAgents(false);
      }
    };

    fetchAgents();
  }, []);

  // Fetch sources for the agent
  const fetchSources = async (id: string) => {
    if (!id) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/agents/${id}/sources`);
      if (response.ok) {
        const data = await response.json();
        setSources(data);
      }
    } catch (error) {
      console.error("Error fetching sources:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch content for a specific source
  const fetchSourceContent = async (sourceId: string) => {
    if (!sourceId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/sources/${sourceId}/content`);
      if (response.ok) {
        const data = await response.json();
        const content = data.content || "No content available";
        setSourceContent(content);
        setOriginalContent(content);
        setCharacterCount(content ? content.length : 0);
      }
    } catch (error) {
      console.error("Error fetching source content:", error);
      setSourceContent("Error fetching content");
      setOriginalContent("Error fetching content");
    } finally {
      setIsLoading(false);
    }
  };

  // Clean the content using our content cleaner
  const cleanContent = async () => {
    if (!sourceContent) return;

    setIsCleaningContent(true);
    try {
      const response = await fetch("/api/clean-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: sourceContent }),
      });

      if (response.ok) {
        const data = await response.json();
        setSourceContent(data.cleanedContent);
        setCharacterCount(data.cleanedContent.length);

        // Show metrics in a toast or alert
        alert(`Content cleaned successfully:
- Characters: ${data.metrics.originalLength.toLocaleString()} → ${data.metrics.cleanedLength.toLocaleString()} (${
          data.metrics.percentageDifference
        }% reduction)
- Words: ${data.metrics.originalWordCount.toLocaleString()} → ${data.metrics.cleanedWordCount.toLocaleString()}
- Paragraphs: ${data.metrics.originalParagraphCount.toLocaleString()} → ${data.metrics.cleanedParagraphCount.toLocaleString()}
        `);
      }
    } catch (error) {
      console.error("Error cleaning content:", error);
    } finally {
      setIsCleaningContent(false);
    }
  };

  // Reset to original content
  const resetContent = () => {
    setSourceContent(originalContent);
    setCharacterCount(originalContent.length);
  };

  // Handle agent ID change
  const handleAgentIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAgentId(e.target.value);
  };

  // Handle source selection change
  const handleSourceChange = (value: string) => {
    setSelectedSourceId(value);
    fetchSourceContent(value);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Source Content Test</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Select Agent and Source</CardTitle>
          <CardDescription>
            Enter an agent ID and select a source to view its content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="agent-select">Select Agent</Label>
              <div className="flex space-x-2">
                <Select
                  value={agentId}
                  onValueChange={(value) => {
                    setAgentId(value);
                    fetchSources(value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name} ({agent.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isLoadingAgents && (
                  <Loader2 className="h-4 w-4 animate-spin ml-2 mt-3" />
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="agent-id">Or Enter Agent ID Directly</Label>
              <div className="flex space-x-2">
                <Input
                  id="agent-id"
                  placeholder="Enter agent ID"
                  value={agentId}
                  onChange={handleAgentIdChange}
                />
                <Button
                  onClick={() => fetchSources(agentId)}
                  disabled={!agentId || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Fetch Sources"
                  )}
                </Button>
              </div>
            </div>
          </div>

          {sources.length > 0 && (
            <div>
              <Label htmlFor="source-select">Select Source</Label>
              <Select
                value={selectedSourceId}
                onValueChange={handleSourceChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a source" />
                </SelectTrigger>
                <SelectContent>
                  {sources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.name} ({source.sourceType})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedSourceId && (
        <Card>
          <CardHeader>
            <CardTitle>Source Content</CardTitle>
            <CardDescription>
              Character Count: {characterCount.toLocaleString()}
              {sources.find((s) => s.id === selectedSourceId)?.characterCount &&
                ` (Stored: ${sources
                  .find((s) => s.id === selectedSourceId)
                  ?.characterCount.toLocaleString()})`}
            </CardDescription>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-neutral-500">
              <div>
                <span className="font-medium">Word Count:</span>{" "}
                {sourceContent
                  .split(/\s+/)
                  .filter(Boolean)
                  .length.toLocaleString()}
              </div>
              <div>
                <span className="font-medium">Paragraphs:</span>{" "}
                {sourceContent
                  .split("\n\n")
                  .filter(Boolean)
                  .length.toLocaleString()}
              </div>
              <div>
                <span className="font-medium">Avg Word Length:</span>{" "}
                {sourceContent
                  ? (
                      sourceContent.length /
                      sourceContent.split(/\s+/).filter(Boolean).length
                    ).toFixed(1)
                  : "0"}
              </div>
              <div>
                <span className="font-medium">Content Quality:</span>{" "}
                {sourceContent.length < 100
                  ? "Poor"
                  : sourceContent.length < 1000
                  ? "Basic"
                  : sourceContent.length < 5000
                  ? "Good"
                  : "Excellent"}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={sourceContent}
              readOnly
              rows={20}
              className="font-mono text-sm"
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <div>
              <p className="text-sm text-neutral-500">
                This is the content extracted from the source.
              </p>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={resetContent}
                disabled={sourceContent === originalContent}
              >
                Reset to Original
              </Button>
              <Button
                variant="outline"
                onClick={cleanContent}
                disabled={isCleaningContent}
              >
                {isCleaningContent ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cleaning...
                  </>
                ) : (
                  "Clean Content"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(sourceContent);
                  alert("Content copied to clipboard!");
                }}
              >
                Copy to Clipboard
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
