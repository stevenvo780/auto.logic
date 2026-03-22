/**
 * Tokenizer — Tokenización básica basada en regex
 */
import type { Token, Language } from '../types';
import { isStopword } from './stopwords';
import { stemEs } from './stemmer-es';
import { stemEn } from './stemmer-en';

/**
 * Tokeniza un texto en tokens con metadatos.
 */
export function tokenize(text: string, language: Language = 'es'): Token[] {
  const stemFn = language === 'es' ? stemEs : stemEn;
  const words = text.match(/[\p{L}\p{N}]+/gu) || [];
  const tokens: Token[] = [];
  let searchPos = 0;

  for (const word of words) {
    const pos = text.indexOf(word, searchPos);
    const normalized = word.toLowerCase();
    tokens.push({
      text: word,
      normalized,
      stem: stemFn(normalized),
      isStopword: isStopword(normalized, language),
      position: pos,
    });
    searchPos = pos + word.length;
  }

  return tokens;
}

/**
 * Extrae palabras de contenido (no stopwords) de un texto.
 */
export function contentWords(text: string, language: Language = 'es'): Token[] {
  return tokenize(text, language).filter(t => !t.isStopword);
}
