/**
 * Propositional Formula Builder
 *
 * Construye fórmulas de lógica proposicional a partir de átomos con roles.
 * Genera fórmulas reales con conectivos: →, ∧, ∨, ¬, ↔
 */
import type { AnalyzedSentence, AtomEntry, FormulaEntry, STStatementType, LogicProfile } from '../types';
import { ST_OPERATORS } from './connectors';
import { applyLogicalModifiers, resolveAtomId } from './helpers';

/**
 * Aplica reglas cuantitativas a un átomo base según el perfil lógico.
 * Útil para extraer `Pr(X) = Y` o ecuaciones aritméticas desde el texto original.
 */
function applyQuantitativeExtraction(text: string, baseAtomStr: string, profile: LogicProfile): string {
  if (profile === 'probabilistic.basic') {
    const probMatch = text.match(/0\.\d+/);
    const isPercentage = text.match(/(\d+(?:\.\d+)?)%/);
    let pValue = probMatch ? probMatch[0] : null;
    if (!pValue && isPercentage) {
      pValue = (parseFloat(isPercentage[1]) / 100).toString();
    }
    if (pValue) {
      return `(Pr(${baseAtomStr}) = ${pValue})`;
    }
  }

  if (profile === 'arithmetic') {
    // Busca patrones como "a + b = c" o "mod" y los pasa explícitamente a ST-lang en vez de usar átomos textuales
    const mathMatch = text.match(/(\w+)\s*([\+\-\*\/]|mod)\s*(\w+)\s*=\s*(\w+)/);
    if (mathMatch) {
       return text; // Return the raw text equation!
    }
  }

  return baseAtomStr;
}

/**
 * Construye fórmulas proposicionales para un conjunto de oraciones.
 * Cada oración se procesa según su tipo detectado.
 */
export function buildPropositional_old(
  sentences: AnalyzedSentence[],
  atomEntries: AtomEntry[],
  detectedPatterns: string[],
  profile: LogicProfile = 'classical.propositional'
): FormulaEntry[] {
  const formulas: FormulaEntry[] = [];
  let labelCounter = 1;

  // Construir mapa global de cláusula-texto → atomId
  const globalClauseAtomMap = buildGlobalAtomMap(sentences, atomEntries);

  for (let sIdx = 0; sIdx < sentences.length; sIdx++) {
    const sentence = sentences[sIdx];
    const builtFormulas = buildSentenceFormulas(
      sentence, atomEntries, globalClauseAtomMap, sIdx, labelCounter, detectedPatterns, profile
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
  profile: LogicProfile
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
        const antecedent = resolveAtomId(conditionClauses[0].text, allAtoms, globalMap);
        const consequent = resolveAtomId(consequentClauses[0].text, allAtoms, globalMap);

        // Aplicar negación si hay modificadores
        const antStr = applyLogicalModifiers(
          antecedent,
          conditionClauses[0].modifiers.map(m => m.type),
          'classical.propositional'
        );
        const consStr = applyLogicalModifiers(
          consequent,
          consequentClauses[0].modifiers.map(m => m.type),
          'classical.propositional'
        );

        formulas.push({
          formula: `${antStr} ${ST_OPERATORS.implication} ${consStr}`,
          stType: 'axiom',
          label: `regla_${label}`,
          sourceText: sentence.original,
          sourceSentence: sentenceIdx,
          comment: `Condicional: "${sentence.original}"`,
        });

        const supplementalClauses = clauses.filter(clause =>
          clause !== conditionClauses[0] && clause !== consequentClauses[0]
        );

        for (const clause of supplementalClauses) {
          const atom = resolveAtomId(clause.text, allAtoms, globalMap);
          formulas.push({
            formula: applyLogicalModifiers(
              atom,
              clause.modifiers.map(m => m.type),
              'classical.propositional'
            ),
            stType: clause.role === 'conclusion' ? 'derive' : 'axiom',
            label: `hecho_${++label}`,
            sourceText: clause.text,
            sourceSentence: sentenceIdx,
            comment: `Subcláusula condicional: "${clause.text}"`,
          });
        }
      }
      break;
    }

    case 'biconditional': {
      if (clauses.length >= 2) {
        const left = resolveAtomId(clauses[0].text, allAtoms, globalMap);
        const right = resolveAtomId(clauses[1].text, allAtoms, globalMap);
        formulas.push({
          formula: `${applyLogicalModifiers(left, clauses[0].modifiers.map(m => m.type), 'classical.propositional')} ${ST_OPERATORS.biconditional} ${applyLogicalModifiers(right, clauses[1].modifiers.map(m => m.type), 'classical.propositional')}`,
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
      const atoms = clauses.map(c =>
        applyLogicalModifiers(
          resolveAtomId(c.text, allAtoms, globalMap),
          c.modifiers.map(m => m.type),
          'classical.propositional'
        )
      );
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
      const atoms = clauses.map(c =>
        applyLogicalModifiers(
          resolveAtomId(c.text, allAtoms, globalMap),
          c.modifiers.map(m => m.type),
          'classical.propositional'
        )
      );
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
        const atom = resolveAtomId(clauses[0].text, allAtoms, globalMap);
        formulas.push({
          formula: applyLogicalModifiers(atom, ['negation'], 'classical.propositional'),
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
      // "Puesto que X, Y" → genera X -> Y (causal) + axiom X + derive Y
      const premiseClauses = clauses.filter(c => c.role === 'premise');
      const conclusionClauses = clauses.filter(c => c.role === 'conclusion');

      if (premiseClauses.length > 0 && conclusionClauses.length > 0) {
        // ── Generar la regla causal: premisa(s) → conclusión ──
        const premiseAtoms = premiseClauses.map(pc => {
          const atom = resolveAtomId(pc.text, allAtoms, globalMap);
          return applyLogicalModifiers(atom, pc.modifiers.map(m => m.type), 'classical.propositional');
        });
        const conclusionAtom = resolveAtomId(conclusionClauses[0].text, allAtoms, globalMap);
        const conclusionStr = applyLogicalModifiers(
          conclusionAtom,
          conclusionClauses[0].modifiers.map(m => m.type),
          'classical.propositional'
        );

        // Antecedente: si hay múltiples premisas, conjunción
        const antecedent = premiseAtoms.length === 1
          ? premiseAtoms[0]
          : `(${premiseAtoms.join(` ${ST_OPERATORS.conjunction} `)})`;

        formulas.push({
          formula: `${antecedent} ${ST_OPERATORS.implication} ${conclusionStr}`,
          stType: 'axiom',
          label: `regla_${label++}`,
          sourceText: sentence.original,
          sourceSentence: sentenceIdx,
          comment: `Causal: "${sentence.original}"`,
        });

        // Generar axiomas para cada premisa afirmada
        for (const pClause of premiseClauses) {
          const atom = resolveAtomId(pClause.text, allAtoms, globalMap);
          const atomStr = applyLogicalModifiers(atom, pClause.modifiers.map(m => m.type), 'classical.propositional');
          formulas.push({
            formula: atomStr,
            stType: 'axiom',
            label: `premisa_${label++}`,
            sourceText: pClause.text,
            sourceSentence: sentenceIdx,
            comment: `Premisa: "${pClause.text}"`,
          });
        }

        // Generar derivación de la conclusión
        const premiseLabels = formulas
          .filter(f => f.comment?.startsWith('Premisa:') || f.comment?.startsWith('Causal:'))
          .map(f => f.label);
        for (const cClause of conclusionClauses) {
          const atom = resolveAtomId(cClause.text, allAtoms, globalMap);
          const atomMod = applyLogicalModifiers(atom, cClause.modifiers.map(m => m.type), 'classical.propositional');
          formulas.push({
            formula: atomMod,
            stType: 'derive',
            label: `conclusion_${label++}`,
            sourceText: cClause.text,
            sourceSentence: sentenceIdx,
            comment: `Conclusión: "${cClause.text}"`,
          });
        }
      } else {
        // Solo premisas sin conclusión → axiomas simples
        for (const pClause of premiseClauses) {
          const atom = resolveAtomId(pClause.text, allAtoms, globalMap);
          const atomStr = applyLogicalModifiers(atom, pClause.modifiers.map(m => m.type), 'classical.propositional');
          formulas.push({
            formula: atomStr,
            stType: 'axiom',
            label: `premisa_${label++}`,
            sourceText: pClause.text,
            sourceSentence: sentenceIdx,
            comment: `Premisa: "${pClause.text}"`,
          });
        }
      }
      break;
    }

    default: {
      // Aserción simple o tipo no manejado arriba
      for (const clause of clauses) {
        const atom = resolveAtomId(clause.text, allAtoms, globalMap);
        const atomStr = applyLogicalModifiers(atom, clause.modifiers.map(m => m.type), 'classical.propositional');

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

