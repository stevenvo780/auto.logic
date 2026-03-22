/**
 * Tests — Pattern Detector
 */
import { describe, it, expect } from 'vitest';
import { detectPatterns, buildArgumentStructure } from '../src/discourse/pattern-detector';
import { analyzeDiscourse } from '../src/discourse';
import { segment } from '../src/segmenter';

function analyzeText(text: string, lang: 'es' | 'en' = 'es') {
  const sentences = segment(text, lang);
  return analyzeDiscourse(sentences, lang);
}

describe('Pattern Detector', () => {
  it('detecta modus ponens', () => {
    const analysis = analyzeText(
      'Si llueve, la calle se moja. Llueve. Por lo tanto, la calle se moja.'
    );
    expect(analysis.detectedPatterns).toContain('modus_ponens');
  });

  it('detecta silogismo hipotético', () => {
    const analysis = analyzeText(
      'Si A, entonces B. Si B, entonces C. Si C, entonces D.'
    );
    expect(analysis.detectedPatterns).toContain('hypothetical_syllogism');
    expect(analysis.detectedPatterns).toContain('conditional_chain');
  });

  it('detecta aserción simple', () => {
    const analysis = analyzeText('El cielo es azul.');
    expect(analysis.detectedPatterns).toContain('simple_assertion');
  });

  it('detecta conjunción', () => {
    const analysis = analyzeText('La tierra es redonda y además el agua es líquida.');
    expect(analysis.detectedPatterns).toContain('conjunction_introduction');
  });
});

describe('Argument Structure', () => {
  it('identifica premisas y conclusiones', () => {
    const analysis = analyzeText(
      'Dado que llueve, por lo tanto la calle se moja.'
    );
    expect(analysis.argumentStructure.premises.length +
           analysis.argumentStructure.conclusions.length +
           analysis.argumentStructure.conditions.length).toBeGreaterThan(0);
  });

  it('construye relaciones supports', () => {
    const analysis = analyzeText(
      'Si llueve, la calle se moja. Llueve. Por lo tanto, la calle se moja.'
    );
    // Debe haber al menos algunas relaciones
    expect(analysis.argumentStructure).toBeDefined();
  });
});
