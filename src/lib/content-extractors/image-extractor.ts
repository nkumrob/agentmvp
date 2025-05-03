import { createWorker } from 'tesseract.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';

const execAsync = promisify(exec);

/**
 * Primary method: Extract text from image using Tesseract.js
 */
async function extractContentPrimary(imageBuffer: Buffer): Promise<string> {
  try {
    // Initialize Tesseract worker
    const worker = await createWorker('eng');
    
    // Recognize text in image
    const { data } = await worker.recognize(imageBuffer);
    await worker.terminate();
    
    if (!data.text || data.text.trim().length === 0) {
      throw new Error('No text content extracted from image');
    }
    
    // Clean up content
    return data.text.replace(/\s+/g, ' ').trim();
  } catch (error) {
    console.error(`Primary image OCR failed: ${error}`);
    throw error;
  }
}

/**
 * Fallback method 1: Extract text using external tesseract command
 */
async function extractContentFallback1(imageBuffer: Buffer): Promise<string> {
  try {
    // Create temporary file
    const tempDir = os.tmpdir();
    const tempImagePath = path.join(tempDir, `temp-${Date.now()}.png`);
    const tempTextPath = path.join(tempDir, `temp-${Date.now()}.txt`);
    
    // Write image buffer to temp file
    fs.writeFileSync(tempImagePath, imageBuffer);
    
    // Run tesseract command
    await execAsync(`tesseract "${tempImagePath}" "${tempTextPath.replace('.txt', '')}" -l eng`);
    
    // Read extracted text
    const content = fs.readFileSync(`${tempTextPath}`, 'utf8');
    
    // Clean up temp files
    fs.unlinkSync(tempImagePath);
    fs.unlinkSync(`${tempTextPath}`);
    
    if (!content || content.trim().length === 0) {
      throw new Error('No text content extracted from image');
    }
    
    // Clean up content
    return content.replace(/\s+/g, ' ').trim();
  } catch (error) {
    console.error(`Fallback 1 image OCR failed: ${error}`);
    throw error;
  }
}

/**
 * Fallback method 2: Use a free OCR API (if available)
 * Note: This is a placeholder. In a real implementation, you might use a free tier of an OCR API.
 */
async function extractContentFallback2(imageBuffer: Buffer): Promise<string> {
  try {
    // This is a placeholder for using a free OCR API
    // In a real implementation, you would:
    // 1. Check if you have API keys for a free OCR service
    // 2. Send the image to the API
    // 3. Get back the OCR result
    
    // For demonstration, we'll check if OCR.space API key is available
    const apiKey = process.env.OCR_SPACE_API_KEY;
    
    if (!apiKey) {
      throw new Error('No OCR API key available');
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('apikey', apiKey);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('file', new Blob([imageBuffer]), 'image.png');
    
    // Send request to OCR.space
    const response = await axios.post(
      'https://api.ocr.space/parse/image',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    if (response.data && response.data.ParsedResults && response.data.ParsedResults.length > 0) {
      const content = response.data.ParsedResults[0].ParsedText;
      
      if (!content || content.trim().length === 0) {
        throw new Error('No text content extracted from image');
      }
      
      // Clean up content
      return content.replace(/\s+/g, ' ').trim();
    } else {
      throw new Error('OCR API returned no results');
    }
  } catch (error) {
    console.error(`Fallback 2 image OCR failed: ${error}`);
    throw error;
  }
}

/**
 * Main function to extract image content with fallbacks
 */
export async function extractImageContent(imageBuffer: Buffer, filename?: string): Promise<{
  content: string;
  title: string;
  characterCount: number;
  sourceType: string;
}> {
  let content = '';
  let error = null;
  
  // Try primary method first, then fallbacks
  try {
    content = await extractContentPrimary(imageBuffer);
  } catch (err) {
    error = err;
    console.warn(`Primary image OCR failed, trying fallback 1: ${err}`);
    
    try {
      content = await extractContentFallback1(imageBuffer);
      error = null;
    } catch (err2) {
      console.warn(`Fallback 1 image OCR failed, trying fallback 2: ${err2}`);
      
      try {
        content = await extractContentFallback2(imageBuffer);
        error = null;
      } catch (err3) {
        error = err3;
        console.error(`All image OCR methods failed: ${err3}`);
      }
    }
  }
  
  if (error || !content) {
    throw new Error(`Failed to extract image content: ${error?.message || 'No content extracted'}`);
  }
  
  // Generate title from filename or default
  const title = filename 
    ? `Image: ${path.basename(filename, path.extname(filename))}` 
    : `Image Document (${new Date().toISOString().split('T')[0]})`;
  
  return {
    title,
    content,
    characterCount: content.length,
    sourceType: 'image'
  };
}
