import { OpenAI } from "openai";
import { ModelConfig } from "@prisma/client";

// Initialize OpenAI client if API key is available
let openai: any = null;

// We'll initialize OpenAI only when needed to avoid errors
const initializeOpenAI = () => {
  if (openai) return openai;

  try {
    // Check if API key is available
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn("OpenAI API key is missing. Using fallback implementation.");
      return null;
    }

    openai = new OpenAI({ apiKey });
    return openai;
  } catch (error) {
    console.error("Failed to initialize OpenAI client:", error);
    return null;
  }
};

// Import fallbacks
import { anthropicFallback } from "./fallbacks";

// Initialize Anthropic client if API key is available
let anthropic: any = null;

// We'll initialize Anthropic only when needed, to avoid build errors
const initializeAnthropic = async () => {
  if (anthropic) return anthropic;

  try {
    // Using require instead of import to avoid build errors
    const { Anthropic } = require("anthropic");
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    return anthropic;
  } catch (error) {
    console.error("Failed to initialize Anthropic client:", error);
    return null;
  }
};

/**
 * Available model providers
 */
export const MODEL_PROVIDERS = {
  OPENAI: "openai",
  ANTHROPIC: "anthropic",
  LOCAL: "local",
};

/**
 * Available models by provider
 */
export const AVAILABLE_MODELS = {
  [MODEL_PROVIDERS.OPENAI]: [
    {
      id: "gpt-4o",
      name: "GPT-4o",
      description: "Most capable model for complex tasks",
      contextLength: 128000,
    },
    {
      id: "gpt-4-turbo",
      name: "GPT-4 Turbo",
      description: "Powerful model with strong reasoning",
      contextLength: 128000,
    },
    {
      id: "gpt-4",
      name: "GPT-4",
      description: "High-quality model for complex tasks",
      contextLength: 8192,
    },
    {
      id: "gpt-3.5-turbo",
      name: "GPT-3.5 Turbo",
      description: "Fast and efficient for most tasks",
      contextLength: 16385,
    },
  ],
  [MODEL_PROVIDERS.ANTHROPIC]: [
    {
      id: "claude-3-opus-20240229",
      name: "Claude 3 Opus",
      description: "Most powerful Claude model",
      contextLength: 200000,
    },
    {
      id: "claude-3-sonnet-20240229",
      name: "Claude 3 Sonnet",
      description: "Balanced performance and speed",
      contextLength: 200000,
    },
    {
      id: "claude-3-haiku-20240307",
      name: "Claude 3 Haiku",
      description: "Fast and efficient Claude model",
      contextLength: 200000,
    },
    {
      id: "claude-2.1",
      name: "Claude 2.1",
      description: "Previous generation Claude model",
      contextLength: 100000,
    },
  ],
  [MODEL_PROVIDERS.LOCAL]: [
    {
      id: "local-model",
      name: "Local Model",
      description: "Run models locally (requires setup)",
      contextLength: 8192,
    },
  ],
};

/**
 * Get available models for a provider
 */
export function getAvailableModels(provider: string) {
  return AVAILABLE_MODELS[provider] || [];
}

/**
 * Get all available providers and models
 */
export function getAllProvidersAndModels() {
  return Object.entries(AVAILABLE_MODELS).map(([provider, models]) => ({
    provider,
    models,
  }));
}

/**
 * Generate a chat completion using the specified model configuration
 */
export async function generateChatCompletion(
  messages: any[],
  modelConfig: ModelConfig,
  options: any = {}
) {
  const provider = modelConfig.provider || MODEL_PROVIDERS.OPENAI;
  const model = modelConfig.activeModelId || modelConfig.baseModel;

  // Default parameters
  const parameters = {
    temperature: modelConfig.temperature || 0.7,
    max_tokens: modelConfig.maxTokens || 1000,
    top_p: modelConfig.topP,
    frequency_penalty: modelConfig.frequencyPenalty,
    presence_penalty: modelConfig.presencePenalty,
    ...options,
  };

  // Remove undefined parameters
  Object.keys(parameters).forEach((key) => {
    if (parameters[key] === undefined) {
      delete parameters[key];
    }
  });

  try {
    // Generate completion based on provider
    switch (provider) {
      case MODEL_PROVIDERS.OPENAI:
        return await generateOpenAICompletion(model, messages, parameters);

      case MODEL_PROVIDERS.ANTHROPIC:
        return await generateAnthropicCompletion(model, messages, parameters);

      case MODEL_PROVIDERS.LOCAL:
        return await generateLocalCompletion(model, messages, parameters);

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (error) {
    console.error(`Error generating chat completion with ${provider}:`, error);
    throw error;
  }
}

/**
 * Generate a streaming chat completion using the specified model configuration
 */
export async function generateStreamingChatCompletion(
  messages: any[],
  modelConfig: ModelConfig,
  options: any = {}
) {
  const provider = modelConfig.provider || MODEL_PROVIDERS.OPENAI;
  const model = modelConfig.activeModelId || modelConfig.baseModel;

  // Default parameters
  const parameters = {
    temperature: modelConfig.temperature || 0.7,
    max_tokens: modelConfig.maxTokens || 1000,
    top_p: modelConfig.topP,
    frequency_penalty: modelConfig.frequencyPenalty,
    presence_penalty: modelConfig.presencePenalty,
    ...options,
  };

  // Remove undefined parameters
  Object.keys(parameters).forEach((key) => {
    if (parameters[key] === undefined) {
      delete parameters[key];
    }
  });

  try {
    // Generate streaming completion based on provider
    switch (provider) {
      case MODEL_PROVIDERS.OPENAI:
        return generateOpenAIStreamingCompletion(model, messages, parameters);

      case MODEL_PROVIDERS.ANTHROPIC:
        return generateAnthropicStreamingCompletion(
          model,
          messages,
          parameters
        );

      case MODEL_PROVIDERS.LOCAL:
        return generateLocalStreamingCompletion(model, messages, parameters);

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (error) {
    console.error(
      `Error generating streaming chat completion with ${provider}:`,
      error
    );
    throw error;
  }
}

/**
 * Generate a chat completion using OpenAI
 */
async function generateOpenAICompletion(
  model: string,
  messages: any[],
  parameters: any
) {
  // Initialize OpenAI client
  const client = initializeOpenAI();

  if (!client) {
    console.warn(
      "Using OpenAI fallback due to missing API key or initialization failure"
    );
    // Return a mock response for development
    return {
      content:
        "This is a placeholder response. OpenAI API key is not configured.",
      model: model,
      provider: MODEL_PROVIDERS.OPENAI,
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };
  }

  try {
    const completion = await client.chat.completions.create({
      model,
      messages,
      ...parameters,
    });

    return {
      content: completion.choices[0]?.message?.content || "",
      model: completion.model,
      provider: MODEL_PROVIDERS.OPENAI,
      usage: completion.usage,
    };
  } catch (error) {
    console.error("Error generating OpenAI completion:", error);

    // Return a fallback response
    return {
      content:
        "Sorry, there was an error generating a response. Please check your API key configuration.",
      model: model,
      provider: MODEL_PROVIDERS.OPENAI,
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };
  }
}

/**
 * Generate a chat completion using Anthropic
 */
async function generateAnthropicCompletion(
  model: string,
  messages: any[],
  parameters: any
) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Anthropic API key not configured");
  }

  // Initialize Anthropic client if not already initialized
  const client = await initializeAnthropic();
  if (!client) {
    console.warn("Using Anthropic fallback due to initialization failure");
    return anthropicFallback.generateCompletion(model, messages, parameters);
  }

  // Convert parameters to Anthropic format
  const anthropicParams = {
    max_tokens: parameters.max_tokens,
    temperature: parameters.temperature,
    top_p: parameters.top_p,
  };

  // Remove undefined parameters
  Object.keys(anthropicParams).forEach((key) => {
    if (anthropicParams[key] === undefined) {
      delete anthropicParams[key];
    }
  });

  try {
    const response = await client.messages.create({
      model,
      messages,
      ...anthropicParams,
    });

    return {
      content: response.content[0]?.text || "",
      model: response.model,
      provider: MODEL_PROVIDERS.ANTHROPIC,
      usage: {
        prompt_tokens: response.usage?.input_tokens,
        completion_tokens: response.usage?.output_tokens,
        total_tokens:
          (response.usage?.input_tokens || 0) +
          (response.usage?.output_tokens || 0),
      },
    };
  } catch (error) {
    console.error("Error generating Anthropic completion:", error);
    throw error;
  }
}

/**
 * Generate a chat completion using a local model
 */
async function generateLocalCompletion(
  model: string,
  messages: any[],
  parameters: any
) {
  // This is a placeholder for local model integration
  // In a real implementation, this would connect to a local model server

  console.warn("Local model completion is not fully implemented");

  // Mock response for development
  return {
    content:
      "This is a placeholder response from a local model. Local model integration is not fully implemented.",
    model: "local-model",
    provider: MODEL_PROVIDERS.LOCAL,
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
  };
}
