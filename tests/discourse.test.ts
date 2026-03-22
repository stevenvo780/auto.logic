/**
 * Tests — Discourse Analyzer
 */
import { describe, it, expect } from 'vitest';
import { analyzeDiscourse } from '../src/discourse';
import { classifyClauses } from '../src/discourse/role-classifier';
import { segment } from '../src/segmenter';

describe('Role Classifier', () => {
  it('clasifica cláusula condicional', () => {
    const sentences = segment('Si llueve, entonces la calle se moja.', 'es');
    const analyzed = classifyClauses(sentences[0].clauses, 'es');
    expect(analyzed.type).toBe('conditional');
    expect(analyzed.clauses.some(c => c.role === 'condition')).toBe(true);
  });

  it('clasifica premisa con "dado que"', () => {
    const sentences = segment('Dado que llueve, la calle se moja.', 'es');
    const analyzed = classifyClauses(sentences[0].clauses, 'es');
    expect(analyzed.clauses.some(c => c.role === 'premise')).toBe(true);
  });

  it('clasifica conclusión con "por lo tanto"', () => {
    const sentences = segment('Por lo tanto, la demanda baja.', 'es');
    const analyzed = classifyClauses(sentences[0].clauses, 'es');
    expect(analyzed.clauses.some(c => c.role === 'conclusion')).toBe(true);
  });

  it('clasifica negación', () => {
    const sentences = segment('No es cierto que la tierra sea plana.', 'es');
    const analyzed = classifyClauses(sentences[0].clauses, 'es');
    const hasNegation = analyzed.clauses.some(c =>
      c.modifiers.some(m => m.type === 'negation')
    );
    expect(hasNegation).toBe(true);
  });
});

describe('Discourse Analysis', () => {
  it('analiza modus ponens', () => {
    const sentences = segment(
      'Si llueve, la calle se moja. Está lloviendo. Por lo tanto, la calle está mojada.',
      'es'
    );
    const analysis = analyzeDiscourse(sentences, 'es');
    expect(analysis.sentences.length).toBe(3);
    expect(analysis.detectedPatterns).toContain('modus_ponens');
  });

  it('analiza silogismo hipotético', () => {
    const sentences = segment(
      'Si estudio, apruebo. Si apruebo, obtengo el título. Si obtengo el título, consigo trabajo.',
      'es'
    );
    const analysis = analyzeDiscourse(sentences, 'es');
    expect(analysis.detectedPatterns).toContain('hypothetical_syllogism');
  });

  it('detecta estructura argumental', () => {
    const sentences = segment(
      'Si llueve, la calle se moja. Llueve. Por lo tanto, la calle se moja.',
      'es'
    );
    const analysis = analyzeDiscourse(sentences, 'es');
    expect(analysis.argumentStructure.premises.length).toBeGreaterThan(0);
  });
});
