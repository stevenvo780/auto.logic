/**
 * Coreference — Resolución básica de coreferencia por similitud léxica
 *
 * Detecta cuando dos cláusulas se refieren a la misma proposición:
 * "llueve" ≈ "está lloviendo" → mismo átomo
 *
 * Usa coeficiente Dice/Jaccard sobre bags-of-stems.
 */
import type { Language } from '../types';
import { bagOfStems } from './keyword-extractor';

/** Umbral de similitud para considerar coreferencia (70%) */
const COREFERENCE_THRESHOLD = 0.7;

/**
 * Calcula la similitud Dice entre dos conjuntos de stems.
 * Dice = 2|A∩B| / (|A| + |B|)
 */
export function diceSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }

  return (2 * intersection) / (setA.size + setB.size);
}

/**
 * Calcula la similitud Jaccard entre dos conjuntos.
 * Jaccard = |A∩B| / |A∪B|
 */
export function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  const union = new Set([...setA, ...setB]);
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }

  return intersection / union.size;
}

/**
 * Determina si dos textos son correferentes (hablan de lo mismo).
 */
export function areCoreferent(
  textA: string,
  textB: string,
  language: Language = 'es',
  threshold: number = COREFERENCE_THRESHOLD,
): boolean {
  const stemsA = bagOfStems(textA, language);
  const stemsB = bagOfStems(textB, language);
  return diceSimilarity(stemsA, stemsB) >= threshold;
}

/**
 * Dado un array de textos, agrupa los correferentes y retorna
 * un mapa de texto → índice del grupo representativo.
 */
export function resolveCoreferenceGroups(
  texts: string[],
  language: Language = 'es',
  threshold: number = COREFERENCE_THRESHOLD,
): Map<number, number> {
  const stemSets = texts.map(t => bagOfStems(t, language));
  const groups = new Map<number, number>(); // idx → representative idx

  for (let i = 0; i < texts.length; i++) {
    let found = false;
    for (let j = 0; j < i; j++) {
      if (groups.has(j) && groups.get(j) !== j) continue;
      if (diceSimilarity(stemSets[i], stemSets[j]) >= threshold) {
        groups.set(i, j);
        found = true;
        break;
      }
    }
    if (!found) {
      groups.set(i, i); // es su propio representante
    }
  }

  return groups;
}
