/**
 * Modal Formula Builder
 *
 * Construye fórmulas de lógica modal (K, epistémica, deóntica).
 */
import type { AnalyzedSentence, AtomEntry, FormulaEntry, LogicProfile } from '../types';
import { ST_OPERATORS } from './connectors';

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

  // Determinar qué operadores usar según el perfil
  const necessityOp = getModalNecessity(profile);
  const possibilityOp = getModalPossibility(profile);

  if (sentence.type === 'modal') {
    // Detectar cláusulas con modalidad
    for (const clause of clauses) {
      const atom = findAtomForClause(clause.text, allAtoms);
      if (!atom) continue;

      const hasNecessity = clause.modifiers.some(m => m.type === 'necessity');
      const hasPossibility = clause.modifiers.some(m => m.type === 'possibility');

      let formula: string;
      if (hasNecessity) {
        formula = `${necessityOp}(${atom.id})`;
      } else if (hasPossibility) {
        formula = `${possibilityOp}(${atom.id})`;
      } else {
        formula = atom.id;
      }

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
    // Condicional con modalidad
    const condClauses = clauses.filter(c => c.role === 'condition');
    const consClauses = clauses.filter(c =>
      c.role === 'consequent' || c.role === 'conclusion' || c.role === 'assertion'
    );

    if (condClauses.length > 0 && consClauses.length > 0) {
      const antAtom = findAtomForClause(condClauses[0].text, allAtoms);
      const consAtom = findAtomForClause(consClauses[0].text, allAtoms);

      if (antAtom && consAtom) {
        let antFormula = antAtom.id;
        let consFormula = consAtom.id;

        // Aplicar modalidad
        if (condClauses[0].modifiers.some(m => m.type === 'necessity')) {
          antFormula = `${necessityOp}(${antFormula})`;
        }
        if (consClauses[0].modifiers.some(m => m.type === 'possibility')) {
          consFormula = `${possibilityOp}(${consFormula})`;
        }
        if (consClauses[0].modifiers.some(m => m.type === 'necessity')) {
          consFormula = `${necessityOp}(${consFormula})`;
        }

        formulas.push({
          formula: `${antFormula} -> ${consFormula}`,
          stType: 'axiom',
          label: `a${label++}`,
          sourceText: sentence.original,
          sourceSentence: sentenceIdx,
          comment: `Condicional modal: "${sentence.original}"`,
        });
      }
    }
  } else {
    // Oración no-modal: tratarla como proposicional con envoltura
    for (const clause of clauses) {
      const atom = findAtomForClause(clause.text, allAtoms);
      if (!atom) continue;

      let formula = atom.id;

      // Revisar si algún modificador indica modalidad
      for (const mod of clause.modifiers) {
        if (mod.type === 'necessity') formula = `${necessityOp}(${formula})`;
        else if (mod.type === 'possibility') formula = `${possibilityOp}(${formula})`;
      }

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

function findAtomForClause(text: string, allAtoms: AtomEntry[]): AtomEntry | null {
  return allAtoms.find(a =>
    a.text === text || a.text.includes(text) || text.includes(a.text)
  ) || null;
}

function getModalNecessity(profile: LogicProfile): string {
  switch (profile) {
    case 'deontic.standard': return ST_OPERATORS.necessity;    // [] = obligación
    case 'epistemic.s5': return ST_OPERATORS.necessity;        // [] = conocimiento
    default: return ST_OPERATORS.necessity;                     // [] = necesidad
  }
}

function getModalPossibility(profile: LogicProfile): string {
  switch (profile) {
    case 'deontic.standard': return ST_OPERATORS.possibility;  // <> = permisión
    case 'epistemic.s5': return ST_OPERATORS.possibility;      // <> = creencia
    default: return ST_OPERATORS.possibility;                   // <> = posibilidad
  }
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
