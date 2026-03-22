/**
 * Keyword Extractor — Extrae palabras clave de una cláusula
 *
 * Filtra stopwords, extrae 2-4 palabras clave por lema,
 * genera bags-of-words para coreferencia.
 */
import type { Language, Token } from '../types';
import { tokenize, contentWords } from '../nlp/tokenizer';

export interface SemanticHint {
  subject?: string;
  predicate?: string;
  object?: string;
  polarity: 'positive' | 'negative';
  relationKind: 'copula' | 'action' | 'unknown';
  keywords: string[];
}

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
  // Phase 1.2: Lightweight Math Lexer
  // e.g., a = b + c -> Equals(a, Add(b, c))
  // Simple heuristic for math formulas in text:
  const mathMatch = text.match(/([a-zA-Z0-9]+)\s*([+\-=<>])\s*([a-zA-Z0-9()+*^-]+)/);
  if (mathMatch && mathMatch[2] === '=') {
     return {
       subject: mathMatch[1].trim(),
       predicate: 'Equals_' + mathMatch[3].replace(/[^a-zA-Z0-9]/g, '').trim()
     };
  }

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
  // Phase 1.3: Stop-words filter for subjects/predicates
  const filteredContent = content.filter(t => !['mera', 'ya', 'tambien', 'acaso', 'pues', 'tal', 'vez'].includes(t.normalized));
  if (filteredContent.length > 0) {
    return {
      subject: filteredContent[0].normalized,
      predicate: filteredContent.slice(1).map(t => t.normalized).join('_'),
    };
  }
  return {
    subject: content[0]?.normalized || 'x',
    predicate: content.slice(1).map(t => t.normalized).join('_') || 'P',
  };
}

export function extractSemanticHint(text: string, language: Language = 'es'): SemanticHint {
  const tokens = tokenize(text, language);
  const normalized = tokens.map((token) => token.normalized);
  const keywords = extractKeywords(text, language, 5);
  const polarity = normalized.includes('no') || normalized.includes('nunca') || normalized.includes('jamas')
    ? 'negative'
    : 'positive';

  const copulaPatterns = language === 'es'
    ? ['es', 'son', 'esta', 'estan', 'está', 'están', 'fue', 'sera', 'será']
    : ['is', 'are', 'was', 'were', 'be'];
  const copulaIndex = normalized.findIndex((token) => copulaPatterns.includes(token));

  if (copulaIndex > 0) {
    const subject = tokens
      .slice(0, copulaIndex)
      .filter((token) => !token.isStopword)
      .map((token) => token.stem || token.normalized)
      .join('_');
    const predicateParts = tokens
      .slice(copulaIndex + 1)
      .filter((token) => !token.isStopword && token.normalized !== 'no')
      .map((token) => token.stem || token.normalized);

    return {
      subject: subject || undefined,
      predicate: predicateParts[0],
      object: predicateParts.slice(1).join('_') || undefined,
      polarity,
      relationKind: 'copula',
      keywords,
    };
  }

  const content = tokens.filter((token) => !token.isStopword && token.normalized !== 'no');
  if (content.length === 0) {
    return { polarity, relationKind: 'unknown', keywords };
  }

  return {
    subject: content[0] ? (content[0].stem || content[0].normalized) : undefined,
    predicate: content[1] ? (content[1].stem || content[1].normalized) : (content[0].stem || content[0].normalized),
    object: content.slice(2).map((token) => token.stem || token.normalized).join('_') || undefined,
    polarity,
    relationKind: content.length >= 2 ? 'action' : 'unknown',
    keywords,
  };
}
