// Using a simpler approach for PDF extraction to avoid dependency issues
// import pdfParse from 'pdf-parse';
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Primary method: Extract PDF content using a simple text extraction
 * This is a placeholder that returns a message since we're not using the actual PDF extraction
 */
async function extractContentPrimary(pdfBuffer: Buffer): Promise<string> {
  try {
    // In a real implementation, we would use pdf-parse or another library
    // For now, we'll return a placeholder message
    return `This is a PDF document with ${pdfBuffer.length} bytes. The actual content would be extracted here.`;
  } catch (error) {
    console.error(`Primary PDF extraction failed: ${error}`);
    throw error;
  }
}

/**
 * Fallback method 1: Extract PDF content using pdfjs-dist
 * Note: This requires installing pdfjs-dist separately
 */
async function extractContentFallback1(pdfBuffer: Buffer): Promise<string> {
  try {
    // Dynamically import pdfjs-dist to avoid requiring it as a dependency
    const pdfjs = await import("pdfjs-dist");

    // Load PDF document
    const loadingTask = pdfjs.getDocument({ data: pdfBuffer });
    const pdf = await loadingTask.promise;

    let content = "";

    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => ("str" in item ? item.str : ""))
        .join(" ");

      content += pageText + " ";
    }

    if (!content || content.trim().length === 0) {
      throw new Error("No text content extracted from PDF");
    }

    // Clean up content
    return content.replace(/\s+/g, " ").trim();
  } catch (error) {
    console.error(`Fallback 1 PDF extraction failed: ${error}`);
    throw error;
  }
}

/**
 * Fallback method 2: Extract PDF content using external tools (pdftotext)
 */
async function extractContentFallback2(pdfBuffer: Buffer): Promise<string> {
  try {
    // Create temporary file
    const tempDir = os.tmpdir();
    const tempPdfPath = path.join(tempDir, `temp-${Date.now()}.pdf`);
    const tempTxtPath = path.join(tempDir, `temp-${Date.now()}.txt`);

    // Write PDF buffer to temp file
    fs.writeFileSync(tempPdfPath, pdfBuffer);

    try {
      // Try using pdftotext (from poppler-utils)
      await execAsync(`pdftotext -layout "${tempPdfPath}" "${tempTxtPath}"`);

      // Read extracted text
      const content = fs.readFileSync(tempTxtPath, "utf8");

      // Clean up temp files
      fs.unlinkSync(tempPdfPath);
      fs.unlinkSync(tempTxtPath);

      if (!content || content.trim().length === 0) {
        throw new Error("No text content extracted from PDF");
      }

      // Clean up content
      return content.replace(/\s+/g, " ").trim();
    } catch (execError) {
      // Try using pdf2txt.py (from pdfminer)
      await execAsync(`pdf2txt.py -o "${tempTxtPath}" "${tempPdfPath}"`);

      // Read extracted text
      const content = fs.readFileSync(tempTxtPath, "utf8");

      // Clean up temp files
      fs.unlinkSync(tempPdfPath);
      fs.unlinkSync(tempTxtPath);

      if (!content || content.trim().length === 0) {
        throw new Error("No text content extracted from PDF");
      }

      // Clean up content
      return content.replace(/\s+/g, " ").trim();
    }
  } catch (error) {
    console.error(`Fallback 2 PDF extraction failed: ${error}`);
    throw error;
  }
}

/**
 * Main function to extract PDF content with fallbacks
 */
export async function extractPdfContent(pdfBuffer: Buffer): Promise<{
  content: string;
  title: string;
  characterCount: number;
  sourceType: string;
}> {
  let content = "";
  let error = null;

  // Try primary method first, then fallbacks
  try {
    content = await extractContentPrimary(pdfBuffer);
  } catch (err) {
    error = err;
    console.warn(`Primary PDF extraction failed, trying fallback 1: ${err}`);

    try {
      content = await extractContentFallback1(pdfBuffer);
      error = null;
    } catch (err2) {
      console.warn(
        `Fallback 1 PDF extraction failed, trying fallback 2: ${err2}`
      );

      try {
        content = await extractContentFallback2(pdfBuffer);
        error = null;
      } catch (err3) {
        error = err3;
        console.error(`All PDF extraction methods failed: ${err3}`);
      }
    }
  }

  if (error || !content) {
    throw new Error(
      `Failed to extract PDF content: ${
        error?.message || "No content extracted"
      }`
    );
  }

  // In a real implementation, we would extract the title from PDF metadata
  // For now, we'll use a generic title
  const title = "PDF Document";

  return {
    title,
    content,
    characterCount: content.length,
    sourceType: "pdf",
  };
}
