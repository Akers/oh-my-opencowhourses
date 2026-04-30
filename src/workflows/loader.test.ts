import { describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { loadWorkflowsFromDirectory, parseWorkflowYaml } from './loader';

const VALID_WORKFLOW_YAML = `
name: test-workflow
description: |
  Use when: testing workflow loading
  Does: loads a workflow from YAML
nodes:
  - id: step1
    agent: explorer
    prompt: Find all files
  - id: step2
    agent: oracle
    depends_on: [step1]
    prompt: Review $step1.output
`;

describe('parseWorkflowYaml', () => {
  it('parses valid workflow YAML', () => {
    const result = parseWorkflowYaml(VALID_WORKFLOW_YAML);
    expect(result).toBeDefined();
    expect(result?.name).toBe('test-workflow');
    expect(result?.nodes).toHaveLength(2);
  });

  it('returns null for invalid YAML', () => {
    const result = parseWorkflowYaml('not: valid: yaml: :::');
    expect(result).toBeNull();
  });

  it('returns null for valid YAML but invalid schema', () => {
    const result = parseWorkflowYaml('name: missing-nodes');
    expect(result).toBeNull();
  });

  it('parses workflow with all node types', () => {
    const yaml = `
name: full-workflow
description: All node types
nodes:
  - id: explore
    agent: explorer
    prompt: Search
  - id: auto
    auto_agent: true
    prompt: Decide
  - id: run
    bash: echo hello
  - id: loop
    loop:
      prompt: Fix
      until: DONE
      max_iterations: 3
  - id: approve
    approval:
      message: OK?
  - id: cancel
    cancel: Stop
`;
    const result = parseWorkflowYaml(yaml);
    expect(result).toBeDefined();
    expect(result?.nodes).toHaveLength(6);
  });
});

describe('loadWorkflowsFromDirectory', () => {
  it('returns empty array for non-existent directory', () => {
    const result = loadWorkflowsFromDirectory('/nonexistent/path');
    expect(result).toEqual([]);
  });

  it('loads workflows from directory with valid YAML files', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-test-'));
    fs.writeFileSync(path.join(tmpDir, 'test.yaml'), VALID_WORKFLOW_YAML);
    fs.writeFileSync(path.join(tmpDir, 'bad.txt'), 'not yaml');

    try {
      const result = loadWorkflowsFromDirectory(tmpDir);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('test-workflow');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });
});
