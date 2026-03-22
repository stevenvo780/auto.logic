/**
 * Tests — Segmenter
 */
import { describe, it, expect } from 'vitest';
import { splitSentences } from '../src/segmenter/sentence-splitter';
import { splitClauses } from '../src/segmenter/clause-splitter';
import { segment } from '../src/segmenter';

describe('Sentence Splitter', () => {
  it('divide por puntos', () => {
    const result = splitSentences('La tierra es redonda. El agua es líquida.');
    expect(result).toHaveLength(2);
    expect(result[0]).toContain('La tierra es redonda');
    expect(result[1]).toContain('El agua es líquida');
  });

  it('divide por punto y coma', () => {
    const result = splitSentences('Llueve; la calle se moja.');
    expect(result).toHaveLength(2);
  });

  it('divide por signos de interrogación', () => {
    const result = splitSentences('¿Llueve? Sí, llueve.');
    expect(result).toHaveLength(2);
  });

  it('respeta abreviaturas', () => {
    const result = splitSentences('El Dr. García es bueno. Trabaja bien.');
    expect(result).toHaveLength(2);
  });

  it('retorna vacío para texto vacío', () => {
    expect(splitSentences('')).toHaveLength(0);
    expect(splitSentences('   ')).toHaveLength(0);
  });

  it('maneja una sola oración sin punto final', () => {
    const result = splitSentences('El cielo es azul');
    expect(result).toHaveLength(1);
  });
});

describe('Clause Splitter', () => {
  it('divide cláusula condicional en español', () => {
    const result = splitClauses('Si llueve, entonces la calle se moja', 'es');
    expect(result.length).toBeGreaterThanOrEqual(1);
    // Debe detectar marcadores "si" y "entonces"
    const allMarkers = result.flatMap(c => c.markers);
    expect(allMarkers.some(m => m.role === 'condition' || m.role === 'consequent')).toBe(true);
  });

  it('divide premisa con "dado que"', () => {
    const result = splitClauses('Dado que llueve, la calle se moja', 'es');
    expect(result.length).toBeGreaterThanOrEqual(1);
    const allMarkers = result.flatMap(c => c.markers);
    expect(allMarkers.some(m => m.role === 'premise')).toBe(true);
  });

  it('maneja oración sin marcadores', () => {
    const result = splitClauses('El cielo es azul', 'es');
    expect(result).toHaveLength(1);
    expect(result[0].text).toContain('cielo');
  });
});

describe('Segment (integrado)', () => {
  it('segmenta texto completo', () => {
    const result = segment('Si llueve, la calle se moja. El sol brilla.', 'es');
    expect(result).toHaveLength(2);
    expect(result[0].clauses.length).toBeGreaterThanOrEqual(1);
    expect(result[1].clauses.length).toBeGreaterThanOrEqual(1);
  });
});
