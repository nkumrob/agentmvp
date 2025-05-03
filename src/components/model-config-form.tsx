"use client";

import { useState, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Info } from "lucide-react";
import { MODEL_PROVIDERS } from "@/lib/model-providers";

interface ModelConfigFormProps {
  agentId: string;
  onSave?: () => void;
}

interface ModelConfig {
  id: string;
  baseModel: string;
  provider: string;
  temperature: number;
  maxTokens: number;
  topP: number | null;
  frequencyPenalty: number | null;
  presencePenalty: number | null;
  systemPrompt: string | null;
  status: string;
  activeModelId: string | null;
}

interface Model {
  id: string;
  name: string;
  description: string;
  contextLength: number;
}

interface ProviderModels {
  provider: string;
  models: Model[];
}

export function ModelConfigForm({ agentId, onSave }: ModelConfigFormProps) {
  const [modelConfig, setModelConfig] = useState<ModelConfig | null>(null);
  const [availableProviders, setAvailableProviders] = useState<
    ProviderModels[]
  >([]);
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch model config and global settings
  useEffect(() => {
    const fetchModelConfig = async () => {
      try {
        setIsLoading(true);

        // Try to get global settings from localStorage
        let globalSettings = null;
        try {
          const savedSettings = localStorage.getItem("appSettings");
          if (savedSettings) {
            globalSettings = JSON.parse(savedSettings);
          }
        } catch (err) {
          console.warn("Could not load global settings:", err);
        }

        const response = await fetch(`/api/agents/${agentId}/model-config`);

        if (response.ok) {
          const data = await response.json();
          setModelConfig(data);
        } else if (response.status === 404) {
          // Create a default model config using global settings if available
          const defaultProvider = globalSettings?.defaultProvider || "openai";
          const defaultModel = globalSettings?.defaultModel || "gpt-3.5-turbo";

          const createResponse = await fetch(
            `/api/agents/${agentId}/model-config`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                baseModel: defaultModel,
                provider: defaultProvider,
                temperature: 0.7,
                maxTokens: 1000,
                status: "pending",
              }),
            }
          );

          if (createResponse.ok) {
            const data = await createResponse.json();
            setModelConfig(data);
          } else {
            setError("Failed to create model config");
          }
        } else {
          setError("Failed to fetch model config");
        }
      } catch (error) {
        console.error("Error fetching model config:", error);
        setError("An error occurred while fetching model config");
      } finally {
        setIsLoading(false);
      }
    };

    fetchModelConfig();
  }, [agentId]);

  // Fetch available models
  useEffect(() => {
    const fetchAvailableModels = async () => {
      try {
        const response = await fetch("/api/models");

        if (response.ok) {
          const data = await response.json();
          setAvailableProviders(data);

          // Set available models for the current provider
          if (modelConfig?.provider) {
            const providerModels = data.find(
              (p: ProviderModels) => p.provider === modelConfig.provider
            );
            if (providerModels) {
              setAvailableModels(providerModels.models);
            }
          }
        } else {
          console.error("Failed to fetch available models");
        }
      } catch (error) {
        console.error("Error fetching available models:", error);
      }
    };

    fetchAvailableModels();
  }, [modelConfig?.provider]);

  const handleProviderChange = (provider: string) => {
    // Update the provider
    setModelConfig((prev) => {
      if (!prev) return prev;
      return { ...prev, provider };
    });

    // Update available models for the selected provider
    const providerModels = availableProviders.find(
      (p) => p.provider === provider
    );
    if (providerModels) {
      setAvailableModels(providerModels.models);

      // Set the first model as default if the current model is not from this provider
      const firstModel = providerModels.models[0];
      if (
        firstModel &&
        !providerModels.models.some((m) => m.id === modelConfig?.baseModel)
      ) {
        setModelConfig((prev) => {
          if (!prev) return prev;
          return { ...prev, baseModel: firstModel.id };
        });
      }
    }
  };

  const handleSave = async () => {
    if (!modelConfig) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/agents/${agentId}/model-config`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(modelConfig),
      });

      if (response.ok) {
        const data = await response.json();
        setModelConfig(data);
        if (onSave) onSave();
      } else {
        setError("Failed to save model config");
      }
    } catch (error) {
      console.error("Error saving model config:", error);
      setError("An error occurred while saving model config");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!modelConfig) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Failed to load model configuration</p>
        {error && <p className="text-sm text-neutral-500 mt-2">{error}</p>}
      </div>
    );
  }

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Model Configuration</CardTitle>
        <CardDescription>
          Configure the AI model used by this agent
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider">Model Provider</Label>
            <Select
              value={modelConfig.provider}
              onValueChange={handleProviderChange}
            >
              <SelectTrigger id="provider">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                {availableProviders.map((provider) => (
                  <SelectItem key={provider.provider} value={provider.provider}>
                    {getProviderName(provider.provider)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select
              value={modelConfig.baseModel}
              onValueChange={(value) =>
                setModelConfig({ ...modelConfig, baseModel: value })
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
              The AI model that will be used to generate responses
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="temperature">
                Temperature: {modelConfig.temperature}
              </Label>
              <span className="text-xs text-neutral-500">
                {modelConfig.temperature === 0
                  ? "Deterministic"
                  : modelConfig.temperature < 0.5
                  ? "More focused"
                  : modelConfig.temperature > 1.2
                  ? "More random"
                  : "Balanced"}
              </span>
            </div>
            <Slider
              id="temperature"
              min={0}
              max={2}
              step={0.1}
              value={[modelConfig.temperature]}
              onValueChange={(value) =>
                setModelConfig({ ...modelConfig, temperature: value[0] })
              }
            />
            <p className="text-xs text-neutral-500 mt-1">
              Controls randomness: Lower values are more deterministic, higher
              values are more creative
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-tokens">Max Tokens</Label>
            <Input
              id="max-tokens"
              type="number"
              min={1}
              max={32000}
              value={modelConfig.maxTokens}
              onChange={(e) =>
                setModelConfig({
                  ...modelConfig,
                  maxTokens: parseInt(e.target.value) || 1000,
                })
              }
            />
            <p className="text-xs text-neutral-500 mt-1">
              Maximum number of tokens to generate in the response
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="system-prompt">System Prompt</Label>
            <Textarea
              id="system-prompt"
              placeholder="You are a helpful AI assistant..."
              rows={4}
              value={modelConfig.systemPrompt || ""}
              onChange={(e) =>
                setModelConfig({ ...modelConfig, systemPrompt: e.target.value })
              }
            />
            <p className="text-xs text-neutral-500 mt-1">
              Custom system prompt to override the default. Leave empty to use
              the default based on agent persona.
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md flex items-start space-x-2">
            <Info className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                Advanced Configuration
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                For advanced parameters like Top P, Frequency Penalty, and
                Presence Penalty, use the API directly or contact support for
                assistance.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">
            {error}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Configuration"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
