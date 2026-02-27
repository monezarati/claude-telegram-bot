/**
 * Groq provider using OpenAI-compatible API.
 *
 * Chat-only mode: no tools, no MCP, no session resume, no thinking.
 * Maintains conversation history in memory for multi-turn chat.
 */

import OpenAI from "openai";
import type { LLMProvider, LLMEvent, LLMMessageOptions } from "./types";
import { GROQ_API_KEY } from "../config";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class GroqProvider implements LLMProvider {
  readonly name = "groq";
  readonly supportsTools = false;
  readonly supportsResume = false;

  private client: OpenAI;
  private history: ChatMessage[] = [];

  constructor() {
    this.client = new OpenAI({
      apiKey: GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }

  async *sendMessage(
    message: string,
    options: LLMMessageOptions
  ): AsyncGenerator<LLMEvent> {
    // Set system prompt if history is empty (new conversation)
    if (this.history.length === 0 && options.systemPrompt) {
      this.history.push({ role: "system", content: options.systemPrompt });
    }

    // Add user message to history
    this.history.push({ role: "user", content: message });

    const stream = await this.client.chat.completions.create({
      model: options.model,
      messages: this.history,
      stream: true,
    });

    let fullResponse = "";

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullResponse += delta;
        yield { type: "text", text: delta };
      }
    }

    // Save assistant response to history
    if (fullResponse) {
      this.history.push({ role: "assistant", content: fullResponse });
    }

    // Yield result (Groq doesn't provide token usage in streaming mode)
    yield { type: "result" };
  }

  reset(): void {
    this.history = [];
  }
}
