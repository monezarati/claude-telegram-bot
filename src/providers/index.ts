/**
 * LLM Provider factory.
 */

import type { LLMProvider } from "./types";
import { ClaudeProvider } from "./claude";
import { GroqProvider } from "./groq";

export type { LLMProvider, LLMEvent, LLMMessageOptions } from "./types";

export function createProvider(provider: string): LLMProvider {
  switch (provider) {
    case "claude":
      return new ClaudeProvider();
    case "groq":
      return new GroqProvider();
    default:
      throw new Error(
        `Unknown LLM provider: "${provider}". Supported: claude, groq`
      );
  }
}
