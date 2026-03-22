/**
 * Connectors — Mapa de marcador → operador ST
 *
 * Define la correspondencia entre roles discursivos y operadores lógicos ST.
 */
import type { MarkerRole, LogicProfile } from '../types';

/** Operadores ST por tipo de conexión */
export const ST_OPERATORS = {
  implication: '->',
  biconditional: '<->',
  conjunction: '&',
  disjunction: '|',
  negation: '!',
  universal: 'forall',
  existential: 'exists',
  necessity: '[]',
  possibility: '<>',
  temporal_next: 'next',
  temporal_until: 'until',
  temporal_always: 'always',
  temporal_eventually: 'eventually',
} as const;

/**
 * Obtiene el operador ST correspondiente a un rol de marcador.
 */
export function roleToOperator(role: MarkerRole): string | null {
  switch (role) {
    case 'condition':
    case 'consequent':
    case 'conclusion':
      return ST_OPERATORS.implication;
    case 'biconditional':
      return ST_OPERATORS.biconditional;
    case 'and':
      return ST_OPERATORS.conjunction;
    case 'or':
      return ST_OPERATORS.disjunction;
    case 'negation':
      return ST_OPERATORS.negation;
    case 'universal':
      return ST_OPERATORS.universal;
    case 'existential':
      return ST_OPERATORS.existential;
    case 'necessity':
      return ST_OPERATORS.necessity;
    case 'possibility':
      return ST_OPERATORS.possibility;
    case 'temporal':
    case 'temporal_next':
      return ST_OPERATORS.temporal_next;
    case 'temporal_until':
      return ST_OPERATORS.temporal_until;
    case 'temporal_always':
      return ST_OPERATORS.temporal_always;
    case 'temporal_eventually':
      return ST_OPERATORS.temporal_eventually;
    default:
      return null;
  }
}

/**
 * Verifica si un perfil soporta un operador dado.
 */
export function profileSupportsOperator(profile: LogicProfile, operator: string): boolean {
  const propositional = ['->', '<->', '&', '|', '!'];
  const firstOrder = [...propositional, 'forall', 'exists'];
  const modal = [...propositional, '[]', '<>'];
  const temporal = [...propositional, 'next', 'until', 'always', 'eventually'];

  switch (profile) {
    case 'classical.propositional':
    case 'intuitionistic.propositional':
    case 'paraconsistent.belnap':
      return propositional.includes(operator);
    case 'classical.first_order':
      return firstOrder.includes(operator);
    case 'modal.k':
    case 'epistemic.s5':
    case 'deontic.standard':
      return modal.includes(operator);
    case 'temporal.ltl':
      return temporal.includes(operator);
    case 'aristotelian.syllogistic':
      return firstOrder.includes(operator);
    case 'arithmetic':
    case 'probabilistic.basic':
      return propositional.includes(operator);
    default:
      return propositional.includes(operator);
  }
}
