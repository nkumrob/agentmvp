"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Loader2, Plus, Trash2, Edit, MessageSquare } from "lucide-react";

interface Persona {
  id: string;
  name: string;
  description?: string;
  toneRules?: any;
  createdAt: string;
  updatedAt: string;
  _count?: {
    examples: number;
    agents: number;
  };
}

export default function PersonasPage() {
  const router = useRouter();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch personas
  useEffect(() => {
    const fetchPersonas = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/personas');
        if (response.ok) {
          const data = await response.json();
          setPersonas(data);
        } else {
          console.error('Failed to fetch personas');
        }
      } catch (error) {
        console.error('Error fetching personas:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPersonas();
  }, []);

  // Delete a persona
  const handleDelete = async (personaId: string) => {
    try {
      setDeletingId(personaId);
      const response = await fetch(`/api/personas/${personaId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove the deleted persona from the state
        setPersonas(personas.filter(persona => persona.id !== personaId));
      } else {
        const data = await response.json();
        if (data.agentsUsingPersona) {
          alert('Cannot delete persona that is being used by agents');
        } else {
          console.error('Failed to delete persona');
        }
      }
    } catch (error) {
      console.error('Error deleting persona:', error);
    } finally {
      setDeletingId(null);
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
            <Link href="/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Personas</h1>
            <Link href="/personas/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Persona
              </Button>
            </Link>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Manage Personas</CardTitle>
              <CardDescription>
                Create and manage personas to define how your agents communicate
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
                </div>
              ) : personas.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                    No personas created yet
                  </p>
                  <Link href="/personas/create">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Persona
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {personas.map((persona) => (
                    <div
                      key={persona.id}
                      className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-lg">{persona.name}</h3>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                            {persona.description || "No description"}
                          </p>
                          <div className="flex items-center mt-2 text-xs text-neutral-500">
                            <span>Created on {new Date(persona.createdAt).toLocaleDateString()}</span>
                            {persona._count && (
                              <>
                                <span className="mx-2">•</span>
                                <span>{persona._count.examples} examples</span>
                                <span className="mx-2">•</span>
                                <span>Used by {persona._count.agents} agents</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                            onClick={() => router.push(`/personas/${persona.id}`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                            onClick={() => router.push(`/personas/${persona.id}/examples`)}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                            onClick={() => handleDelete(persona.id)}
                            disabled={deletingId === persona.id}
                          >
                            {deletingId === persona.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard')}
              >
                Back to Dashboard
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
