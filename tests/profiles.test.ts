/**
 * Tests — Cada perfil lógico
 */
import { describe, it, expect } from 'vitest';
import { formalize } from '../src';
import type { LogicProfile } from '../src/types';

const PROFILES: { profile: LogicProfile; text: string }[] = [
  {
    profile: 'classical.propositional',
    text: 'Si llueve, la calle se moja.',
  },
  {
    profile: 'classical.first_order',
    text: 'Todo humano es mortal. Sócrates es humano.',
  },
  {
    profile: 'modal.k',
    text: 'Es necesario que las leyes se cumplan.',
  },
  {
    profile: 'deontic.standard',
    text: 'Es obligatorio pagar impuestos.',
  },
  {
    profile: 'epistemic.s5',
    text: 'Es necesario que la verdad sea conocida.',
  },
  {
    profile: 'intuitionistic.propositional',
    text: 'Si hay evidencia, entonces es verdadero.',
  },
  {
    profile: 'temporal.ltl',
    text: 'Después de estudiar, habrá un examen.',
  },
  {
    profile: 'paraconsistent.belnap',
    text: 'La proposición puede ser verdadera y falsa.',
  },
  {
    profile: 'aristotelian.syllogistic',
    text: 'Todo hombre es mortal. Sócrates es hombre.',
  },
  {
    profile: 'probabilistic.basic',
    text: 'Si llueve, probablemente la calle se moja.',
  },
  {
    profile: 'arithmetic',
    text: 'Si un número es par, entonces es divisible por dos.',
  },
];

describe('Todos los perfiles lógicos', () => {
  for (const { profile, text } of PROFILES) {
    it(`genera ST válido para ${profile}`, () => {
      const result = formalize(text, { profile, language: 'es' });
      expect(result.ok).toBe(true);
      expect(result.stCode).toContain(`logic ${profile}`);
      expect(result.stCode.length).toBeGreaterThan(20);
      expect(result.atoms.size).toBeGreaterThan(0);
      expect(result.formulas.length).toBeGreaterThan(0);
    });
  }
});
