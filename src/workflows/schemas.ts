import { z } from 'zod';

// --- Trigger Rules ---
export const TriggerRuleSchema = z.enum([
  'all_success',
  'one_success',
  'all_done',
]);
export type TriggerRule = z.infer<typeof TriggerRuleSchema>;

// --- Retry Config ---
export const RetryConfigSchema = z.object({
  max_attempts: z.number().int().min(1).max(5),
  delay_ms: z.number().int().min(1000).max(60000).optional(),
});
export type RetryConfig = z.infer<typeof RetryConfigSchema>;

// --- Base Node Fields ---
const DagNodeBaseSchema = z.object({
  id: z.string().min(1),
  depends_on: z.array(z.string()).optional(),
  when: z.string().optional(),
  trigger_rule: TriggerRuleSchema.optional(),
  retry: RetryConfigSchema.optional(),
});

// --- Node Type Schemas ---

// Agent node: calls a specific agent (explorer, oracle, fixer, etc.)
export const AgentNodeSchema = DagNodeBaseSchema.extend({
  agent: z.string().min(1),
  prompt: z.string().min(1),
});
export type AgentNode = z.infer<typeof AgentNodeSchema>;

// AutoAgent node: delegates to Orchestrator for free orchestration
export const AutoAgentNodeSchema = DagNodeBaseSchema.extend({
  auto_agent: z.literal(true),
  prompt: z.string().min(1),
});
export type AutoAgentNode = z.infer<typeof AutoAgentNodeSchema>;

// Prompt node: inline prompt sent to LLM via session
export const PromptNodeSchema = DagNodeBaseSchema.extend({
  prompt: z.string().min(1),
});
export type PromptNode = z.infer<typeof PromptNodeSchema>;

// Bash node: shell script executed on host
export const BashNodeSchema = DagNodeBaseSchema.extend({
  bash: z.string().min(1),
});
export type BashNode = z.infer<typeof BashNodeSchema>;

// Script node: Bun/uv script execution
export const ScriptNodeSchema = DagNodeBaseSchema.extend({
  script: z.string().min(1),
  runtime: z.enum(['bun', 'uv']).optional(),
});
export type ScriptNode = z.infer<typeof ScriptNodeSchema>;

// Loop node: iterate until signal or max_iterations
export const LoopNodeSchema = DagNodeBaseSchema.extend({
  loop: z.object({
    prompt: z.string().min(1),
    until: z.string().min(1),
    max_iterations: z.number().int().min(1).max(20),
  }),
});
export type LoopNode = z.infer<typeof LoopNodeSchema>;

// Approval node: human approval gate
export const ApprovalNodeSchema = DagNodeBaseSchema.extend({
  approval: z.object({
    message: z.string().min(1),
    capture_response: z.boolean().optional(),
    on_reject: z
      .object({
        prompt: z.string().min(1),
        max_attempts: z.number().int().min(1).max(5).optional(),
      })
      .optional(),
  }),
});
export type ApprovalNode = z.infer<typeof ApprovalNodeSchema>;

// Cancel node: cancels the workflow
export const CancelNodeSchema = DagNodeBaseSchema.extend({
  cancel: z.string().min(1),
});
export type CancelNode = z.infer<typeof CancelNodeSchema>;

// --- Union Type ---
export const DagNodeSchema = z.union([
  AgentNodeSchema,
  AutoAgentNodeSchema,
  PromptNodeSchema,
  BashNodeSchema,
  ScriptNodeSchema,
  LoopNodeSchema,
  ApprovalNodeSchema,
  CancelNodeSchema,
]);
export type DagNode = z.infer<typeof DagNodeSchema>;

// --- Workflow Definition ---
export const WorkflowDefinitionSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  nodes: z.array(DagNodeSchema).min(1),
});
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;

// --- Node type discriminator helper ---
export type NodeKind =
  | 'agent'
  | 'auto_agent'
  | 'prompt'
  | 'bash'
  | 'script'
  | 'loop'
  | 'approval'
  | 'cancel';

export function getNodeKind(node: DagNode): NodeKind {
  if ('agent' in node) return 'agent';
  if ('auto_agent' in node) return 'auto_agent';
  if ('bash' in node) return 'bash';
  if ('script' in node) return 'script';
  if ('loop' in node) return 'loop';
  if ('approval' in node) return 'approval';
  if ('cancel' in node) return 'cancel';
  return 'prompt';
}
