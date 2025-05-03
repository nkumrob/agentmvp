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
import { Input } from "@/components/ui/input";
import { UserButton } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

export default function AgentEditPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [agent, setAgent] = useState<any>(null);
  const [personas, setPersonas] = useState<any[]>([]);
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch agent details
  useEffect(() => {
    const fetchAgent = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/agents/${agentId}`);
        if (response.ok) {
          const data = await response.json();
          setAgent(data);
          setName(data.name);
          setDescription(data.description || "");
        } else {
          console.error("Failed to fetch agent");
        }
      } catch (error) {
        console.error("Error fetching agent:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgent();
  }, [agentId]);

  // Fetch personas
  useEffect(() => {
    const fetchPersonas = async () => {
      try {
        const response = await fetch("/api/personas");
        if (response.ok) {
          const data = await response.json();
          setPersonas(data);
        } else {
          console.error("Failed to fetch personas");
        }
      } catch (error) {
        console.error("Error fetching personas:", error);
      }
    };

    fetchPersonas();
  }, []);

  // Fetch data sources
  useEffect(() => {
    const fetchDataSources = async () => {
      try {
        const response = await fetch(`/api/agents/${agentId}/sources`);
        if (response.ok) {
          const data = await response.json();
          setDataSources(data);
        } else {
          console.error("Failed to fetch data sources");
        }
      } catch (error) {
        console.error("Error fetching data sources:", error);
      }
    };

    if (agent) {
      fetchDataSources();
    }
  }, [agentId, agent]);

  const handleSave = async () => {
    if (!name) return;

    setIsSaving(true);

    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description: description || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update agent");
      }

      const updatedAgent = await response.json();
      setAgent(updatedAgent);
      alert("Agent updated successfully");
    } catch (error) {
      console.error("Error updating agent:", error);
      alert("Failed to update agent. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete this agent? This action cannot be undone."
      )
    ) {
      setIsDeleting(true);

      try {
        const response = await fetch(`/api/agents/${agentId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete agent");
        }

        router.push("/dashboard");
      } catch (error) {
        console.error("Error deleting agent:", error);
        alert("Failed to delete agent. Please try again.");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const updatePersona = async (personaId: string) => {
    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personaId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update agent persona");
      }

      const updatedAgent = await response.json();
      setAgent(updatedAgent);
    } catch (error) {
      console.error("Error updating agent persona:", error);
      alert("Failed to update agent persona. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        Loading agent details...
      </div>
    );
  }

  if (!agent) {
    return <div className="container mx-auto px-4 py-8">Agent not found</div>;
  }

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
          <h1 className="text-3xl font-bold">Edit Agent: {agent.name}</h1>
          <div className="flex space-x-4">
            <Link href={`/agents/${agentId}/analytics`}>
              <Button variant="outline">View Analytics</Button>
            </Link>
            <Link href={`/agents/${agentId}/chat`}>
              <Button variant="outline">Chat with Agent</Button>
            </Link>
            <Link href={`/agents/${agentId}/model`}>
              <Button variant="outline">Model Settings</Button>
            </Link>
            <Link href={`/agents/${agentId}/fine-tuning`}>
              <Button variant="outline">Fine-tune Model</Button>
            </Link>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <span className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </span>
              ) : (
                "Delete Agent"
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Agent Details</CardTitle>
                <CardDescription>
                  Basic information about your agent
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Name
                  </label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Agent name"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium">
                    Description
                  </label>
                  <textarea
                    id="description"
                    className="w-full p-2 border border-neutral-200 dark:border-neutral-800 rounded-md min-h-[100px]"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what this agent does"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <span className="flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Persona</CardTitle>
                  <CardDescription>
                    Define your agent personality and tone
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Current Persona:</span>
                      <span className="font-medium">
                        {agent.persona?.name || "Default"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {personas?.map((persona) => (
                        <div
                          key={persona.id}
                          className={`p-4 border rounded-md cursor-pointer ${
                            agent.personaId === persona.id
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                              : "border-neutral-200 dark:border-neutral-800"
                          }`}
                          onClick={() => updatePersona(persona.id)}
                        >
                          <h3 className="font-medium">{persona.name}</h3>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            {persona.description || "No description"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Link href="/personas">
                    <Button variant="outline">Manage Personas</Button>
                  </Link>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Knowledge Sources</CardTitle>
                  <CardDescription>
                    Add content for your agent to learn from
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {dataSources && dataSources.length > 0 ? (
                    <div className="space-y-4">
                      {dataSources.map((source) => (
                        <div
                          key={source.id}
                          className="flex justify-between items-center p-3 border border-neutral-200 dark:border-neutral-800 rounded-md"
                        >
                          <div>
                            <h4 className="font-medium">{source.name}</h4>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                              {source.sourceType} • {source.status}
                            </p>
                          </div>
                          <Link
                            href={`/agents/${agentId}/sources/${source.id}`}
                          >
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                        No knowledge sources added yet
                      </p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Link href={`/agents/${agentId}/sources`}>
                    <Button variant="outline">Manage Sources</Button>
                  </Link>
                  <Link href={`/agents/${agentId}/sources/add`}>
                    <Button>Add Knowledge Source</Button>
                  </Link>
                </CardFooter>
              </Card>
            </div>
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
