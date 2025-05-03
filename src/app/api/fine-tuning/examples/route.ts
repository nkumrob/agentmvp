import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/server/db/client";
import { createTrainingExample, getTrainingExamples, deleteTrainingExample } from "@/lib/fine-tuning";

export async function GET(req: Request) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const url = new URL(req.url);
    const source = url.searchParams.get("source");
    const tags = url.searchParams.get("tags");
    const limit = url.searchParams.get("limit");
    const offset = url.searchParams.get("offset");
    const sortBy = url.searchParams.get("sortBy");
    const sortDirection = url.searchParams.get("sortDirection");

    // Build filters
    const filters: any = {};
    if (source) filters.source = source;
    if (tags) filters.tags = tags.split(",");
    if (limit) filters.limit = limit;
    if (offset) filters.offset = offset;
    if (sortBy) filters.sortBy = sortBy;
    if (sortDirection) filters.sortDirection = sortDirection;

    // Get the examples
    const examples = await getTrainingExamples(userId, filters);

    return NextResponse.json(examples);
  } catch (error) {
    console.error("Error fetching training examples:", error);
    return NextResponse.json(
      { error: "Failed to fetch training examples" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { messages, source, tags } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Valid messages array is required" },
        { status: 400 }
      );
    }

    // Validate messages format
    for (const message of messages) {
      if (!message.role || !message.content) {
        return NextResponse.json(
          { error: "Each message must have a role and content" },
          { status: 400 }
        );
      }

      if (!["system", "user", "assistant"].includes(message.role)) {
        return NextResponse.json(
          { error: "Message role must be system, user, or assistant" },
          { status: 400 }
        );
      }
    }

    // Create the training example
    const example = await createTrainingExample(
      userId,
      messages,
      source || "manual",
      tags || []
    );

    return NextResponse.json(example);
  } catch (error) {
    console.error("Error creating training example:", error);
    return NextResponse.json(
      { error: "Failed to create training example" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Example ID is required" },
        { status: 400 }
      );
    }

    // Delete the example
    const result = await deleteTrainingExample(id, userId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error deleting training example:", error);
    return NextResponse.json(
      { error: "Failed to delete training example" },
      { status: 500 }
    );
  }
}
