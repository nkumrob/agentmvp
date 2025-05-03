/**
 * Detect source type from file
 * This is a browser-safe version that doesn't use Node.js modules
 */
export function detectSourceTypeFromFile(filename: string, mimeType?: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  if (mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType === 'text/plain') return 'text';
  }
  
  if (extension) {
    if (['pdf'].includes(extension)) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'image';
    if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(extension)) return 'audio';
    if (['txt', 'md', 'csv'].includes(extension)) return 'text';
  }
  
  return 'unknown';
}

/**
 * Detect source type from URL
 * This is a browser-safe version that doesn't use Node.js modules
 */
export function detectSourceTypeFromUrl(url: string): string {
  const urlLower = url.toLowerCase();
  
  // Check for YouTube
  if (
    urlLower.includes('youtube.com/watch') || 
    urlLower.includes('youtu.be/') ||
    urlLower.includes('youtube.com/embed/')
  ) {
    return 'youtube';
  }
  
  // Check for PDF
  if (urlLower.endsWith('.pdf')) {
    return 'pdf';
  }
  
  // Check for image
  if (
    urlLower.endsWith('.jpg') || 
    urlLower.endsWith('.jpeg') || 
    urlLower.endsWith('.png') || 
    urlLower.endsWith('.gif') ||
    urlLower.endsWith('.webp')
  ) {
    return 'image';
  }
  
  // Check for audio
  if (
    urlLower.endsWith('.mp3') || 
    urlLower.endsWith('.wav') || 
    urlLower.endsWith('.ogg') || 
    urlLower.endsWith('.m4a') ||
    urlLower.endsWith('.flac')
  ) {
    return 'audio';
  }
  
  // Default to website
  return 'url';
}
