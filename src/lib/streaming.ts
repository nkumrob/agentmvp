import { OpenAI } from "openai";
import { ModelConfig } from "@prisma/client";
import { MODEL_PROVIDERS } from "./model-providers";
import { anthropicFallback } from "./fallbacks";

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
 * Generate a streaming chat completion using OpenAI
 */
async function* generateOpenAIStreamingCompletion(
  model: string,
  messages: any[],
  parameters: any
) {
  // Initialize OpenAI client
  const client = initializeOpenAI();

  if (!client) {
    console.warn(
      "Using OpenAI streaming fallback due to missing API key or initialization failure"
    );

    // Return a mock streaming response for development
    const fallbackMessage =
      "This is a placeholder response. OpenAI API key is not configured.";
    const words = fallbackMessage.split(" ");

    let fullContent = "";

    // Simulate streaming by yielding one word at a time
    for (let i = 0; i < words.length; i++) {
      const word = words[i] + (i < words.length - 1 ? " " : "");
      fullContent += word;

      yield {
        content: word,
        fullContent,
        model,
        provider: MODEL_PROVIDERS.OPENAI,
        usage: null,
        done: i === words.length - 1,
      };

      // Simulate delay between words
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return;
  }

  try {
    const stream = await client.chat.completions.create({
      model,
      messages,
      stream: true,
      ...parameters,
    });

    let fullContent = "";
    let usageData = null;

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      fullContent += content;

      // If this is the last chunk, it might contain usage data
      if (chunk.choices[0]?.finish_reason) {
        usageData = chunk.usage;
      }

      yield {
        content,
        fullContent,
        model,
        provider: MODEL_PROVIDERS.OPENAI,
        usage: usageData,
        done: !!chunk.choices[0]?.finish_reason,
      };
    }
  } catch (error) {
    console.error("Error generating OpenAI streaming completion:", error);

    // Return a fallback response if streaming fails
    yield {
      content:
        "Sorry, there was an error generating a streaming response. Please check your API key configuration.",
      fullContent:
        "Sorry, there was an error generating a streaming response. Please check your API key configuration.",
      model,
      provider: MODEL_PROVIDERS.OPENAI,
      usage: null,
      done: true,
    };
  }
}

/**
 * Generate a streaming chat completion using Anthropic
 */
async function* generateAnthropicStreamingCompletion(
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
    console.warn(
      "Using Anthropic streaming fallback due to initialization failure"
    );
    return anthropicFallback.generateStreamingCompletion(
      model,
      messages,
      parameters
    );
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
    const stream = await client.messages.create({
      model,
      messages,
      stream: true,
      ...anthropicParams,
    });

    let fullContent = "";
    let usageData = null;

    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta" && chunk.delta.text) {
        const content = chunk.delta.text;
        fullContent += content;

        yield {
          content,
          fullContent,
          model,
          provider: MODEL_PROVIDERS.ANTHROPIC,
          usage: usageData,
          done: false,
        };
      } else if (chunk.type === "message_stop") {
        // Final chunk with usage information
        usageData = {
          prompt_tokens: chunk.message?.usage?.input_tokens,
          completion_tokens: chunk.message?.usage?.output_tokens,
          total_tokens:
            (chunk.message?.usage?.input_tokens || 0) +
            (chunk.message?.usage?.output_tokens || 0),
        };

        yield {
          content: "",
          fullContent,
          model,
          provider: MODEL_PROVIDERS.ANTHROPIC,
          usage: usageData,
          done: true,
        };
      }
    }
  } catch (error) {
    console.error("Error generating Anthropic streaming completion:", error);

    // Fallback to a simple response if streaming fails
    yield {
      content: "Sorry, there was an error generating a streaming response.",
      fullContent: "Sorry, there was an error generating a streaming response.",
      model,
      provider: MODEL_PROVIDERS.ANTHROPIC,
      usage: null,
      done: true,
    };
  }
}

/**
 * Generate a streaming chat completion using a local model
 */
async function* generateLocalStreamingCompletion(
  model: string,
  messages: any[],
  parameters: any
) {
  // This is a placeholder for local model integration
  // In a real implementation, this would connect to a local model server

  console.warn("Local model streaming is not fully implemented");

  // Mock streaming response for development
  const mockResponse =
    "This is a placeholder response from a local model. Local model integration is not fully implemented.";
  const words = mockResponse.split(" ");

  let fullContent = "";

  // Simulate streaming by yielding one word at a time
  for (let i = 0; i < words.length; i++) {
    const word = words[i] + (i < words.length - 1 ? " " : "");
    fullContent += word;

    yield {
      content: word,
      fullContent,
      model: "local-model",
      provider: MODEL_PROVIDERS.LOCAL,
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
      done: i === words.length - 1,
    };

    // Simulate delay between words
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
