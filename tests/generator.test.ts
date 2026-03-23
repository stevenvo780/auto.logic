/**
 * Tests — ST Generator
 */
import { describe, it, expect } from 'vitest';
import { emitST } from '../src/generator/st-emitter';
import type { FormulaEntry, LogicProfile } from '../src/types';

describe('ST Emitter', () => {
  it('emite header con perfil', () => {
    const { code } = emitST({
      profile: 'classical.propositional',
      language: 'es',
      includeComments: true,
      atoms: new Map([['LLUEVE', 'llueve']]),
      formulas: [],
      detectedPatterns: [],
    });
    expect(code).toContain('logic classical.propositional');
    expect(code).toContain('interpret "llueve" as LLUEVE');
  });

  it('emite axiomas', () => {
    const formulas: FormulaEntry[] = [{
      formula: 'LLUEVE -> CALLE_MOJADA',
      stType: 'axiom',
      label: 'regla_1',
      sourceText: 'Si llueve, la calle se moja',
      sourceSentence: 0,
      comment: 'Condicional',
    }];
    const { code } = emitST({
      profile: 'classical.propositional',
      language: 'es',
      includeComments: true,
      atoms: new Map([
        ['LLUEVE', 'llueve'],
        ['CALLE_MOJADA', 'la calle se moja'],
      ]),
      formulas,
      detectedPatterns: ['modus_ponens'],
    });
    expect(code).toContain('axiom regla_1 = LLUEVE -> CALLE_MOJADA');
  });

  it('emite derive con from', () => {
    const formulas: FormulaEntry[] = [
      {
        formula: 'P -> Q',
        stType: 'axiom',
        label: 'a1',
        sourceText: 'Si P entonces Q',
        sourceSentence: 0,
      },
      {
        formula: 'P',
        stType: 'axiom',
        label: 'a2',
        sourceText: 'P',
        sourceSentence: 1,
      },
      {
        formula: 'Q',
        stType: 'derive',
        label: 'c1',
        sourceText: 'Q',
        sourceSentence: 2,
      },
    ];
    const { code } = emitST({
      profile: 'classical.propositional',
      language: 'es',
      includeComments: false,
      atoms: new Map([['P', 'p'], ['Q', 'q']]),
      formulas,
      detectedPatterns: [],
    });
    expect(code).toContain('derive Q from {a1, a2}');
  });

  it('emite sin comentarios cuando includeComments=false', () => {
    const { code } = emitST({
      profile: 'classical.propositional',
      language: 'es',
      includeComments: false,
      atoms: new Map([['P', 'p']]),
      formulas: [],
      detectedPatterns: [],
    });
    expect(code).not.toContain('//');
  });

  it('does NOT auto-generate check valid for conditional axioms (check valid tests tautology, not argument validity)', () => {
    const formulas: FormulaEntry[] = [{
      formula: 'P -> Q',
      stType: 'axiom',
      label: 'r1',
      sourceText: 'si p entonces q',
      sourceSentence: 0,
    }];
    const { code } = emitST({
      profile: 'classical.propositional',
      language: 'es',
      includeComments: false,
      atoms: new Map(),
      formulas,
      detectedPatterns: [],
    });
    // check valid (P -> Q) would fail because P→Q is not a tautology.
    // Argument validity is proven via `derive`, not `check valid`.
    expect(code).not.toContain('check valid');
    expect(code).toContain('axiom r1 = P -> Q');
  });
});
