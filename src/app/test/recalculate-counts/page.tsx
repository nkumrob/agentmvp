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
import { Loader2 } from "lucide-react";

export default function RecalculateCountsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleRecalculate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        "/api/sources/recalculate-character-counts",
        {
          method: "POST",
        }
      );

      if (response.ok) {
        const data = await response.json();
        setResults(data.results);
      } else {
        console.error("Failed to recalculate character counts");
      }
    } catch (error) {
      console.error("Error recalculating character counts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Recalculate Character Counts</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Character Count Recalculation</CardTitle>
          <CardDescription>
            This will recalculate character counts for all sources across all
            your agents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleRecalculate} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Recalculating...
              </>
            ) : (
              "Recalculate All Character Counts"
            )}
          </Button>
        </CardContent>
      </Card>

      {results && (
        <div className="space-y-8">
          <h2 className="text-2xl font-bold">Results</h2>

          {results.map((agentResult: any) => (
            <Card key={agentResult.agentId}>
              <CardHeader>
                <CardTitle>{agentResult.agentName}</CardTitle>
                <CardDescription>
                  Total Character Count:{" "}
                  {agentResult.totalBefore.toLocaleString()} →{" "}
                  {agentResult.totalAfter.toLocaleString()}(
                  {agentResult.totalAfter - agentResult.totalBefore > 0
                    ? "+"
                    : ""}
                  {(
                    agentResult.totalAfter - agentResult.totalBefore
                  ).toLocaleString()}
                  )
                </CardDescription>
              </CardHeader>
              <CardContent>
                {agentResult.sources.length > 0 ? (
                  <div className="border rounded-md overflow-hidden">
                    <div className="bg-muted p-2 text-sm font-medium grid grid-cols-4">
                      <div>Source Name</div>
                      <div className="text-right">Before</div>
                      <div className="text-right">After</div>
                      <div className="text-right">Difference</div>
                    </div>
                    <div className="divide-y">
                      {agentResult.sources.map((source: any) => (
                        <div
                          key={source.sourceId}
                          className="grid grid-cols-4 p-2 text-sm"
                        >
                          <div>{source.sourceName}</div>
                          <div className="text-right">
                            {source.before.toLocaleString()}
                          </div>
                          <div className="text-right">
                            {source.after.toLocaleString()}
                          </div>
                          <div
                            className={`text-right ${
                              source.difference > 0
                                ? "text-green-500"
                                : source.difference < 0
                                ? "text-red-500"
                                : ""
                            }`}
                          >
                            {source.difference > 0 ? "+" : ""}
                            {source.difference.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-muted p-2 text-xs text-center text-muted-foreground">
                      Sources with updated character counts
                    </div>
                  </div>
                ) : (
                  <p>No sources needed updating</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
