import type { AtomEntry, ClauseModifier, LogicProfile } from '../types';
import { diceSimilarity } from '../atoms/coreference';
import { bagOfStems } from '../atoms/keyword-extractor';
import { ST_OPERATORS } from './connectors';

const MODAL_MODIFIER_TYPES = new Set(['necessity', 'possibility']);
const TEMPORAL_MODIFIER_TYPES = new Set([
  'temporal_next',
  'temporal_until',
  'temporal_always',
  'temporal_eventually'
]);

const MODAL_PROFILES = new Set<LogicProfile>(['modal.k', 'deontic.standard', 'epistemic.s5']);
const TEMPORAL_PROFILES = new Set<LogicProfile>(['temporal.ltl']);

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function buildFallbackAtomId(clauseText: string): string {
  return clauseText
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .toUpperCase()
    .slice(0, 30) || 'ATOM';
}

export function resolveAtomId(
  clauseText: string,
  allAtoms: AtomEntry[],
  globalMap?: Map<string, string>
): string {
  const fromMap = globalMap?.get(clauseText);
  if (fromMap) return fromMap;

  const normalizedClause = normalizeText(clauseText);

  if (globalMap) {
    for (const [text, id] of globalMap) {
      const normalizedText = normalizeText(text);
      if (
        clauseText.includes(text) ||
        text.includes(clauseText) ||
        normalizedClause === normalizedText ||
        normalizedClause.includes(normalizedText) ||
        normalizedText.includes(normalizedClause)
      ) {
        return id;
      }
    }
  }

  const exact = allAtoms.find((atom) => atom.text === clauseText);
  if (exact) return exact.id;

  const normalizedExact = allAtoms.find((atom) => normalizeText(atom.text) === normalizedClause);
  if (normalizedExact) return normalizedExact.id;

  const inclusive = allAtoms.find((atom) => {
    const normalizedAtom = normalizeText(atom.text);
    return (
      atom.text.includes(clauseText) ||
      clauseText.includes(atom.text) ||
      normalizedAtom.includes(normalizedClause) ||
      normalizedClause.includes(normalizedAtom)
    );
  });
  if (inclusive) return inclusive.id;

  const ranked = allAtoms
    .map((atom) => ({
      atom,
      similarity: diceSimilarity(bagOfStems(atom.text, 'es'), bagOfStems(clauseText, 'es'))
    }))
    .sort((left, right) => right.similarity - left.similarity)[0];

  if (ranked && ranked.similarity >= 0.6) {
    return ranked.atom.id;
  }

  return buildFallbackAtomId(clauseText);
}

function getModalSyntax(profile: LogicProfile): { necessity: string; possibility: string } {
  switch (profile) {
    case 'epistemic.s5':
      return { necessity: 'K', possibility: 'B' };
    case 'deontic.standard':
      return { necessity: 'O', possibility: 'P' };
    default:
      return { necessity: ST_OPERATORS.necessity, possibility: ST_OPERATORS.possibility };
  }
}

function getTemporalSyntax(profile: LogicProfile): {
  next: string;
  until: string;
  always: string;
  eventually: string;
} {
  if (profile === 'temporal.ltl') {
    return {
      next: ST_OPERATORS.temporal_next,
      until: ST_OPERATORS.temporal_until,
      always: 'G',
      eventually: 'F'
    };
  }

  return {
    next: ST_OPERATORS.temporal_next,
    until: ST_OPERATORS.temporal_until,
    always: ST_OPERATORS.temporal_always,
    eventually: ST_OPERATORS.temporal_eventually
  };
}

function wrapUnary(operator: string, formula: string): string {
  return `${operator}(${formula})`;
}

export function applyLogicalModifiers(
  formula: string,
  modifiers: Array<ClauseModifier['type'] | string>,
  profile: LogicProfile
): string {
  const modalSyntax = getModalSyntax(profile);
  const temporalSyntax = getTemporalSyntax(profile);
  let output = formula;

  for (const modifier of modifiers) {
    switch (modifier) {
      case 'negation':
        output = wrapUnary(ST_OPERATORS.negation, output);
        break;
      case 'necessity':
        if (MODAL_PROFILES.has(profile)) {
          output = wrapUnary(modalSyntax.necessity, output);
        }
        break;
      case 'possibility':
        if (MODAL_PROFILES.has(profile)) {
          output = wrapUnary(modalSyntax.possibility, output);
        }
        break;
      case 'temporal_next':
        if (TEMPORAL_PROFILES.has(profile)) {
          output = `${temporalSyntax.next} ${output}`;
        }
        break;
      case 'temporal_until':
        if (TEMPORAL_PROFILES.has(profile)) {
          output = `${temporalSyntax.until} ${output}`;
        }
        break;
      case 'temporal_always':
        if (TEMPORAL_PROFILES.has(profile)) {
          output = wrapUnary(temporalSyntax.always, output);
        }
        break;
      case 'temporal_eventually':
        if (TEMPORAL_PROFILES.has(profile)) {
          output = wrapUnary(temporalSyntax.eventually, output);
        }
        break;
    }
  }

  return output;
}

export function pickLeadingSentenceModifiers(
  modifiers: ClauseModifier[],
  family: 'modal' | 'temporal'
): ClauseModifier['type'][] {
  const allowed = family === 'modal' ? MODAL_MODIFIER_TYPES : TEMPORAL_MODIFIER_TYPES;
  return modifiers.filter((modifier) => allowed.has(modifier.type)).map((modifier) => modifier.type);
}

export function stripModifierFamily(
  modifiers: ClauseModifier[],
  family: 'modal' | 'temporal'
): ClauseModifier['type'][] {
  const blocked = family === 'modal' ? MODAL_MODIFIER_TYPES : TEMPORAL_MODIFIER_TYPES;
  return modifiers.filter((modifier) => !blocked.has(modifier.type)).map((modifier) => modifier.type);
}

export function onlyModifierFamily(
  modifiers: ClauseModifier[],
  family: 'modal' | 'temporal'
): ClauseModifier['type'][] {
  const allowed = family === 'modal' ? MODAL_MODIFIER_TYPES : TEMPORAL_MODIFIER_TYPES;
  return modifiers.filter((modifier) => allowed.has(modifier.type)).map((modifier) => modifier.type);
}
