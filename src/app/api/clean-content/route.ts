import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { cleanContent, getAccurateCharacterCount, fixEncodingIssues } from "@/lib/content-extractors/content-cleaner";

export async function POST(req: Request) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    // Fix encoding issues first
    const fixedContent = fixEncodingIssues(content);
    
    // Apply comprehensive cleaning
    const cleanedContent = cleanContent(fixedContent);
    
    // Calculate metrics
    const originalLength = content.length;
    const cleanedLength = cleanedContent.length;
    const originalWordCount = content.split(/\s+/).filter(Boolean).length;
    const cleanedWordCount = cleanedContent.split(/\s+/).filter(Boolean).length;
    const originalParagraphCount = content.split('\n\n').filter(Boolean).length;
    const cleanedParagraphCount = cleanedContent.split('\n\n').filter(Boolean).length;
    
    // Calculate difference percentage
    const lengthDifference = originalLength - cleanedLength;
    const percentageDifference = (lengthDifference / originalLength) * 100;
    
    return NextResponse.json({
      cleanedContent,
      metrics: {
        originalLength,
        cleanedLength,
        originalWordCount,
        cleanedWordCount,
        originalParagraphCount,
        cleanedParagraphCount,
        lengthDifference,
        percentageDifference: parseFloat(percentageDifference.toFixed(2)),
      }
    });
  } catch (error) {
    console.error("Error cleaning content:", error);
    return NextResponse.json(
      { error: "Failed to clean content" },
      { status: 500 }
    );
  }
}
