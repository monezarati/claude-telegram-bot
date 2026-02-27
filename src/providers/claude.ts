/**
 * Claude provider using the Agent SDK.
 *
 * Full-featured: tools, MCP servers, session resume, extended thinking.
 */

import {
  query,
  type Options,
} from "@anthropic-ai/claude-agent-sdk";
import type { LLMProvider, LLMEvent, LLMMessageOptions } from "./types";

export class ClaudeProvider implements LLMProvider {
  readonly name = "claude";
  readonly supportsTools = true;
  readonly supportsResume = true;

  async *sendMessage(
    message: string,
    options: LLMMessageOptions
  ): AsyncGenerator<LLMEvent> {
    const abortController = new AbortController();

    // Wire external abort signal to our controller
    if (options.abortSignal) {
      options.abortSignal.addEventListener("abort", () =>
        abortController.abort()
      );
    }

    const queryOptions: Options = {
      model: options.model,
      cwd: options.cwd,
      settingSources: ["user", "project"],
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      systemPrompt: options.systemPrompt,
      mcpServers: options.mcpServers as Options["mcpServers"],
      maxThinkingTokens: options.thinkingTokens,
      additionalDirectories: options.allowedPaths,
      resume: options.sessionId || undefined,
      abortController,
    };

    if (process.env.CLAUDE_CODE_PATH) {
      queryOptions.pathToClaudeCodeExecutable = process.env.CLAUDE_CODE_PATH;
    }

    const queryInstance = query({
      prompt: message,
      options: queryOptions,
    });

    for await (const event of queryInstance) {
      // Yield session_id
      if (event.session_id) {
        yield { type: "session_id", id: event.session_id };
      }

      if (event.type === "assistant") {
        for (const block of event.message.content) {
          if (block.type === "thinking") {
            const thinkingText = (block as { thinking?: string }).thinking;
            if (thinkingText) {
              yield { type: "thinking", text: thinkingText };
            }
          }

          if (block.type === "tool_use") {
            yield {
              type: "tool_use",
              name: block.name,
              input: block.input as Record<string, unknown>,
            };
          }

          if (block.type === "text") {
            yield { type: "text", text: block.text };
          }
        }
      }

      if (event.type === "result") {
        const usage = "usage" in event ? event.usage : undefined;
        yield {
          type: "result",
          usage: usage as LLMEvent extends { type: "result" }
            ? LLMEvent["usage"]
            : never,
        };
      }
    }
  }

  reset(): void {
    // Claude sessions are managed by session ID; nothing to clear here
  }
}
