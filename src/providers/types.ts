/**
 * LLM Provider interface and event types.
 *
 * Abstracts different LLM backends behind a common streaming interface.
 */

import type { TokenUsage } from "../types";

// Events yielded by providers during streaming
export type LLMEvent =
  | { type: "text"; text: string }
  | { type: "thinking"; text: string }
  | {
      type: "tool_use";
      name: string;
      input: Record<string, unknown>;
    }
  | { type: "result"; usage?: TokenUsage }
  | { type: "session_id"; id: string };

// Options passed to sendMessage
export interface LLMMessageOptions {
  systemPrompt: string;
  model: string;
  cwd: string;
  thinkingTokens: number;
  abortSignal?: AbortSignal;
  sessionId?: string;
  mcpServers?: Record<string, unknown>;
  allowedPaths?: string[];
}

// Common interface for all LLM providers
export interface LLMProvider {
  readonly name: string;
  readonly supportsTools: boolean;
  readonly supportsResume: boolean;

  sendMessage(
    message: string,
    options: LLMMessageOptions
  ): AsyncGenerator<LLMEvent>;

  reset(): void;
}
