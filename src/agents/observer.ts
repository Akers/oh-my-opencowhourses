import type { AgentDefinition } from './orchestrator';
import OBSERVER_PROMPT from './prompts/observer.md' with { type: 'text' };

export function createObserverAgent(
  model: string,
  customPrompt?: string,
  customAppendPrompt?: string,
): AgentDefinition {
  let prompt = OBSERVER_PROMPT;

  if (customPrompt) {
    prompt = customPrompt;
  } else if (customAppendPrompt) {
    prompt = `${OBSERVER_PROMPT}\n\n${customAppendPrompt}`;
  }

  return {
    name: 'observer',
    description:
      'Visual analysis. Use for interpreting images, screenshots, PDFs, and diagrams — extracts structured observations without loading raw files into main context. Requires a vision-capable model.',
    config: {
      model,
      temperature: 0.1,
      prompt,
    },
  };
}
