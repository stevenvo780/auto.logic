/**
 * formalize() — Función stateless principal de Autologic
 *
 * Toma texto natural + opciones y produce código ST válido.
 * Pipeline: Segment → Analyze → Extract Atoms → Build Formulas → Emit ST → Validate
 */
import type { FormalizeOptions, FormalizationResult, Diagnostic, LogicProfile, Language, AtomStyle } from './types';
import { segment } from './segmenter';
import { analyzeDiscourse } from './discourse';
import { extractAtoms } from './atoms';
import { buildFormulas } from './formula';
import { emitST } from './generator/st-emitter';
import { validateST, validationToDiagnostics } from './generator/validator';

/** Opciones por defecto */
const DEFAULTS: Required<FormalizeOptions> = {
  profile: 'classical.propositional',
  language: 'es',
  atomStyle: 'keywords',
  includeComments: true,
  validateOutput: true,
  maxClauseDepth: 3,
};

/**
 * Formaliza texto natural a código ST.
 *
 * @param text Texto en lenguaje natural a formalizar
 * @param options Opciones de formalización
 * @returns Resultado con código ST, análisis y diagnósticos
 *
 * @example
 * ```ts
 * const result = formalize(
 *   "Si llueve, entonces la calle se moja. Está lloviendo. Por lo tanto, la calle está mojada.",
 *   { profile: 'classical.propositional', language: 'es' }
 * );
 * console.log(result.stCode);
 * ```
 */
export function formalize(text: string, options: FormalizeOptions = {}): FormalizationResult {
  const opts = { ...DEFAULTS, ...options };
  const diagnostics: Diagnostic[] = [];

  // ── Validación de entrada ───────────────────
  if (!text || !text.trim()) {
    return emptyResult('El texto de entrada está vacío.', diagnostics);
  }

  try {
    // ── 1. Segmentación ─────────────────────────
    const sentences = segment(text, opts.language);

    if (sentences.length === 0) {
      return emptyResult('No se detectaron oraciones en el texto.', diagnostics);
    }

    // ── 2. Análisis discursivo ──────────────────
    const analysis = analyzeDiscourse(sentences, opts.language);

    // ── 3. Extracción de átomos ─────────────────
    const { atoms, entries: atomEntries } = extractAtoms(analysis.sentences, {
      language: opts.language,
      atomStyle: opts.atomStyle,
      profile: opts.profile,
    });

    // ── 4. Construcción de fórmulas ─────────────
    const formulas = buildFormulas(
      analysis.sentences,
      atomEntries,
      opts.profile,
      analysis.detectedPatterns,
    );

    // ── 5. Generación de código ST ──────────────
    const { code, diagnostics: emitDiags } = emitST({
      profile: opts.profile,
      language: opts.language,
      includeComments: opts.includeComments,
      atoms,
      formulas,
      detectedPatterns: analysis.detectedPatterns,
    });
    diagnostics.push(...emitDiags);

    // ── 6. Validación (opcional) ────────────────
    let stValidation: { ok: boolean; errors: string[] } | undefined;
    if (opts.validateOutput) {
      stValidation = validateST(code);
      diagnostics.push(...validationToDiagnostics(stValidation));
    }

    return {
      ok: diagnostics.every(d => d.severity !== 'error'),
      stCode: code,
      analysis,
      atoms,
      formulas,
      diagnostics,
      stValidation,
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    diagnostics.push({
      severity: 'error',
      message: `Error en pipeline de formalización: ${message}`,
      code: 'PIPELINE_ERROR',
    });

    return {
      ok: false,
      stCode: '',
      analysis: {
        sentences: [],
        argumentStructure: { premises: [], conclusions: [], conditions: [], relations: [] },
        detectedPatterns: [],
      },
      atoms: new Map(),
      formulas: [],
      diagnostics,
    };
  }
}

/**
 * Resultado vacío con error.
 */
function emptyResult(message: string, diagnostics: Diagnostic[]): FormalizationResult {
  diagnostics.push({ severity: 'warning', message, code: 'EMPTY_INPUT' });
  return {
    ok: false,
    stCode: '',
    analysis: {
      sentences: [],
      argumentStructure: { premises: [], conclusions: [], conditions: [], relations: [] },
      detectedPatterns: [],
    },
    atoms: new Map(),
    formulas: [],
    diagnostics,
  };
}
