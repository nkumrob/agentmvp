"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserButton } from "@clerk/nextjs";
import { ExampleForm } from "@/components/fine-tuning/example-form";
import { ExampleList } from "@/components/fine-tuning/example-list";
import { JobForm } from "@/components/fine-tuning/job-form";
import { JobList } from "@/components/fine-tuning/job-list";
import { RealTimeJobList } from "@/components/fine-tuning/real-time-job-list";
import { KnowledgeStatus } from "@/components/knowledge-status";
import { KnowledgeSourceList } from "@/components/knowledge-source-list";
import { Loader2, Plus, Database, Zap, BookOpen } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  description?: string;
}

interface ModelConfig {
  id: string;
  baseModel: string;
  status: string;
  activeModelId: string | null;
}

interface TrainingExample {
  id: string;
  messages: any[];
  tags: string[];
  source: string;
  createdAt: string;
  updatedAt: string;
}

interface FineTuningJob {
  id: string;
  jobId: string;
  status: string;
  model: string;
  fineTunedModel: string | null;
  trainingFile: string | null;
  validationFile: string | null;
  hyperparameters: string | null;
  resultMetrics: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  modelConfig: {
    id: string;
    baseModel: string;
    agent: {
      id: string;
      name: string;
    };
  };
}

export default function AgentFineTuningPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;
  const { toast } = useToast();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [modelConfig, setModelConfig] = useState<ModelConfig | null>(null);
  const [examples, setExamples] = useState<TrainingExample[]>([]);
  const [jobs, setJobs] = useState<FineTuningJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingExample, setIsCreatingExample] = useState(false);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [selectedExampleIds, setSelectedExampleIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("knowledge");

  // Fetch agent data
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

  // Fetch model config
  useEffect(() => {
    const fetchModelConfig = async () => {
      try {
        setIsLoading(true);

        // Check if model config exists
        const response = await fetch(`/api/agents/${agentId}/model-config`);

        if (response.ok) {
          const data = await response.json();
          setModelConfig(data);
        } else if (response.status === 404) {
          // Create a new model config if it doesn't exist
          const createResponse = await fetch(
            `/api/agents/${agentId}/model-config`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                baseModel: "gpt-3.5-turbo",
                status: "pending",
              }),
            }
          );

          if (createResponse.ok) {
            const data = await createResponse.json();
            setModelConfig(data);
          } else {
            console.error("Failed to create model config");
          }
        } else {
          console.error("Failed to fetch model config");
        }
      } catch (error) {
        console.error("Error fetching model config:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (agentId) {
      fetchModelConfig();
    }
  }, [agentId]);

  // Fetch training examples
  const fetchExamples = async () => {
    try {
      const response = await fetch(`/api/fine-tuning/examples`);
      if (response.ok) {
        const data = await response.json();
        setExamples(data);
      } else {
        console.error("Failed to fetch examples");
      }
    } catch (error) {
      console.error("Error fetching examples:", error);
    }
  };

  useEffect(() => {
    fetchExamples();
  }, []);

  // Fetch fine-tuning jobs
  const fetchJobs = async () => {
    try {
      if (!modelConfig) return;

      const response = await fetch(
        `/api/fine-tuning?modelConfigId=${modelConfig.id}`
      );
      if (response.ok) {
        const data = await response.json();
        setJobs(data);
      } else {
        console.error("Failed to fetch jobs");
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
    }
  };

  useEffect(() => {
    if (modelConfig) {
      fetchJobs();
    }
  }, [modelConfig]);

  // Handle creating a new training example
  const handleCreateExample = async (example: any) => {
    try {
      const response = await fetch("/api/fine-tuning/examples", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(example),
      });

      if (response.ok) {
        await fetchExamples();
        setIsCreatingExample(false);
      } else {
        console.error("Failed to create example");
      }
    } catch (error) {
      console.error("Error creating example:", error);
    }
  };

  // Handle deleting a training example
  const handleDeleteExample = async (id: string) => {
    try {
      const response = await fetch(`/api/fine-tuning/examples?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchExamples();
      } else {
        console.error("Failed to delete example");
      }
    } catch (error) {
      console.error("Error deleting example:", error);
    }
  };

  // Handle creating a new fine-tuning job
  const handleCreateJob = async (jobData: any) => {
    try {
      console.log("Creating fine-tuning job with data:", jobData);

      const response = await fetch("/api/fine-tuning", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(jobData),
      });

      if (response.ok) {
        await fetchJobs();
        setIsCreatingJob(false);
        setActiveTab("jobs");
        toast({
          title: "Success",
          description: "Fine-tuning job created successfully",
          variant: "default",
        });
      } else {
        // Get the error message from the response
        let errorMessage = "Failed to create job";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If we can't parse the JSON, just use the status text
          errorMessage = `Failed to create job: ${response.status} ${response.statusText}`;
        }

        console.error(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Error creating job:", errorMessage);
      toast({
        title: "Error",
        description: `Failed to create job: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  // Handle deleting a fine-tuning job
  const handleDeleteJob = async (id: string) => {
    try {
      const response = await fetch(`/api/fine-tuning?jobId=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchJobs();
      } else {
        console.error("Failed to delete job");
      }
    } catch (error) {
      console.error("Error deleting job:", error);
    }
  };

  // Handle setting the active model
  const handleSetActiveModel = async (
    modelConfigId: string,
    fineTunedModelId: string
  ) => {
    try {
      const response = await fetch("/api/fine-tuning/active-model", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          modelConfigId,
          fineTunedModelId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setModelConfig({
          ...modelConfig!,
          activeModelId: data.activeModelId,
        });
      } else {
        console.error("Failed to set active model");
      }
    } catch (error) {
      console.error("Error setting active model:", error);
    }
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
          <div>
            <h1 className="text-3xl font-bold">
              Fine-tuning: {agent?.name || "Agent"}
            </h1>
            <p className="text-neutral-500 mt-1">
              Create custom models tailored to your specific use case
            </p>
          </div>
          <div className="flex space-x-2">
            <Link href={`/agents/${agentId}/edit`}>
              <Button variant="outline">Back to Agent</Button>
            </Link>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8">
            <TabsTrigger value="knowledge" className="flex items-center">
              <BookOpen className="h-4 w-4 mr-2" />
              Knowledge Sources
            </TabsTrigger>
            <TabsTrigger value="examples" className="flex items-center">
              <Database className="h-4 w-4 mr-2" />
              Training Examples
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center">
              <Zap className="h-4 w-4 mr-2" />
              Fine-tuning Jobs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="knowledge">
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Knowledge Sources</h2>
                <div className="flex space-x-2">
                  <Link href={`/agents/${agentId}/sources`}>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Manage Knowledge Sources
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <KnowledgeStatus
                  agentId={agentId}
                  onGenerateExamples={(newExamples) => {
                    // Add the new examples to the existing examples
                    setExamples((prev) => [...newExamples, ...prev]);
                    // Switch to the examples tab
                    setActiveTab("examples");
                    // Select the new examples
                    setSelectedExampleIds(newExamples.map((ex) => ex.id));
                    // Show a notification or feedback
                    toast({
                      title: "Examples generated",
                      description: `${newExamples.length} examples were generated from your knowledge sources.`,
                    });
                  }}
                />

                <KnowledgeSourceList agentId={agentId} />

                <Card>
                  <CardHeader>
                    <CardTitle>Fine-tuning with Knowledge</CardTitle>
                    <CardDescription>
                      How knowledge sources are used in fine-tuning
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">
                        Knowledge Integration
                      </h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Your knowledge sources are used in two ways:
                      </p>
                      <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
                        <li>
                          <strong>RAG (Retrieval-Augmented Generation):</strong>{" "}
                          During chat, relevant information is retrieved from
                          your knowledge sources in real-time.
                        </li>
                        <li>
                          <strong>Fine-tuning:</strong> Your knowledge sources
                          are automatically used for fine-tuning your custom
                          model, along with your persona instructions.
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-medium mb-2">Recommended Workflow</h3>
                      <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
                        <li>Add comprehensive knowledge sources (required)</li>
                        <li>
                          Define your persona with tone rules (recommended)
                        </li>
                        <li>Create additional custom examples (optional)</li>
                        <li>
                          Fine-tune a model using your knowledge sources and
                          persona
                        </li>
                        <li>Set the fine-tuned model as active</li>
                      </ol>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="examples">
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Training Examples</h2>
                <div className="flex space-x-2">
                  <Button onClick={() => setIsCreatingExample(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Example
                  </Button>
                  {selectedExampleIds.length > 0 && (
                    <Button
                      onClick={() => {
                        setIsCreatingJob(true);
                        setActiveTab("jobs");
                      }}
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Create Fine-tuning Job with Selected Examples
                    </Button>
                  )}
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Available Examples</CardTitle>
                  <CardDescription>
                    Select examples to use for fine-tuning
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ExampleList
                    examples={examples}
                    onDelete={handleDeleteExample}
                    onSelect={setSelectedExampleIds}
                    selectable={true}
                    selectedIds={selectedExampleIds}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="jobs">
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Fine-tuning Jobs</h2>
                <Button onClick={() => setIsCreatingJob(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Fine-tuning Job
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Job History</CardTitle>
                  <CardDescription>
                    View and manage your fine-tuning jobs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Replace the JobList with the RealTimeJobList */}
                  {modelConfig && (
                    <RealTimeJobList
                      initialJobs={jobs}
                      modelConfigId={modelConfig.id}
                      agentId={agentId}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Create Example Dialog */}
      <Dialog open={isCreatingExample} onOpenChange={setIsCreatingExample}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Training Example</DialogTitle>
            <DialogDescription>
              Add a new example to use for fine-tuning your model
            </DialogDescription>
          </DialogHeader>

          <ExampleForm
            onSubmit={handleCreateExample}
            onCancel={() => setIsCreatingExample(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Create Job Dialog */}
      <Dialog open={isCreatingJob} onOpenChange={setIsCreatingJob}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Fine-tuning Job</DialogTitle>
            <DialogDescription>
              Configure and start a new fine-tuning job using your knowledge
              sources and persona
            </DialogDescription>
          </DialogHeader>

          {modelConfig && (
            <JobForm
              modelConfigId={modelConfig.id}
              agentId={agentId}
              onSubmit={handleCreateJob}
              onCancel={() => setIsCreatingJob(false)}
              trainingExampleIds={selectedExampleIds}
            />
          )}
        </DialogContent>
      </Dialog>

      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-6 px-4">
        <div className="container mx-auto text-center text-sm text-neutral-600 dark:text-neutral-400">
          &copy; {new Date().getFullYear()} Agennt. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
