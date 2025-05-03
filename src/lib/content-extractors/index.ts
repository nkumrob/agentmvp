// Import utility functions that are safe for browser environments
import { detectSourceTypeFromUrl, detectSourceTypeFromFile } from "./utils";

// Use dynamic imports for Node.js specific modules
// These will only be loaded in a server environment
let extractors: any = {
  async loadExtractors() {
    if (typeof window === "undefined") {
      // Server-side only imports
      const youtubeModule = await import("./youtube-extractor");
      const websiteModule = await import("./website-extractor");
      const pdfModule = await import("./pdf-extractor");
      const imageModule = await import("./image-extractor");
      const audioModule = await import("./audio-extractor");

      return {
        extractYouTubeContent: youtubeModule.extractYouTubeContent,
        extractVideoId: youtubeModule.extractVideoId,
        extractWebsiteContent: websiteModule.extractWebsiteContent,
        extractPdfContent: pdfModule.extractPdfContent,
        extractImageContent: imageModule.extractImageContent,
        extractAudioContent: audioModule.extractAudioContent,
      };
    }

    // In browser environment, return placeholder functions
    return {
      extractYouTubeContent: () =>
        Promise.reject(
          new Error("YouTube extraction not available in browser")
        ),
      extractVideoId: (url: string) => {
        const regExp =
          /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        return match && match[7].length === 11 ? match[7] : null;
      },
      extractWebsiteContent: () =>
        Promise.reject(
          new Error("Website extraction not available in browser")
        ),
      extractPdfContent: () =>
        Promise.reject(new Error("PDF extraction not available in browser")),
      extractImageContent: () =>
        Promise.reject(new Error("Image extraction not available in browser")),
      extractAudioContent: () =>
        Promise.reject(new Error("Audio extraction not available in browser")),
    };
  },
};

export interface ExtractedContent {
  content: string;
  title: string;
  characterCount: number;
  sourceType: string;
}

/**
 * Detect source type from URL
 */
export function detectSourceTypeFromUrl(url: string): string {
  const urlLower = url.toLowerCase();

  // Check for YouTube
  if (
    urlLower.includes("youtube.com/watch") ||
    urlLower.includes("youtu.be/") ||
    urlLower.includes("youtube.com/embed/")
  ) {
    return "youtube";
  }

  // Check for PDF
  if (urlLower.endsWith(".pdf")) {
    return "pdf";
  }

  // Check for image
  if (
    urlLower.endsWith(".jpg") ||
    urlLower.endsWith(".jpeg") ||
    urlLower.endsWith(".png") ||
    urlLower.endsWith(".gif") ||
    urlLower.endsWith(".webp")
  ) {
    return "image";
  }

  // Check for audio
  if (
    urlLower.endsWith(".mp3") ||
    urlLower.endsWith(".wav") ||
    urlLower.endsWith(".ogg") ||
    urlLower.endsWith(".m4a") ||
    urlLower.endsWith(".flac")
  ) {
    return "audio";
  }

  // Default to website
  return "url";
}

/**
 * Detect source type from file
 */
export function detectSourceTypeFromFile(
  filename: string,
  mimeType?: string
): string {
  const extension = filename.split(".").pop()?.toLowerCase();

  if (mimeType) {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("audio/")) return "audio";
    if (mimeType === "application/pdf") return "pdf";
    if (mimeType === "text/plain") return "text";
  }

  if (extension) {
    if (["pdf"].includes(extension)) return "pdf";
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension))
      return "image";
    if (["mp3", "wav", "ogg", "m4a", "flac"].includes(extension))
      return "audio";
    if (["txt", "md", "csv"].includes(extension)) return "text";
  }

  return "unknown";
}

/**
 * Main function to extract content based on source type
 */
export async function extractContent(
  sourceType: string,
  data: Buffer | string,
  options?: {
    filename?: string;
    url?: string;
    skipCleaning?: boolean; // Option to skip automatic cleaning
  }
): Promise<ExtractedContent> {
  try {
    // Check if we're in a browser environment
    if (typeof window !== "undefined") {
      throw new Error(
        "Content extraction is only available in server environment"
      );
    }

    // Load extractors dynamically
    const extractorModules = await extractors.loadExtractors();

    // Import content cleaner (will be used after extraction)
    const contentCleanerModule = await import("./content-cleaner");

    switch (sourceType.toLowerCase()) {
      case "youtube":
        return await extractorModules.extractYouTubeContent(data as string);

      case "url":
        return await extractorModules.extractWebsiteContent(data as string);

      case "pdf":
        return await extractorModules.extractPdfContent(data as Buffer);

      case "image":
        return await extractorModules.extractImageContent(
          data as Buffer,
          options?.filename
        );

      case "audio":
        return await extractorModules.extractAudioContent(
          data as Buffer,
          options?.filename
        );

      case "text":
        const content = data.toString();
        // Use a safe way to get filename without path module
        const getBasename = (filepath: string) => {
          const parts = filepath.split(/[\/\\]/);
          const filename = parts[parts.length - 1];
          const nameParts = filename.split(".");
          nameParts.pop(); // Remove extension
          return nameParts.join(".");
        };

        const title = options?.filename
          ? getBasename(options.filename)
          : "Text Document";

        // Skip cleaning if explicitly requested
        if (options?.skipCleaning) {
          return {
            content,
            title,
            characterCount: content.length,
            sourceType: "text",
          };
        }

        // Apply comprehensive cleaning
        const cleanedContent = contentCleanerModule.cleanContent(content);

        // Get accurate character count
        const characterCount =
          contentCleanerModule.getAccurateCharacterCount(cleanedContent);

        // Log cleaning results for debugging
        console.log(
          `Text content cleaning: Original length: ${content.length}, Cleaned length: ${cleanedContent.length}`
        );

        return {
          content: cleanedContent,
          title,
          characterCount,
          sourceType: "text",
        };

      default:
        throw new Error(`Unsupported source type: ${sourceType}`);
    }

    // For non-text content types, apply automatic cleaning unless explicitly skipped
    if (sourceType.toLowerCase() !== "text" && !options?.skipCleaning) {
      try {
        // Get the extraction result based on the source type
        let extractionResult;

        switch (sourceType.toLowerCase()) {
          case "youtube":
            extractionResult = await extractorModules.extractYouTubeContent(
              data as string
            );
            break;
          case "url":
            extractionResult = await extractorModules.extractWebsiteContent(
              data as string
            );
            break;
          case "pdf":
            extractionResult = await extractorModules.extractPdfContent(
              data as Buffer
            );
            break;
          case "image":
            extractionResult = await extractorModules.extractImageContent(
              data as Buffer,
              options?.filename
            );
            break;
          case "audio":
            extractionResult = await extractorModules.extractAudioContent(
              data as Buffer,
              options?.filename
            );
            break;
          default:
            throw new Error(`Unsupported source type: ${sourceType}`);
        }

        // Apply cleaning to the content
        const cleanedContent = contentCleanerModule.cleanContent(
          extractionResult.content
        );

        // Get accurate character count
        const characterCount =
          contentCleanerModule.getAccurateCharacterCount(cleanedContent);

        // Log cleaning results for debugging
        console.log(
          `${sourceType} content cleaning: Original length: ${extractionResult.content.length}, Cleaned length: ${cleanedContent.length}`
        );

        // Return the cleaned result
        return {
          ...extractionResult,
          content: cleanedContent,
          characterCount,
        };
      } catch (cleaningError) {
        console.warn(
          `Failed to apply automatic cleaning to ${sourceType} content:`,
          cleaningError
        );
        // Fall back to the original extraction without cleaning
        console.log(`Falling back to uncleaned content for ${sourceType}`);
      }
    }

    // If we reach here, it means we need to extract content without cleaning
    // or we're handling the text case which is already handled above
    switch (sourceType.toLowerCase()) {
      case "youtube":
        return await extractorModules.extractYouTubeContent(data as string);
      case "url":
        return await extractorModules.extractWebsiteContent(data as string);
      case "pdf":
        return await extractorModules.extractPdfContent(data as Buffer);
      case "image":
        return await extractorModules.extractImageContent(
          data as Buffer,
          options?.filename
        );
      case "audio":
        return await extractorModules.extractAudioContent(
          data as Buffer,
          options?.filename
        );
      default:
        throw new Error(`Unsupported source type: ${sourceType}`);
    }
  } catch (error) {
    console.error(`Content extraction failed for ${sourceType}:`, error);
    throw new Error(
      `Failed to extract content from ${sourceType}: ${error.message}`
    );
  }
}

// Export placeholder functions for client-side
// These will be replaced with actual implementations on the server
export const extractYouTubeContent = async (url: string) => {
  if (typeof window !== "undefined") {
    throw new Error(
      "YouTube extraction is only available in server environment"
    );
  }
  const modules = await extractors.loadExtractors();
  return modules.extractYouTubeContent(url);
};

export const extractVideoId = (url: string) => {
  const regExp =
    /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[7].length === 11 ? match[7] : null;
};

export const extractWebsiteContent = async (url: string) => {
  if (typeof window !== "undefined") {
    throw new Error(
      "Website extraction is only available in server environment"
    );
  }
  const modules = await extractors.loadExtractors();
  return modules.extractWebsiteContent(url);
};

export const extractPdfContent = async (data: Buffer) => {
  if (typeof window !== "undefined") {
    throw new Error("PDF extraction is only available in server environment");
  }
  const modules = await extractors.loadExtractors();
  return modules.extractPdfContent(data);
};

export const extractImageContent = async (data: Buffer, filename?: string) => {
  if (typeof window !== "undefined") {
    throw new Error("Image extraction is only available in server environment");
  }
  const modules = await extractors.loadExtractors();
  return modules.extractImageContent(data, filename);
};

export const extractAudioContent = async (data: Buffer, filename?: string) => {
  if (typeof window !== "undefined") {
    throw new Error("Audio extraction is only available in server environment");
  }
  const modules = await extractors.loadExtractors();
  return modules.extractAudioContent(data, filename);
};
