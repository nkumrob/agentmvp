export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: string; // JSON string that may contain citations
  citations?: Array<{
    source: string;
    text: string;
  }>;
  feedback?: number;
  feedbackComment?: string;
}

export interface Chat {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  agentId: string;
  userId: string;
  lastMessageAt: string;
}

export interface Agent {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  userId: string;
  personaId?: string;
  persona?: {
    id: string;
    name: string;
    description: string;
    toneRules?: string;
  };
  modelConfig?: {
    id: string;
    baseModel: string;
    provider: string;
    temperature: number;
    maxTokens: number;
    topP?: number | null;
    frequencyPenalty?: number | null;
    presencePenalty?: number | null;
    systemPrompt?: string | null;
    activeModelId?: string | null;
  };
}
