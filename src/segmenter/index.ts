/**
 * Segmenter — Orquestador de segmentación
 */
export { splitSentences } from './sentence-splitter';
export { splitClauses } from './clause-splitter';
import { splitSentences } from './sentence-splitter';
import { splitClauses } from './clause-splitter';
import type { Sentence, Language } from '../types';

/**
 * Segmenta un texto completo en oraciones con cláusulas.
 */
export function segment(text: string, language: Language = 'es'): Sentence[] {
  const rawSentences = splitSentences(text);
  return rawSentences.map((raw, index) => ({
    original: raw,
    index,
    clauses: splitClauses(raw, language),
  }));
}
