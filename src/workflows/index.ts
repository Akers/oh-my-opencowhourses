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

export {
  WorkflowExecutor,
  WorkflowCancelledError,
  WorkflowCycleError,
  buildTopologicalLayers,
  resolveReferences,
  type NodeOutput,
  type WorkflowExecutorOptions,
} from './dag-executor';

export {
  type WorkflowDefinition,
  type DagNode,
  type AgentNode,
  type AutoAgentNode,
  type PromptNode,
  type BashNode,
  type ScriptNode,
  type LoopNode,
  type ApprovalNode,
  type CancelNode,
  type NodeKind,
  getNodeKind,
} from './schemas';

export { parseWorkflowYaml, loadWorkflowsFromDirectory } from './loader';

export { evaluateCondition } from './condition-evaluator';
