import { NLLinterDiagnostic, NLRule } from './types';
import { anaphoricRule, cognitiveDensityRule, fuzzyQuantifiersRule, logicalCompletenessRule } from './rules';

export const DEFAULT_RULES: NLRule[] = [
  anaphoricRule,
  cognitiveDensityRule,
  fuzzyQuantifiersRule,
  logicalCompletenessRule
];

/**
 * Escanea de forma asíncrona un texto buscando posibles violaciones de formalización sintiéndose como un Linter "ESLint".
 * Totalmente compatible con ejecución en cliente.
 */
export function lintNaturalLanguage(text: string, rules: NLRule[] = DEFAULT_RULES): NLLinterDiagnostic[] {
  if (!text || text.trim() === '') return [];
  
  let diagnostics: NLLinterDiagnostic[] = [];
  for (const rule of rules) {
     const result = rule.evaluate(text);
     if (result && result.length) {
       diagnostics = diagnostics.concat(result);
     }
  }
  
  // Ordenar por aparición en el texto
  return diagnostics.sort((a, b) => a.start - b.start);
}

export * from './types';
export * from './rules';
