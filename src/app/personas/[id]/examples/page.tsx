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
import { Loader2, Plus, Trash2, Tag } from "lucide-react";

interface Persona {
  id: string;
  name: string;
  description?: string;
}

interface Example {
  id: string;
  prompt: string;
  response: string;
  tags: string;
  personaId: string;
  createdAt: string;
  updatedAt: string;
}

export default function PersonaExamplesPage() {
  const params = useParams();
  const router = useRouter();
  const personaId = params.id as string;

  const [persona, setPersona] = useState<Persona | null>(null);
  const [examples, setExamples] = useState<Example[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // New example form state
  const [showForm, setShowForm] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [tags, setTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch persona details
  useEffect(() => {
    const fetchPersona = async () => {
      try {
        const response = await fetch(`/api/personas/${personaId}`);
        if (response.ok) {
          const data = await response.json();
          setPersona(data);
          setExamples(data.examples || []);
        } else {
          console.error('Failed to fetch persona');
        }
      } catch (error) {
        console.error('Error fetching persona:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPersona();
  }, [personaId]);

  // Delete an example
  const handleDelete = async (exampleId: string) => {
    try {
      setDeletingId(exampleId);
      const response = await fetch(`/api/personas/${personaId}/examples/${exampleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove the deleted example from the state
        setExamples(examples.filter(example => example.id !== exampleId));
      } else {
        console.error('Failed to delete example');
      }
    } catch (error) {
      console.error('Error deleting example:', error);
    } finally {
      setDeletingId(null);
    }
  };

  // Add a new example
  const handleAddExample = async () => {
    if (!prompt || !response) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/personas/${personaId}/examples`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          response,
          tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add example');
      }

      const newExample = await response.json();
      setExamples([...examples, newExample]);
      
      // Reset form
      setPrompt("");
      setResponse("");
      setTags("");
      setShowForm(false);
    } catch (error) {
      console.error('Error adding example:', error);
      alert('Failed to add example. Please try again.');
    } finally {
      setIsSubmitting(false);
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
            <Link href={`/personas/${personaId}`}>
              <Button variant="ghost">Back to Persona</Button>
            </Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">
              Examples for {persona?.name || "Persona"}
            </h1>
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancel" : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Example
                </>
              )}
            </Button>
          </div>

          {showForm && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Add New Example</CardTitle>
                <CardDescription>
                  Create an example of how this persona should respond to a prompt
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="prompt" className="text-sm font-medium">
                    Prompt
                  </label>
                  <textarea
                    id="prompt"
                    className="w-full p-2 border border-neutral-200 dark:border-neutral-800 rounded-md min-h-[100px]"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter a sample user prompt..."
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="response" className="text-sm font-medium">
                    Response
                  </label>
                  <textarea
                    id="response"
                    className="w-full p-2 border border-neutral-200 dark:border-neutral-800 rounded-md min-h-[150px]"
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Enter how the persona should respond..."
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="tags" className="text-sm font-medium">
                    Tags (Optional)
                  </label>
                  <Input
                    id="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="greeting, introduction, help (comma separated)"
                  />
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    Add comma-separated tags to categorize this example
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button
                  onClick={handleAddExample}
                  disabled={!prompt || !response || isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </span>
                  ) : (
                    "Add Example"
                  )}
                </Button>
              </CardFooter>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Training Examples</CardTitle>
              <CardDescription>
                Examples help define how your persona should respond to different prompts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {examples.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                    No examples added yet
                  </p>
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Example
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {examples.map((example) => (
                    <div
                      key={example.id}
                      className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden"
                    >
                      <div className="p-4 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
                        <div className="flex justify-between items-start">
                          <h3 className="font-medium">User Prompt</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                            onClick={() => handleDelete(example.id)}
                            disabled={deletingId === example.id}
                          >
                            {deletingId === example.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <p className="mt-2 text-neutral-700 dark:text-neutral-300">
                          {example.prompt}
                        </p>
                      </div>
                      <div className="p-4">
                        <h3 className="font-medium">Persona Response</h3>
                        <p className="mt-2 text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                          {example.response}
                        </p>
                        
                        {example.tags && (
                          <div className="mt-4 flex items-center flex-wrap gap-2">
                            <Tag className="h-4 w-4 text-neutral-500" />
                            {example.tags.split(',').map((tag, index) => (
                              <span
                                key={index}
                                className="text-xs px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-full"
                              >
                                {tag.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                onClick={() => router.push(`/personas/${personaId}`)}
              >
                Back to Persona
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
