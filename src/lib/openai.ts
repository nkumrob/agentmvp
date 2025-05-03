import OpenAI from "openai";

// Initialize the OpenAI client with the API key from environment variables
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to check if OpenAI API key is configured
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

// Helper function to get a formatted error message from OpenAI errors
export function getOpenAIErrorMessage(error: any): string {
  if (!error) return "Unknown error";
  
  // Extract the error message from the OpenAI error object
  if (error.response) {
    // API error response
    const status = error.response.status;
    const message = error.response.data?.error?.message || error.message;
    
    if (status === 401) {
      return "Invalid API key or unauthorized access. Please check your OpenAI API key.";
    } else if (status === 429) {
      return "Rate limit exceeded or quota reached. Please try again later or check your OpenAI account.";
    } else if (status === 500) {
      return "OpenAI server error. Please try again later.";
    }
    
    return `OpenAI API error (${status}): ${message}`;
  }
  
  // Network or other error
  if (error.message) {
    if (error.message.includes("api key")) {
      return "Invalid or missing OpenAI API key. Please check your configuration.";
    }
    return error.message;
  }
  
  // Fallback for unknown error format
  return String(error);
}
