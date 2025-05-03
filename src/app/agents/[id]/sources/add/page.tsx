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
import { Loader2, ArrowLeft } from "lucide-react";
import { SourceUploadForm } from "@/components/source-upload-form";

export default function AddSourcePage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [agent, setAgent] = useState<any>(null);

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

  const handleSuccess = () => {
    // Navigate back to sources page after successful upload
    router.push(`/agents/${agentId}/sources`);
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
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center mb-8">
            <Link href={`/agents/${agentId}/sources`}>
              <Button variant="ghost" size="sm" className="mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Add Knowledge Source</h1>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
            </div>
          ) : (
            <>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                Adding knowledge source for{" "}
                <strong>{agent?.name || "Agent"}</strong>
              </p>

              <SourceUploadForm agentId={agentId} onSuccess={handleSuccess} />
            </>
          )}
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
