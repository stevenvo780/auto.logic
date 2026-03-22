/**
 * Autologic — Formalizador automático de texto natural a lógica formal ST
 *
 * @packageDocumentation
 * @module @stevenvo780/autologic
 */

// ── API pública principal ─────────────────────
export { formalize, formalizeWithLLM } from './formalize';
export type { FormalizeWithLLMOptions, FormalizationLLMResult } from './formalize';
export { lintNaturalLanguage, DEFAULT_RULES } from './nl-linter';
export type { NLLinterDiagnostic, NLRule } from './nl-linter';
export { Autologic } from './autologic';
export { parseTextWithLLM, llmResultToST } from './llm-parser';
export type { LLMConfig, LLMParsedResult } from './llm-parser';

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
