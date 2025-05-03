import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sourceId = params?.id;

    if (!sourceId) {
      return NextResponse.json(
        { error: "Source ID is required" },
        { status: 400 }
      );
    }

    // Get the source
    const source = await prisma.dataSource.findUnique({
      where: {
        id: sourceId,
      },
      include: {
        agent: true,
      },
    });

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    // Check if the user has access to this source
    if (source.agent.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return the source content
    return NextResponse.json({
      id: source.id,
      name: source.name,
      sourceType: source.sourceType,
      content: source.content,
      characterCount: source.characterCount,
      actualCharacterCount: source.content ? source.content.length : 0,
      createdAt: source.createdAt,
    });
  } catch (error) {
    console.error("Error fetching source content:", error);
    return NextResponse.json(
      { error: "Failed to fetch source content" },
      { status: 500 }
    );
  }
}
