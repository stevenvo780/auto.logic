/**
 * First-Order Formula Builder
 *
 * Construye fórmulas de lógica de primer orden con cuantificadores y predicados.
 */
import type { AnalyzedSentence, AtomEntry, FormulaEntry } from '../types';
import { ST_OPERATORS } from './connectors';

/**
 * Construye fórmulas de primer orden para oraciones con cuantificadores.
 */
export function buildFirstOrder(
  sentences: AnalyzedSentence[],
  atomEntries: AtomEntry[],
  detectedPatterns: string[],
): FormulaEntry[] {
  const formulas: FormulaEntry[] = [];
  let labelCounter = 1;

  for (let sIdx = 0; sIdx < sentences.length; sIdx++) {
    const sentence = sentences[sIdx];
    const builtFormulas = buildFOSentence(sentence, atomEntries, sIdx, labelCounter);
    formulas.push(...builtFormulas);
    labelCounter += builtFormulas.length;
  }

  // Si se detecta instanciación universal, agregar derive
  if (detectedPatterns.includes('universal_instantiation') && formulas.length >= 2) {
    const universalFormula = formulas.find(f => f.formula.includes('forall'));
    const instanceFormula = formulas.find(f => !f.formula.includes('forall') && f.stType === 'axiom');
    if (universalFormula && instanceFormula) {
      // Intentar derivar la conclusión
      const derivedFormula = tryInstantiation(universalFormula, instanceFormula, atomEntries);
      if (derivedFormula) {
        formulas.push({
          formula: derivedFormula,
          stType: 'derive',
          label: `conclusion_${labelCounter}`,
          sourceText: 'Instanciación universal',
          sourceSentence: sentences.length - 1,
          comment: 'Conclusión por instanciación universal',
        });
      }
    }
  }

  return formulas;
}

function buildFOSentence(
  sentence: AnalyzedSentence,
  allAtoms: AtomEntry[],
  sentenceIdx: number,
  labelStart: number,
): FormulaEntry[] {
  const formulas: FormulaEntry[] = [];
  const clauses = sentence.clauses;
  let label = labelStart;

  // Detectar cuantificación universal
  const hasUniversal = clauses.some(c => c.modifiers.some(m => m.type === 'universal'));
  const hasExistential = clauses.some(c => c.modifiers.some(m => m.type === 'existential'));

  if (hasUniversal && sentence.type === 'conditional') {
    // "Todo X es Y" → forall x (X(x) -> Y(x))
    const conditionAtoms = getAtomsForClauses(
      clauses.filter(c => c.role === 'condition' || c.role === 'premise'),
      allAtoms
    );
    const consequentAtoms = getAtomsForClauses(
      clauses.filter(c => c.role === 'consequent' || c.role === 'conclusion' || c.role === 'assertion'),
      allAtoms
    );

    if (conditionAtoms.length > 0 && consequentAtoms.length > 0) {
      const pred1 = conditionAtoms[0].predicate || conditionAtoms[0].id;
      const pred2 = consequentAtoms[0].predicate || consequentAtoms[0].id;
      const variable = conditionAtoms[0].terms?.[0] || 'x';

      const formula = `forall ${variable} (${formatPredicate(pred1, variable)} ${ST_OPERATORS.implication} ${formatPredicate(pred2, variable)})`;
      formulas.push({
        formula,
        stType: 'axiom',
        label: `a${label}`,
        sourceText: sentence.original,
        sourceSentence: sentenceIdx,
        comment: `Universal: "${sentence.original}"`,
      });
    }
  } else if (hasUniversal) {
    // "Todo X tiene Y" → forall x X(x)
    for (const clause of clauses) {
      const atoms = getAtomsForClause(clause.text, allAtoms);
      if (atoms.length > 0) {
        const atom = atoms[0];
        const pred = atom.predicate || atom.id;
        const variable = atom.terms?.[0] || 'x';
        formulas.push({
          formula: `forall ${variable} ${formatPredicate(pred, variable)}`,
          stType: 'axiom',
          label: `a${label++}`,
          sourceText: clause.text,
          sourceSentence: sentenceIdx,
          comment: `Universal: "${clause.text}"`,
        });
      }
    }
  } else if (hasExistential) {
    // "Existe X tal que Y"
    for (const clause of clauses) {
      const atoms = getAtomsForClause(clause.text, allAtoms);
      if (atoms.length > 0) {
        const atom = atoms[0];
        const pred = atom.predicate || atom.id;
        const variable = atom.terms?.[0] || 'x';
        formulas.push({
          formula: `exists ${variable} ${formatPredicate(pred, variable)}`,
          stType: 'axiom',
          label: `a${label++}`,
          sourceText: clause.text,
          sourceSentence: sentenceIdx,
          comment: `Existencial: "${clause.text}"`,
        });
      }
    }
  } else {
    // Predicado sin cuantificador (instancia concreta)
    for (const clause of clauses) {
      const atoms = getAtomsForClause(clause.text, allAtoms);
      if (atoms.length > 0) {
        const atom = atoms[0];
        const isConclusion = clause.role === 'conclusion';

        formulas.push({
          formula: atom.id,
          stType: isConclusion ? 'derive' : 'axiom',
          label: isConclusion ? `conclusion_${label}` : `a${label}`,
          sourceText: clause.text,
          sourceSentence: sentenceIdx,
          comment: isConclusion
            ? `Conclusión: "${clause.text}"`
            : `Instancia: "${clause.text}"`,
        });
        label++;
      }
    }
  }

  return formulas;
}

function getAtomsForClauses(
  clauses: { text: string }[],
  allAtoms: AtomEntry[],
): AtomEntry[] {
  const results: AtomEntry[] = [];
  for (const clause of clauses) {
    const found = getAtomsForClause(clause.text, allAtoms);
    results.push(...found);
  }
  return results;
}

function getAtomsForClause(text: string, allAtoms: AtomEntry[]): AtomEntry[] {
  return allAtoms.filter(a =>
    a.text === text || a.text.includes(text) || text.includes(a.text)
  );
}

function formatPredicate(predicate: string, variable: string): string {
  if (predicate.includes('(')) return predicate;
  return `${predicate}(${variable})`;
}

function tryInstantiation(
  universalFormula: FormulaEntry,
  instanceFormula: FormulaEntry,
  _allAtoms: AtomEntry[],
): string | null {
  // Simplificación: intentar extraer la conclusión de la instanciación
  const match = universalFormula.formula.match(/forall\s+(\w+)\s+\((.+)\s+->\s+(.+)\)/);
  if (!match) return null;

  const [, _variable, _antecedent, consequent] = match;
  // Buscar la constante de la instancia para sustituir
  const instanceMatch = instanceFormula.formula.match(/(\w+)\((\w+)\)/);
  if (!instanceMatch) return null;

  const constant = instanceMatch[2];
  // Sustituir variable por constante en el consecuente
  const instantiated = consequent.replace(/\(\w+\)/, `(${constant})`);
  return instantiated;
}
