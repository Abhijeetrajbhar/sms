export interface AIProvider {
  complete(prompt: string, systemPrompt?: string): Promise<string>;
  isAvailable(): boolean;
}

export interface AICompletionOptions {
  maxTokens?: number;
  temperature?: number;
}
