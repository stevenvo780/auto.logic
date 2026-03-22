/**
 * Formula — Orquestador de construcción de fórmulas
 *
 * Pipeline:
 * 1. Construir fórmulas per-sentence (según perfil lógico)
 * 2. Enriquecer con derivaciones cross-sentence (argument-builder)
 */
export { buildPropositional } from './propositional';
export { buildFirstOrder } from './first-order';
export { buildModal } from './modal';
export { buildTemporal } from './temporal';
export { buildCrossSentenceDerivations } from './argument-builder';
export { roleToOperator, profileSupportsOperator, ST_OPERATORS } from './connectors';

import type { AnalyzedSentence, AtomEntry, FormulaEntry, LogicProfile } from '../types';
import { buildPropositional } from './propositional';
import { buildFirstOrder } from './first-order';
import { buildModal } from './modal';
import { buildTemporal } from './temporal';
import { buildCrossSentenceDerivations } from './argument-builder';

/**
 * Construye fórmulas ST según el perfil lógico seleccionado.
 * Delega al builder específico del perfil, luego enriquece
 * con derivaciones cross-sentence.
 */
export function buildFormulas(
  sentences: AnalyzedSentence[],
  atomEntries: AtomEntry[],
  profile: LogicProfile,
  detectedPatterns: string[],
): FormulaEntry[] {
  // ── Paso 1: fórmulas per-sentence ─────────────
  let perSentence: FormulaEntry[];

  switch (profile) {
    case 'classical.propositional':
    case 'intuitionistic.propositional':
    case 'paraconsistent.belnap':
    case 'arithmetic':
    case 'probabilistic.basic':
      perSentence = buildPropositional(sentences, atomEntries, detectedPatterns);
      break;

    case 'classical.first_order':
    case 'aristotelian.syllogistic':
      perSentence = buildFirstOrder(sentences, atomEntries, detectedPatterns);
      break;

    case 'modal.k':
    case 'epistemic.s5':
    case 'deontic.standard':
      perSentence = buildModal(sentences, atomEntries, profile);
      break;

    case 'temporal.ltl':
      perSentence = buildTemporal(sentences, atomEntries);
      break;

    default:
      perSentence = buildPropositional(sentences, atomEntries, detectedPatterns);
      break;
  }

  // ── Paso 2: derivaciones cross-sentence ───────
  const crossDerives = buildCrossSentenceDerivations(
    perSentence,
    sentences,
    atomEntries,
    detectedPatterns,
  );

  return [...perSentence, ...crossDerives];
}
