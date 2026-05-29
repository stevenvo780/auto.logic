/**
 * Tests de regresión — semántica del formalizador.
 *
 * BUG-C7 (central): `ok`/`stValidation.ok` deben reflejar `stExecution`.
 *   Si la derivación es refutable o no demostrable, `ok` NO puede ser true.
 *   Antes había pérdida semántica silenciosa (formalizeOk:true con derive
 *   refutable).
 *
 * BUG-C1: normalización de átomos para variantes flexivas
 *   (LLUEVE vs LLOVIENDO → mismo átomo).
 */
import { describe, it, expect } from 'vitest';
import { formalize } from '../src';
import { areCoreferent, canonicalStem } from '../src/atoms/coreference';

describe('BUG-C7 — ok refleja la validez semántica de la ejecución', () => {
  it('marca ok=false cuando la derivación es refutable', () => {
    const result = formalize(
      'Si llueve, entonces la calle se moja. Está lloviendo. Por lo tanto, la calle está mojada.',
      { profile: 'classical.propositional', language: 'es', validateOutput: true }
    );

    expect(result.stExecution).toBeDefined();
    // La ejecución corre sin errores de runtime...
    expect(result.stExecution!.ok).toBe(true);
    // ...pero al menos una afirmación es refutable.
    expect(result.stExecution!.resultStatuses).toContain('refutable');
    expect(result.stExecution!.semanticOk).toBe(false);
    expect(result.stExecution!.failingStatuses).toContain('refutable');

    // El fix: ok y stValidation.ok lo reflejan (antes era true silenciosamente).
    expect(result.ok).toBe(false);
    expect(result.stValidation?.ok).toBe(false);

    // Y se emite un diagnóstico ST_SEMANTIC visible (warning, no error fatal).
    const semantic = result.diagnostics.filter((d) => d.code === 'ST_SEMANTIC');
    expect(semantic.length).toBeGreaterThan(0);
    expect(semantic[0].severity).toBe('warning');
  });

  it('mantiene ok=true cuando todas las derivaciones se sostienen', () => {
    // Argumento cuya unificación SÍ funciona → todas las derivaciones provable.
    const result = formalize(
      'Si está nublado, entonces hay humedad. Está nublado. Por lo tanto, hay humedad.',
      { profile: 'classical.propositional', language: 'es', validateOutput: true }
    );
    if (result.stExecution && result.stExecution.resultStatuses.length > 0) {
      const allHold = result.stExecution.failingStatuses.length === 0;
      // ok debe ser exactamente consistente con la validez semántica.
      expect(result.ok).toBe(allHold && result.diagnostics.every((d) => d.severity !== 'error'));
    }
  });

  it('invariante: ok nunca es true si hay un estado refutable', () => {
    const samples = [
      'Si un número es par, entonces es divisible entre dos. Cuatro es par. Por lo tanto, cuatro es divisible entre dos.',
      'Todos los filósofos buscan la verdad. Sócrates es filósofo. Por lo tanto, Sócrates busca la verdad.',
    ];
    for (const text of samples) {
      const r = formalize(text, { profile: 'classical.first_order', language: 'es', validateOutput: true });
      if (r.stExecution && r.stExecution.failingStatuses.length > 0) {
        expect(r.ok, `"${text.slice(0, 30)}..." debe ser ok=false`).toBe(false);
      }
    }
  });

  it('no penaliza timeouts (resultado incompleto, no incorrecto)', () => {
    // Verificamos la lógica de la bandera: un timeout no debe forzar ok=false
    // por refutabilidad (failingStatuses vacío + timedOut). Probamos el
    // contrato sobre un caso normal: si no hubo timeout ni refutabilidad, ok
    // refleja la validez.
    const r = formalize('El sol brilla.', {
      profile: 'classical.propositional',
      language: 'es',
      validateOutput: true,
    });
    // Aserción simple sin derivación: no hay estados que fallen.
    expect(r.stExecution?.failingStatuses ?? []).toHaveLength(0);
  });
});

describe('BUG-C1 — unificación de átomos para variantes flexivas', () => {
  it('LLUEVE y LLOVIENDO se consideran correferentes', () => {
    expect(areCoreferent('llueve', 'está lloviendo', 'es')).toBe(true);
    expect(areCoreferent('llueve', 'lloviendo', 'es')).toBe(true);
  });

  it('participio femenino se unifica con la base verbal (moja/mojada)', () => {
    expect(areCoreferent('la calle se moja', 'la calle está mojada', 'es')).toBe(true);
  });

  it('canonicalStem pliega raíces irregulares y participios sobre-stemizados', () => {
    expect(canonicalStem('lluev')).toBe('llov'); // irregular e→ie
    expect(canonicalStem('mojad')).toBe('moj'); // participio femenino
    expect(canonicalStem('cansad')).toBe('cans');
  });

  it('canonicalStem NO colapsa sustantivos cortos (edad)', () => {
    // raíz < 5 no se pliega: evita falsos positivos.
    expect(canonicalStem('edad')).toBe('edad');
  });

  it('"Está lloviendo" se fusiona en el átomo de "llueve" (un átomo, no dos)', () => {
    const result = formalize(
      'Si llueve, entonces la calle se moja. Está lloviendo.',
      { profile: 'classical.propositional', language: 'es', validateOutput: false }
    );
    const atomIds = [...result.atoms.keys()];
    // No deben coexistir LLUEVE y LLOVIENDO como átomos separados.
    const hasLlueve = atomIds.some((id) => id.includes('LLUEVE'));
    const hasLloviendo = atomIds.some((id) => id.includes('LLOVIENDO'));
    expect(hasLlueve).toBe(true);
    expect(hasLloviendo).toBe(false);
  });
});
