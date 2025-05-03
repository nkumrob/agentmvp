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
import { Loader2, MessageSquare } from "lucide-react";

interface Persona {
  id: string;
  name: string;
  description?: string;
  toneRules?: any;
  createdAt: string;
  updatedAt: string;
  examples?: Example[];
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

export default function PersonaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const personaId = params.id as string;

  const [persona, setPersona] = useState<Persona | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [toneRules, setToneRules] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch persona details
  useEffect(() => {
    const fetchPersona = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/personas/${personaId}`);
        if (response.ok) {
          const data = await response.json();
          setPersona(data);
          setName(data.name);
          setDescription(data.description || "");
          
          // Format tone rules for display
          if (data.toneRules) {
            try {
              const parsedRules = typeof data.toneRules === 'string' 
                ? JSON.parse(data.toneRules) 
                : data.toneRules;
              setToneRules(JSON.stringify(parsedRules, null, 2));
            } catch (e) {
              setToneRules(data.toneRules.toString());
            }
          } else {
            setToneRules("");
          }
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

  const handleSave = async () => {
    if (!name) return;

    setIsSaving(true);

    try {
      // Parse tone rules if provided
      let parsedToneRules = null;
      if (toneRules) {
        try {
          parsedToneRules = JSON.parse(toneRules);
        } catch (e) {
          // If not valid JSON, treat as a string
          parsedToneRules = toneRules;
        }
      }

      const response = await fetch(`/api/personas/${personaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description: description || undefined,
          toneRules: parsedToneRules || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update persona');
      }

      const updatedPersona = await response.json();
      setPersona(updatedPersona);
      alert('Persona updated successfully');
    } catch (error) {
      console.error('Error updating persona:', error);
      alert('Failed to update persona. Please try again.');
    } finally {
      setIsSaving(false);
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
            <Link href="/personas">
              <Button variant="ghost">Back to Personas</Button>
            </Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Edit Persona</h1>
            <Link href={`/personas/${personaId}/examples`}>
              <Button variant="outline">
                <MessageSquare className="h-4 w-4 mr-2" />
                Manage Examples
              </Button>
            </Link>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Persona Details</CardTitle>
              <CardDescription>
                Edit the personality and communication style for this persona
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Persona Name
                </label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Professional Assistant, Friendly Helper"
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
                  placeholder="Describe the personality and tone of this persona..."
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="toneRules" className="text-sm font-medium">
                  Tone Rules (Optional)
                </label>
                <textarea
                  id="toneRules"
                  className="w-full p-2 border border-neutral-200 dark:border-neutral-800 rounded-md min-h-[150px] font-mono text-sm"
                  value={toneRules}
                  onChange={(e) => setToneRules(e.target.value)}
                  placeholder={`{
  "formality": "professional",
  "friendliness": "high",
  "humor": "moderate",
  "empathy": "high",
  "conciseness": "moderate"
}`}
                />
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  Enter tone rules as JSON or plain text. These rules will guide how your agent communicates.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => router.push('/personas')}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!name || isSaving}
              >
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
      </main>

      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-6 px-4">
        <div className="container mx-auto text-center text-sm text-neutral-600 dark:text-neutral-400">
          &copy; {new Date().getFullYear()} Agennt. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
