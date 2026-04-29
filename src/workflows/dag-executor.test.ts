import { describe, expect, it } from 'bun:test';
import {
  buildTopologicalLayers,
  type NodeOutput,
  resolveReferences,
} from './dag-executor';

describe('buildTopologicalLayers', () => {
  it('builds single layer for independent nodes', () => {
    const nodes = [
      { id: 'a', agent: 'explorer', prompt: 'x' },
      { id: 'b', agent: 'oracle', prompt: 'y' },
    ] as any[];

    const layers = buildTopologicalLayers(nodes);
    expect(layers).toHaveLength(1);
    expect(layers[0]).toHaveLength(2);
  });

  it('builds sequential layers for chained nodes', () => {
    const nodes = [
      { id: 'a', agent: 'explorer', prompt: 'x' },
      { id: 'b', agent: 'oracle', depends_on: ['a'], prompt: 'y' },
      { id: 'c', agent: 'fixer', depends_on: ['b'], prompt: 'z' },
    ] as any[];

    const layers = buildTopologicalLayers(nodes);
    expect(layers).toHaveLength(3);
    expect(layers[0][0].id).toBe('a');
    expect(layers[1][0].id).toBe('b');
    expect(layers[2][0].id).toBe('c');
  });

  it('builds diamond-shaped DAG correctly', () => {
    const nodes = [
      { id: 'start', agent: 'explorer', prompt: 'x' },
      { id: 'left', agent: 'oracle', depends_on: ['start'], prompt: 'y' },
      {
        id: 'right',
        agent: 'librarian',
        depends_on: ['start'],
        prompt: 'z',
      },
      {
        id: 'end',
        agent: 'fixer',
        depends_on: ['left', 'right'],
        prompt: 'w',
      },
    ] as any[];

    const layers = buildTopologicalLayers(nodes);
    expect(layers).toHaveLength(3);
    expect(layers[0]).toHaveLength(1);
    expect(layers[1]).toHaveLength(2);
    expect(layers[2]).toHaveLength(1);
  });

  it('throws on circular dependency', () => {
    const nodes = [
      { id: 'a', agent: 'explorer', depends_on: ['b'], prompt: 'x' },
      { id: 'b', agent: 'oracle', depends_on: ['a'], prompt: 'y' },
    ] as any[];

    expect(() => buildTopologicalLayers(nodes)).toThrow(/circular/i);
  });

  it('throws on missing dependency', () => {
    const nodes = [
      { id: 'a', agent: 'explorer', depends_on: ['nonexistent'], prompt: 'x' },
    ] as any[];

    expect(() => buildTopologicalLayers(nodes)).toThrow();
  });
});

describe('resolveReferences', () => {
  const outputs: Record<string, NodeOutput> = {
    step1: { state: 'completed', output: 'search results here' },
    step2: {
      state: 'completed',
      output: '{"has_issues": true, "count": 5}',
    },
  };

  it('replaces $nodeId.output with full output', () => {
    const result = resolveReferences('Results: $step1.output', outputs);
    expect(result).toBe('Results: search results here');
  });

  it('replaces $nodeId.output.field with JSON field', () => {
    const result = resolveReferences('Count: $step2.output.count', outputs);
    expect(result).toBe('Count: 5');
  });

  it('handles multiple references', () => {
    const result = resolveReferences(
      '$step1.output and $step2.output',
      outputs,
    );
    expect(result).toBe(
      'search results here and {"has_issues": true, "count": 5}',
    );
  });

  it('leaves unresolved references as-is', () => {
    const result = resolveReferences('$nonexistent.output', outputs);
    expect(result).toBe('$nonexistent.output');
  });

  it('returns original text if no references', () => {
    const result = resolveReferences('no refs here', outputs);
    expect(result).toBe('no refs here');
  });
});
