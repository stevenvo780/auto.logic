/**
 * Temporal Formula Builder
 *
 * Construye fórmulas de lógica temporal (LTL).
 */
import type { AnalyzedSentence, AtomEntry, FormulaEntry } from '../types';
import { ST_OPERATORS } from './connectors';

/**
 * Construye fórmulas temporales LTL.
 */
export function buildTemporal(
  sentences: AnalyzedSentence[],
  atomEntries: AtomEntry[],
): FormulaEntry[] {
  const formulas: FormulaEntry[] = [];
  let labelCounter = 1;

  for (let sIdx = 0; sIdx < sentences.length; sIdx++) {
    const sentence = sentences[sIdx];
    const built = buildTemporalSentence(sentence, atomEntries, sIdx, labelCounter);
    formulas.push(...built);
    labelCounter += built.length;
  }

  return formulas;
}

function buildTemporalSentence(
  sentence: AnalyzedSentence,
  allAtoms: AtomEntry[],
  sentenceIdx: number,
  labelStart: number,
): FormulaEntry[] {
  const formulas: FormulaEntry[] = [];
  const clauses = sentence.clauses;
  let label = labelStart;

  // Detectar operadores temporales en cláusulas
  const hasNext = clauses.some(c => c.modifiers.some(m => m.type === 'temporal_next'));
  const hasUntil = clauses.some(c => c.modifiers.some(m => m.type === 'temporal_until'));
  const hasAlways = clauses.some(c => c.modifiers.some(m => m.type === 'temporal_always'));
  const hasEventually = clauses.some(c => c.modifiers.some(m => m.type === 'temporal_eventually'));

  if (sentence.type === 'conditional' && hasNext) {
    // "Después de A, B" → A -> next B
    const condClauses = clauses.filter(c => c.role === 'condition' || c.role === 'premise');
    const consClauses = clauses.filter(c =>
      c.role === 'consequent' || c.role === 'conclusion' || c.role === 'assertion'
    );

    if (condClauses.length > 0 && consClauses.length > 0) {
      const ant = findAtom(condClauses[0].text, allAtoms);
      const cons = findAtom(consClauses[0].text, allAtoms);
      if (ant && cons) {
        formulas.push({
          formula: `${ant.id} -> ${ST_OPERATORS.temporal_next} ${cons.id}`,
          stType: 'axiom',
          label: `a${label++}`,
          sourceText: sentence.original,
          sourceSentence: sentenceIdx,
          comment: `Temporal next: "${sentence.original}"`,
        });
      }
    }
  } else if (hasUntil && clauses.length >= 2) {
    // "A hasta que B" → A until B
    const atomsList = clauses.map(c => findAtom(c.text, allAtoms)).filter(Boolean);
    if (atomsList.length >= 2) {
      formulas.push({
        formula: `${atomsList[0]!.id} ${ST_OPERATORS.temporal_until} ${atomsList[1]!.id}`,
        stType: 'axiom',
        label: `a${label++}`,
        sourceText: sentence.original,
        sourceSentence: sentenceIdx,
        comment: `Temporal until: "${sentence.original}"`,
      });
    }
  } else if (hasAlways) {
    // "Siempre A" → always A
    for (const clause of clauses) {
      const atom = findAtom(clause.text, allAtoms);
      if (atom) {
        formulas.push({
          formula: `${ST_OPERATORS.temporal_always} ${atom.id}`,
          stType: 'axiom',
          label: `a${label++}`,
          sourceText: clause.text,
          sourceSentence: sentenceIdx,
          comment: `Temporal always: "${clause.text}"`,
        });
      }
    }
  } else if (hasEventually) {
    // "Eventualmente A" → eventually A
    for (const clause of clauses) {
      const atom = findAtom(clause.text, allAtoms);
      if (atom) {
        formulas.push({
          formula: `${ST_OPERATORS.temporal_eventually} ${atom.id}`,
          stType: 'axiom',
          label: `a${label++}`,
          sourceText: clause.text,
          sourceSentence: sentenceIdx,
          comment: `Temporal eventually: "${clause.text}"`,
        });
      }
    }
  } else {
    // Temporal genérico: tratar como condicional con next
    if (sentence.type === 'conditional' || clauses.length >= 2) {
      const condClauses = clauses.filter(c => c.role === 'condition' || c.role === 'premise');
      const restClauses = clauses.filter(c => c.role !== 'condition' && c.role !== 'premise');

      if (condClauses.length > 0 && restClauses.length > 0) {
        const ant = findAtom(condClauses[0].text, allAtoms);
        const cons = findAtom(restClauses[0].text, allAtoms);
        if (ant && cons) {
          formulas.push({
            formula: `${ant.id} -> ${ST_OPERATORS.temporal_next} ${cons.id}`,
            stType: 'axiom',
            label: `a${label++}`,
            sourceText: sentence.original,
            sourceSentence: sentenceIdx,
            comment: `Temporal: "${sentence.original}"`,
          });
        }
      }
    } else {
      // Aserción temporal simple
      for (const clause of clauses) {
        const atom = findAtom(clause.text, allAtoms);
        if (atom) {
          formulas.push({
            formula: atom.id,
            stType: 'axiom',
            label: `a${label++}`,
            sourceText: clause.text,
            sourceSentence: sentenceIdx,
          });
        }
      }
    }
  }

  return formulas;
}

function findAtom(text: string, allAtoms: AtomEntry[]): AtomEntry | null {
  return allAtoms.find(a =>
    a.text === text || a.text.includes(text) || text.includes(a.text)
  ) || null;
}
