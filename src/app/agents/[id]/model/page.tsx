"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserButton } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { ModelConfigForm } from "@/components/model-config-form";

interface Agent {
  id: string;
  name: string;
  description?: string;
}

export default function AgentModelPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch agent details
  useEffect(() => {
    const fetchAgent = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/agents/${agentId}`);
        if (response.ok) {
          const data = await response.json();
          setAgent(data);
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

  const handleSave = () => {
    // Optionally redirect or show a success message
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="border-b border-neutral-200 dark:border-neutral-800">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Link href="/">
                <h1 className="text-2xl font-bold">Agennt</h1>
              </Link>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        </main>
      </div>
    );
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
          <h1 className="text-3xl font-bold">
            Model Settings: {agent?.name || "Agent"}
          </h1>
          <div className="flex space-x-2">
            <Link href={`/agents/${agentId}/edit`}>
              <Button variant="outline">Back to Agent</Button>
            </Link>
            <Link href={`/agents/${agentId}/chat`}>
              <Button variant="outline">Chat with Agent</Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <ModelConfigForm agentId={agentId} onSave={handleSave} />
          </div>

          <div className="space-y-6">
            <div className="bg-neutral-50 dark:bg-neutral-900 p-6 rounded-lg border border-neutral-200 dark:border-neutral-800">
              <h2 className="text-xl font-bold mb-4">About AI Models</h2>
              <div className="space-y-4 text-sm">
                <p>
                  Different AI models have different capabilities, strengths, and costs. Choose the model that best fits your needs.
                </p>
                
                <div>
                  <h3 className="font-medium mb-1">OpenAI Models</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>GPT-4o:</strong> Most capable model for complex tasks</li>
                    <li><strong>GPT-4 Turbo:</strong> Powerful model with strong reasoning</li>
                    <li><strong>GPT-3.5 Turbo:</strong> Fast and efficient for most tasks</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium mb-1">Anthropic Models</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Claude 3 Opus:</strong> Most powerful Claude model</li>
                    <li><strong>Claude 3 Sonnet:</strong> Balanced performance and speed</li>
                    <li><strong>Claude 3 Haiku:</strong> Fast and efficient Claude model</li>
                  </ul>
                </div>
                
                <p className="text-neutral-600 dark:text-neutral-400 italic">
                  Note: You need to have API keys configured for the respective providers to use their models.
                </p>
              </div>
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
