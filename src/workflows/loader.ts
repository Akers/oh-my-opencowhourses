import * as fs from 'node:fs';
import * as path from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { WorkflowDefinition } from './schemas';
import { WorkflowDefinitionSchema } from './schemas';

/**
 * Parse a YAML string into a validated WorkflowDefinition.
 * Returns null if parsing or validation fails.
 */
export function parseWorkflowYaml(
  yamlContent: string,
): WorkflowDefinition | null {
  try {
    const raw = parseYaml(yamlContent);
    if (!raw || typeof raw !== 'object') return null;

    const result = WorkflowDefinitionSchema.safeParse(raw);
    if (!result.success) {
      console.warn(
        '[workflow] Invalid workflow schema:',
        result.error.issues.map((i) => i.message).join(', '),
      );
      return null;
    }

    return result.data;
  } catch (error) {
    console.warn(
      '[workflow] Failed to parse YAML:',
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

/**
 * Load all workflow definitions from a directory.
 * Scans for .yaml and .yml files, parses and validates each one.
 * Returns an array of valid WorkflowDefinitions.
 * Silently skips files that fail to parse or validate.
 * Returns empty array if directory doesn't exist.
 */
export function loadWorkflowsFromDirectory(
  directory: string,
): WorkflowDefinition[] {
  if (!fs.existsSync(directory)) {
    return [];
  }

  let entries: string[];
  try {
    entries = fs.readdirSync(directory);
  } catch {
    return [];
  }

  const workflows: WorkflowDefinition[] = [];

  for (const entry of entries) {
    if (!entry.endsWith('.yaml') && !entry.endsWith('.yml')) {
      continue;
    }

    const filePath = path.join(directory, entry);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const workflow = parseWorkflowYaml(content);
      if (workflow) {
        workflows.push(workflow);
      }
    } catch (error) {
      console.warn(
        `[workflow] Failed to read ${filePath}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  return workflows;
}
