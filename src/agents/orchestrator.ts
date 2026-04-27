import type { AgentConfig } from '@opencode-ai/sdk/v2';
import manifest from './prompts/manifest.json';
import ORCHESTRATOR_TEMPLATE from './prompts/orchestrator.md' with {
  type: 'text',
};

export interface AgentDefinition {
  name: string;
  displayName?: string;
  description?: string;
  config: AgentConfig;
  /** Priority-ordered model entries for runtime fallback resolution. */
  _modelArray?: Array<{ id: string; variant?: string }>;
}

/**
 * Resolve agent prompt from base/custom/append inputs.
 * If customPrompt is provided, it replaces the base entirely.
 * Otherwise, customAppendPrompt is appended to the base.
 */
export function resolvePrompt(
  base: string,
  customPrompt?: string,
  customAppendPrompt?: string,
): string {
  if (customPrompt) return customPrompt;
  if (customAppendPrompt) return `${base}\n\n${customAppendPrompt}`;
  return base;
}

/** Manifest entry for a single agent's orchestration description */
export interface AgentManifestEntry {
  name: string;
  role: string;
  stats?: string;
  capabilities?: string;
  delegateWhen?: string;
  dontDelegateWhen?: string;
  ruleOfThumb?: string;
  important?: string;
}

/** Full manifest structure */
interface AgentManifest {
  agents: Record<string, AgentManifestEntry>;
  validationRouting: string[];
  parallelExamples: string[];
}

const typedManifest = manifest as AgentManifest;

/**
 * Format a single agent entry for the orchestrator prompt.
 */
function formatAgentEntry(
  internalName: string,
  entry: AgentManifestEntry,
): string {
  const lines = [`@${internalName}`];
  if (entry.role) lines.push(`- 角色：${entry.role}`);
  if (entry.stats) lines.push(`- 统计：${entry.stats}`);
  if (entry.capabilities) lines.push(`- 能力：${entry.capabilities}`);
  if (entry.delegateWhen) lines.push(`- **委派时机：** ${entry.delegateWhen}`);
  if (entry.dontDelegateWhen)
    lines.push(`- **不委派时机：** ${entry.dontDelegateWhen}`);
  if (entry.ruleOfThumb) lines.push(`- **经验法则：** ${entry.ruleOfThumb}`);
  if (entry.important) lines.push(`- **注意：** ${entry.important}`);
  return lines.join('\n');
}

/**
 * Filter lines that reference agents, removing any that mention disabled agents.
 */
function filterAgentLines(
  lines: string[],
  disabledAgents?: Set<string>,
): string {
  return lines
    .filter((line) => {
      const mentions = [...line.matchAll(/@(\w+)/g)].map((m) => m[1]);
      if (mentions.length === 0) return true;
      return mentions.every((name) => !disabledAgents?.has(name));
    })
    .join('\n');
}

/**
 * Build the orchestrator prompt with dynamic agent filtering.
 * Reads from orchestrator.md template and manifest.json.
 *
 * @param disabledAgents - Set of disabled agent names to exclude from the prompt
 * @param overrides - Optional partial manifest overrides (from user config)
 * @returns The complete orchestrator prompt string
 */
export function buildOrchestratorPrompt(
  disabledAgents?: Set<string>,
  overrides?: Record<string, Partial<AgentManifestEntry>>,
): string {
  // Merge built-in manifest with optional overrides
  const mergedManifest = { ...typedManifest };
  if (overrides) {
    for (const [agentName, override] of Object.entries(overrides)) {
      if (mergedManifest.agents[agentName]) {
        mergedManifest.agents = {
          ...mergedManifest.agents,
          [agentName]: {
            ...mergedManifest.agents[agentName],
            ...override,
          },
        };
      }
    }
  }

  // Build agent descriptions from manifest
  const enabledAgentEntries = Object.entries(mergedManifest.agents)
    .filter(([name]) => !disabledAgents?.has(name))
    .map(([name, entry]) => formatAgentEntry(name, entry))
    .join('\n\n');

  // Filter validation routing and parallel examples
  const validationRouting = filterAgentLines(
    mergedManifest.validationRouting,
    disabledAgents,
  );
  const parallelExamples = filterAgentLines(
    mergedManifest.parallelExamples,
    disabledAgents,
  );

  // Replace placeholders in template
  return ORCHESTRATOR_TEMPLATE.replace(
    '{{AGENT_MANIFEST}}',
    enabledAgentEntries,
  )
    .replace('{{PARALLEL_EXAMPLES}}', parallelExamples)
    .replace('{{VALIDATION_ROUTING}}', validationRouting);
}

/** @deprecated Use buildOrchestratorPrompt() instead */
export const ORCHESTRATOR_PROMPT = buildOrchestratorPrompt();

export function createOrchestratorAgent(
  model?: string | Array<string | { id: string; variant?: string }>,
  customPrompt?: string,
  customAppendPrompt?: string,
  disabledAgents?: Set<string>,
  agentDescriptions?: Record<string, Partial<AgentManifestEntry>>,
): AgentDefinition {
  const basePrompt = buildOrchestratorPrompt(disabledAgents, agentDescriptions);
  const prompt = resolvePrompt(basePrompt, customPrompt, customAppendPrompt);

  const definition: AgentDefinition = {
    name: 'orchestrator',
    description:
      'AI coding orchestrator that delegates tasks to specialist agents for optimal quality, speed, and cost',
    config: {
      temperature: 0.1,
      prompt,
    },
  };

  if (Array.isArray(model)) {
    definition._modelArray = model.map((m) =>
      typeof m === 'string' ? { id: m } : m,
    );
  } else if (typeof model === 'string' && model) {
    definition.config.model = model;
  }

  return definition;
}
