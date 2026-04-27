import { type AgentDefinition, resolvePrompt } from './orchestrator';
import COUNCILLOR_PROMPT from './prompts/councillor.md' with { type: 'text' };

export function createCouncillorAgent(
  model: string,
  customPrompt?: string,
  customAppendPrompt?: string,
): AgentDefinition {
  const prompt = resolvePrompt(
    COUNCILLOR_PROMPT,
    customPrompt,
    customAppendPrompt,
  );

  return {
    name: 'councillor',
    description:
      'Read-only council advisor. Examines codebase and provides independent analysis. Spawned internally by the council system.',
    config: {
      model,
      temperature: 0.2,
      prompt,
      // Mirror OpenCode's explore agent: deny all, then allow read-only tools
      permission: {
        '*': 'deny',
        question: 'deny',
        read: 'allow',
        glob: 'allow',
        grep: 'allow',
        lsp: 'allow',
        list: 'allow',
        codesearch: 'allow',
      },
    },
  };
}
