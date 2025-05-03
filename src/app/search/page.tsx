"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserButton } from "@clerk/nextjs";
import { SemanticSearch } from "@/components/semantic-search";

interface SearchResult {
  id: string;
  content: string;
  source?: string;
  similarity?: number;
  metadata?: any;
}

export default function SearchPage() {
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Link href="/">
              <h1 className="text-2xl font-bold">Agennt</h1>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Semantic Search</h1>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Search Knowledge Base</CardTitle>
              </CardHeader>
              <CardContent>
                <SemanticSearch
                  onResultSelect={setSelectedResult}
                  placeholder="Enter a query to search across all knowledge..."
                />
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Selected Result</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedResult ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-md">
                      <p className="whitespace-pre-wrap">{selectedResult.content}</p>
                    </div>
                    
                    {selectedResult.source && (
                      <div className="text-sm">
                        <span className="font-medium">Source:</span> {selectedResult.source}
                      </div>
                    )}
                    
                    {selectedResult.similarity !== undefined && (
                      <div className="text-sm">
                        <span className="font-medium">Relevance Score:</span>{" "}
                        {Math.round(selectedResult.similarity * 100)}%
                      </div>
                    )}
                    
                    {selectedResult.metadata && (
                      <div className="text-sm">
                        <span className="font-medium">Metadata:</span>
                        <pre className="mt-1 p-2 bg-neutral-100 dark:bg-neutral-800 rounded text-xs overflow-auto">
                          {JSON.stringify(selectedResult.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-neutral-500">
                    <p>Select a search result to view details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-6 px-4">
        <div className="container mx-auto text-center text-sm text-neutral-600 dark:text-neutral-400">
          &copy; {new Date().getFullYear()} Agennt. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
