import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { openai } from "@/lib/openai";

export async function GET(req: Request) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if OpenAI API key is configured
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { 
          valid: false, 
          error: "OpenAI API key is not configured",
          details: "The OPENAI_API_KEY environment variable is not set."
        },
        { status: 200 }
      );
    }

    // Test the API key by making a simple request
    try {
      // List models to verify the API key works
      const models = await openai.models.list();
      
      // Check if the API key has access to fine-tuning models
      const hasFinetuningModels = models.data.some(model => 
        model.id.includes("gpt-3.5-turbo") || 
        model.id.includes("gpt-4") || 
        model.id.includes("davinci")
      );
      
      if (!hasFinetuningModels) {
        return NextResponse.json(
          { 
            valid: false, 
            error: "API key does not have access to fine-tuning models",
            details: "Your API key appears to be valid but does not have access to models that support fine-tuning."
          },
          { status: 200 }
        );
      }
      
      // Check if the API key has fine-tuning permissions
      try {
        // Try to list fine-tuning jobs to verify permissions
        await openai.fineTuning.jobs.list({ limit: 1 });
        
        return NextResponse.json(
          { 
            valid: true, 
            message: "OpenAI API key is valid and has fine-tuning permissions",
            models: models.data.filter(model => 
              model.id.includes("gpt-3.5-turbo") || 
              model.id.includes("gpt-4")
            ).map(model => model.id)
          },
          { status: 200 }
        );
      } catch (finetuningError: any) {
        // Check if the error is due to permissions
        if (finetuningError.message && finetuningError.message.includes("permission")) {
          return NextResponse.json(
            { 
              valid: false, 
              error: "API key does not have fine-tuning permissions",
              details: "Your API key is valid but does not have permissions to create fine-tuning jobs."
            },
            { status: 200 }
          );
        } else {
          // Some other error with fine-tuning, but the key might still be valid
          return NextResponse.json(
            { 
              valid: true, 
              warning: "API key is valid but there was an issue checking fine-tuning permissions",
              details: finetuningError.message || "Unknown error checking fine-tuning permissions"
            },
            { status: 200 }
          );
        }
      }
    } catch (error: any) {
      return NextResponse.json(
        { 
          valid: false, 
          error: "Invalid OpenAI API key",
          details: error.message || "The API key was rejected by OpenAI."
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Error verifying OpenAI API key:", error);
    return NextResponse.json(
      { error: "Failed to verify OpenAI API key" },
      { status: 500 }
    );
  }
}
