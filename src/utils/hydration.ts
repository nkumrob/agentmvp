/**
 * Utility functions to help with hydration errors
 */

/**
 * Safely parse JSON with fallback for hydration errors
 * @param jsonString The JSON string to parse
 * @param fallback Fallback value if parsing fails
 * @returns Parsed JSON or fallback
 */
export function safeJsonParse<T>(jsonString: string | null | undefined, fallback: T): T {
  if (!jsonString) return fallback;
  
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return fallback;
  }
}

/**
 * Check if code is running on the client side
 * @returns true if running in a browser, false otherwise
 */
export function isClient(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Safely access window object to prevent hydration errors
 * @param callback Function to execute with window object
 * @param fallback Fallback value if window is not available
 * @returns Result of callback or fallback
 */
export function withWindow<T>(callback: (w: Window) => T, fallback: T): T {
  if (isClient()) {
    return callback(window);
  }
  return fallback;
}
