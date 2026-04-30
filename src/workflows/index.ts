/**
 * Workflow engine module for oh-my-opencode-slim.
 *
 * Provides a lightweight DAG-based workflow engine that:
 * - Loads YAML workflow definitions from .opencode/workflows/
 * - Executes nodes in topological order with intra-layer parallelism
 * - Supports 8 node types: agent, auto_agent, prompt, bash, script, loop, approval, cancel
 * - Resolves $nodeId.output references between nodes
 * - Evaluates when: condition expressions for conditional execution
 */

export { evaluateCondition } from './condition-evaluator';
export {
  buildTopologicalLayers,
  type NodeOutput,
  resolveReferences,
  WorkflowCancelledError,
  WorkflowCycleError,
  WorkflowExecutor,
  type WorkflowExecutorOptions,
} from './dag-executor';

export { loadWorkflowsFromDirectory, parseWorkflowYaml } from './loader';
export {
  type AgentNode,
  type ApprovalNode,
  type AutoAgentNode,
  type BashNode,
  type CancelNode,
  type DagNode,
  getNodeKind,
  type LoopNode,
  type NodeKind,
  type PromptNode,
  type ScriptNode,
  type WorkflowDefinition,
} from './schemas';
