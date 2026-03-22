/**
 * Tests — Formula Builder
 */
import { describe, it, expect } from 'vitest';
import { buildFormulas } from '../src/formula';
import { analyzeDiscourse } from '../src/discourse';
import { extractAtoms } from '../src/atoms';
import { segment } from '../src/segmenter';

function getFormulas(text: string, profile: string = 'classical.propositional', language: 'es' | 'en' = 'es') {
  const sentences = segment(text, language);
  const analysis = analyzeDiscourse(sentences, language);
  const { entries: atomEntries } = extractAtoms(analysis.sentences, {
    language,
    atomStyle: 'keywords',
    profile: profile as any,
  });
  return buildFormulas(analysis.sentences, atomEntries, profile as any, analysis.detectedPatterns);
}

describe('Formula Builder — Propositional', () => {
  it('genera fórmula condicional', () => {
    const formulas = getFormulas('Si llueve, entonces la calle se moja.');
    expect(formulas.length).toBeGreaterThan(0);
    const hasImplication = formulas.some(f => f.formula.includes('->'));
    expect(hasImplication).toBe(true);
  });

  it('genera axiomas para premisas', () => {
    const formulas = getFormulas('La tierra es redonda.');
    expect(formulas.length).toBeGreaterThan(0);
    expect(formulas.some(f => f.stType === 'axiom')).toBe(true);
  });

  it('genera derive para conclusiones', () => {
    const formulas = getFormulas('Dado que llueve, por lo tanto la calle se moja.');
    const hasDeriveOrAxiom = formulas.some(f => f.stType === 'derive' || f.stType === 'axiom');
    expect(hasDeriveOrAxiom).toBe(true);
  });
});

describe('Formula Builder — First Order', () => {
  it('genera fórmula con cuantificador universal', () => {
    const formulas = getFormulas('Todo humano es mortal.', 'classical.first_order');
    expect(formulas.length).toBeGreaterThan(0);
    const hasForall = formulas.some(f => f.formula.includes('forall'));
    expect(hasForall).toBe(true);
  });
});

describe('Formula Builder — Modal', () => {
  it('genera fórmula con necesidad', () => {
    const formulas = getFormulas(
      'Es necesario que las leyes se cumplan.',
      'modal.k'
    );
    expect(formulas.length).toBeGreaterThan(0);
    const hasNecessity = formulas.some(f => f.formula.includes('[]'));
    expect(hasNecessity).toBe(true);
  });
});

describe('Formula Builder — Temporal', () => {
  it('genera fórmula temporal next', () => {
    const formulas = getFormulas(
      'Después de estudiar, habrá un examen.',
      'temporal.ltl'
    );
    expect(formulas.length).toBeGreaterThan(0);
  });
});
