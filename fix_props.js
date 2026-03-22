const fs = require('fs');
let code = fs.readFileSync('src/formula/propositional.ts', 'utf8');

// remove all instances of buildSentenceFormulas to end of file
code = code.substring(0, code.indexOf('function buildSentenceFormulas'));

code += `function buildSentenceFormulas(
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

  const getStr = (clause: any) => {
    let modTypes = clause?.modifiers ? clause.modifiers.map((m: any) => m.type) : [];
    if (Array.isArray(clause) && typeof clause[0] === 'string') modTypes = clause;
    const text = typeof clause === 'string' ? clause : clause.text;
    const isExplicitNeg = Array.isArray(clause); 
    const atomId = resolveAtomId(text, allAtoms, globalMap);
    const modStr = applyLogicalModifiers(atomId, isExplicitNeg ? clause : modTypes, profile);
    return applyQuantitativeExtraction(text, modStr, profile);
  };

  const formulas: FormulaEntry[] = [];
  let label = labelStart;

  switch (sentence.type) {
    case 'conditional': {
      let conditionClauses = clauses.filter(c => c.role === 'condition');
      let consequentClauses = clauses.filter(c => c.role === 'consequent' || c.role === 'conclusion' || c.role === 'assertion');

      if (conditionClauses.length === 0 && clauses.length >= 2) {
        const nonConsequent = clauses.filter(c => c.role !== 'consequent' && c.role !== 'conclusion');
        if (nonConsequent.length > 0) {
          conditionClauses = [nonConsequent[0]];
          consequentClauses = clauses.filter(c => c !== nonConsequent[0]);
        }
      }

      if (conditionClauses.length > 0 && consequentClauses.length > 0) {
        const antStr = getStr(conditionClauses[0]);
        const consStr = getStr(consequentClauses[0]);

        formulas.push({
          formula: \`\${antStr} \${ST_OPERATORS.implication} \${consStr}\`,
          stType: 'axiom',
          label: \`regla_\${label}\`,
          sourceText: sentence.original,
          sourceSentence: sentenceIdx,
          comment: \`Condicional: "\${sentence.original}"\`,
        });

        const supplementalClauses = clauses.filter(clause => clause !== conditionClauses[0] && clause !== consequentClauses[0]);

        for (const clause of supplementalClauses) {
          formulas.push({
            formula: getStr(clause),
            stType: clause.role === 'conclusion' ? 'derive' : 'axiom',
            label: \`hecho_\${++label}\`,
            sourceText: clause.text,
            sourceSentence: sentenceIdx,
            comment: \`Subcláusula condicional: "\${clause.text}"\`,
          });
        }
      }
      break;
    }

    case 'biconditional': {
      if (clauses.length >= 2) {
        formulas.push({
          formula: \`\${getStr(clauses[0])} \${ST_OPERATORS.biconditional} \${getStr(clauses[1])}\`,
          stType: 'axiom',
          label: \`bicond_\${label}\`,
          sourceText: sentence.original,
          sourceSentence: sentenceIdx,
          comment: \`Bicondicional: "\${sentence.original}"\`,
        });
      }
      break;
    }

    case 'conjunction': {
      const atoms = clauses.map(c => getStr(c));
      if (atoms.length >= 2) {
        formulas.push({
          formula: atoms.join(\` \${ST_OPERATORS.conjunction} \`),
          stType: 'axiom',
          label: \`conj_\${label}\`,
          sourceText: sentence.original,
          sourceSentence: sentenceIdx,
          comment: \`Conjunción: "\${sentence.original}"\`,
        });
      } else if (atoms.length === 1) {
        formulas.push({
          formula: atoms[0],
          stType: 'axiom',
          label: \`hecho_\${label}\`,
          sourceText: sentence.original,
          sourceSentence: sentenceIdx,
          comment: \`Hecho: "\${sentence.original}"\`,
        });
      }
      break;
    }

    case 'disjunction': {
      const atoms = clauses.map(c => getStr(c));
      if (atoms.length >= 2) {
        formulas.push({
          formula: atoms.join(\` \${ST_OPERATORS.disjunction} \`),
          stType: 'axiom',
          label: \`disj_\${label}\`,
          sourceText: sentence.original,
          sourceSentence: sentenceIdx,
          comment: \`Disyunción: "\${sentence.original}"\`,
        });
      }
      break;
    }

    case 'negation': {
      if (clauses.length > 0) {
        const atomId = resolveAtomId(clauses[0].text, allAtoms, globalMap);
        const modStr = applyLogicalModifiers(atomId, ['negation'], profile);
        formulas.push({
          formula: applyQuantitativeExtraction(clauses[0].text, modStr, profile),
          stType: 'axiom',
          label: \`neg_\${label}\`,
          sourceText: sentence.original,
          sourceSentence: sentenceIdx,
          comment: \`Negación: "\${sentence.original}"\`,
        });
      }
      break;
    }

    case 'complex': {
      const premiseClauses = clauses.filter(c => c.role === 'premise');
      const conclusionClauses = clauses.filter(c => c.role === 'conclusion');

      if (premiseClauses.length > 0 && conclusionClauses.length > 0) {
        const premiseAtoms = premiseClauses.map(pc => getStr(pc));
        const conclusionStr = getStr(conclusionClauses[0]);

        const antecedent = premiseAtoms.length === 1 ? premiseAtoms[0] : \`(\${premiseAtoms.join(\` \${ST_OPERATORS.conjunction} \`)})\`;

        formulas.push({
          formula: \`\${antecedent} \${ST_OPERATORS.implication} \${conclusionStr}\`,
          stType: 'axiom',
          label: \`regla_\${label++}\`,
          sourceText: sentence.original,
          sourceSentence: sentenceIdx,
          comment: \`Causal: "\${sentence.original}"\`,
        });

        for (const pClause of premiseClauses) {
          formulas.push({
            formula: getStr(pClause),
            stType: 'axiom',
            label: \`premisa_\${label++}\`,
            sourceText: pClause.text,
            sourceSentence: sentenceIdx,
            comment: \`Premisa: "\${pClause.text}"\`,
          });
        }

        for (const cClause of conclusionClauses) {
          formulas.push({
            formula: getStr(cClause),
            stType: 'derive',
            label: \`conclusion_\${label++}\`,
            sourceText: cClause.text,
            sourceSentence: sentenceIdx,
            comment: \`Conclusión: "\${cClause.text}"\`,
          });
        }
      } else {
        for (const pClause of premiseClauses) {
          formulas.push({
            formula: getStr(pClause),
            stType: 'axiom',
            label: \`premisa_\${label++}\`,
            sourceText: pClause.text,
            sourceSentence: sentenceIdx,
            comment: \`Premisa: "\${pClause.text}"\`,
          });
        }
      }
      break;
    }

    default: {
      for (const clause of clauses) {
        const isConclusion = clause.role === 'conclusion';
        formulas.push({
          formula: getStr(clause),
          stType: isConclusion ? 'derive' : 'axiom',
          label: isConclusion ? \`conclusion_\${label}\` : \`hecho_\${label}\`,
          sourceText: clause.text,
          sourceSentence: sentenceIdx,
          comment: isConclusion ? \`Conclusión: "\${clause.text}"\` : \`Hecho: "\${clause.text}"\`,
        });
        label++;
      }
      break;
    }
  }

  return formulas;
}
`;

fs.writeFileSync('src/formula/propositional.ts', code);
