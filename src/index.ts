/**
 * Autologic — Formalizador automático de texto natural a lógica formal ST
 *
 * @packageDocumentation
 * @module @stevenvo780/autologic
 *
 * @example
 * ```ts
 * import { formalize, Autologic } from '@stevenvo780/autologic';
 *
 * // Uso stateless
 * const result = formalize("Si llueve, la calle se moja.", {
 *   profile: 'classical.propositional',
 *   language: 'es',
 * });
 * console.log(result.stCode);
 *
 * // Uso con estado
 * const al = new Autologic({ language: 'es' });
 * const r = al.formalize("Todo humano es mortal. Sócrates es humano.");
 * ```
 */

// ── API pública principal ─────────────────────
export { formalize } from './formalize';
export { Autologic } from './autologic';

// ── Tipos ─────────────────────────────────────
export type {
  FormalizeOptions,
  FormalizationResult,
  AutologicConfig,
  LogicProfile,
  Language,
  AtomStyle,
  DiscourseAnalysis,
  AnalyzedSentence,
  AnalyzedClause,
  SentenceType,
  ClauseRole,
  ClauseModifier,
  MarkerRole,
  MarkerDefinition,
  DetectedMarker,
  ArgumentStructure,
  ArgumentRelation,
  ArgumentPattern,
  Sentence,
  Clause,
  AtomEntry,
  FormulaEntry,
  STStatementType,
  Diagnostic,
  Token,
} from './types';

// ── Utilidades expuestas ──────────────────────
export { segment } from './segmenter';
export { analyzeDiscourse } from './discourse';
export { extractAtoms } from './atoms';
export { buildFormulas } from './formula';
export { emitST } from './generator/st-emitter';
export { validateST } from './generator/validator';
