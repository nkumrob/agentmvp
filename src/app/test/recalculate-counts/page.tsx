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
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function RecalculateCountsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleRecalculate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/sources/recalculate-character-counts", {
        method: "POST",
      });
      
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
            This will recalculate character counts for all sources across all your agents
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
                  Total Character Count: {agentResult.totalBefore.toLocaleString()} → {agentResult.totalAfter.toLocaleString()} 
                  ({agentResult.totalAfter - agentResult.totalBefore > 0 ? "+" : ""}
                  {(agentResult.totalAfter - agentResult.totalBefore).toLocaleString()})
                </CardDescription>
              </CardHeader>
              <CardContent>
                {agentResult.sources.length > 0 ? (
                  <Table>
                    <TableCaption>Sources with updated character counts</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source Name</TableHead>
                        <TableHead className="text-right">Before</TableHead>
                        <TableHead className="text-right">After</TableHead>
                        <TableHead className="text-right">Difference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agentResult.sources.map((source: any) => (
                        <TableRow key={source.sourceId}>
                          <TableCell>{source.sourceName}</TableCell>
                          <TableCell className="text-right">{source.before.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{source.after.toLocaleString()}</TableCell>
                          <TableCell className={`text-right ${source.difference > 0 ? "text-green-500" : source.difference < 0 ? "text-red-500" : ""}`}>
                            {source.difference > 0 ? "+" : ""}
                            {source.difference.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
