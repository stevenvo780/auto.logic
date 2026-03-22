/**
 * Formula — Orquestador de construcción de fórmulas
 */
export { buildPropositional } from './propositional';
export { buildFirstOrder } from './first-order';
export { buildModal } from './modal';
export { buildTemporal } from './temporal';
export { roleToOperator, profileSupportsOperator, ST_OPERATORS } from './connectors';

import type { AnalyzedSentence, AtomEntry, FormulaEntry, LogicProfile } from '../types';
import { buildPropositional } from './propositional';
import { buildFirstOrder } from './first-order';
import { buildModal } from './modal';
import { buildTemporal } from './temporal';

/**
 * Construye fórmulas ST según el perfil lógico seleccionado.
 * Delega al builder específico del perfil.
 */
export function buildFormulas(
  sentences: AnalyzedSentence[],
  atomEntries: AtomEntry[],
  profile: LogicProfile,
  detectedPatterns: string[],
): FormulaEntry[] {
  switch (profile) {
    case 'classical.propositional':
    case 'intuitionistic.propositional':
    case 'paraconsistent.belnap':
    case 'arithmetic':
    case 'probabilistic.basic':
      return buildPropositional(sentences, atomEntries, detectedPatterns);

    case 'classical.first_order':
    case 'aristotelian.syllogistic':
      return buildFirstOrder(sentences, atomEntries, detectedPatterns);

    case 'modal.k':
    case 'epistemic.s5':
    case 'deontic.standard':
      return buildModal(sentences, atomEntries, profile);

    case 'temporal.ltl':
      return buildTemporal(sentences, atomEntries);

    default:
      return buildPropositional(sentences, atomEntries, detectedPatterns);
  }
}
