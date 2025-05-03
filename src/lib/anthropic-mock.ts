// This is a mock implementation of the Anthropic module
// It's used when the real Anthropic module is not available or not needed

export class Anthropic {
  constructor(options: any) {
    console.log("Mock Anthropic initialized with options:", options);
  }

  async messages() {
    return {
      create: async (params: any) => {
        console.log("Mock Anthropic messages.create called with params:", params);
        return {
          id: "mock-message-id",
          content: [{ text: "This is a mock response from Anthropic" }],
          model: params.model || "claude-3-opus-20240229",
          role: "assistant",
          type: "message"
        };
      }
    };
  }

  async completions() {
    return {
      create: async (params: any) => {
        console.log("Mock Anthropic completions.create called with params:", params);
        return {
          id: "mock-completion-id",
          completion: "This is a mock completion from Anthropic",
          model: params.model || "claude-3-opus-20240229",
          stop_reason: "end_turn"
        };
      }
    };
  }
}

export default Anthropic;
