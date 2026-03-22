/**
 * Discourse — Analizador discursivo
 */
export { MARKERS_ES } from './markers-es';
export { MARKERS_EN } from './markers-en';
export { classifyClauses } from './role-classifier';
export { detectPatterns, buildArgumentStructure } from './pattern-detector';

import type { Sentence, Language, DiscourseAnalysis, AnalyzedSentence, MarkerDefinition } from '../types';
import { classifyClauses } from './role-classifier';
import { detectPatterns, buildArgumentStructure } from './pattern-detector';

/**
 * Analiza discursivamente un conjunto de oraciones segmentadas.
 * Retorna análisis completo con roles, patrones y estructura argumental.
 */
export function analyzeDiscourse(sentences: Sentence[], language: Language = 'es'): DiscourseAnalysis {
  // 1. Clasificar cláusulas de cada oración
  const analyzedSentences: AnalyzedSentence[] = sentences.map(sentence =>
    classifyClauses(sentence.clauses, language)
  );

  // 2. Detectar patrones argumentales
  const detectedPatterns = detectPatterns(analyzedSentences);

  // 3. Construir estructura argumental
  const argumentStructure = buildArgumentStructure(analyzedSentences);

  return {
    sentences: analyzedSentences,
    argumentStructure,
    detectedPatterns,
  };
}

/**
 * Registra un marcador personalizado (para extensibilidad).
 */
export function createCustomMarker(
  text: string,
  role: MarkerDefinition['role'],
  language: Language,
  priority: number = 5,
): MarkerDefinition {
  return { text: text.toLowerCase(), role, language, priority };
}
