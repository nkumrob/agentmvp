"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserButton } from "@clerk/nextjs";
import {
  Loader2,
  Trash2,
  Plus,
  FileText,
  Globe,
  Type,
  Youtube,
  Image,
  FileAudio,
  File as FilePdf,
} from "lucide-react";

interface DataSource {
  id: string;
  name: string;
  sourceType: string;
  sourceUrl?: string;
  content?: string;
  status: string;
  characterCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface Agent {
  id: string;
  name: string;
  description?: string;
}

export default function SourcesPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch agent details
  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const response = await fetch(`/api/agents/${agentId}`);
        if (response.ok) {
          const data = await response.json();
          setAgent(data);
        } else {
          console.error("Failed to fetch agent");
        }
      } catch (error) {
        console.error("Error fetching agent:", error);
      }
    };

    fetchAgent();
  }, [agentId]);

  // Fetch data sources
  useEffect(() => {
    const fetchDataSources = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/agents/${agentId}/sources`);
        if (response.ok) {
          const data = await response.json();
          setDataSources(data);
        } else {
          console.error("Failed to fetch data sources");
        }
      } catch (error) {
        console.error("Error fetching data sources:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDataSources();
  }, [agentId]);

  // Delete a data source
  const handleDelete = async (sourceId: string) => {
    try {
      setDeletingId(sourceId);
      const response = await fetch(`/api/sources/${sourceId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Remove the deleted source from the state
        setDataSources(dataSources.filter((source) => source.id !== sourceId));
      } else {
        console.error("Failed to delete data source");
      }
    } catch (error) {
      console.error("Error deleting data source:", error);
    } finally {
      setDeletingId(null);
    }
  };

  // Get icon for source type
  const getSourceTypeIcon = (sourceType: string) => {
    switch (sourceType) {
      case "url":
        return <Globe className="h-4 w-4" />;
      case "file":
        return <FileText className="h-4 w-4" />;
      case "text":
        return <Type className="h-4 w-4" />;
      case "youtube":
        return <Youtube className="h-4 w-4" />;
      case "pdf":
        return <FilePdf className="h-4 w-4" />;
      case "image":
        return <Image className="h-4 w-4" />;
      case "audio":
        return <FileAudio className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500";
      case "processing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-500";
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-500";
      default:
        return "bg-neutral-100 text-neutral-800 dark:bg-neutral-900/30 dark:text-neutral-500";
    }
  };

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
            <Link href={`/agents/${agentId}/edit`}>
              <Button variant="ghost">Back to Agent</Button>
            </Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Knowledge Sources</h1>
            <Link href={`/agents/${agentId}/sources/add`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Source
              </Button>
            </Link>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sources for {agent?.name || "Agent"}</CardTitle>
              <CardDescription>
                Manage the knowledge sources for your agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
                </div>
              ) : dataSources.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                    No knowledge sources added yet
                  </p>
                  <Link href={`/agents/${agentId}/sources/add`}>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Source
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {dataSources.map((source) => (
                    <div
                      key={source.id}
                      className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-md">
                              {getSourceTypeIcon(source.sourceType)}
                            </span>
                            <h3 className="font-medium">{source.name}</h3>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(
                                source.status
                              )}`}
                            >
                              {source.status}
                            </span>
                          </div>
                          <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                            {(source.sourceType === "url" ||
                              source.sourceType === "youtube") &&
                            source.sourceUrl ? (
                              <a
                                href={source.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {source.sourceUrl}
                              </a>
                            ) : source.sourceType === "text" ? (
                              <p className="line-clamp-2">
                                {source.content || "No content"}
                              </p>
                            ) : ["pdf", "image", "audio"].includes(
                                source.sourceType
                              ) ? (
                              <p>
                                {source.characterCount
                                  ? `${source.sourceType.toUpperCase()} content (${source.characterCount.toLocaleString()} characters)`
                                  : `${source.sourceType.toUpperCase()} content`}
                              </p>
                            ) : (
                              <p>
                                {source.content
                                  ? `Content (${source.content.length.toLocaleString()} characters)`
                                  : source.characterCount
                                  ? `Content (${source.characterCount.toLocaleString()} characters)`
                                  : "No content"}
                              </p>
                            )}
                          </div>
                          <div className="mt-2 text-xs text-neutral-500">
                            Added on{" "}
                            {new Date(source.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                          onClick={() => handleDelete(source.id)}
                          disabled={deletingId === source.id}
                        >
                          {deletingId === source.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => router.push(`/agents/${agentId}/edit`)}
              >
                Back to Agent
              </Button>
            </CardFooter>
          </Card>
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
