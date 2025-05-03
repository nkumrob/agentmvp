"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";

interface SearchResult {
  id: string;
  content: string;
  source?: string;
  similarity?: number;
  metadata?: any;
}

interface SemanticSearchProps {
  agentId?: string;
  onResultSelect?: (result: SearchResult) => void;
  placeholder?: string;
}

export function SemanticSearch({
  agentId,
  onResultSelect,
  placeholder = "Search knowledge base...",
}: SemanticSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      // Build the search URL with query parameters
      const searchParams = new URLSearchParams();
      searchParams.append("query", query);
      if (agentId) searchParams.append("agentId", agentId);
      
      const response = await fetch(`/api/search?${searchParams.toString()}`);
      
      if (!response.ok) {
        throw new Error("Search failed");
      }
      
      const data = await response.json();
      setResults(data);
    } catch (err) {
      console.error("Search error:", err);
      setError("Failed to perform search. Please try again.");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex space-x-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1"
          disabled={isSearching}
        />
        <Button onClick={handleSearch} disabled={isSearching || !query.trim()}>
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Search className="h-4 w-4 mr-2" />
          )}
          Search
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-md text-sm">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Search Results</h3>
          <div className="space-y-2">
            {results.map((result) => (
              <div
                key={result.id}
                className="p-3 border rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer"
                onClick={() => onResultSelect && onResultSelect(result)}
              >
                <div className="text-sm line-clamp-3">{result.content}</div>
                {result.source && (
                  <div className="text-xs text-neutral-500 mt-1">
                    Source: {result.source}
                  </div>
                )}
                {result.similarity !== undefined && (
                  <div className="text-xs text-neutral-500">
                    Relevance: {Math.round(result.similarity * 100)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
