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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, AlertCircle } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useToast } from "@/components/ui/use-toast";
import { MODEL_PROVIDERS, AVAILABLE_MODELS } from "@/lib/model-providers";

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    defaultProvider: "openai",
    defaultModel: "gpt-3.5-turbo",
    apiKeys: {
      openai: "",
      anthropic: "",
      local: "",
    },
  });
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("models");

  // Fetch settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        // In a real app, this would fetch from an API
        // For now, we'll use localStorage or default values
        const savedSettings = localStorage.getItem("appSettings");
        if (savedSettings) {
          setSettings(JSON.parse(savedSettings));
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
        setError("Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Handle saving settings
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // In a real app, this would save to an API
      // For now, we'll use localStorage
      localStorage.setItem("appSettings", JSON.stringify(settings));

      toast({
        title: "Settings saved",
        description: "Your settings have been saved successfully.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      setError("Failed to save settings");
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle provider change
  const handleProviderChange = (provider: string) => {
    const availableModels = AVAILABLE_MODELS[provider] || [];
    const defaultModel = availableModels.length > 0 ? availableModels[0].id : "";
    
    setSettings({
      ...settings,
      defaultProvider: provider,
      defaultModel,
    });
  };

  // Get available models for the selected provider
  const availableModels = AVAILABLE_MODELS[settings.defaultProvider] || [];

  // Get provider display name
  const getProviderName = (provider: string) => {
    switch (provider) {
      case MODEL_PROVIDERS.OPENAI:
        return "OpenAI";
      case MODEL_PROVIDERS.ANTHROPIC:
        return "Anthropic";
      case MODEL_PROVIDERS.LOCAL:
        return "Local Model";
      default:
        return provider;
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
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
              <UserButton afterSignOutUrl="/" />
            </div>
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
          <h1 className="text-3xl font-bold">Settings</h1>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>

        {error && (
          <div className="mb-6">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                  Error
                </h3>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8">
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
          </TabsList>

          <TabsContent value="models">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Default Model Settings</CardTitle>
                  <CardDescription>
                    Configure the default AI models for new agents
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="provider">Default Model Provider</Label>
                      <Select
                        value={settings.defaultProvider}
                        onValueChange={handleProviderChange}
                      >
                        <SelectTrigger id="provider">
                          <SelectValue placeholder="Select a provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={MODEL_PROVIDERS.OPENAI}>
                            OpenAI
                          </SelectItem>
                          <SelectItem value={MODEL_PROVIDERS.ANTHROPIC}>
                            Anthropic
                          </SelectItem>
                          <SelectItem value={MODEL_PROVIDERS.LOCAL}>
                            Local Model
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-neutral-500 mt-1">
                        The default provider for new agents
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="model">Default Model</Label>
                      <Select
                        value={settings.defaultModel}
                        onValueChange={(value) =>
                          setSettings({ ...settings, defaultModel: value })
                        }
                      >
                        <SelectTrigger id="model">
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableModels.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              <div className="flex flex-col">
                                <span>{model.name}</span>
                                <span className="text-xs text-neutral-500">
                                  {model.description}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-neutral-500 mt-1">
                        The default model for new agents
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Model Information</CardTitle>
                  <CardDescription>
                    Details about the selected model
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium">Provider</h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                        {getProviderName(settings.defaultProvider)}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium">Model</h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                        {
                          availableModels.find(
                            (m) => m.id === settings.defaultModel
                          )?.name || settings.defaultModel
                        }
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium">Description</h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                        {
                          availableModels.find(
                            (m) => m.id === settings.defaultModel
                          )?.description || "No description available"
                        }
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium">Context Length</h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                        {
                          availableModels.find(
                            (m) => m.id === settings.defaultModel
                          )?.contextLength?.toLocaleString() || "Unknown"
                        }{" "}
                        tokens
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="api-keys">
            <Card>
              <CardHeader>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>
                  Configure API keys for different model providers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="openai-key">OpenAI API Key</Label>
                    <Input
                      id="openai-key"
                      type="password"
                      placeholder="sk-..."
                      value={settings.apiKeys.openai}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          apiKeys: {
                            ...settings.apiKeys,
                            openai: e.target.value,
                          },
                        })
                      }
                    />
                    <p className="text-xs text-neutral-500 mt-1">
                      Your OpenAI API key for GPT models
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="anthropic-key">Anthropic API Key</Label>
                    <Input
                      id="anthropic-key"
                      type="password"
                      placeholder="sk_ant-..."
                      value={settings.apiKeys.anthropic}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          apiKeys: {
                            ...settings.apiKeys,
                            anthropic: e.target.value,
                          },
                        })
                      }
                    />
                    <p className="text-xs text-neutral-500 mt-1">
                      Your Anthropic API key for Claude models
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="local-key">Local Model API Key</Label>
                    <Input
                      id="local-key"
                      type="password"
                      placeholder="Optional"
                      value={settings.apiKeys.local}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          apiKeys: {
                            ...settings.apiKeys,
                            local: e.target.value,
                          },
                        })
                      }
                    />
                    <p className="text-xs text-neutral-500 mt-1">
                      API key for your local model server (if required)
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <p className="text-xs text-neutral-500">
                  Your API keys are stored securely and are only used to make API
                  calls to the respective providers.
                </p>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>
                  Customize the appearance of the application
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-500">
                  Appearance settings will be implemented in a future update.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-6 px-4">
        <div className="container mx-auto text-center text-sm text-neutral-600 dark:text-neutral-400">
          &copy; {new Date().getFullYear()} Agennt. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
