import { describe, expect, it } from 'bun:test';
import {
  AgentNodeSchema,
  ApprovalNodeSchema,
  AutoAgentNodeSchema,
  BashNodeSchema,
  CancelNodeSchema,
  LoopNodeSchema,
  PromptNodeSchema,
  WorkflowDefinitionSchema,
} from './schemas';

describe('WorkflowDefinitionSchema', () => {
  it('parses a valid workflow with agent node', () => {
    const workflow = {
      name: 'test-workflow',
      description: 'A test workflow',
      nodes: [
        {
          id: 'step1',
          agent: 'explorer',
          prompt: 'Find all TypeScript files',
        },
      ],
    };
    const result = WorkflowDefinitionSchema.safeParse(workflow);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('test-workflow');
      expect(result.data.nodes).toHaveLength(1);
    }
  });

  it('parses a workflow with depends_on and when', () => {
    const workflow = {
      name: 'test',
      description: 'desc',
      nodes: [
        { id: 'a', agent: 'explorer', prompt: 'search' },
        {
          id: 'b',
          agent: 'oracle',
          depends_on: ['a'],
          when: "$a.output == 'done'",
          prompt: 'review $a.output',
        },
      ],
    };
    const result = WorkflowDefinitionSchema.safeParse(workflow);
    expect(result.success).toBe(true);
  });

  it('parses auto_agent node', () => {
    const node = {
      id: 'auto1',
      auto_agent: true,
      prompt: 'Do something smart',
    };
    const result = AutoAgentNodeSchema.safeParse(node);
    expect(result.success).toBe(true);
  });

  it('parses bash node', () => {
    const node = {
      id: 'bash1',
      bash: 'bun test',
    };
    const result = BashNodeSchema.safeParse(node);
    expect(result.success).toBe(true);
  });

  it('parses loop node', () => {
    const node = {
      id: 'loop1',
      loop: {
        prompt: 'Fix failing tests',
        until: 'ALL_PASS',
        max_iterations: 3,
      },
    };
    const result = LoopNodeSchema.safeParse(node);
    expect(result.success).toBe(true);
  });

  it('parses approval node', () => {
    const node = {
      id: 'approve1',
      approval: {
        message: 'Continue?',
      },
    };
    const result = ApprovalNodeSchema.safeParse(node);
    expect(result.success).toBe(true);
  });

  it('parses cancel node', () => {
    const node = {
      id: 'cancel1',
      cancel: 'Workflow cancelled by user',
    };
    const result = CancelNodeSchema.safeParse(node);
    expect(result.success).toBe(true);
  });

  it('parses prompt node', () => {
    const node = {
      id: 'prompt1',
      prompt: 'Analyze this code',
    };
    const result = PromptNodeSchema.safeParse(node);
    expect(result.success).toBe(true);
  });

  it('parses node with retry config', () => {
    const node = {
      id: 'retry1',
      agent: 'fixer',
      prompt: 'Fix bugs',
      retry: { max_attempts: 3, delay_ms: 1000 },
    };
    const result = AgentNodeSchema.safeParse(node);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.retry?.max_attempts).toBe(3);
    }
  });

  it('parses node with trigger_rule', () => {
    const node = {
      id: 'trigger1',
      agent: 'explorer',
      depends_on: ['a', 'b'],
      trigger_rule: 'one_success',
      prompt: 'Search',
    };
    const result = AgentNodeSchema.safeParse(node);
    expect(result.success).toBe(true);
  });

  it('rejects workflow without name', () => {
    const workflow = {
      description: 'desc',
      nodes: [{ id: 'a', bash: 'echo hi' }],
    };
    const result = WorkflowDefinitionSchema.safeParse(workflow);
    expect(result.success).toBe(false);
  });

  it('rejects workflow with empty nodes', () => {
    const workflow = {
      name: 'test',
      description: 'desc',
      nodes: [],
    };
    const result = WorkflowDefinitionSchema.safeParse(workflow);
    expect(result.success).toBe(false);
  });

  it('rejects node without id', () => {
    const node = {
      agent: 'explorer',
      prompt: 'search',
    };
    const result = AgentNodeSchema.safeParse(node);
    expect(result.success).toBe(false);
  });

  it('rejects invalid trigger_rule', () => {
    const node = {
      id: 'bad',
      agent: 'explorer',
      trigger_rule: 'invalid',
      prompt: 'search',
    };
    const result = AgentNodeSchema.safeParse(node);
    expect(result.success).toBe(false);
  });
});
