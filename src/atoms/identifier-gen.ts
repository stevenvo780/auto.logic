/**
 * Identifier Generator — Genera IDs simbólicos ST válidos
 *
 * Convierte palabras clave en identificadores válidos para ST:
 * - Keywords → KEYWORDS_JOINED (e.g., LLUEVE, CALLE_MOJA)
 * - Letters → P, Q, R, S, ...
 * - Numbered → A1, A2, A3, ...
 */
import type { AtomStyle } from '../types';

/** Letras disponibles para estilo 'letters' */
const LETTERS = 'PQRSTUVWXYZABCDEFGHIJKLMNO'.split('');

/**
 * Genera un identificador ST válido a partir de palabras clave.
 */
export function generateId(
  keywords: string[],
  style: AtomStyle = 'keywords',
  index: number = 0,
): string {
  switch (style) {
    case 'keywords':
      return keywordsToId(keywords);
    case 'letters':
      return lettersId(index);
    case 'numbered':
      return numberedId(index);
  }
}

/**
 * Genera ID a partir de palabras clave.
 * Limpia caracteres especiales y une con underscore.
 */
function keywordsToId(keywords: string[]): string {
  if (keywords.length === 0) return 'ATOM';

  const id = keywords
    .map(k => sanitize(k))
    .filter(k => k.length > 0)
    .join('_')
    .toUpperCase();

  return id || 'ATOM';
}

/**
 * Genera ID tipo letra (P, Q, R, ..., P1, Q1, ...).
 */
function lettersId(index: number): string {
  if (index < LETTERS.length) return LETTERS[index];
  const cycle = Math.floor(index / LETTERS.length);
  const pos = index % LETTERS.length;
  return `${LETTERS[pos]}${cycle}`;
}

/**
 * Genera ID tipo numerado (A1, A2, A3, ...).
 */
function numberedId(index: number): string {
  return `A${index + 1}`;
}

/**
 * Sanitiza una palabra para ser un identificador ST válido.
 * Solo permite letras ASCII, dígitos y underscore.
 */
function sanitize(word: string): string {
  return word
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // eliminar diacríticos
    .replace(/[^a-zA-Z0-9_]/g, '')
    .replace(/^[0-9]/, '_$&'); // no empezar con dígito
}

/**
 * Genera un identificador para predicados (primer orden).
 * Formato: NombrePredicado (CamelCase)
 */
export function generatePredicateId(words: string[]): string {
  if (words.length === 0) return 'Pred';
  return words
    .map(w => {
      const s = sanitize(w);
      return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    })
    .join('');
}

/**
 * Genera un identificador de variable (minúscula).
 */
export function generateVariableId(name: string): string {
  const s = sanitize(name).toLowerCase();
  return s || 'x';
}
