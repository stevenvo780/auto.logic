/**
 * Argument Builder — Genera derivaciones cross-sentence
 *
 * Analiza la estructura argumental GLOBAL (multi-oración) para producir:
 * - derive por Modus Ponens:          A→B, A ⊢ B
 * - derive por Modus Tollens:         A→B, ¬B ⊢ ¬A
 * - derive por Silogismo Hipotético:  A→B, B→C ⊢ A→C
 * - derive por Silogismo Disyuntivo:  A∨B, ¬A ⊢ B
 * - derive por Conjunción Intro:      A, B ⊢ A∧B
 *
 * Se ejecuta DESPUÉS de los formula builders per-sentence.
 */
import type { FormulaEntry, AtomEntry, AnalyzedSentence } from '../types';
import { ST_OPERATORS } from './connectors';
import { diceSimilarity } from '../atoms/coreference';
import { bagOfStems } from '../atoms/keyword-extractor';

/**
 * Enriquece las fórmulas per-sentence con derivaciones cross-sentence.
 */
export function buildCrossSentenceDerivations(
  perSentenceFormulas: FormulaEntry[],
  sentences: AnalyzedSentence[],
  atomEntries: AtomEntry[],
  detectedPatterns: string[],
): FormulaEntry[] {
  const extra: FormulaEntry[] = [];
  let labelCounter = perSentenceFormulas.length + 1;

  // Clasificar fórmulas existentes
  const conditionals = perSentenceFormulas.filter(f =>
    f.stType === 'axiom' && f.formula.includes(ST_OPERATORS.implication)
  );
  const simpleAxioms = perSentenceFormulas.filter(f =>
    f.stType === 'axiom' && !f.formula.includes(ST_OPERATORS.implication) &&
    !f.formula.includes(ST_OPERATORS.biconditional)
  );
  const negationAxioms = simpleAxioms.filter(f =>
    f.formula.startsWith('!') || f.formula.startsWith('!(')
  );
  const positiveAxioms = simpleAxioms.filter(f =>
    !f.formula.startsWith('!') && !f.formula.startsWith('!(')
  );
  const disjunctions = perSentenceFormulas.filter(f =>
    f.stType === 'axiom' && f.formula.includes(ST_OPERATORS.disjunction)
    && !f.formula.includes(ST_OPERATORS.implication)
  );
  const existingDerives = perSentenceFormulas.filter(f => f.stType === 'derive');
  const derivedOrExistingFormulas = new Set(existingDerives.map((formula) => formula.formula));
  const pushExtra = (entry: FormulaEntry) => {
    if (derivedOrExistingFormulas.has(entry.formula)) return;
    derivedOrExistingFormulas.add(entry.formula);
    extra.push(entry);
  };

  // ── Modus Ponens: A→B, A ⊢ B ──────────────────
  if (detectedPatterns.includes('modus_ponens') || conditionals.length > 0) {
    for (const cond of conditionals) {
      const parsed = parseImplication(cond.formula);
      if (!parsed) continue;

      // Buscar un axioma que unifique con el antecedente
      const matchingPremise = findMatchingAxiom(
        parsed.antecedent, positiveAxioms, atomEntries
      );

      if (matchingPremise) {
        // Buscar si ya hay conclusión explícita
        const conclusionSentences = sentences.filter(s =>
          s.clauses.some(c => c.role === 'conclusion')
        );

        pushExtra({
          formula: parsed.consequent,
          stType: 'derive',
          label: `mp_${labelCounter++}`,
          sourceText: `Modus Ponens: de ${cond.label} y ${matchingPremise.label}`,
          sourceSentence: cond.sourceSentence,
          comment: `Modus Ponens: ${parsed.antecedent} → ${parsed.consequent}, ${parsed.antecedent} ⊢ ${parsed.consequent}`,
        });
        // Solo una derivación MP por condicional
        break;
      }
    }
  }

  // ── Modus Tollens: A→B, ¬B ⊢ ¬A ──────────────
  if (detectedPatterns.includes('modus_tollens') || 
      (conditionals.length > 0 && negationAxioms.length > 0)) {
    for (const cond of conditionals) {
      const parsed = parseImplication(cond.formula);
      if (!parsed) continue;

      // Buscar ¬B entre los axiomas de negación
      const negConsequent = stripNegation(parsed.consequent);
      if (!negConsequent) continue;

      const matchingNeg = negationAxioms.find(a => {
        const stripped = stripNegation(a.formula);
        return stripped !== null && atomsUnify(stripped, parsed.consequent, atomEntries);
      });

      // También buscar si el axioma negado es directamente ¬(consequent)
      const matchingNeg2 = negationAxioms.find(a => {
        const innerAtom = extractNegatedAtom(a.formula);
        return innerAtom !== null && atomsUnify(innerAtom, parsed.consequent, atomEntries);
      });

      const foundNeg = matchingNeg || matchingNeg2;
      if (foundNeg) {
        pushExtra({
          formula: `${ST_OPERATORS.negation}(${parsed.antecedent})`,
          stType: 'derive',
          label: `mt_${labelCounter++}`,
          sourceText: `Modus Tollens: de ${cond.label} y ${foundNeg.label}`,
          sourceSentence: cond.sourceSentence,
          comment: `Modus Tollens: ${parsed.antecedent}→${parsed.consequent}, ¬${parsed.consequent} ⊢ ¬${parsed.antecedent}`,
        });
        break;
      }
    }
  }

  // ── Silogismo Hipotético: A→B, B→C ⊢ A→C ─────
  if (detectedPatterns.includes('hypothetical_syllogism') || conditionals.length >= 2) {
    const chains = findConditionalChains(conditionals, atomEntries);
    for (const chain of chains) {
      pushExtra({
        formula: `${chain.start} ${ST_OPERATORS.implication} ${chain.end}`,
        stType: 'derive',
        label: `hs_${labelCounter++}`,
        sourceText: `Silogismo Hipotético: cadena de ${chain.labels.join(', ')}`,
        sourceSentence: conditionals[0].sourceSentence,
        comment: `Silogismo Hipotético: ${chain.start} → ... → ${chain.end}`,
      });
    }
  }

  // ── Silogismo Disyuntivo: A∨B, ¬A ⊢ B ────────
  if (detectedPatterns.includes('disjunctive_syllogism') ||
      (disjunctions.length > 0 && negationAxioms.length > 0)) {
    for (const disj of disjunctions) {
      const parts = disj.formula.split(` ${ST_OPERATORS.disjunction} `).map(s => s.trim());
      if (parts.length < 2) continue;

      for (const negAxiom of negationAxioms) {
        const negated = extractNegatedAtom(negAxiom.formula);
        if (!negated) continue;

        const negIdx = parts.findIndex(p => atomsUnify(p, negated, atomEntries));
        if (negIdx >= 0) {
          const remaining = parts.filter((_, i) => i !== negIdx).join(` ${ST_OPERATORS.disjunction} `);
          pushExtra({
            formula: remaining,
            stType: 'derive',
            label: `ds_${labelCounter++}`,
            sourceText: `Silogismo Disyuntivo: de ${disj.label} y ${negAxiom.label}`,
            sourceSentence: disj.sourceSentence,
            comment: `Silogismo Disyuntivo: ${disj.formula}, ${negAxiom.formula} ⊢ ${remaining}`,
          });
          break;
        }
      }
    }
  }

  // ── Cadena condicional con MP final ────────────
  // Si tenemos A→B, B→C, C→D y además A, derivar D
  if (conditionals.length >= 2 && positiveAxioms.length > 0) {
    const chains = findConditionalChains(conditionals, atomEntries);
    for (const chain of chains) {
      const matchingStart = findMatchingAxiom(chain.start, positiveAxioms, atomEntries);
      if (matchingStart && !derivedOrExistingFormulas.has(chain.end)) {
        pushExtra({
          formula: chain.end,
          stType: 'derive',
          label: `chain_${labelCounter++}`,
          sourceText: `Cadena + MP: de ${chain.labels.join(', ')} y ${matchingStart.label}`,
          sourceSentence: conditionals[conditionals.length - 1].sourceSentence,
          comment: `Cadena condicional + Modus Ponens: ${chain.start} → ... → ${chain.end}, ${chain.start} ⊢ ${chain.end}`,
        });
      }
    }
  }

  // ── Instanciación Universal Proposicional ──────
  // Si hay universal_instantiation + universal_generalization y una conclusión explícita
  // sin condicionales, generar la regla implícita:
  // "Todos F buscan V" (universal) + "S es F" (instancia) → "S busca V" (conclusión)
  // Proposicionalmente: UNIVERSAL & INSTANCIA -> CONCLUSIÓN
  if (detectedPatterns.includes('universal_instantiation') &&
      conditionals.length === 0 && existingDerives.length > 0) {
    // Hay derives per-sentence (la conclusión explícita con "por lo tanto")
    // y axiomas universales + instancias, pero no hay condicionales.
    // Generar regla proposicional: premisas → conclusión
    const premiseFormulas = positiveAxioms.map(a => a.formula);
    if (premiseFormulas.length >= 2 && existingDerives.length > 0) {
      const conclusionFormula = existingDerives[0].formula;
      const antecedent = premiseFormulas.length === 1
        ? premiseFormulas[0]
        : `(${premiseFormulas.join(` ${ST_OPERATORS.conjunction} `)})`;
      const premiseLabels = positiveAxioms.map(a => a.label);

      // Solo agregar si no es redundante con la conclusión ya existente
      if (!extra.some(e => e.formula === conclusionFormula)) {
        pushExtra({
          formula: `${antecedent} ${ST_OPERATORS.implication} ${conclusionFormula}`,
          stType: 'axiom',
          label: `ui_regla_${labelCounter++}`,
          sourceText: `Instanciación universal: ${premiseLabels.join(', ')} ⊢ ${conclusionFormula}`,
          sourceSentence: existingDerives[0].sourceSentence,
          comment: `Regla de instanciación universal (proposicional): ${antecedent} → ${conclusionFormula}`,
        });
      }
    }
  }

  return extra;
}

// ══════════════════════════════════════════════════════════════
// Utilidades internas
// ══════════════════════════════════════════════════════════════

/** Parsea "A -> B" en { antecedent, consequent } */
function parseImplication(formula: string): { antecedent: string; consequent: string } | null {
  const operator = ` ${ST_OPERATORS.implication} `;
  let depth = 0;
  let idx = -1;

  for (let i = 0; i <= formula.length - operator.length; i++) {
    const char = formula[i];
    if (char === '(') depth++;
    else if (char === ')') depth = Math.max(0, depth - 1);

    if (depth === 0 && formula.slice(i, i + operator.length) === operator) {
      idx = i;
      break;
    }
  }

  if (idx < 0) return null;
  const antecedent = formula.slice(0, idx).trim();
  const consequent = formula.slice(idx + operator.length).trim();
  if (!antecedent || !consequent) return null;
  return { antecedent, consequent };
}

/** Extrae el átomo dentro de una negación: "!(X)" → "X", "!X" → "X" */
function extractNegatedAtom(formula: string): string | null {
  const trimmed = formula.trim();
  // "!(ATOM)" pattern
  const match1 = trimmed.match(/^!\((.+)\)$/);
  if (match1) return match1[1].trim();
  // "!ATOM" pattern
  const match2 = trimmed.match(/^!(\w+)$/);
  if (match2) return match2[1].trim();
  return null;
}

/** Remueve negación si existe, retorna null si no es negación */
function stripNegation(formula: string): string | null {
  const inner = extractNegatedAtom(formula);
  return inner;
}

/**
 * Verifica si dos expresiones atómicas se "unifican" (son el mismo concepto).
 * Usa similitud de stems para manejar variaciones morfológicas.
 */
function atomsUnify(a: string, b: string, atomEntries: AtomEntry[]): boolean {
  const normalizeFormulaAtom = (value: string): string => {
    let current = value.trim();
    let changed = true;

    while (changed) {
      changed = false;
      const unaryWrap = current.match(/^(?:!|\[\]|<>|K|B|O|P|G|F)\((.+)\)$/);
      if (unaryWrap) {
        current = unaryWrap[1].trim();
        changed = true;
        continue;
      }

      const prefixed = current.match(/^next\s+(.+)$/);
      if (prefixed) {
        current = prefixed[1].trim();
        changed = true;
      }
    }

    return current.replace(/^\(|\)$/g, '').trim();
  };

  const semanticSimilarity = (left: AtomEntry, right: AtomEntry): number => {
    if (left.polarity && right.polarity && left.polarity !== right.polarity) return 0;

    let score = 0;
    const sameRelation = left.relationKind && right.relationKind && left.relationKind === right.relationKind;
    if (sameRelation) score += 0.1;

    if (left.predicate && right.predicate) {
      const predicateSim = diceSimilarity(bagOfStems(left.predicate, 'es'), bagOfStems(right.predicate, 'es'));
      if (predicateSim >= 0.8) score += 0.7;
      else if (predicateSim >= 0.5) score += 0.45;
    }

    if (left.object && right.object) {
      const objectSim = diceSimilarity(bagOfStems(left.object, 'es'), bagOfStems(right.object, 'es'));
      if (objectSim >= 0.75) score += 0.2;
      else if (objectSim >= 0.5) score += 0.1;
    }

    if (left.subject && right.subject) {
      const subjectSim = diceSimilarity(bagOfStems(left.subject, 'es'), bagOfStems(right.subject, 'es'));
      if (subjectSim >= 0.75) score += 0.15;
    }

    if (left.relationKind === 'copula' && right.relationKind === 'copula' && left.predicate && right.predicate) {
      const samePredicate = diceSimilarity(bagOfStems(left.predicate, 'es'), bagOfStems(right.predicate, 'es')) >= 0.8;
      if (samePredicate) score = Math.max(score, 0.82);
    }

    if (left.keywords?.length && right.keywords?.length) {
      const keywordSim = diceSimilarity(new Set(left.keywords), new Set(right.keywords));
      if (keywordSim >= 0.6) score += 0.1;
    }

    return Math.min(score, 1);
  };

  // Igualdad directa
  if (a === b) return true;

  // Normalizar quitando paréntesis externos
  const na = normalizeFormulaAtom(a);
  const nb = normalizeFormulaAtom(b);
  if (na === nb) return true;

  // Buscar los textos originales de los átomos
  const atomA = atomEntries.find(e => e.id === na);
  const atomB = atomEntries.find(e => e.id === nb);
  const textA = atomA?.text;
  const textB = atomB?.text;

  if (atomA && atomB && semanticSimilarity(atomA, atomB) >= 0.8) {
    return true;
  }

  if (textA && textB) {
    const stemsA = bagOfStems(textA, 'es');
    const stemsB = bagOfStems(textB, 'es');
    return diceSimilarity(stemsA, stemsB) >= 0.5;
  }

  return false;
}

/**
 * Busca un axioma simple que unifique con un átomo/fórmula dado.
 */
function findMatchingAxiom(
  target: string,
  axioms: FormulaEntry[],
  atomEntries: AtomEntry[],
): FormulaEntry | null {
  // Match exacto primero
  const exact = axioms.find(a => a.formula === target);
  if (exact) return exact;

  // Match por unificación
  for (const axiom of axioms) {
    if (atomsUnify(axiom.formula, target, atomEntries)) {
      return axiom;
    }
  }

  return null;
}

interface ConditionalChain {
  start: string;
  end: string;
  labels: string[];
}

/**
 * Encuentra cadenas de condicionales: A→B, B→C → chain(A, C)
 */
function findConditionalChains(
  conditionals: FormulaEntry[],
  atomEntries: AtomEntry[],
): ConditionalChain[] {
  const parsed = conditionals
    .map(c => ({ ...parseImplication(c.formula)!, label: c.label }))
    .filter(p => p.antecedent && p.consequent);

  if (parsed.length < 2) return [];

  const chains: ConditionalChain[] = [];

  // Buscar cadenas empezando por cada condicional
  for (let i = 0; i < parsed.length; i++) {
    let current = parsed[i];
    const chain: string[] = [current.label];
    let end = current.consequent;

    for (let j = 0; j < parsed.length; j++) {
      if (j === i || chain.includes(parsed[j].label)) continue;
      if (atomsUnify(end, parsed[j].antecedent, atomEntries)) {
        chain.push(parsed[j].label);
        end = parsed[j].consequent;
        j = -1; // restart search for next link
      }
    }

    if (chain.length >= 2) {
      chains.push({
        start: parsed[i].antecedent,
        end,
        labels: chain,
      });
    }
  }

  // Deduplicar: quedarse con la cadena más larga para cada par start→end
  const seen = new Set<string>();
  return chains
    .sort((a, b) => b.labels.length - a.labels.length)
    .filter(c => {
      const key = `${c.start}->${c.end}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
