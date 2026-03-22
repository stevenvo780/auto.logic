/**
 * Tests — Atoms
 */
import { describe, it, expect } from 'vitest';
import { extractKeywords, bagOfStems } from '../src/atoms/keyword-extractor';
import { generateId, generatePredicateId, generateVariableId } from '../src/atoms/identifier-gen';
import { areCoreferent, diceSimilarity } from '../src/atoms/coreference';
import { extractAtoms } from '../src/atoms';
import { analyzeDiscourse } from '../src/discourse';
import { segment } from '../src/segmenter';

describe('Keyword Extractor', () => {
  it('extrae keywords de texto español', () => {
    const kw = extractKeywords('la calle se moja', 'es');
    expect(kw.length).toBeGreaterThan(0);
    expect(kw.some(k => k.includes('calle') || k.includes('moja'))).toBe(true);
  });

  it('filtra stopwords', () => {
    const kw = extractKeywords('el gato está en la mesa', 'es');
    expect(kw).not.toContain('el');
    expect(kw).not.toContain('en');
    expect(kw).not.toContain('la');
  });

  it('limita a maxWords', () => {
    const kw = extractKeywords('la economía global está creciendo rápidamente este año', 'es', 2);
    expect(kw.length).toBeLessThanOrEqual(2);
  });
});

describe('Identifier Generator', () => {
  it('genera ID keywords', () => {
    const id = generateId(['calle', 'moja'], 'keywords');
    expect(id).toBe('CALLE_MOJA');
  });

  it('genera ID letters', () => {
    expect(generateId([], 'letters', 0)).toBe('P');
    expect(generateId([], 'letters', 1)).toBe('Q');
    expect(generateId([], 'letters', 25)).toBe('O');
  });

  it('genera ID numbered', () => {
    expect(generateId([], 'numbered', 0)).toBe('A1');
    expect(generateId([], 'numbered', 4)).toBe('A5');
  });

  it('genera predicate ID', () => {
    const id = generatePredicateId(['mortal']);
    expect(id).toBe('Mortal');
  });

  it('genera variable ID', () => {
    expect(generateVariableId('sócrates')).toBe('socrates');
  });
});

describe('Coreference', () => {
  it('detecta coreferencia por similitud', () => {
    expect(areCoreferent('la calle se moja', 'calle mojada', 'es', 0.3)).toBe(true);
  });

  it('no detecta coreferencia entre textos diferentes', () => {
    expect(areCoreferent('el sol brilla', 'la calle se moja', 'es')).toBe(false);
  });

  it('calcula Dice similarity correctamente', () => {
    const a = new Set(['a', 'b', 'c']);
    const b = new Set(['b', 'c', 'd']);
    const sim = diceSimilarity(a, b);
    // Intersección = {b, c} = 2, Dice = 2*2/(3+3) = 0.667
    expect(sim).toBeCloseTo(0.667, 2);
  });
});

describe('Extract Atoms (integrado)', () => {
  it('extrae átomos de oraciones analizadas', () => {
    const sentences = segment('Si llueve, la calle se moja.', 'es');
    const analysis = analyzeDiscourse(sentences, 'es');
    const { atoms, entries } = extractAtoms(analysis.sentences, {
      language: 'es',
      atomStyle: 'keywords',
    });
    expect(atoms.size).toBeGreaterThan(0);
    expect(entries.length).toBeGreaterThan(0);
  });
});
