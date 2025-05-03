import { MODEL_PROVIDERS } from './model-providers';

/**
 * Fallback implementation for when the Anthropic package is not available
 */
export const anthropicFallback = {
  /**
   * Fallback for Anthropic chat completion
   */
  generateCompletion: async (model: string, messages: any[], parameters: any) => {
    console.warn('Using Anthropic fallback - package not available');
    
    return {
      content: 'I apologize, but the Anthropic service is currently unavailable. Please try again later or use a different model provider.',
      model,
      provider: MODEL_PROVIDERS.ANTHROPIC,
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };
  },
  
  /**
   * Fallback for Anthropic streaming chat completion
   */
  generateStreamingCompletion: async function* (model: string, messages: any[], parameters: any) {
    console.warn('Using Anthropic streaming fallback - package not available');
    
    const fallbackMessage = 'I apologize, but the Anthropic service is currently unavailable. Please try again later or use a different model provider.';
    
    // Simulate streaming by yielding one character at a time
    let fullContent = '';
    
    for (let i = 0; i < fallbackMessage.length; i++) {
      const char = fallbackMessage[i];
      fullContent += char;
      
      yield {
        content: char,
        fullContent,
        model,
        provider: MODEL_PROVIDERS.ANTHROPIC,
        usage: null,
        done: i === fallbackMessage.length - 1,
      };
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Final yield with usage data
    yield {
      content: '',
      fullContent,
      model,
      provider: MODEL_PROVIDERS.ANTHROPIC,
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
      done: true,
    };
  },
};
