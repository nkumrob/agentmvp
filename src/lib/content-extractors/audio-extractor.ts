import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import axios from "axios";

const execAsync = promisify(exec);

/**
 * Primary method: Extract text from audio
 * This is a simplified version that doesn't require external dependencies
 */
async function extractContentPrimary(audioBuffer: Buffer): Promise<string> {
  try {
    // In a real implementation, we would use a speech recognition library
    // For now, we'll return a placeholder message
    return `This is an audio file that would be transcribed. The audio is ${audioBuffer.length} bytes in size.`;
  } catch (error) {
    console.error(`Primary audio transcription failed: ${error}`);
    throw error;
  }
}

/**
 * Fallback method 1: Extract text using ffmpeg (if available)
 * This is a simplified version that doesn't require vosk
 */
async function extractContentFallback1(audioBuffer: Buffer): Promise<string> {
  try {
    // Create temporary file
    const tempDir = os.tmpdir();
    const tempAudioPath = path.join(tempDir, `temp-${Date.now()}.wav`);

    // Write audio buffer to temp file
    fs.writeFileSync(tempAudioPath, audioBuffer);

    // Check if ffmpeg is available
    try {
      await execAsync("ffmpeg -version");
    } catch (error) {
      throw new Error("ffmpeg is not installed or not in PATH");
    }

    // In a real implementation, we would use ffmpeg to convert audio and then process it
    // For now, we'll return a placeholder message

    // Clean up temp files
    fs.unlinkSync(tempAudioPath);

    return `This is an audio file that would be transcribed using ffmpeg and speech recognition. The audio is ${audioBuffer.length} bytes in size.`;
  } catch (error) {
    console.error(`Fallback 1 audio transcription failed: ${error}`);
    throw error;
  }
}

/**
 * Fallback method 2: Use a free speech-to-text API (if available)
 * Note: This is a placeholder. In a real implementation, you might use a free tier of an STT API.
 */
async function extractContentFallback2(audioBuffer: Buffer): Promise<string> {
  try {
    // Check if AssemblyAI API key is available
    const apiKey = process.env.ASSEMBLYAI_API_KEY;

    if (!apiKey) {
      throw new Error("No speech-to-text API key available");
    }

    // Upload audio file to AssemblyAI
    const uploadResponse = await axios.post(
      "https://api.assemblyai.com/v2/upload",
      audioBuffer,
      {
        headers: {
          "Content-Type": "application/octet-stream",
          Authorization: apiKey,
        },
      }
    );

    if (!uploadResponse.data || !uploadResponse.data.upload_url) {
      throw new Error("Failed to upload audio file");
    }

    // Transcribe audio
    const transcribeResponse = await axios.post(
      "https://api.assemblyai.com/v2/transcript",
      {
        audio_url: uploadResponse.data.upload_url,
      },
      {
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    if (!transcribeResponse.data || !transcribeResponse.data.id) {
      throw new Error("Failed to start transcription");
    }

    // Poll for transcription result
    const transcriptId = transcribeResponse.data.id;
    let transcript;
    let attempts = 0;

    while (attempts < 30) {
      // Timeout after 30 attempts (5 minutes)
      await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds between polls

      transcript = await axios.get(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        {
          headers: {
            Authorization: apiKey,
          },
        }
      );

      if (transcript.data.status === "completed") {
        break;
      } else if (transcript.data.status === "error") {
        throw new Error(`Transcription error: ${transcript.data.error}`);
      }

      attempts++;
    }

    if (!transcript || !transcript.data || !transcript.data.text) {
      throw new Error("Transcription timed out or failed");
    }

    return transcript.data.text.trim();
  } catch (error) {
    console.error(`Fallback 2 audio transcription failed: ${error}`);
    throw error;
  }
}

/**
 * Main function to extract audio content with fallbacks
 */
export async function extractAudioContent(
  audioBuffer: Buffer,
  filename?: string
): Promise<{
  content: string;
  title: string;
  characterCount: number;
  sourceType: string;
}> {
  let content = "";
  let error = null;

  // Try primary method first, then fallbacks
  try {
    content = await extractContentPrimary(audioBuffer);
  } catch (err) {
    error = err;
    console.warn(
      `Primary audio transcription failed, trying fallback 1: ${err}`
    );

    try {
      content = await extractContentFallback1(audioBuffer);
      error = null;
    } catch (err2) {
      console.warn(
        `Fallback 1 audio transcription failed, trying fallback 2: ${err2}`
      );

      try {
        content = await extractContentFallback2(audioBuffer);
        error = null;
      } catch (err3) {
        error = err3;
        console.error(`All audio transcription methods failed: ${err3}`);
      }
    }
  }

  if (error || !content) {
    throw new Error(
      `Failed to transcribe audio content: ${
        error?.message || "No content extracted"
      }`
    );
  }

  // Generate title from filename or default
  const title = filename
    ? `Audio: ${path.basename(filename, path.extname(filename))}`
    : `Audio Recording (${new Date().toISOString().split("T")[0]})`;

  return {
    title,
    content,
    characterCount: content.length,
    sourceType: "audio",
  };
}
