/**
 * Propositional Formula Builder
 *
 * Construye fórmulas de lógica proposicional a partir de átomos con roles.
 */
import type { AnalyzedSentence, AtomEntry, FormulaEntry, STStatementType } from '../types';
import { ST_OPERATORS } from './connectors';

/**
 * Construye fórmulas proposicionales para un conjunto de oraciones.
 */
export function buildPropositional(
  sentences: AnalyzedSentence[],
  atomEntries: AtomEntry[],
  detectedPatterns: string[],
): FormulaEntry[] {
  const formulas: FormulaEntry[] = [];
  let labelCounter = 1;

  for (let sIdx = 0; sIdx < sentences.length; sIdx++) {
    const sentence = sentences[sIdx];
    const sentenceAtoms = atomEntries.filter(a => {
      // Buscar átomos que pertenecen a cláusulas de esta oración
      const clauseIdxs = sentence.clauses.map((_, i) => i);
      // Heurística: mapear por índice global de cláusula
      return true; // procesamos todos y filtramos por contexto
    });

    const builtFormulas = buildSentenceFormulas(sentence, atomEntries, sIdx, labelCounter, detectedPatterns);
    formulas.push(...builtFormulas);
    labelCounter += builtFormulas.length;
  }

  return formulas;
}

/**
 * Construye fórmulas para una oración individual.
 */
function buildSentenceFormulas(
  sentence: AnalyzedSentence,
  allAtoms: AtomEntry[],
  sentenceIdx: number,
  labelStart: number,
  patterns: string[],
): FormulaEntry[] {
  const clauses = sentence.clauses;
  if (clauses.length === 0) return [];

  // Obtener átomos para esta oración (por texto de cláusula)
  const clauseAtomMap = new Map<string, string>();
  for (const atom of allAtoms) {
    // Mapear texto de cláusula → atom ID
    const matchClause = clauses.find(c =>
      c.text === atom.text || c.text.includes(atom.text) || atom.text.includes(c.text)
    );
    if (matchClause) {
      clauseAtomMap.set(matchClause.text, atom.id);
    }
  }

  // Fallback: asignar átomos por orden si no hay match textual
  if (clauseAtomMap.size === 0) {
    clauses.forEach((c, i) => {
      const atom = allAtoms[i];
      if (atom) clauseAtomMap.set(c.text, atom.id);
    });
  }

  const formulas: FormulaEntry[] = [];
  let label = labelStart;

  switch (sentence.type) {
    case 'conditional': {
      let conditionClauses = clauses.filter(c => c.role === 'condition');
      let consequentClauses = clauses.filter(c =>
        c.role === 'consequent' || c.role === 'conclusion' || c.role === 'assertion'
      );

      // Fallback: si no hay cláusula explícita de condición pero hay consequent,
      // usar la primera cláusula que no sea consequent como condición
      if (conditionClauses.length === 0 && clauses.length >= 2) {
        const nonConsequent = clauses.filter(c =>
          c.role !== 'consequent' && c.role !== 'conclusion'
        );
        if (nonConsequent.length > 0) {
          conditionClauses = [nonConsequent[0]];
          consequentClauses = clauses.filter(c => c !== nonConsequent[0]);
        }
      }

      if (conditionClauses.length > 0 && consequentClauses.length > 0) {
        const antecedent = getAtomId(conditionClauses[0].text, clauseAtomMap, allAtoms);
        const consequent = getAtomId(consequentClauses[0].text, clauseAtomMap, allAtoms);

        // Aplicar negación si hay modificadores
        const antStr = applyModifiers(antecedent, conditionClauses[0].modifiers.map(m => m.type));
        const consStr = applyModifiers(consequent, consequentClauses[0].modifiers.map(m => m.type));

        formulas.push({
          formula: `${antStr} ${ST_OPERATORS.implication} ${consStr}`,
          stType: 'axiom',
          label: `regla_${label}`,
          sourceText: sentence.original,
          sourceSentence: sentenceIdx,
          comment: `Condicional: "${sentence.original}"`,
        });
      }
      break;
    }

    case 'biconditional': {
      if (clauses.length >= 2) {
        const left = getAtomId(clauses[0].text, clauseAtomMap, allAtoms);
        const right = getAtomId(clauses[1].text, clauseAtomMap, allAtoms);
        formulas.push({
          formula: `${left} ${ST_OPERATORS.biconditional} ${right}`,
          stType: 'axiom',
          label: `bicond_${label}`,
          sourceText: sentence.original,
          sourceSentence: sentenceIdx,
          comment: `Bicondicional: "${sentence.original}"`,
        });
      }
      break;
    }

    case 'conjunction': {
      const atoms = clauses.map(c => getAtomId(c.text, clauseAtomMap, allAtoms));
      if (atoms.length >= 2) {
        const formula = atoms.join(` ${ST_OPERATORS.conjunction} `);
        formulas.push({
          formula,
          stType: 'axiom',
          label: `conj_${label}`,
          sourceText: sentence.original,
          sourceSentence: sentenceIdx,
          comment: `Conjunción: "${sentence.original}"`,
        });
      }
      break;
    }

    case 'disjunction': {
      const atoms = clauses.map(c => getAtomId(c.text, clauseAtomMap, allAtoms));
      if (atoms.length >= 2) {
        const formula = atoms.join(` ${ST_OPERATORS.disjunction} `);
        formulas.push({
          formula,
          stType: 'axiom',
          label: `disj_${label}`,
          sourceText: sentence.original,
          sourceSentence: sentenceIdx,
          comment: `Disyunción: "${sentence.original}"`,
        });
      }
      break;
    }

    case 'negation': {
      if (clauses.length > 0) {
        const atom = getAtomId(clauses[0].text, clauseAtomMap, allAtoms);
        formulas.push({
          formula: `${ST_OPERATORS.negation}(${atom})`,
          stType: 'axiom',
          label: `neg_${label}`,
          sourceText: sentence.original,
          sourceSentence: sentenceIdx,
          comment: `Negación: "${sentence.original}"`,
        });
      }
      break;
    }

    case 'complex': {
      // Oraciones complejas con premisas y conclusiones
      const premiseClauses = clauses.filter(c => c.role === 'premise');
      const conclusionClauses = clauses.filter(c => c.role === 'conclusion');

      // Generar axiomas para premisas
      for (const pClause of premiseClauses) {
        const atom = getAtomId(pClause.text, clauseAtomMap, allAtoms);
        const atomStr = applyModifiers(atom, pClause.modifiers.map(m => m.type));
        formulas.push({
          formula: atomStr,
          stType: 'axiom',
          label: `premisa_${label++}`,
          sourceText: pClause.text,
          sourceSentence: sentenceIdx,
          comment: `Premisa: "${pClause.text}"`,
        });
      }

      // Generar derivaciones para conclusiones
      if (conclusionClauses.length > 0 && premiseClauses.length > 0) {
        for (const cClause of conclusionClauses) {
          const atom = getAtomId(cClause.text, clauseAtomMap, allAtoms);
          const premiseLabels = formulas
            .filter(f => f.stType === 'axiom')
            .map(f => f.label);
          formulas.push({
            formula: atom,
            stType: 'derive',
            label: `conclusion_${label++}`,
            sourceText: cClause.text,
            sourceSentence: sentenceIdx,
            comment: `Conclusión: "${cClause.text}"`,
          });
        }
      }
      break;
    }

    default: {
      // Aserción simple o tipo no manejado arriba
      for (const clause of clauses) {
        const atom = getAtomId(clause.text, clauseAtomMap, allAtoms);
        const atomStr = applyModifiers(atom, clause.modifiers.map(m => m.type));

        const isConclusion = clause.role === 'conclusion';
        const isPremise = clause.role === 'premise' || clause.role === 'assertion';

        formulas.push({
          formula: atomStr,
          stType: isConclusion ? 'derive' : 'axiom',
          label: isConclusion ? `conclusion_${label}` : `hecho_${label}`,
          sourceText: clause.text,
          sourceSentence: sentenceIdx,
          comment: isConclusion
            ? `Conclusión: "${clause.text}"`
            : `Hecho: "${clause.text}"`,
        });
        label++;
      }
      break;
    }
  }

  return formulas;
}

/**
 * Obtiene el ID de átomo para un texto de cláusula.
 */
function getAtomId(
  clauseText: string,
  clauseAtomMap: Map<string, string>,
  allAtoms: AtomEntry[],
): string {
  // Buscar en el mapa directo
  const direct = clauseAtomMap.get(clauseText);
  if (direct) return direct;

  // Buscar match parcial
  for (const [text, id] of clauseAtomMap) {
    if (clauseText.includes(text) || text.includes(clauseText)) {
      return id;
    }
  }

  // Buscar en todos los átomos
  const atomMatch = allAtoms.find(a =>
    a.text === clauseText || a.text.includes(clauseText) || clauseText.includes(a.text)
  );
  if (atomMatch) return atomMatch.id;

  // Fallback: generar ID del texto
  return clauseText.replace(/\s+/g, '_').toUpperCase().slice(0, 20);
}

/**
 * Aplica modificadores lógicos a una fórmula atómica.
 */
function applyModifiers(atomId: string, modifiers: string[]): string {
  let formula = atomId;
  for (const mod of modifiers) {
    switch (mod) {
      case 'negation':
        formula = `!(${formula})`;
        break;
      case 'necessity':
        formula = `[](${formula})`;
        break;
      case 'possibility':
        formula = `<>(${formula})`;
        break;
    }
  }
  return formula;
}
