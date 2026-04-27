import { describe, expect, test } from 'bun:test';
import { preserveReasoningContent } from './reasoning-preserve';

describe('preserveReasoningContent', () => {
  test('injects providerOptions.openaiCompatible.reasoning_content for assistant messages with reasoning parts', () => {
    const messages = [
      {
        info: { role: 'user' },
        parts: [{ type: 'text', text: 'Hello' }],
      },
      {
        info: { role: 'assistant' },
        parts: [
          { type: 'reasoning', text: 'Let me think...' },
          { type: 'text', text: 'Final answer' },
        ],
      },
    ];

    preserveReasoningContent(messages);

    expect(
      (messages[1] as Record<string, unknown>).providerOptions,
    ).toEqual({
      openaiCompatible: {
        reasoning_content: 'Let me think...',
      },
    });
  });

  test('joins multiple reasoning parts with newline', () => {
    const messages = [
      {
        info: { role: 'assistant' },
        parts: [
          { type: 'reasoning', text: 'Step 1' },
          { type: 'reasoning', text: 'Step 2' },
          { type: 'text', text: 'Answer' },
        ],
      },
    ];

    preserveReasoningContent(messages);

    const opts = (messages[0] as Record<string, unknown>)
      .providerOptions as Record<string, unknown>;
    const compat = opts.openaiCompatible as Record<string, unknown>;
    expect(compat.reasoning_content).toBe('Step 1\nStep 2');
  });

  test('does not overwrite existing providerOptions', () => {
    const messages = [
      {
        info: { role: 'assistant' },
        parts: [
          { type: 'reasoning', text: 'Thinking' },
          { type: 'text', text: 'Answer' },
        ],
        providerOptions: {
          openaiCompatible: {
            customField: 'value',
          },
          otherProvider: {
            key: 'val',
          },
        },
      },
    ];

    preserveReasoningContent(messages);

    const opts = (messages[0] as Record<string, unknown>)
      .providerOptions as Record<string, unknown>;
    const compat = opts.openaiCompatible as Record<string, unknown>;
    expect(compat.reasoning_content).toBe('Thinking');
    expect(compat.customField).toBe('value');
    expect(opts.otherProvider).toEqual({ key: 'val' });
  });

  test('does not overwrite existing reasoning_content', () => {
    const messages = [
      {
        info: { role: 'assistant' },
        parts: [
          { type: 'reasoning', text: 'New thinking' },
          { type: 'text', text: 'Answer' },
        ],
        providerOptions: {
          openaiCompatible: {
            reasoning_content: 'Original thinking',
          },
        },
      },
    ];

    preserveReasoningContent(messages);

    const opts = (messages[0] as Record<string, unknown>)
      .providerOptions as Record<string, unknown>;
    const compat = opts.openaiCompatible as Record<string, unknown>;
    expect(compat.reasoning_content).toBe('Original thinking');
  });

  test('skips non-assistant messages', () => {
    const messages = [
      {
        info: { role: 'user' },
        parts: [{ type: 'reasoning', text: 'Should be ignored' }],
      },
      {
        info: { role: 'system' },
        parts: [{ type: 'reasoning', text: 'Should be ignored' }],
      },
    ];

    preserveReasoningContent(messages);

    expect(
      (messages[0] as Record<string, unknown>).providerOptions,
    ).toBeUndefined();
    expect(
      (messages[1] as Record<string, unknown>).providerOptions,
    ).toBeUndefined();
  });

  test('skips assistant messages without reasoning parts', () => {
    const messages = [
      {
        info: { role: 'assistant' },
        parts: [{ type: 'text', text: 'Just text' }],
      },
    ];

    preserveReasoningContent(messages);

    expect(
      (messages[0] as Record<string, unknown>).providerOptions,
    ).toBeUndefined();
  });

  test('skips empty reasoning parts', () => {
    const messages = [
      {
        info: { role: 'assistant' },
        parts: [
          { type: 'reasoning', text: '' },
          { type: 'reasoning' },
          { type: 'text', text: 'Answer' },
        ],
      },
    ];

    preserveReasoningContent(messages);

    expect(
      (messages[0] as Record<string, unknown>).providerOptions,
    ).toBeUndefined();
  });
});
