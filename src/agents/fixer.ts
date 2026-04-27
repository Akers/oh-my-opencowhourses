import type { AgentDefinition } from './orchestrator';
import FIXER_PROMPT from './prompts/fixer.md' with { type: 'text' };

export function createFixerAgent(
  model: string,
  customPrompt?: string,
  customAppendPrompt?: string,
): AgentDefinition {
  let prompt = FIXER_PROMPT;

  if (customPrompt) {
    prompt = customPrompt;
  } else if (customAppendPrompt) {
    prompt = `${FIXER_PROMPT}\n\n${customAppendPrompt}`;
  }

  return {
    name: 'fixer',
    description:
      'Fast implementation specialist. Receives complete context and task spec, executes code changes efficiently.',
    config: {
      model,
      temperature: 0.2,
      prompt,
    },
  };
}
