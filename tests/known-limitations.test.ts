import { describe, expect, it } from 'vitest';
import { formalize } from '../src';

// Estas pruebas documentan regresiones semánticas importantes que ya deben mantenerse estables.

describe('Known limitations — aspirational formalization tests', () => {
  it('conecta correctamente hechos específicos con premisas generales en cadenas de modus ponens', () => {
    const result = formalize(
      'Si un animal es mamífero, entonces tiene sangre caliente. Si tiene sangre caliente, entonces puede regular su temperatura. Los perros son mamíferos. Por lo tanto, los perros pueden regular su temperatura.',
      {
        profile: 'classical.propositional',
        language: 'es',
        atomStyle: 'keywords',
        includeComments: true,
        validateOutput: true
      }
    );

    expect(result.ok).toBe(true);
    expect(result.stCode).toContain('derive');
    expect(result.stCode).toContain('MAMIFERO');
    expect(result.stCode).toContain('derive CALIENTE_SANGRE_TIENE');
    expect(result.stCode).toContain('derive TEMPERATURA_REGULAR_PUEDE');
  });

  it('preserva mejor la modalización epistémica explícita en español', () => {
    const result = formalize(
      'Se sabe que la tierra es redonda. Si la tierra es redonda, entonces tiene gravedad.',
      {
        profile: 'epistemic.s5',
        language: 'es',
        atomStyle: 'keywords',
        includeComments: true,
        validateOutput: true
      }
    );

    expect(result.ok).toBe(true);
    expect(result.stCode).toMatch(/K|know|sabe/);
  });

  it('mantiene la negación explícita en ejemplos paraconsistentes', () => {
    const result = formalize(
      'El gato está vivo y el gato no está vivo. El gato está en la caja.',
      {
        profile: 'paraconsistent.belnap',
        language: 'es',
        atomStyle: 'keywords',
        includeComments: true,
        validateOutput: true
      }
    );

    expect(result.ok).toBe(true);
    expect(result.stCode).toContain('!');
  });

  it('mantiene la necesidad explícita en cadenas modales largas', () => {
    const result = formalize(
      'Es necesario que si una alarma se activa, el protocolo se inicie. Es necesario que si el protocolo se inicia, el personal evacúe. Posiblemente la alarma se activa. Por lo tanto, es posible que el personal evacúe.',
      {
        profile: 'modal.k',
        language: 'es',
        atomStyle: 'keywords',
        includeComments: true,
        validateOutput: true
      }
    );

    expect(result.ok).toBe(true);
    expect(result.stCode).toContain('[]');
  });

  it('propaga operadores epistémicos explícitos en cadenas largas', () => {
    const result = formalize(
      'Se sabe que la muestra contiene hierro. Si la muestra contiene hierro, entonces reacciona al imán. Si reacciona al imán, entonces el laboratorio confirma la hipótesis. Por lo tanto, se sabe que el laboratorio puede confirmar la hipótesis.',
      {
        profile: 'epistemic.s5',
        language: 'es',
        atomStyle: 'keywords',
        includeComments: true,
        validateOutput: true
      }
    );

    expect(result.ok).toBe(true);
    expect(result.stCode).toContain('K');
  });

  it('representa siempre y eventualmente de forma explícita en casos temporales largos', () => {
    const result = formalize(
      'Siempre que el servidor reinicia, eventualmente el servicio responde. Si el servicio responde, en el siguiente ciclo se registran métricas. El servidor reinicia ahora. Por lo tanto, eventualmente se registran métricas.',
      {
        profile: 'temporal.ltl',
        language: 'es',
        atomStyle: 'keywords',
        includeComments: true,
        validateOutput: true
      }
    );

    expect(result.ok).toBe(true);
    expect(result.stCode).toContain('G(');
    expect(result.stCode).toContain('F(');
  });

  it('conserva la negación explícita en contradicciones paraconsistentes largas', () => {
    const result = formalize(
      'El paciente tiene fiebre y el paciente no tiene fiebre. Si el paciente tiene fiebre, entonces se activa la alerta. El paciente está en observación. Por lo tanto, la alerta puede activarse sin colapsar el expediente.',
      {
        profile: 'paraconsistent.belnap',
        language: 'es',
        atomStyle: 'keywords',
        includeComments: true,
        validateOutput: true
      }
    );

    expect(result.ok).toBe(true);
    expect(result.stCode).toContain('!');
  });
});
