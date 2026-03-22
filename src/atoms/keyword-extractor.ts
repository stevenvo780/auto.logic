/**
 * Keyword Extractor — Extrae palabras clave de una cláusula
 *
 * Filtra stopwords, extrae 2-4 palabras clave por lema,
 * genera bags-of-words para coreferencia.
 */
import type { Language, Token } from '../types';
import { tokenize, contentWords } from '../nlp/tokenizer';

/**
 * Extrae las palabras clave principales de un texto.
 * Filtra stopwords y selecciona las más significativas.
 */
export function extractKeywords(text: string, language: Language = 'es', maxWords: number = 4): string[] {
  const tokens = contentWords(text, language);
  if (tokens.length === 0) {
    // Fallback: usar todas las palabras
    return tokenize(text, language)
      .filter(t => t.normalized.length > 2)
      .slice(0, maxWords)
      .map(t => t.normalized);
  }

  // Priorizar palabras más largas (generalmente más significativas)
  const sorted = [...tokens].sort((a, b) => b.normalized.length - a.normalized.length);
  return sorted.slice(0, maxWords).map(t => t.normalized);
}

/**
 * Obtiene los stems de las palabras de contenido para comparación.
 */
export function extractStems(text: string, language: Language = 'es'): string[] {
  const tokens = contentWords(text, language);
  return tokens
    .filter(t => t.stem && t.stem.length > 1)
    .map(t => t.stem!);
}

/**
 * Calcula un bag-of-stems para comparación de similitud.
 */
export function bagOfStems(text: string, language: Language = 'es'): Set<string> {
  return new Set(extractStems(text, language));
}

/**
 * Extrae sujeto y predicado para lógica de primer orden.
 * Heurística: el primer sustantivo es el sujeto, el verbo + complemento es el predicado.
 */
export function extractSubjectPredicate(
  text: string,
  language: Language = 'es'
): { subject: string; predicate: string } | null {
  const tokens = tokenize(text, language);
  const content = tokens.filter(t => !t.isStopword);

  if (content.length < 2) return null;

  // Heurística para español: "[sujeto] es [predicado]"
  const copulaPatterns = language === 'es'
    ? ['es', 'son', 'está', 'están', 'fue', 'será']
    : ['is', 'are', 'was', 'were', 'will be'];

  const copulaIndex = tokens.findIndex(t => copulaPatterns.includes(t.normalized));

  if (copulaIndex > 0) {
    const subject = tokens.slice(0, copulaIndex)
      .filter(t => !t.isStopword)
      .map(t => t.normalized)
      .join('_');
    const predicate = tokens.slice(copulaIndex + 1)
      .filter(t => !t.isStopword)
      .map(t => t.normalized)
      .join('_');

    if (subject && predicate) {
      return { subject, predicate };
    }
  }

  // Fallback: primera palabra = sujeto, resto = predicado
  return {
    subject: content[0].normalized,
    predicate: content.slice(1).map(t => t.normalized).join('_'),
  };
}
