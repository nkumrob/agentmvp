/**
 * Utility functions for cleaning and normalizing extracted content
 */

/**
 * Clean and normalize text content
 * @param content The raw content to clean
 * @returns Cleaned and normalized content
 */
export function cleanContent(content: string): string {
  if (!content) return '';
  
  let cleaned = content;
  
  // Step 1: Remove HTML tags
  cleaned = removeHtmlTags(cleaned);
  
  // Step 2: Normalize whitespace
  cleaned = normalizeWhitespace(cleaned);
  
  // Step 3: Remove duplicate paragraphs
  cleaned = removeDuplicateParagraphs(cleaned);
  
  // Step 4: Remove common boilerplate text
  cleaned = removeBoilerplate(cleaned);
  
  // Step 5: Fix common OCR/extraction errors
  cleaned = fixCommonErrors(cleaned);
  
  // Step 6: Normalize line endings
  cleaned = normalizeLineEndings(cleaned);
  
  return cleaned;
}

/**
 * Remove HTML tags from content
 */
function removeHtmlTags(content: string): string {
  // Basic HTML tag removal
  let cleaned = content.replace(/<[^>]*>/g, ' ');
  
  // Handle HTML entities
  cleaned = cleaned.replace(/&nbsp;/g, ' ');
  cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = cleaned.replace(/&lt;/g, '<');
  cleaned = cleaned.replace(/&gt;/g, '>');
  cleaned = cleaned.replace(/&quot;/g, '"');
  cleaned = cleaned.replace(/&#39;/g, "'");
  
  // Handle more complex HTML entities
  cleaned = cleaned.replace(/&#x?[0-9a-f]+;/gi, ' ');
  
  return cleaned;
}

/**
 * Normalize whitespace in content
 */
function normalizeWhitespace(content: string): string {
  // Replace multiple spaces, tabs, and other whitespace with a single space
  let cleaned = content.replace(/\s+/g, ' ');
  
  // Ensure proper spacing around punctuation
  cleaned = cleaned.replace(/\s+([.,;:!?)])/g, '$1');
  cleaned = cleaned.replace(/([({])\s+/g, '$1');
  
  // Ensure proper paragraph breaks
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
}

/**
 * Remove duplicate paragraphs that often appear in extracted content
 */
function removeDuplicateParagraphs(content: string): string {
  // Split into paragraphs
  const paragraphs = content.split('\n\n');
  
  // Remove exact duplicates
  const uniqueParagraphs = [...new Set(paragraphs)];
  
  // Check for near-duplicates (paragraphs that are very similar)
  const filteredParagraphs = [];
  const seenContent = new Set();
  
  for (const paragraph of uniqueParagraphs) {
    // Skip very short paragraphs
    if (paragraph.length < 10) {
      filteredParagraphs.push(paragraph);
      continue;
    }
    
    // Create a simplified version for comparison (lowercase, only alphanumeric)
    const simplified = paragraph.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Skip if we've seen something very similar
    if (seenContent.has(simplified)) {
      continue;
    }
    
    seenContent.add(simplified);
    filteredParagraphs.push(paragraph);
  }
  
  return filteredParagraphs.join('\n\n');
}

/**
 * Remove common boilerplate text that appears in extracted content
 */
function removeBoilerplate(content: string): string {
  const boilerplatePatterns = [
    // Common website footer text
    /Copyright © \d{4}.*?All rights reserved\./gi,
    /Terms of (Use|Service)|Privacy Policy/gi,
    
    // Common navigation text
    /Home\s+About\s+Contact\s+FAQ/gi,
    
    // Cookie notices
    /This website uses cookies.*?experience/gi,
    
    // Social media boilerplate
    /Follow us on (Twitter|Facebook|Instagram|LinkedIn)/gi,
    
    // Common YouTube boilerplate
    /Don't forget to like and subscribe/gi,
    /Click the bell icon to be notified/gi,
    
    // Common PDF extraction artifacts
    /Page \d+ of \d+/gi,
    
    // Common email/newsletter signup text
    /Sign up for our newsletter/gi,
    /Enter your email address/gi,
    
    // Common website header/footer navigation
    /Skip to (main content|navigation)/gi,
    
    // Common "read more" text
    /Read more\.\.\./gi,
    /Continue reading/gi,
  ];
  
  let cleaned = content;
  
  // Apply each pattern
  for (const pattern of boilerplatePatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  return cleaned;
}

/**
 * Fix common OCR and extraction errors
 */
function fixCommonErrors(content: string): string {
  let cleaned = content;
  
  // Fix common OCR errors
  const commonErrors = [
    [/\bI\s+I\b/g, 'll'], // Fix "I I" to "ll"
    [/\b0\b/g, 'o'],      // Fix "0" to "o" when it's a single character
    [/\bl\b/g, 'i'],      // Fix "l" to "i" when it's a single character
    [/\bm\s+n\b/g, 'mn'], // Fix "m n" to "mn"
    [/\ba\s+n\s+d\b/g, 'and'], // Fix "a n d" to "and"
    [/\bt\s+h\s+e\b/g, 'the'], // Fix "t h e" to "the"
    [/\bf\s+o\s+r\b/g, 'for'], // Fix "f o r" to "for"
  ];
  
  for (const [pattern, replacement] of commonErrors) {
    cleaned = cleaned.replace(pattern, replacement as string);
  }
  
  // Fix repeated punctuation
  cleaned = cleaned.replace(/([.,;:!?]){2,}/g, '$1');
  
  // Fix spaces before punctuation
  cleaned = cleaned.replace(/\s+([.,;:!?])/g, '$1');
  
  return cleaned;
}

/**
 * Normalize line endings to ensure consistent paragraph breaks
 */
function normalizeLineEndings(content: string): string {
  // First convert all line endings to \n
  let cleaned = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Ensure paragraphs are separated by double line breaks
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // Ensure sentences end with proper spacing
  cleaned = cleaned.replace(/([.!?])\s*\n/g, '$1\n');
  
  return cleaned.trim();
}

/**
 * Calculate accurate character count after cleaning
 */
export function getAccurateCharacterCount(content: string): number {
  const cleaned = cleanContent(content);
  return cleaned.length;
}

/**
 * Check if content is likely to be clean and meaningful
 */
export function isContentClean(content: string): boolean {
  // Check if content is too short
  if (content.length < 50) return false;
  
  // Check if content has too many non-alphanumeric characters
  const alphanumericRatio = content.replace(/[^a-zA-Z0-9]/g, '').length / content.length;
  if (alphanumericRatio < 0.5) return false;
  
  // Check if content has too many repeated characters
  const repeatedCharPattern = /(.)\1{5,}/;
  if (repeatedCharPattern.test(content)) return false;
  
  return true;
}

/**
 * Detect and fix encoding issues
 */
export function fixEncodingIssues(content: string): string {
  let cleaned = content;
  
  // Fix common encoding issues
  const encodingFixes = [
    [/â€™/g, "'"],   // Right single quotation mark
    [/â€œ/g, '"'],   // Left double quotation mark
    [/â€/g, '"'],    // Right double quotation mark
    [/â€¦/g, '...'], // Ellipsis
    [/â€"/g, '–'],   // En dash
    [/â€"/g, '—'],   // Em dash
    [/Â /g, ' '],    // Non-breaking space
  ];
  
  for (const [pattern, replacement] of encodingFixes) {
    cleaned = cleaned.replace(pattern, replacement as string);
  }
  
  return cleaned;
}
