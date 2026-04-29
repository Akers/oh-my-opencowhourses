/**
 * Lightweight DAG workflow executor.
 *
 * Uses Kahn's algorithm for topological sorting into layers,
 * then executes layers sequentially with intra-layer parallelism.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { PluginInput } from '@opencode-ai/plugin';
import {
  extractSessionResult,
  type PromptBody,
  promptWithTimeout,
} from '../utils/session';
import { evaluateCondition } from './condition-evaluator';
import type { DagNode, WorkflowDefinition } from './schemas';
import { getNodeKind } from './schemas';

type OpencodeClient = PluginInput['client'];

const execFileAsync = promisify(execFile);

// --- Node Output ---

export interface NodeOutput {
  state: 'completed' | 'failed' | 'skipped' | 'cancelled';
  output: string;
  error?: string;
}

// --- Custom Errors ---

export class WorkflowCancelledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkflowCancelledError';
  }
}

export class WorkflowCycleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkflowCycleError';
  }
}

// --- Topological Sort (Kahn's Algorithm) ---

/**
 * Build topological layers from DAG nodes.
 * Layer 0: nodes with no dependencies.
 * Layer N: nodes whose dependencies all appear in layers 0..N-1.
 * Throws if cycle detected or dependency not found.
 */
export function buildTopologicalLayers(nodes: readonly DagNode[]): DagNode[][] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Validate all dependencies exist
  for (const node of nodes) {
    for (const dep of node.depends_on ?? []) {
      if (!nodeMap.has(dep)) {
        throw new Error(
          `[workflow] Node "${node.id}" depends on "${dep}" which does not exist`,
        );
      }
    }
  }

  // Compute in-degree and adjacency
  const inDegree = new Map(nodes.map((n) => [n.id, 0]));
  const dependents = new Map(nodes.map((n) => [n.id, [] as string[]]));

  for (const node of nodes) {
    for (const dep of node.depends_on ?? []) {
      inDegree.set(node.id, (inDegree.get(node.id) ?? 0) + 1);
      dependents.get(dep)?.push(node.id);
    }
  }

  const layers: DagNode[][] = [];
  let remaining = nodes.length;

  // Start with nodes that have no dependencies
  let currentLayer = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0);

  while (currentLayer.length > 0) {
    layers.push(currentLayer);
    remaining -= currentLayer.length;

    const nextLayer: DagNode[] = [];
    for (const node of currentLayer) {
      for (const depId of dependents.get(node.id) ?? []) {
        const newDeg = (inDegree.get(depId) ?? 0) - 1;
        inDegree.set(depId, newDeg);
        if (newDeg === 0) {
          const nextNode = nodeMap.get(depId);
          if (nextNode) nextLayer.push(nextNode);
        }
      }
    }
    currentLayer = nextLayer;
  }

  if (remaining > 0) {
    throw new WorkflowCycleError(
      `[workflow] Circular dependency detected among ${remaining} nodes`,
    );
  }

  return layers;
}

// --- Reference Resolution ---

/**
 * Replace $nodeId.output and $nodeId.output.field references in text.
 */
export function resolveReferences(
  text: string,
  outputs: Record<string, NodeOutput>,
): string {
  return text.replace(
    /\$([a-zA-Z_][a-zA-Z0-9_-]*)\.output(\.[a-zA-Z_][a-zA-Z0-9_-]*)*/g,
    (match) => {
      const path = match.slice(1).split('.');
      const nodeId = path[0];

      const nodeOutput = outputs[nodeId];
      if (!nodeOutput) return match;

      if (path.length === 2) {
        return nodeOutput.output;
      }

      try {
        let value: unknown = JSON.parse(nodeOutput.output);
        for (let i = 2; i < path.length; i++) {
          if (value === null || typeof value !== 'object') return match;
          value = (value as Record<string, unknown>)[path[i]];
        }
        return value !== undefined ? String(value) : match;
      } catch {
        return match;
      }
    },
  );
}

// --- Trigger Rule Evaluation ---

function checkTriggerRule(
  node: DagNode,
  outputs: Record<string, NodeOutput>,
): { canRun: boolean; reason?: string } {
  const deps = node.depends_on ?? [];
  if (deps.length === 0) return { canRun: true };

  const rule = node.trigger_rule ?? 'all_success';
  const depStates = deps.map(
    (id) =>
      (outputs[id]?.state ?? 'pending') as
        | 'completed'
        | 'failed'
        | 'skipped'
        | 'cancelled'
        | 'pending'
        | 'running',
  );

  switch (rule) {
    case 'all_success':
      if (depStates.every((s) => s === 'completed')) return { canRun: true };
      return {
        canRun: false,
        reason: `Not all dependencies succeeded: ${depStates.join(', ')}`,
      };
    case 'one_success':
      if (depStates.some((s) => s === 'completed')) return { canRun: true };
      return {
        canRun: false,
        reason: 'No dependency succeeded',
      };
    case 'all_done':
      if (depStates.every((s) => s !== 'pending' && s !== 'running'))
        return { canRun: true };
      return {
        canRun: false,
        reason: 'Not all dependencies finished',
      };
    default:
      return { canRun: true };
  }
}

// --- WorkflowExecutor ---

export interface WorkflowExecutorOptions {
  client: OpencodeClient;
  directory: string;
  parentSessionId: string;
  questionFn?: (message: string) => Promise<{ answer: string }>;
}

export class WorkflowExecutor {
  private options: WorkflowExecutorOptions;

  constructor(options: WorkflowExecutorOptions) {
    this.options = options;
  }

  async execute(
    workflow: WorkflowDefinition,
  ): Promise<Record<string, NodeOutput>> {
    const layers = buildTopologicalLayers(workflow.nodes);
    const outputs: Record<string, NodeOutput> = {};

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];

      const results = await Promise.allSettled(
        layer.map((node) => this.executeNode(node, outputs)),
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const node = layer[j];

        if (result.status === 'fulfilled') {
          outputs[node.id] = result.value;
        } else {
          if (result.reason instanceof WorkflowCancelledError) {
            outputs[node.id] = {
              state: 'cancelled',
              output: result.reason.message,
            };
            for (const remainingNode of workflow.nodes) {
              if (!outputs[remainingNode.id]) {
                outputs[remainingNode.id] = {
                  state: 'cancelled',
                  output: 'Workflow cancelled',
                };
              }
            }
            return outputs;
          }

          outputs[node.id] = {
            state: 'failed',
            output: '',
            error:
              result.reason instanceof Error
                ? result.reason.message
                : String(result.reason),
          };
        }
      }
    }

    return outputs;
  }

  private async executeNode(
    node: DagNode,
    outputs: Record<string, NodeOutput>,
  ): Promise<NodeOutput> {
    const trigger = checkTriggerRule(node, outputs);
    if (!trigger.canRun) {
      return {
        state: 'skipped',
        output: trigger.reason ?? 'Skipped',
      };
    }

    const flatOutputs: Record<string, string> = {};
    for (const [id, o] of Object.entries(outputs)) {
      flatOutputs[id] = o.output;
    }
    const condition = evaluateCondition(node.when, flatOutputs);
    if (condition === false) {
      return { state: 'skipped', output: 'Condition not met' };
    }

    const kind = getNodeKind(node);
    const maxAttempts = node.retry?.max_attempts ?? 1;
    const delayMs = node.retry?.delay_ms ?? 1000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.executeNodeByKind(node, kind, outputs);
      } catch (error) {
        // Always propagate cancellation — retry is not appropriate
        if (error instanceof WorkflowCancelledError) throw error;
        const isLast = attempt === maxAttempts;
        if (isLast) {
          return {
            state: 'failed',
            output: '',
            error: error instanceof Error
              ? error.message
              : String(error),
          };
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return {
      state: 'failed',
      output: '',
      error: 'Unexpected retry loop exit',
    };
  }

  private async executeNodeByKind(
    node: DagNode,
    kind: ReturnType<typeof getNodeKind>,
    outputs: Record<string, NodeOutput>,
  ): Promise<NodeOutput> {
    switch (kind) {
      case 'agent':
        return this.executeAgentNode(
          node as import('./schemas').AgentNode,
          outputs,
        );
      case 'auto_agent':
        return this.executeAutoAgentNode(
          node as import('./schemas').AutoAgentNode,
          outputs,
        );
      case 'prompt':
        return this.executePromptNode(
          node as import('./schemas').PromptNode,
          outputs,
        );
      case 'bash':
        return this.executeBashNode(node as import('./schemas').BashNode);
      case 'script':
        return this.executeScriptNode(node as import('./schemas').ScriptNode);
      case 'loop':
        return this.executeLoopNode(
          node as import('./schemas').LoopNode,
          outputs,
        );
      case 'approval':
        return this.executeApprovalNode(
          node as import('./schemas').ApprovalNode,
        );
      case 'cancel':
        throw new WorkflowCancelledError(
          (node as import('./schemas').CancelNode).cancel,
        );
    }
  }

  private async executeAgentNode(
    node: import('./schemas').AgentNode,
    outputs: Record<string, NodeOutput>,
  ): Promise<NodeOutput> {
    const prompt = resolveReferences(node.prompt, outputs);
    const result = await this.runSession(node.agent, prompt, node.id);
    return { state: 'completed', output: result };
  }

  private async executeAutoAgentNode(
    node: import('./schemas').AutoAgentNode,
    outputs: Record<string, NodeOutput>,
  ): Promise<NodeOutput> {
    const prompt = resolveReferences(node.prompt, outputs);
    const autoPrompt =
      `[AutoAgent Task] ${prompt}\n\n` +
      'You have full autonomy to use any available agents and tools to complete this task. Break it down as needed and delegate to specialists.';
    const result = await this.runSession('orchestrator', autoPrompt, node.id);
    return { state: 'completed', output: result };
  }

  private async executePromptNode(
    node: import('./schemas').PromptNode,
    outputs: Record<string, NodeOutput>,
  ): Promise<NodeOutput> {
    const prompt = resolveReferences(node.prompt, outputs);
    const result = await this.runSession('orchestrator', prompt, node.id);
    return { state: 'completed', output: result };
  }

  private async executeBashNode(
    node: import('./schemas').BashNode,
  ): Promise<NodeOutput> {
    try {
      const { stdout, stderr } = await execFileAsync(
        'bash',
        ['-c', node.bash],
        {
          cwd: this.options.directory,
          timeout: 120_000,
          maxBuffer: 1024 * 1024,
        },
      );
      return {
        state: 'completed',
        output: (stdout + (stderr ? `\n${stderr}` : '')).trim(),
      };
    } catch (error) {
      const execError = error as {
        stdout?: string;
        stderr?: string;
        message?: string;
      };
      const output = [execError.stdout, execError.stderr, execError.message]
        .filter(Boolean)
        .join('\n');
      throw new Error(`Bash command failed: ${output}`);
    }
  }

  private async executeScriptNode(
    node: import('./schemas').ScriptNode,
  ): Promise<NodeOutput> {
    const runtime = node.runtime ?? 'bun';
    const cmd = runtime === 'uv' ? 'uv' : 'bun';
    const args = runtime === 'uv' ? ['run', node.script] : [node.script];

    try {
      const { stdout } = await execFileAsync(cmd, args, {
        cwd: this.options.directory,
        timeout: 120_000,
        maxBuffer: 1024 * 1024,
      });
      return { state: 'completed', output: stdout.trim() };
    } catch (error) {
      throw new Error(
        `Script execution failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async executeLoopNode(
    node: import('./schemas').LoopNode,
    outputs: Record<string, NodeOutput>,
  ): Promise<NodeOutput> {
    const loopConfig = node.loop;
    let lastOutput = '';

    for (let i = 0; i < loopConfig.max_iterations; i++) {
      const prompt = resolveReferences(loopConfig.prompt, {
        ...outputs,
        [node.id]: { state: 'completed', output: lastOutput },
      });

      lastOutput = await this.runSession(
        'orchestrator',
        prompt,
        `${node.id}-iter-${i}`,
      );

      if (lastOutput.includes(loopConfig.until)) {
        return { state: 'completed', output: lastOutput };
      }
    }

    return {
      state: 'failed',
      output: lastOutput,
      error: `Loop exceeded max_iterations (${loopConfig.max_iterations}) without receiving "${loopConfig.until}" signal`,
    };
  }

  private async executeApprovalNode(
    node: import('./schemas').ApprovalNode,
  ): Promise<NodeOutput> {
    const approvalConfig = node.approval;

    if (!this.options.questionFn) {
      return {
        state: 'completed',
        output: 'Auto-approved (no question function available)',
      };
    }

    const maxAttempts = approvalConfig.on_reject?.max_attempts ?? 3;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await this.options.questionFn(approvalConfig.message);

      if (
        response.answer === 'yes' ||
        response.answer === 'approved' ||
        response.answer === 'approve'
      ) {
        return { state: 'completed', output: 'Approved' };
      }

      // Continue to next attempt if on_reject is configured
      if (!approvalConfig.on_reject) break;
    }

    return { state: 'completed', output: 'Rejected' };
  }

  private async runSession(
    agent: string,
    promptText: string,
    title: string,
  ): Promise<string> {
    const { client, directory, parentSessionId } = this.options;

    const session = await client.session.create({
      body: {
        parentID: parentSessionId,
        title: `[workflow] ${title}`,
      },
      query: { directory },
    });
    if (!session.data) {
      throw new Error('Failed to create session: no data returned');
    }
    const sessionId = session.data.id;

    try {
      const body: PromptBody = {
        agent,
        parts: [{ type: 'text', text: promptText }],
        tools: { task: false },
      };

      await promptWithTimeout(
        client,
        {
          path: { id: sessionId },
          body,
          query: { directory },
        },
        300_000,
      );

      const extraction = await extractSessionResult(client, sessionId, {
        includeReasoning: false,
      });

      if (extraction.empty) {
        throw new Error(
          `Agent ${agent} returned empty response for node "${title}"`,
        );
      }

      return extraction.text;
    } finally {
      client.session.abort({ path: { id: sessionId } }).catch(() => {});
    }
  }
}
