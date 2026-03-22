import { describe, expect, it } from 'vitest';
import { formalize } from '../src';
import { CORPUS_CASES, type CorpusCase } from './fixtures/corpus';

function countMatches(code: string, pattern: RegExp): number {
  return (code.match(pattern) || []).length;
}

function expectCaseQuality(testCase: CorpusCase, result: ReturnType<typeof formalize>) {
  expect(result.ok, `${testCase.id} should formalize successfully`).toBe(true);
  expect(result.stCode, `${testCase.id} should emit ST`).toContain(`logic ${testCase.options.profile}`);
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

  expect(result.stValidation?.ok ?? true, `${testCase.id} should pass ST parser validation`).toBe(true);
  expect(
    result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error'),
    `${testCase.id} should not emit fatal diagnostics`
  ).toHaveLength(0);
}

describe('Autologic corpus quality suite', () => {
  it('covers a broad multilingual/profile corpus', () => {
    expect(CORPUS_CASES.length).toBeGreaterThanOrEqual(20);

    const profiles = new Set(CORPUS_CASES.map((testCase) => testCase.options.profile));
    const languages = new Set(CORPUS_CASES.map((testCase) => testCase.options.language));

    expect(profiles.size).toBeGreaterThanOrEqual(10);
    expect(languages).toEqual(new Set(['es', 'en']));
  });

  for (const testCase of CORPUS_CASES) {
    it(`${testCase.id} — ${testCase.description}`, () => {
      const result = formalize(testCase.text, testCase.options);
      expectCaseQuality(testCase, result);
    });
  }

  it('keeps long arguments substantially richer than short ones', () => {
    const shortCase = CORPUS_CASES.find((testCase) => testCase.id === 'es-short-modus-ponens');
    const longCase = CORPUS_CASES.find((testCase) => testCase.id === 'es-long-economic-chain');

    expect(shortCase).toBeDefined();
    expect(longCase).toBeDefined();

    const shortResult = formalize(shortCase!.text, shortCase!.options);
    const longResult = formalize(longCase!.text, longCase!.options);

    expectCaseQuality(shortCase!, shortResult);
    expectCaseQuality(longCase!, longResult);

    expect(longResult.atoms.size).toBeGreaterThan(shortResult.atoms.size);
    expect(longResult.formulas.length).toBeGreaterThan(shortResult.formulas.length);
    expect(longResult.stCode.length).toBeGreaterThan(shortResult.stCode.length);
  });

  it('maintains comments and traceability in generated ST for the corpus', () => {
    for (const testCase of CORPUS_CASES) {
      const result = formalize(testCase.text, testCase.options);
      expectCaseQuality(testCase, result);
      expect(result.stCode).toContain('//');
      expect(result.stCode).toContain('logic ');
    }
  });
});
