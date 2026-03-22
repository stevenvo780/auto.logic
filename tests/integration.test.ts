/**
 * Tests — Integration (end-to-end)
 */
import { describe, it, expect } from 'vitest';
import { formalize, Autologic } from '../src';
import {
  MODUS_PONENS_ES,
  MODUS_PONENS_THEREFORE_ES,
  CONJUNCTION_ES,
  DISJUNCTION_ES,
  NEGATION_ES,
  FIRST_ORDER_UNIVERSAL_ES,
  MODAL_NECESSITY_ES,
  TEMPORAL_ES,
  BICONDITIONAL_ES,
  COMPLEX_ARGUMENT_ES,
  SIMPLE_ASSERTION_ES,
  EMPTY_TEXT,
  DEONTIC_ES,
} from './fixtures/texts-es';
import {
  MODUS_PONENS_EN,
  COMPLEX_ARGUMENT_EN,
} from './fixtures/texts-en';

describe('formalize() — Español', () => {
  it('formaliza modus ponens', () => {
    const result = formalize(MODUS_PONENS_ES, {
      profile: 'classical.propositional',
      language: 'es',
    });
    expect(result.ok).toBe(true);
    expect(result.stCode).toContain('logic classical.propositional');
    expect(result.stCode).toContain('axiom');
    expect(result.stCode).toContain('->');
    expect(result.atoms.size).toBeGreaterThan(0);
    expect(result.formulas.length).toBeGreaterThanOrEqual(2);
  });

  it('formaliza modus ponens con "por lo tanto"', () => {
    const result = formalize(MODUS_PONENS_THEREFORE_ES, {
      profile: 'classical.propositional',
      language: 'es',
    });
    expect(result.ok).toBe(true);
    expect(result.stCode).toContain('logic classical.propositional');
    expect(result.stCode).toContain('->');
  });

  it('formaliza conjunción', () => {
    const result = formalize(CONJUNCTION_ES, {
      profile: 'classical.propositional',
      language: 'es',
    });
    expect(result.ok).toBe(true);
    expect(result.stCode).toContain('logic classical.propositional');
  });

  it('formaliza negación', () => {
    const result = formalize(NEGATION_ES, {
      profile: 'classical.propositional',
      language: 'es',
    });
    expect(result.ok).toBe(true);
    expect(result.stCode).toContain('logic classical.propositional');
  });

  it('formaliza aserción simple', () => {
    const result = formalize(SIMPLE_ASSERTION_ES, {
      profile: 'classical.propositional',
      language: 'es',
    });
    expect(result.ok).toBe(true);
    expect(result.stCode).toContain('axiom');
  });

  it('maneja texto vacío', () => {
    const result = formalize(EMPTY_TEXT);
    expect(result.ok).toBe(false);
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  it('formaliza argumento complejo', () => {
    const result = formalize(COMPLEX_ARGUMENT_ES, {
      profile: 'classical.propositional',
      language: 'es',
    });
    expect(result.ok).toBe(true);
    expect(result.atoms.size).toBeGreaterThan(1);
    expect(result.formulas.length).toBeGreaterThan(1);
  });
});

describe('formalize() — Primer Orden', () => {
  it('formaliza cuantificación universal', () => {
    const result = formalize(FIRST_ORDER_UNIVERSAL_ES, {
      profile: 'classical.first_order',
      language: 'es',
    });
    expect(result.ok).toBe(true);
    expect(result.stCode).toContain('logic classical.first_order');
    expect(result.stCode).toContain('forall');
  });
});

describe('formalize() — Modal', () => {
  it('formaliza necesidad modal', () => {
    const result = formalize(MODAL_NECESSITY_ES, {
      profile: 'modal.k',
      language: 'es',
    });
    expect(result.ok).toBe(true);
    expect(result.stCode).toContain('logic modal.k');
    expect(result.stCode).toContain('[]');
  });

  it('formaliza deóntico', () => {
    const result = formalize(DEONTIC_ES, {
      profile: 'deontic.standard',
      language: 'es',
    });
    expect(result.ok).toBe(true);
    expect(result.stCode).toContain('logic deontic.standard');
  });
});

describe('formalize() — Temporal', () => {
  it('formaliza lógica temporal', () => {
    const result = formalize(TEMPORAL_ES, {
      profile: 'temporal.ltl',
      language: 'es',
    });
    expect(result.ok).toBe(true);
    expect(result.stCode).toContain('logic temporal.ltl');
  });
});

describe('formalize() — Inglés', () => {
  it('formaliza modus ponens en inglés', () => {
    const result = formalize(MODUS_PONENS_EN, {
      profile: 'classical.propositional',
      language: 'en',
    });
    expect(result.ok).toBe(true);
    expect(result.stCode).toContain('logic classical.propositional');
    expect(result.stCode).toContain('->');
  });

  it('formaliza argumento complejo en inglés', () => {
    const result = formalize(COMPLEX_ARGUMENT_EN, {
      profile: 'classical.propositional',
      language: 'en',
    });
    expect(result.ok).toBe(true);
    expect(result.atoms.size).toBeGreaterThan(0);
  });
});

describe('Autologic class', () => {
  it('formaliza con defaults', () => {
    const al = new Autologic({ language: 'es', defaultProfile: 'classical.propositional' });
    const result = al.formalize('Si llueve, la calle se moja.');
    expect(result.ok).toBe(true);
    expect(result.stCode).toContain('logic classical.propositional');
  });

  it('analiza sin generar ST', () => {
    const al = new Autologic();
    const analysis = al.analyze('Si P entonces Q, pero no Q, luego no P.');
    expect(analysis.sentences.length).toBeGreaterThan(0);
  });

  it('mantiene historial', () => {
    const al = new Autologic();
    al.formalize('El sol brilla.');
    al.formalize('La luna refleja.');
    expect(al.getHistory()).toHaveLength(2);
    al.clearHistory();
    expect(al.getHistory()).toHaveLength(0);
  });

  it('permite configuración dinámica', () => {
    const al = new Autologic({ language: 'es' });
    al.setConfig({ language: 'en' });
    expect(al.getConfig().language).toBe('en');
  });
});
