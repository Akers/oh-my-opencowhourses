/**
 * Preserve reasoning_content for DeepSeek and other providers that require
 * it in multi-turn conversations with thinking mode enabled.
 *
 * When using @ai-sdk/openai-compatible without `interleaved` configured,
 * reasoning parts in assistant messages are dropped during API
 * serialization, causing "reasoning_content must be passed back" errors.
 *
 * Workaround: inject reasoning text into providerOptions so the provider
 * transform includes it in the API request body.
 *
 * Primary fix: add to model config in opencode.jsonc:
 *   "interleaved": { "field": "reasoning_content" }
 */

/**
 * Preserve reasoning content for assistant messages.
 * Should be called from experimental.chat.messages.transform hook.
 */
export function preserveReasoningContent(
  messages: Array<{
    info: { role: string };
    parts: Array<{
      type: string;
      text?: string;
      [key: string]: unknown;
    }>;
  }>,
): void {
  for (const message of messages) {
    if (message.info.role !== 'assistant') continue;

    const reasoningParts = message.parts.filter(
      (p): p is { type: string; text: string } =>
        p.type === 'reasoning' &&
        typeof p.text === 'string' &&
        p.text.length > 0,
    );
    if (reasoningParts.length === 0) continue;

    const reasoningText = reasoningParts
      .map((p) => p.text)
      .join('\n');
    const msg = message as Record<string, unknown>;
    const opts = (msg.providerOptions ?? {}) as Record<
      string,
      unknown
    >;
    const compat = (opts.openaiCompatible ?? {}) as Record<
      string,
      unknown
    >;

    if (!compat.reasoning_content) {
      msg.providerOptions = {
        ...opts,
        openaiCompatible: {
          ...compat,
          reasoning_content: reasoningText,
        },
      };
    }
  }
}
