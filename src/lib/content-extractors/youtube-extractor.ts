import { YoutubeTranscript } from "youtube-transcript";
import axios from "axios";
import * as cheerio from "cheerio";

// Use dynamic import for puppeteer to avoid build issues
let puppeteer: any = null;

// Only import puppeteer in server environment
if (typeof window === "undefined") {
  // This will only run on the server side
  import("puppeteer")
    .then((module) => {
      puppeteer = module.default;
    })
    .catch((err) => {
      console.warn("Failed to load puppeteer:", err);
    });
}

/**
 * Extract video ID from YouTube URL
 */
export function extractVideoId(url: string): string | null {
  const regExp =
    /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[7].length === 11 ? match[7] : null;
}

/**
 * Primary method: Extract transcript using youtube-transcript library
 */
async function extractTranscriptPrimary(videoId: string): Promise<string> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);

    if (!transcript || transcript.length === 0) {
      throw new Error("No transcript found");
    }

    // Combine transcript segments into a single text
    // Make sure we don't have duplicate segments by using a Set
    const uniqueSegments = new Set(transcript.map((segment) => segment.text));
    return Array.from(uniqueSegments).join(" ").replace(/\s+/g, " ").trim();
  } catch (error) {
    console.error(`Primary transcript extraction failed: ${error}`);
    throw error;
  }
}

/**
 * Fallback method 1: Extract transcript using YouTube page scraping
 */
async function extractTranscriptFallback1(videoId: string): Promise<string> {
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await axios.get(url);
    const html = response.data;

    // Look for transcript data in the page
    const transcriptMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
    if (!transcriptMatch) {
      throw new Error("No caption tracks found in page");
    }

    // Parse the caption tracks JSON
    const captionTracks = JSON.parse(transcriptMatch[1].replace(/\\"/g, '"'));

    if (!captionTracks || captionTracks.length === 0) {
      throw new Error("No caption tracks available");
    }

    // Get the first English track or the first track if no English
    const track =
      captionTracks.find((t: any) => t.languageCode === "en") ||
      captionTracks[0];

    if (!track || !track.baseUrl) {
      throw new Error("No valid caption track found");
    }

    // Fetch the transcript XML
    const transcriptResponse = await axios.get(track.baseUrl);
    const transcriptXml = transcriptResponse.data;

    // Parse the XML to extract text
    const $ = cheerio.load(transcriptXml, { xmlMode: true });
    const textSegments = $("text")
      .map((_, el) => $(el).text())
      .get();

    // Remove duplicate segments
    const uniqueSegments = new Set(textSegments);
    return Array.from(uniqueSegments).join(" ").replace(/\s+/g, " ").trim();
  } catch (error) {
    console.error(`Fallback 1 transcript extraction failed: ${error}`);
    throw error;
  }
}

/**
 * Fallback method 2: Extract transcript using Puppeteer
 * Note: This will only work in a Node.js environment
 */
async function extractTranscriptFallback2(videoId: string): Promise<string> {
  // Check if we're in a browser environment or if puppeteer failed to load
  if (typeof window !== "undefined" || !puppeteer) {
    throw new Error("Puppeteer is not available in this environment");
  }

  let browser = null;
  try {
    browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    // Go to video page
    await page.goto(`https://www.youtube.com/watch?v=${videoId}`, {
      waitUntil: "networkidle2",
    });

    // Click on the "..." button to open menu
    await page.waitForSelector("button.ytp-button.ytp-settings-button");
    await page.click("button.ytp-button.ytp-settings-button");

    // Wait for menu and click on "Open transcript"
    await page.waitForSelector(".ytp-panel-menu");

    // Find and click the transcript option
    const transcriptButton = await page.evaluateHandle(() => {
      const menuItems = Array.from(document.querySelectorAll(".ytp-menuitem"));
      return menuItems.find((item) => {
        const label = item.querySelector(".ytp-menuitem-label");
        return (
          label && label.textContent && label.textContent.includes("transcript")
        );
      });
    });

    if (!transcriptButton) {
      throw new Error("Transcript option not found");
    }

    await transcriptButton.click();

    // Wait for transcript panel and extract text
    await page.waitForSelector(".ytd-transcript-renderer");

    const transcriptText = await page.evaluate(() => {
      const segments = Array.from(
        document.querySelectorAll(".ytd-transcript-segment-renderer")
      );

      // Extract text from segments
      const textSegments = segments
        .map((segment) => {
          const textElement = segment.querySelector(".segment-text");
          return textElement ? textElement.textContent : "";
        })
        .filter((text) => text.trim() !== "");

      // Remove duplicate segments
      const uniqueSegments = Array.from(new Set(textSegments));
      return uniqueSegments.join(" ");
    });

    return transcriptText.replace(/\s+/g, " ").trim();
  } catch (error) {
    console.error(`Fallback 2 transcript extraction failed: ${error}`);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Extract video title using axios and cheerio
 */
async function extractVideoTitle(videoId: string): Promise<string> {
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await axios.get(url);
    const html = response.data;

    const $ = cheerio.load(html);

    // Try to get title from meta tags
    const metaTitle =
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="title"]').attr("content");

    if (metaTitle) {
      return metaTitle.trim();
    }

    // Fallback to title tag
    const titleTag = $("title").text();
    if (titleTag) {
      // Remove " - YouTube" suffix if present
      return titleTag.replace(/ - YouTube$/, "").trim();
    }

    // Last resort
    return `YouTube Video: ${videoId}`;
  } catch (error) {
    console.error(`Failed to extract video title: ${error}`);
    return `YouTube Video: ${videoId}`;
  }
}

/**
 * Main function to extract YouTube content with fallbacks
 */
export async function extractYouTubeContent(videoUrl: string): Promise<{
  content: string;
  title: string;
  characterCount: number;
  sourceType: string;
}> {
  // Extract video ID
  const videoId = extractVideoId(videoUrl);
  if (!videoId) {
    throw new Error("Invalid YouTube URL");
  }

  // Get video title
  const title = await extractVideoTitle(videoId);

  // Try primary method first, then fallbacks
  let content = "";
  let error = null;

  try {
    content = await extractTranscriptPrimary(videoId);
  } catch (err) {
    error = err;
    console.warn(
      `Primary YouTube transcript extraction failed, trying fallback 1: ${err}`
    );

    try {
      content = await extractTranscriptFallback1(videoId);
      error = null;
    } catch (err2) {
      console.warn(
        `Fallback 1 YouTube transcript extraction failed, trying fallback 2: ${err2}`
      );

      try {
        content = await extractTranscriptFallback2(videoId);
        error = null;
      } catch (err3) {
        error = err3;
        console.error(
          `All YouTube transcript extraction methods failed: ${err3}`
        );
      }
    }
  }

  if (error || !content) {
    throw new Error(
      `Failed to extract YouTube transcript: ${
        error?.message || "No content extracted"
      }`
    );
  }

  // Import the content cleaner
  const { cleanContent, getAccurateCharacterCount } = await import(
    "./content-cleaner"
  );

  // Apply comprehensive cleaning
  const cleanedContent = cleanContent(content);

  // Get accurate character count
  const characterCount = getAccurateCharacterCount(cleanedContent);

  // Log cleaning results for debugging
  console.log(
    `YouTube content cleaning: Original length: ${content.length}, Cleaned length: ${cleanedContent.length}`
  );

  return {
    title,
    content: cleanedContent,
    characterCount,
    sourceType: "youtube",
  };
}
