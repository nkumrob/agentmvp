"use client";

import { useState, useEffect } from "react";
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
import { UserButton, useAuth } from "@clerk/nextjs";

export default function Dashboard() {
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const { userId, isLoaded, isSignedIn } = useAuth();
  const [agents, setAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch agents
  const fetchAgents = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/agents");
      if (response.ok) {
        const data = await response.json();
        setAgents(data);
      } else {
        console.error("Failed to fetch agents");
      }
    } catch (error) {
      console.error("Error fetching agents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load agents on component mount
  useEffect(() => {
    if (isSignedIn) {
      fetchAgents();
    }
  }, [isSignedIn]);

  const handleCreateAgent = async () => {
    if (newAgentName.trim()) {
      try {
        setIsCreating(true);
        console.log("Creating agent with name:", newAgentName);

        const response = await fetch("/api/agents", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: newAgentName,
            description: `Agent created on ${new Date().toLocaleDateString()}`,
          }),
        });

        if (response.ok) {
          setNewAgentName("");
          setIsCreatingAgent(false);
          // Refetch agents after creating a new one
          fetchAgents();
        } else {
          console.error("Failed to create agent");
        }
      } catch (error) {
        console.error("Error creating agent:", error);
      } finally {
        setIsCreating(false);
      }
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
            <Link href="/analytics/compare">
              <Button variant="ghost">Compare Agents</Button>
            </Link>
            <Link href="/search">
              <Button variant="ghost">Search</Button>
            </Link>
            <Link href="/personas">
              <Button variant="ghost">Personas</Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost">Settings</Button>
            </Link>
            <div className="relative group">
              <Button variant="ghost">Developer</Button>
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md shadow-lg hidden group-hover:block z-10">
                <div className="py-1">
                  <Link href="/test/source-content">
                    <div className="px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer">
                      View Source Content
                    </div>
                  </Link>
                  <Link href="/test/recalculate-counts">
                    <div className="px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer">
                      Recalculate Counts
                    </div>
                  </Link>
                </div>
              </div>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Your Agents</h1>
          <div className="flex flex-col items-end">
            <div className="flex space-x-2">
              <Link href="/analytics/compare">
                <Button variant="outline">Compare Agents</Button>
              </Link>
              <Button onClick={() => setIsCreatingAgent(true)}>
                Create New Agent
              </Button>
            </div>
            <div className="text-xs mt-2">
              Auth Status:{" "}
              {isLoaded
                ? isSignedIn
                  ? `Signed in (${userId})`
                  : "Not signed in"
                : "Loading..."}
            </div>
            <div className="text-xs mt-1">
              {isCreating ? "Creating agent..." : ""}
            </div>
          </div>
        </div>

        {isCreatingAgent && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Create New Agent</CardTitle>
              <CardDescription>
                Give your agent a name to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="agent-name" className="text-sm font-medium">
                    Agent Name
                  </label>
                  <input
                    id="agent-name"
                    className="w-full p-2 border border-neutral-200 dark:border-neutral-800 rounded-md"
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                    placeholder="My Customer Support Agent"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setIsCreatingAgent(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateAgent}
                disabled={!newAgentName.trim() || isCreating}
              >
                {isCreating ? "Creating..." : "Create Agent"}
              </Button>
            </CardFooter>
          </Card>
        )}

        {isLoading ? (
          <div className="text-center py-8">Loading your agents...</div>
        ) : agents && agents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <Card key={agent.id}>
                <CardHeader>
                  <CardTitle>{agent.name}</CardTitle>
                  <CardDescription>
                    {agent.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500 dark:text-neutral-400">
                        Persona:
                      </span>
                      <span>{agent.persona?.name || "Default"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500 dark:text-neutral-400">
                        Created:
                      </span>
                      <span>
                        {new Date(agent.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500 dark:text-neutral-400">
                        ID:
                      </span>
                      <span
                        className="font-mono text-xs"
                        title="Click to copy"
                        onClick={() => {
                          navigator.clipboard.writeText(agent.id);
                          alert(`Copied agent ID: ${agent.id}`);
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        {agent.id}
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Link href={`/agents/${agent.id}/edit`}>
                    <Button variant="outline">Edit</Button>
                  </Link>
                  <Link href={`/agents/${agent.id}/chat`}>
                    <Button>Chat</Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">No agents yet</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              Create your first agent to get started with Agennt.
            </p>
            <Button onClick={() => setIsCreatingAgent(true)}>
              Create Your First Agent
            </Button>
          </div>
        )}
      </main>

      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-6 px-4">
        <div className="container mx-auto text-center text-sm text-neutral-600 dark:text-neutral-400">
          &copy; {new Date().getFullYear()} Agennt. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
