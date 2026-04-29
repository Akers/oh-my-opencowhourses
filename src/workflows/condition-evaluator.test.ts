import { describe, expect, it } from 'bun:test';
import { evaluateCondition } from './condition-evaluator';

// Mock outputs from previous nodes
const outputs: Record<string, string> = {
  step1: 'hello world',
  step2: '{"status": "success", "count": 42}',
  step3: 'true',
  step4: 'rejected',
};

describe('evaluateCondition', () => {
  it('evaluates string equality', () => {
    expect(
      evaluateCondition("$step1.output == 'hello world'", outputs),
    ).toBe(true);
  });

  it('evaluates string inequality', () => {
    expect(
      evaluateCondition("$step1.output != 'goodbye'", outputs),
    ).toBe(true);
  });

  it('evaluates dot notation field access', () => {
    expect(
      evaluateCondition("$step2.output.status == 'success'", outputs),
    ).toBe(true);
  });

  it('evaluates numeric comparison', () => {
    expect(
      evaluateCondition("$step2.output.count > '40'", outputs),
    ).toBe(true);
    expect(
      evaluateCondition("$step2.output.count < '50'", outputs),
    ).toBe(true);
  });

  it('evaluates compound AND', () => {
    expect(
      evaluateCondition(
        "$step1.output == 'hello world' && $step3.output == 'true'",
        outputs,
      ),
    ).toBe(true);
  });

  it('evaluates compound OR', () => {
    expect(
      evaluateCondition(
        "$step4.output == 'approved' || $step3.output == 'true'",
        outputs,
      ),
    ).toBe(true);
  });

  it('returns false for non-matching condition', () => {
    expect(
      evaluateCondition("$step1.output == 'wrong'", outputs),
    ).toBe(false);
  });

  it('returns false when referenced node not found', () => {
    expect(
      evaluateCondition(
        "$nonexistent.output == 'something'",
        outputs,
      ),
    ).toBe(false);
  });

  it('returns false for malformed expression (fail-closed)', () => {
    expect(evaluateCondition('not a valid expression', outputs)).toBe(
      false,
    );
  });

  it('returns undefined (skip) when condition is undefined', () => {
    expect(evaluateCondition(undefined, outputs)).toBeUndefined();
  });

  it('evaluates >= operator', () => {
    expect(
      evaluateCondition("$step2.output.count >= '42'", outputs),
    ).toBe(true);
    expect(
      evaluateCondition("$step2.output.count >= '43'", outputs),
    ).toBe(false);
  });

  it('evaluates <= operator', () => {
    expect(
      evaluateCondition("$step2.output.count <= '42'", outputs),
    ).toBe(true);
    expect(
      evaluateCondition("$step2.output.count <= '41'", outputs),
    ).toBe(false);
  });
});
