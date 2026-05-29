/**
 * Tests de regresión — NL Linter (src/nl-linter/rules.ts)
 *
 * Cubre los 4 fixes:
 *  1. Implicación 'si...entonces' anclada por oración (no greedy cross-oración).
 *  2. Lista ampliada de cuantificadores difusos (incl. "a menudo").
 *  3. Normalización de tildes antes de matchear (evasión "la mayoria").
 *  4. Regla anafórica afinada (menos falso positivo en "su derivada",
 *     más cobertura: esto/eso/aquello/sus/suyo).
 */
import { describe, it, expect } from 'vitest';
import { lintNaturalLanguage } from '../src/nl-linter';

const byId = (text: string, id: string) =>
  lintNaturalLanguage(text).filter((d) => d.id === id);

describe('NL Linter — implicación si...entonces anclada por oración', () => {
  it('NO marca implicación cuando "si" y "entonces" están en oraciones distintas', () => {
    // 'si' en la primera oración, 'entonces' en otra: antes el .* greedy
    // los unía y daba un falso negativo (no avisaba de premisas aisladas).
    const text =
      'Si esto pasa. Algo intermedio ocurre. Entonces aquello sucede y este texto es suficientemente largo.';
    const missing = byId(text, 'nl-missing-relations');
    expect(missing).toHaveLength(1);
  });

  it('SÍ reconoce la implicación cuando "si...entonces" están en la misma oración', () => {
    const text =
      'Si llueve entonces la calle se moja y agregamos texto extra para superar el umbral de longitud.';
    const missing = byId(text, 'nl-missing-relations');
    expect(missing).toHaveLength(0);
  });

  it('reconoce "solo si" / "siempre que" como implicación', () => {
    expect(
      byId('Apruebas el examen solo si estudias mucho durante todo el semestre completo.', 'nl-missing-relations')
    ).toHaveLength(0);
  });
});

describe('NL Linter — cuantificadores difusos ampliados', () => {
  const cases = [
    'A menudo sucede.',
    'De vez en cuando ocurre.',
    'Por lo general pasa.',
    'Usualmente funciona.',
    'Generalmente es así.',
    'Rara vez falla.',
    'Casi siempre acierta.',
    'Tiende a fallar.',
    'Suele ocurrir.',
    'Mayormente es cierto.',
  ];

  for (const c of cases) {
    it(`marca término difuso en "${c}"`, () => {
      expect(byId(c, 'nl-fuzzy-quantifier').length).toBeGreaterThan(0);
    });
  }

  it('mantiene los términos originales (frecuentemente, a veces, casi nunca)', () => {
    expect(byId('Frecuentemente llueve.', 'nl-fuzzy-quantifier').length).toBeGreaterThan(0);
    expect(byId('A veces llueve.', 'nl-fuzzy-quantifier').length).toBeGreaterThan(0);
    expect(byId('Casi nunca llueve.', 'nl-fuzzy-quantifier').length).toBeGreaterThan(0);
  });
});

describe('NL Linter — normalización de tildes', () => {
  it('detecta "la mayoria" sin tilde igual que con tilde', () => {
    const sin = byId('La mayoria de los casos fallan en produccion.', 'nl-fuzzy-quantifier');
    const con = byId('La mayoría de los casos fallan en producción.', 'nl-fuzzy-quantifier');
    expect(sin.length).toBeGreaterThan(0);
    expect(con.length).toBeGreaterThan(0);
  });

  it('preserva offsets sobre el texto ORIGINAL (con tilde)', () => {
    const text = 'La mayoría de los casos fallan.';
    const [diag] = byId(text, 'nl-fuzzy-quantifier');
    expect(diag).toBeDefined();
    // El slice de offsets sobre el texto original debe reproducir el término
    // tal como aparece (con tilde), no la versión normalizada.
    expect(text.slice(diag.start, diag.end)).toBe('La mayoría de');
  });

  it('detecta "quizas" / "tal vez" sin tilde', () => {
    expect(byId('Quizas funcione.', 'nl-fuzzy-quantifier').length).toBeGreaterThan(0);
    expect(byId('Tal vez funcione.', 'nl-fuzzy-quantifier').length).toBeGreaterThan(0);
  });
});

describe('NL Linter — regla anafórica afinada', () => {
  it('NO marca posesivo en uso matemático ("su derivada")', () => {
    expect(byId('Calculamos su derivada y su integral.', 'nl-anaphoric-ambiguity')).toHaveLength(0);
  });

  it('SÍ marca posesivo en uso discursivo ("su casa")', () => {
    expect(byId('Fue a su casa.', 'nl-anaphoric-ambiguity').length).toBeGreaterThan(0);
  });

  it('cubre esto/eso/aquello además de este/ese/aquel', () => {
    expect(byId('Esto es relevante.', 'nl-anaphoric-ambiguity').length).toBe(1);
    expect(byId('Eso importa.', 'nl-anaphoric-ambiguity').length).toBe(1);
    expect(byId('Aquello cambió.', 'nl-anaphoric-ambiguity').length).toBe(1);
  });

  it('cubre sus/suyo/suya', () => {
    expect(byId('Tomaron sus pertenencias.', 'nl-anaphoric-ambiguity').length).toBeGreaterThan(0);
    expect(byId('Ese libro es suyo.', 'nl-anaphoric-ambiguity').length).toBeGreaterThan(0);
  });
});
