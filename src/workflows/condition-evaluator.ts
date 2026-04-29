/**
 * Evaluates `when:` condition expressions for workflow nodes.
 *
 * Supported syntax:
 *   $nodeId.output == 'VALUE'
 *   $nodeId.output != 'VALUE'
 *   $nodeId.output.field == 'VALUE'
 *   $nodeId.output > 'NUM'   (>=, <, <=)
 *   compound: && and ||
 *
 * Fail-closed: any parse or evaluation error returns false.
 */

// Resolve a reference like "$step1.output" or "$step1.output.field"
function resolveReference(
  ref: string,
  outputs: Record<string, string>,
): string | undefined {
  // Strip leading $
  const path = ref.startsWith('$') ? ref.slice(1) : ref;
  const parts = path.split('.');

  // First part is nodeId, then "output", then optional field path
  if (parts.length < 2 || parts[1] !== 'output') return undefined;

  const nodeId = parts[0];
  const rawOutput = outputs[nodeId];
  if (rawOutput === undefined) return undefined;

  // No field access: return full output
  if (parts.length === 2) return rawOutput;

  // Field access: try JSON parse
  try {
    let value: unknown = JSON.parse(rawOutput);
    for (let i = 2; i < parts.length; i++) {
      if (value === null || typeof value !== 'object') return undefined;
      value = (value as Record<string, unknown>)[parts[i]];
    }
    return String(value);
  } catch {
    return undefined;
  }
}

type ComparisonOp = '==' | '!=' | '>' | '>=' | '<' | '<=';

function compare(left: string, op: ComparisonOp, right: string): boolean {
  switch (op) {
    case '==':
      return left === right;
    case '!=':
      return left !== right;
    case '>':
      return Number(left) > Number(right);
    case '>=':
      return Number(left) >= Number(right);
    case '<':
      return Number(left) < Number(right);
    case '<=':
      return Number(left) <= Number(right);
  }
}

// Match a single comparison expression like $a.output == 'value'
const COMPARISON_RE =
  /^\s*(\$\w+(?:\.\w+)*)\s*(==|!=|>=|<=|>|<)\s*'([^']*)'\s*$/;

function evaluateSingle(
  expr: string,
  outputs: Record<string, string>,
): boolean {
  const match = expr.match(COMPARISON_RE);
  if (!match) return false;

  const [, ref, op, value] = match;
  const resolved = resolveReference(ref, outputs);
  if (resolved === undefined) return false;

  return compare(resolved, op as ComparisonOp, value);
}

/**
 * Evaluate a `when:` condition expression against node outputs.
 * Returns true if condition passes, false if it fails or cannot be parsed.
 * Returns undefined if `when` is undefined (no condition to evaluate).
 */
export function evaluateCondition(
  when: string | undefined,
  outputs: Record<string, string>,
): boolean | undefined {
  if (when === undefined) return undefined;

  try {
    // Handle compound expressions with && and ||
    const orParts = when.split('||');
    for (const orPart of orParts) {
      const andParts = orPart.split('&&');
      const andResult = andParts.every((part) =>
        evaluateSingle(part.trim(), outputs),
      );
      if (andResult) return true;
    }
    return false;
  } catch {
    // Fail-closed: any error returns false
    return false;
  }
}
