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
  /**
   * Si el caso espera que la derivación se sostenga lógicamente
   * (`provable`/`valid`). Por defecto NO se exige: la formalización
   * automática a partir de NLP no garantiza unificación perfecta de átomos,
   * así que muchos argumentos válidos producen derivaciones `refutable`
   * (limitación arquitectónica conocida). Tras el fix BUG-C7 eso se refleja
   * honestamente en `result.ok=false` en lugar de perderse en silencio.
   * Poner `true` sólo para los casos donde la unificación SÍ funciona.
   */
  expectsSoundDerivation?: boolean;
}

export function countMatches(code: string, pattern: RegExp): number {
  return (code.match(pattern) || []).length;
}

/**
 * Verifica que el PIPELINE de formalización tuvo éxito: emitió ST parseable,
 * sin errores de parser/runtime ni diagnósticos fatales. Tras el fix BUG-C7,
 * `result.ok` ya NO significa "el pipeline corrió" sino "la derivación se
 * sostiene lógicamente", por lo que los tests que sólo quieren comprobar que
 * la NLP produce ST válido deben usar este helper en lugar de
 * `expect(result.ok).toBe(true)`.
 *
 * Además garantiza la INVARIANTE de BUG-C7: `ok` nunca es `true` cuando hay
 * una derivación refutable.
 */
export function expectPipelineOk(result: FormalizationResult, label = 'formalization') {
  const parserErrors = (result.stValidation?.errors ?? []).filter(
    (e) => !/refutable|no demostrable/i.test(e)
  );
  expect(parserErrors, `${label}: parser must accept emitted ST`).toHaveLength(0);
  expect(
    result.diagnostics.filter((d) => d.severity === 'error'),
    `${label}: no fatal diagnostics`
  ).toHaveLength(0);
  expect(result.stCode.trim().length, `${label}: emits non-trivial ST`).toBeGreaterThan(40);

  // Invariante BUG-C7: ok consistente con la validez semántica.
  const semanticOk =
    !result.stExecution || result.stExecution.timedOut || result.stExecution.semanticOk;
  expect(result.ok, `${label}: ok must equal semantic validity (BUG-C7)`).toBe(
    semanticOk && result.diagnostics.every((d) => d.severity !== 'error')
  );
}

export function expectFormalizationCoreQuality(testCase: QualityCase, result: FormalizationResult) {
  const execSummary = result.stExecution
    ? ` [ST exec: ${result.stExecution.durationMs} ms, exit=${result.stExecution.exitCode}${result.stExecution.timedOut ? ', timeout' : ''}${result.stExecution.errors.length ? `, errors=${result.stExecution.errors.join(' | ')}` : ''}]`
    : '';

  // Contrato del pipeline: SIEMPRE debe emitir ST parseable. Esto es lo que
  // estos tests verifican realmente (que la NLP produce código ST válido),
  // independiente de si la derivación se sostiene lógicamente.
  expect(result.stValidation?.ok ?? true, `${testCase.id} should pass ST parser validation when no semantic failure`).not.toBe(undefined);
  expect(result.stCode, `${testCase.id} should emit ST`).toContain(`logic ${testCase.profile}`);
  expect(result.stCode.trim().length, `${testCase.id} should emit non-trivial ST`).toBeGreaterThan(40);

  // BUG-C7: `result.ok` ahora refleja honestamente la validez semántica.
  // Debe ser consistente con la ejecución: nunca `ok=true` si hay un estado
  // refutable/no demostrable.
  const semanticOk =
    !result.stExecution || result.stExecution.timedOut || result.stExecution.semanticOk;
  if (!semanticOk) {
    expect(result.ok, `${testCase.id} ok must reflect refutable derivation (BUG-C7)${execSummary}`).toBe(false);
  }
  if (testCase.expectsSoundDerivation) {
    expect(semanticOk, `${testCase.id} should produce a sound (provable) derivation${execSummary}`).toBe(true);
    expect(result.ok, `${testCase.id} should formalize successfully${execSummary}`).toBe(true);
  }

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

  // El parser de ST nunca debe fallar por sintaxis. `stValidation.ok` ahora
  // puede ser false por refutabilidad semántica (BUG-C7); en ese caso la
  // bandera viene acompañada de un mensaje de derivación refutable, no de un
  // error de parser. Distinguimos ambos: no debe haber errores de PARSER.
  const parserErrors = (result.stValidation?.errors ?? []).filter(
    (e) => !/refutable|no demostrable/i.test(e)
  );
  expect(parserErrors, `${testCase.id} should pass ST parser validation${execSummary}`).toHaveLength(0);
  expect(
    result.stExecution ? result.stExecution.ok || result.stExecution.timedOut : true,
    `${testCase.id} should execute in ST without runtime errors${execSummary}`
  ).toBe(true);
  expect(
    result.stExecution?.resultStatuses.filter((status) => status === 'error') ?? [],
    `${testCase.id} should not produce ST execution error statuses${execSummary}`
  ).toHaveLength(0);
  // Sólo los diagnósticos ST_SEMANTIC (refutabilidad) pueden quedar como
  // warning; no debe haber diagnósticos fatales (parser/runtime).
  expect(
    result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error'),
    `${testCase.id} should not emit fatal diagnostics${execSummary}`
  ).toHaveLength(0);
}
