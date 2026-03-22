/**
 * Modal Formula Builder
 *
 * Construye fórmulas de lógica modal (K, epistémica, deóntica).
 */
import type { AnalyzedSentence, AtomEntry, FormulaEntry, LogicProfile } from '../types';
import {
  applyLogicalModifiers,
  onlyModifierFamily,
  pickLeadingSentenceModifiers,
  resolveAtomId,
  stripModifierFamily
} from './helpers';

/**
 * Construye fórmulas modales para oraciones con operadores de necesidad/posibilidad.
 */
export function buildModal(
  sentences: AnalyzedSentence[],
  atomEntries: AtomEntry[],
  profile: LogicProfile,
): FormulaEntry[] {
  const formulas: FormulaEntry[] = [];
  let labelCounter = 1;

  for (let sIdx = 0; sIdx < sentences.length; sIdx++) {
    const sentence = sentences[sIdx];
    const built = buildModalSentence(sentence, atomEntries, sIdx, labelCounter, profile);
    formulas.push(...built);
    labelCounter += built.length;
  }

  return formulas;
}

function buildModalSentence(
  sentence: AnalyzedSentence,
  allAtoms: AtomEntry[],
  sentenceIdx: number,
  labelStart: number,
  profile: LogicProfile,
): FormulaEntry[] {
  const formulas: FormulaEntry[] = [];
  const clauses = sentence.clauses;
  let label = labelStart;

  if (sentence.type === 'modal') {
    // Detectar cláusulas con modalidad
    for (const clause of clauses) {
      const atom = resolveAtomId(clause.text, allAtoms);
      const formula = applyLogicalModifiers(atom, clause.modifiers.map((modifier) => modifier.type), profile);

      formulas.push({
        formula,
        stType: 'axiom',
        label: `a${label++}`,
        sourceText: clause.text,
        sourceSentence: sentenceIdx,
        comment: buildModalComment(clause.text, profile),
      });
    }
  } else if (sentence.type === 'conditional') {
    // Condicional con modalidad; si el operador aparece al inicio de la oración,
    // envuelve la implicación completa en vez de perderlo en el antecedente.
    const condClauses = clauses.filter(c => c.role === 'condition');
    const consClauses = clauses.filter(c =>
      c.role === 'consequent' || c.role === 'conclusion' || c.role === 'assertion'
    );

    if (condClauses.length > 0 && consClauses.length > 0) {
      const antAtom = resolveAtomId(condClauses[0].text, allAtoms);
      const consAtom = resolveAtomId(consClauses[0].text, allAtoms);
      
      const firstClause = clauses[0];
      const condMarker = firstClause.markers.find(m => m.role === 'condition');
      
      let sentenceLevel: string[] = [];
      let antModifiers: string[] = [];
      
      if (condMarker) {
        // Find modal modifiers that appear BEFORE the conditional marker (e.g. "Es necesario que si...")
        const modalModifiersBeforeCond = firstClause.modifiers.filter(mod => {
          const mMarker = firstClause.markers.find(m => m.text === mod.text);
          return mMarker && mMarker.position < condMarker.position && ['necessity', 'possibility'].includes(mod.type);
        });
        
        sentenceLevel = modalModifiersBeforeCond.map(m => m.type);
        antModifiers = firstClause.modifiers
          .filter(mod => !sentenceLevel.includes(mod.type))
          .map(m => m.type);
      } else {
        sentenceLevel = pickLeadingSentenceModifiers(firstClause.modifiers, 'modal');
        antModifiers = stripModifierFamily(firstClause.modifiers, 'modal');
      }

      const antFormula = applyLogicalModifiers(antAtom, antModifiers, profile);
      const consFormula = applyLogicalModifiers(consAtom, consClauses[0].modifiers.map((modifier) => modifier.type), profile);
      const implication = `${antFormula} -> ${consFormula}`;

      formulas.push({
        formula: applyLogicalModifiers(implication, sentenceLevel, profile),
        stType: 'axiom',
        label: `a${label++}`,
        sourceText: sentence.original,
        sourceSentence: sentenceIdx,
        comment: `Condicional modal: "${sentence.original}"`,
      });

      const supplementalClauses = clauses.filter(clause =>
        clause !== condClauses[0] && clause !== consClauses[0]
      );

      for (const clause of supplementalClauses) {
        const atom = resolveAtomId(clause.text, allAtoms);
        formulas.push({
          formula: applyLogicalModifiers(atom, clause.modifiers.map((modifier) => modifier.type), profile),
          stType: clause.role === 'conclusion' ? 'derive' : 'axiom',
          label: `a${label++}`,
          sourceText: clause.text,
          sourceSentence: sentenceIdx,
          comment: `Subcláusula modal: "${clause.text}"`,
        });
      }

      if (supplementalClauses.length === 0 && sentenceLevel.length > 0) {
        formulas.push({
          formula: applyLogicalModifiers(consAtom, consClauses[0].modifiers.map((modifier) => modifier.type), profile),
          stType: consClauses[0].role === 'conclusion' ? 'derive' : 'axiom',
          label: `a${label++}`,
          sourceText: consClauses[0].text,
          sourceSentence: sentenceIdx,
          comment: `Consecuente modal contextual: "${consClauses[0].text}"`,
        });
      }
    }
  } else {
    // Oración no-modal: tratarla como proposicional con envoltura
    for (const clause of clauses) {
      const atom = resolveAtomId(clause.text, allAtoms);
      const formula = applyLogicalModifiers(atom, clause.modifiers.map((modifier) => modifier.type), profile);

      const isConclusion = clause.role === 'conclusion';
      formulas.push({
        formula,
        stType: isConclusion ? 'derive' : 'axiom',
        label: isConclusion ? `conclusion_${label}` : `a${label}`,
        sourceText: clause.text,
        sourceSentence: sentenceIdx,
      });
      label++;
    }
  }

  return formulas;
}

function buildModalComment(text: string, profile: LogicProfile): string {
  const names: Record<string, string> = {
    'modal.k': 'Modal K',
    'deontic.standard': 'Deóntico',
    'epistemic.s5': 'Epistémico S5',
  };
  const profileName = names[profile] || 'Modal';
  return `${profileName}: "${text}"`;
}
