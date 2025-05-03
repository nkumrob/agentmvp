import axios from "axios";
import * as cheerio from "cheerio";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

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
 * Primary method: Extract website content using Readability
 */
async function extractContentPrimary(url: string): Promise<{
  title: string;
  content: string;
}> {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    const html = response.data;
    const dom = new JSDOM(html, { url });

    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      throw new Error("Failed to parse article content");
    }

    return {
      title: article.title || new URL(url).hostname,
      content: article.textContent || "",
    };
  } catch (error) {
    console.error(`Primary website extraction failed: ${error}`);
    throw error;
  }
}

/**
 * Fallback method 1: Extract website content using Cheerio
 */
async function extractContentFallback1(url: string): Promise<{
  title: string;
  content: string;
}> {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Get title
    const title = $("title").text().trim() || new URL(url).hostname;

    // Remove non-content elements
    $(
      'script, style, meta, link, noscript, header, footer, nav, aside, iframe, [role="banner"], [role="navigation"]'
    ).remove();

    // Try to find main content
    let content = "";
    const contentSelectors = [
      "article",
      "main",
      '[role="main"]',
      ".content",
      "#content",
      ".post",
      ".article",
      ".post-content",
      ".entry-content",
      '[itemprop="articleBody"]',
    ];

    for (const selector of contentSelectors) {
      if ($(selector).length) {
        content = $(selector).text().trim();
        break;
      }
    }

    // If no content found, use body
    if (!content) {
      content = $("body").text().trim();
    }

    // Clean up content
    content = content.replace(/\s+/g, " ").trim();

    return { title, content };
  } catch (error) {
    console.error(`Fallback 1 website extraction failed: ${error}`);
    throw error;
  }
}

/**
 * Fallback method 2: Extract website content using Puppeteer
 * Note: This will only work in a Node.js environment
 */
async function extractContentFallback2(url: string): Promise<{
  title: string;
  content: string;
}> {
  // Check if we're in a browser environment or if puppeteer failed to load
  if (typeof window !== "undefined" || !puppeteer) {
    throw new Error("Puppeteer is not available in this environment");
  }

  let browser = null;
  try {
    browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    // Set user agent
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );

    // Navigate to URL
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    // Get page title
    const title = (await page.title()) || new URL(url).hostname;

    // Extract content using Readability in the browser context
    const content = await page.evaluate(() => {
      // @ts-ignore - Readability will be injected
      if (typeof Readability === "undefined") {
        // Simple content extraction if Readability is not available
        document
          .querySelectorAll("script, style, meta, link, noscript")
          .forEach((el) => el.remove());

        // Try to find main content
        const contentSelectors = [
          "article",
          "main",
          '[role="main"]',
          ".content",
          "#content",
          ".post",
          ".article",
          ".post-content",
          ".entry-content",
          '[itemprop="articleBody"]',
        ];

        for (const selector of contentSelectors) {
          const element = document.querySelector(selector);
          if (element) return element.textContent;
        }

        // Fallback to body
        return document.body.textContent;
      } else {
        // Use Readability if available
        const reader = new Readability(document);
        const article = reader.parse();
        return article ? article.textContent : document.body.textContent;
      }
    });

    // Clean up content
    const cleanContent = content.replace(/\s+/g, " ").trim();

    return { title, content: cleanContent };
  } catch (error) {
    console.error(`Fallback 2 website extraction failed: ${error}`);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Main function to extract website content with fallbacks
 */
export async function extractWebsiteContent(url: string): Promise<{
  content: string;
  title: string;
  characterCount: number;
  sourceType: string;
}> {
  let result = null;
  let error = null;

  // Try primary method first, then fallbacks
  try {
    result = await extractContentPrimary(url);
  } catch (err) {
    error = err;
    console.warn(
      `Primary website extraction failed, trying fallback 1: ${err}`
    );

    try {
      result = await extractContentFallback1(url);
      error = null;
    } catch (err2) {
      console.warn(
        `Fallback 1 website extraction failed, trying fallback 2: ${err2}`
      );

      try {
        result = await extractContentFallback2(url);
        error = null;
      } catch (err3) {
        error = err3;
        console.error(`All website extraction methods failed: ${err3}`);
      }
    }
  }

  if (error || !result) {
    throw new Error(
      `Failed to extract website content: ${
        error?.message || "No content extracted"
      }`
    );
  }

  // Import the content cleaner
  const { cleanContent, getAccurateCharacterCount, fixEncodingIssues } =
    await import("./content-cleaner");

  // Fix any encoding issues first
  const fixedContent = fixEncodingIssues(result.content);

  // Apply comprehensive cleaning
  const cleanedContent = cleanContent(fixedContent);

  // Get accurate character count
  const characterCount = getAccurateCharacterCount(cleanedContent);

  // Log cleaning results for debugging
  console.log(
    `Website content cleaning: Original length: ${result.content.length}, Cleaned length: ${cleanedContent.length}`
  );

  return {
    title: result.title,
    content: cleanedContent,
    characterCount,
    sourceType: "url",
  };
}
