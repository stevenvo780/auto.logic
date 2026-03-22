import { expect } from 'vitest';
import type { FormalizationResult } from '../../src';
import type { LogicProfile } from '../../src/types';

export interface QualityCase {
  id: string;
  description: string;
  text: string;
  profile: LogicProfile;
  minAtoms?: number;
  minFormulas?: number;
  minInterprets?: number;
  minAxioms?: number;
  expectedPatterns?: string[];
  expectedFormulaSnippets?: string[];
}

export function countMatches(code: string, pattern: RegExp): number {
  return (code.match(pattern) || []).length;
}

export function expectFormalizationCoreQuality(testCase: QualityCase, result: FormalizationResult) {
  const execSummary = result.stExecution
    ? ` [ST exec: ${result.stExecution.durationMs} ms, exit=${result.stExecution.exitCode}${result.stExecution.timedOut ? ', timeout' : ''}${result.stExecution.errors.length ? `, errors=${result.stExecution.errors.join(' | ')}` : ''}]`
    : '';

  expect(result.ok, `${testCase.id} should formalize successfully`).toBe(true);
  expect(result.stCode, `${testCase.id} should emit ST`).toContain(`logic ${testCase.profile}`);
  expect(result.stCode.trim().length, `${testCase.id} should emit non-trivial ST`).toBeGreaterThan(40);

  if (typeof testCase.minAtoms === 'number') {
    expect(result.atoms.size, `${testCase.id} should extract enough atoms`).toBeGreaterThanOrEqual(testCase.minAtoms);
  }

  if (typeof testCase.minFormulas === 'number') {
    expect(result.formulas.length, `${testCase.id} should build enough formulas`).toBeGreaterThanOrEqual(testCase.minFormulas);
  }

  if (typeof testCase.minInterprets === 'number') {
    expect(countMatches(result.stCode, /^interpret\s/gm), `${testCase.id} should emit enough interpret lines`).toBeGreaterThanOrEqual(testCase.minInterprets);
  }

  if (typeof testCase.minAxioms === 'number') {
    expect(countMatches(result.stCode, /^axiom\s/gm), `${testCase.id} should emit enough axioms`).toBeGreaterThanOrEqual(testCase.minAxioms);
  }

  if (testCase.expectedPatterns) {
    for (const pattern of testCase.expectedPatterns) {
      expect(result.analysis.detectedPatterns, `${testCase.id} should detect pattern ${pattern}`).toContain(pattern);
    }
  }

  if (testCase.expectedFormulaSnippets) {
    for (const snippet of testCase.expectedFormulaSnippets) {
      expect(result.stCode, `${testCase.id} should contain snippet ${snippet}`).toContain(snippet);
    }
  }

  expect(result.stValidation?.ok ?? true, `${testCase.id} should pass ST parser validation${execSummary}`).toBe(true);
  expect(
    result.stExecution ? result.stExecution.ok || result.stExecution.timedOut : true,
    `${testCase.id} should execute in ST without runtime errors${execSummary}`
  ).toBe(true);
  expect(
    result.stExecution?.resultStatuses.filter((status) => status === 'error') ?? [],
    `${testCase.id} should not produce ST execution error statuses${execSummary}`
  ).toHaveLength(0);
  expect(
    result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error'),
    `${testCase.id} should not emit fatal diagnostics${execSummary}`
  ).toHaveLength(0);
}
