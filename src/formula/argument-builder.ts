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

  // Si ya hay derives, no duplicar
  if (existingDerives.length > 0) return extra;

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

        extra.push({
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
        extra.push({
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
      extra.push({
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
          extra.push({
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
      if (matchingStart && extra.every(e => e.formula !== chain.end)) {
        extra.push({
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

  return extra;
}

// ══════════════════════════════════════════════════════════════
// Utilidades internas
// ══════════════════════════════════════════════════════════════

/** Parsea "A -> B" en { antecedent, consequent } */
function parseImplication(formula: string): { antecedent: string; consequent: string } | null {
  const idx = formula.indexOf(` ${ST_OPERATORS.implication} `);
  if (idx < 0) return null;
  const antecedent = formula.slice(0, idx).trim();
  const consequent = formula.slice(idx + ` ${ST_OPERATORS.implication} `.length).trim();
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
  // Igualdad directa
  if (a === b) return true;

  // Normalizar quitando paréntesis externos
  const na = a.replace(/^\(|\)$/g, '').trim();
  const nb = b.replace(/^\(|\)$/g, '').trim();
  if (na === nb) return true;

  // Buscar los textos originales de los átomos
  const textA = atomEntries.find(e => e.id === na)?.text;
  const textB = atomEntries.find(e => e.id === nb)?.text;

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
