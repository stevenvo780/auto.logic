/**
 * Pattern Detector — Detecta patrones argumentales conocidos
 *
 * Analiza la estructura argumental global para identificar
 * Modus Ponens, Modus Tollens, silogismos, etc.
 */
import type { AnalyzedSentence, ArgumentPattern, ArgumentStructure } from '../types';

/**
 * Detecta patrones argumentales en un conjunto de oraciones analizadas.
 */
export function detectPatterns(sentences: AnalyzedSentence[]): ArgumentPattern[] {
  const patterns: ArgumentPattern[] = [];

  const conditionals = sentences.filter(s => s.type === 'conditional');
  const assertions = sentences.filter(s =>
    s.type === 'assertion' || s.clauses.some(c => c.role === 'premise')
  );
  const conclusions = sentences.filter(s =>
    s.clauses.some(c => c.role === 'conclusion')
  );
  const negations = sentences.filter(s =>
    s.type === 'negation' || s.clauses.some(c => c.modifiers.some(m => m.type === 'negation'))
  );

  // Modus Ponens: A→B, A ⊢ B
  if (conditionals.length > 0 && assertions.length > 0 && conclusions.length > 0) {
    patterns.push('modus_ponens');
  }

  // Modus Tollens: A→B, ¬B ⊢ ¬A
  if (conditionals.length > 0 && negations.length > 0 && conclusions.length > 0) {
    const conclusionHasNegation = conclusions.some(s =>
      s.clauses.some(c => c.modifiers.some(m => m.type === 'negation'))
    );
    if (conclusionHasNegation) {
      patterns.push('modus_tollens');
    }
  }

  // Silogismo hipotético: A→B, B→C ⊢ A→C
  if (conditionals.length >= 2) {
    patterns.push('hypothetical_syllogism');
  }

  // Silogismo disyuntivo: A∨B, ¬A ⊢ B
  const disjunctions = sentences.filter(s => s.type === 'disjunction');
  if (disjunctions.length > 0 && negations.length > 0) {
    patterns.push('disjunctive_syllogism');
  }

  // Cadena condicional: múltiples condicionales encadenadas
  if (conditionals.length >= 3) {
    patterns.push('conditional_chain');
  }

  // Generalización universal: predicados con cuantificador universal
  const universals = sentences.filter(s => s.type === 'universal');
  if (universals.length > 0) {
    patterns.push('universal_generalization');
  }

  // Instanciación universal: universal + instancia concreta
  if (universals.length > 0 && assertions.length > 0) {
    patterns.push('universal_instantiation');
  }

  // Conjunción introducción: múltiples aserciones unidas por "y"
  const conjunctions = sentences.filter(s => s.type === 'conjunction');
  if (conjunctions.length > 0) {
    patterns.push('conjunction_introduction');
  }

  // Bicondicional
  const biconditionals = sentences.filter(s => s.type === 'biconditional');
  if (biconditionals.length > 0) {
    patterns.push('biconditional_introduction');
  }

  // Si no se detectó ningún patrón complejo, es aserción simple
  if (patterns.length === 0 && sentences.length > 0) {
    patterns.push('simple_assertion');
  }

  return patterns;
}

/**
 * Construye la estructura argumental a partir de oraciones analizadas.
 */
export function buildArgumentStructure(sentences: AnalyzedSentence[]): ArgumentStructure {
  const premises: number[] = [];
  const conclusions: number[] = [];
  const conditions: number[] = [];

  sentences.forEach((sentence, idx) => {
    const hasPremise = sentence.clauses.some(c =>
      c.role === 'premise' || c.role === 'condition'
    );
    const hasConclusion = sentence.clauses.some(c =>
      c.role === 'conclusion' || c.role === 'consequent'
    );

    if (sentence.type === 'conditional') {
      conditions.push(idx);
    }

    if (hasPremise && !hasConclusion) {
      premises.push(idx);
    } else if (hasConclusion) {
      conclusions.push(idx);
    } else {
      // Oraciones sin roles explícitos son premisas por defecto
      premises.push(idx);
    }
  });

  // Construir relaciones: premisas soportan conclusiones
  const relations = conclusions.flatMap(concIdx =>
    premises.map(premIdx => ({
      from: premIdx,
      to: concIdx,
      type: 'supports' as const,
    }))
  );

  return { premises, conclusions, conditions, relations };
}
