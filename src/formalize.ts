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
import { compileComplexLogic } from './compiler-frontend';
import { executeST, executionToDiagnostics, validateST, validationToDiagnostics } from './generator/validator';

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
    
    // ── 0. Compilador AST Directo (Fase 1-4) ─────
    const advancedLogic = compileComplexLogic(text, opts.profile);
    if (advancedLogic) {
      const { code: stCode, diagnostics: emitDiags } = emitST({
        profile: opts.profile,
        language: opts.language,
        includeComments: opts.includeComments,
        atoms: new Map(),
        formulas: advancedLogic.map((al, idx) => ({
          formula: al.formula,
          stType: al.type,
          label: `a${idx+1}`,
          sourceText: text,
          sourceSentence: 0,
        })),
        detectedPatterns: ['ast_compiled']
      });
      diagnostics.push(...emitDiags);
      
      return {
        ok: true,
        stCode,
        analysis: { sentences: [], argumentStructure: { premises: [], conclusions: [], conditions: [], relations: [] }, detectedPatterns: [] },
        atoms: new Map(),
        formulas: [],
        diagnostics,
        stValidation: {ok: true, errors: []},
        stExecution: undefined
      }
    }

    // ── 1. Segmentación ─────────────────────────
    const sentences = segment(text, opts.language);

    if (sentences.length === 0) {
      return emptyResult('No se detectaron oraciones en el texto.', diagnostics);
    }

    // ── 1.5. Resolución Anafórica (Fase 2.1) ────────
    let lastSubject = '';
    for (const sentence of sentences) {
      for (const clause of sentence.clauses) {
         // Heuristica basica para buscar el sujeto dominante 
         // o palabras clave de la clausula
         const words = clause.text.split(' ');
         for (let i=0; i<words.length; i++) {
           const w = words[i].toLowerCase();
           if (['el', 'la', 'los', 'las', 'un', 'una'].includes(w) && i+1 < words.length && words[i+1].length > 3) {
              lastSubject = words[i+1];
           }
         }
         
         // Reemplazar anáforas
         if (lastSubject) {
            clause.text = clause.text.replace(/\b(este|ese|aquel|éste|ése|aquél)\b/gi, lastSubject);
            clause.text = clause.text.replace(/\b(lo anterior)\b/gi, lastSubject);
         }
      }
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
    let stExecution:
      | { ok: boolean; exitCode: number; timedOut: boolean; durationMs: number; errors: string[]; resultStatuses: string[] }
      | undefined;
    if (opts.validateOutput) {
      stValidation = validateST(code);
      diagnostics.push(...validationToDiagnostics(stValidation));

      if (stValidation.ok) {
        stExecution = executeST(code);
        diagnostics.push(...executionToDiagnostics(stExecution));
      }
    }

    return {
      ok: diagnostics.every(d => d.severity !== 'error'),
      stCode: code,
      analysis,
      atoms,
      formulas,
      diagnostics,
      stValidation,
      stExecution,
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

import { parseTextWithLLM, llmResultToST, LLMParsedResult, LLMConfig } from './llm-parser';
import { lintNaturalLanguage, DEFAULT_RULES, NLLinterDiagnostic } from './nl-linter';

export interface FormalizeWithLLMOptions extends FormalizeOptions {
  llmConfig: LLMConfig;
  abortOnLinterErrors?: boolean;
}

export interface FormalizationLLMResult extends FormalizationResult {
  linterDiagnostics: NLLinterDiagnostic[];
  llmRawAst?: LLMParsedResult;
}

/**
 * Nueva entrada arquitectonica de Doble Capa.
 * 1. Pasa por en NL Linter
 * 2. Manda a Inferencia (Local o Red)
 */
export async function formalizeWithLLM(text: string, options: FormalizeWithLLMOptions): Promise<FormalizationLLMResult> {
  const opts = { ...DEFAULTS, abortOnLinterErrors: true, ...options };
  const baseResult: FormalizationLLMResult = {
      ok: false, stCode: '', analysis: { sentences: [], argumentStructure: { premises: [], conclusions: [], conditions: [], relations: [] }, detectedPatterns: [] },
      atoms: new Map(), formulas: [], diagnostics: [], stValidation: {ok: true, errors: []}, stExecution: undefined,
      linterDiagnostics: []
  };

  // 1. Capa Linter
  const linterDiagnostics = lintNaturalLanguage(text, DEFAULT_RULES);
  baseResult.linterDiagnostics = linterDiagnostics;
  
  const hasErrors = linterDiagnostics.some(d => d.severity === 'error');
  if (hasErrors && opts.abortOnLinterErrors) {
      baseResult.diagnostics.push({
          severity: 'error',
          code: 'NL_LINTER_ABORT',
          message: 'El texto no es apto para formalización. Revisa los errores del NL Linter.'
      });
      return baseResult;
  }

  try {
      // 2. Capa LLM / SLM (Inferencia semántica)
      const parsedAst = await parseTextWithLLM(text, opts.profile, opts.llmConfig);
      baseResult.llmRawAst = parsedAst;

      // 3. Traducimos el Árbol JSON a código ST
      const stLines = llmResultToST(parsedAst);
      
      const generatorInput = stLines.map((line, i) => ({
          formula: line.formula,
          stType: line.type,
          label: line.type === 'axiom' ? `a${i+1}` : `c${i+1}`,
          sourceText: '', sourceSentence: 0
      }));

      const { code: stCode, diagnostics: emitDiags } = emitST({
          profile: opts.profile,
          language: opts.language,
          includeComments: opts.includeComments,
          atoms: new Map(),
          formulas: generatorInput,
          detectedPatterns: ['llm_extracted']
      });

      baseResult.stCode = stCode;
      baseResult.diagnostics.push(...emitDiags);

      if (opts.validateOutput) {
          const stValidation = validateST(stCode);
          baseResult.stValidation = stValidation;
          baseResult.diagnostics.push(...validationToDiagnostics(stValidation));

          if (stValidation.ok) {
              const stExecution = executeST(stCode);
              baseResult.stExecution = stExecution;
              baseResult.diagnostics.push(...executionToDiagnostics(stExecution));
          }
      }

      const allValid = baseResult.diagnostics.every(d => d.severity !== 'error');
      baseResult.ok = allValid;
      return baseResult;

  } catch (err: any) {
      baseResult.diagnostics.push({
          severity: 'error',
          code: 'LLM_PIPELINE_ERROR',
          message: `Ocurrió un error en la capa inferencial: ${err.message}`
      });
      return baseResult;
  }
}
