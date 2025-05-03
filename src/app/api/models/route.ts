import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { getAllProvidersAndModels, getAvailableModels } from "@/lib/model-providers";

export async function GET(req: Request) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider");

    // If provider is specified, return models for that provider
    if (provider) {
      const models = getAvailableModels(provider);
      return NextResponse.json(models);
    }

    // Otherwise, return all providers and models
    const providersAndModels = getAllProvidersAndModels();
    return NextResponse.json(providersAndModels);
  } catch (error) {
    console.error("Error fetching models:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}
