/**
 * Propositional Formula Builder
 *
 * Construye fórmulas de lógica proposicional a partir de átomos con roles.
 * Genera fórmulas reales con conectivos: →, ∧, ∨, ¬, ↔
 */
import type { AnalyzedSentence, AtomEntry, FormulaEntry, STStatementType } from '../types';
import { ST_OPERATORS } from './connectors';

/**
 * Construye fórmulas proposicionales para un conjunto de oraciones.
 * Cada oración se procesa según su tipo detectado.
 */
export function buildPropositional(
  sentences: AnalyzedSentence[],
  atomEntries: AtomEntry[],
  detectedPatterns: string[],
): FormulaEntry[] {
  const formulas: FormulaEntry[] = [];
  let labelCounter = 1;

  // Construir mapa global de cláusula-texto → atomId
  const globalClauseAtomMap = buildGlobalAtomMap(sentences, atomEntries);

  for (let sIdx = 0; sIdx < sentences.length; sIdx++) {
    const sentence = sentences[sIdx];
    const builtFormulas = buildSentenceFormulas(
      sentence, atomEntries, globalClauseAtomMap, sIdx, labelCounter, detectedPatterns,
    );
    formulas.push(...builtFormulas);
    labelCounter += builtFormulas.length;
  }

  return formulas;
}

/**
 * Construye un mapa global de texto-cláusula → atomId.
 */
function buildGlobalAtomMap(
  sentences: AnalyzedSentence[],
  atomEntries: AtomEntry[],
): Map<string, string> {
  const map = new Map<string, string>();

  // Recopilar todas las cláusulas con su índice global
  let globalIdx = 0;
  for (const sentence of sentences) {
    for (const clause of sentence.clauses) {
      // Buscar átomo por texto exacto
      const exactMatch = atomEntries.find(a => a.text === clause.text);
      if (exactMatch) {
        map.set(clause.text, exactMatch.id);
      } else {
        // Buscar por inclusión
        const partialMatch = atomEntries.find(a =>
          a.text.includes(clause.text) || clause.text.includes(a.text)
        );
        if (partialMatch) {
          map.set(clause.text, partialMatch.id);
        } else {
          // Buscar por índice de cláusula fuente
          const bySource = atomEntries.find(a => a.sourceClause === globalIdx);
          if (bySource) {
            map.set(clause.text, bySource.id);
          }
        }
      }
      globalIdx++;
    }
  }

  return map;
}

/**
 * Construye fórmulas para una oración individual.
 */
function buildSentenceFormulas(
  sentence: AnalyzedSentence,
  allAtoms: AtomEntry[],
  globalMap: Map<string, string>,
  sentenceIdx: number,
  labelStart: number,
  patterns: string[],
): FormulaEntry[] {
  const clauses = sentence.clauses;
  if (clauses.length === 0) return [];

  const formulas: FormulaEntry[] = [];
  let label = labelStart;

  switch (sentence.type) {
    case 'conditional': {
      let conditionClauses = clauses.filter(c => c.role === 'condition');
      let consequentClauses = clauses.filter(c =>
        c.role === 'consequent' || c.role === 'conclusion' || c.role === 'assertion'
      );

      // Fallback: si no hay cláusula explícita de condición, inferir por posición
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
        const antecedent = resolveAtom(conditionClauses[0].text, globalMap, allAtoms);
        const consequent = resolveAtom(consequentClauses[0].text, globalMap, allAtoms);

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
        const left = resolveAtom(clauses[0].text, globalMap, allAtoms);
        const right = resolveAtom(clauses[1].text, globalMap, allAtoms);
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
      const atoms = clauses.map(c => resolveAtom(c.text, globalMap, allAtoms));
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
      } else if (atoms.length === 1) {
        formulas.push({
          formula: atoms[0],
          stType: 'axiom',
          label: `hecho_${label}`,
          sourceText: sentence.original,
          sourceSentence: sentenceIdx,
          comment: `Hecho: "${sentence.original}"`,
        });
      }
      break;
    }

    case 'disjunction': {
      const atoms = clauses.map(c => resolveAtom(c.text, globalMap, allAtoms));
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
        const atom = resolveAtom(clauses[0].text, globalMap, allAtoms);
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
      // Oraciones complejas con premisas y conclusiones explícitas
      const premiseClauses = clauses.filter(c => c.role === 'premise');
      const conclusionClauses = clauses.filter(c => c.role === 'conclusion');

      // Generar axiomas para premisas
      for (const pClause of premiseClauses) {
        const atom = resolveAtom(pClause.text, globalMap, allAtoms);
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
          const atom = resolveAtom(cClause.text, globalMap, allAtoms);
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
        const atom = resolveAtom(clause.text, globalMap, allAtoms);
        const atomStr = applyModifiers(atom, clause.modifiers.map(m => m.type));

        const isConclusion = clause.role === 'conclusion';

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
 * Resuelve el ID de átomo para un texto de cláusula.
 * Usa el mapa global, luego busca en todos los átomos.
 */
function resolveAtom(
  clauseText: string,
  globalMap: Map<string, string>,
  allAtoms: AtomEntry[],
): string {
  // 1. Buscar en el mapa global (ya resuelto)
  const fromMap = globalMap.get(clauseText);
  if (fromMap) return fromMap;

  // 2. Match parcial en mapa global
  for (const [text, id] of globalMap) {
    if (clauseText.includes(text) || text.includes(clauseText)) {
      return id;
    }
  }

  // 3. Buscar en todos los átomos por texto
  const atomMatch = allAtoms.find(a =>
    a.text === clauseText || a.text.includes(clauseText) || clauseText.includes(a.text)
  );
  if (atomMatch) return atomMatch.id;

  // 4. Fallback: generar ID del texto
  return clauseText
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .toUpperCase()
    .slice(0, 30) || 'ATOM';
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
