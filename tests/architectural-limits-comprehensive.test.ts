import { describe, it, expect } from 'vitest';
import { Autologic } from '../src/autologic';

describe('Auditoría Integral de Arquitectura Autologic - Límites por Familia Lógica', () => {
  const al = new Autologic();

  it('1. Lógica Aristotélica: Falla en sub-categorización estricta por culpa de regex asumiendo Lógica de Primer Orden pura', () => {
    const r = al.formalize("Ningún mamífero es un animal que pone huevos, excepto el ornitorrinco que sí lo hace.", { profile: 'aristotelian' as any });
    const st = r.stCode || '';
    // Autologic debería generar categorización silogística: No S es P, etc. o First-Order encadenada negada estricta
    expect(st).not.toMatch(/interpret "ningun mamifero es un animal"/i);
    expect(st).toMatch(/forall|No /); 
  });

  it('2. Lógica Clásica (FOL Avanzada): Cobardía combinatoria con cuantificadores exactos y anidamiento', () => {
    const text = "Solo los administradores que también son fundadores pueden borrar exactamente dos tablas anidadas.";
    const r = al.formalize(text, { profile: 'classical.first_order' });
    const st = r.stCode || '';
    // Debe haber un exists con x, y, distinción de variables (x != y), y limitación universal de z
    expect(st).toMatch(/exists\s+[a-z0-9]+,\s*[a-z0-9]+/);
    expect(st).toMatch(/!=\s*/);
    expect(st).not.toMatch(/ExactamenteDosTablas/i);
  });

  it('3. Lógica Aritmética: NLP destruye las puras ecuaciones', () => {
    const text = "Si al cuadrado de X le sumas la variable Y, el resultado será siempre menor a 100.";
    const r = al.formalize(text, { profile: 'arithmetic' });
    const st = r.stCode || '';
    // Debe aislar la matemática para el motor ST
    expect(st).toMatch(/Addition/i);
    expect(st).toMatch(/<\s*100/);
    expect(st).not.toMatch(/CuadradoDeX/i);
  });

  it('4. Lógica Deóntica (CTD - Contrary to Duty Paradoxes): Colapso normativo en imperativos pasivos y enlazados', () => {
    const text = "Debes compilar el código. Pero si no logras compilarlo, entonces estás obligado a reportar el fallo al líder técnico.";
    const r = al.formalize(text, { profile: 'deontic.standard' });
    const st = r.stCode || '';
    // Debería generar: O(compilar) & (~compilar -> O(reportar))
    expect(st).toMatch(/O\s*\(/);
    expect(st).toMatch(/->\s*O\s*\(/);
    expect(st).not.toMatch(/EstasObligadoAReportar/i);
  });

  it('5. Lógica Epistémica (Anidación Multi-agente y DRT Anafórico): Pérdida de punteros', () => {
    const text = "El servidor principal colapsó. El administrador sabe esto. Sin embargo, el CEO cree que el administrador lo ignora.";
    const r = al.formalize(text, { profile: 'epistemic.s5' });
    const st = r.stCode || '';
    // Creencia anidada: B_CEO( ~K_Admin( Colapso ) ) // o B_CEO( K_Admin( ~Colapso ) ) dependiendo de matiz
    // El key es anidamiento de B( K() ) y resolución de "esto", "lo".
    expect(st).toMatch(/B_[A-Za-z0-9_]+\s*\(\s*\(\s*(!|~|-|not\s*)?K_[A-Za-z0-9_]+\s*\(/i);
    expect(st).not.toMatch(/SabeEsto/i);
    expect(st).not.toMatch(/ElAdministradorLoIgnora/i);
  });

  it('6. Lógica Temporal (LTL): Incapacidad de aislar operadores de tiempo (Until, Always, Eventually)', () => {
    const text = "La alarma sonará eventualmente, y desde entonces se mantendrá activa hasta que un técnico ingrese el pin.";
    const r = al.formalize(text, { profile: 'temporal' as any });
    const st = r.stCode || '';
    // Debe mapear a: Eventually(Alarma) & Always(Alarma Until Pin) -- o sintaxis G, F, U.
    expect(st).toMatch(/Eventually| F | Until | U /i);
    expect(st).not.toMatch(/SeMandraActiva/i);
  });

  it('7. Lógica Modal (Alethica): Desconocimiento de Necesidad vs Contingencia sobre el dominio', () => {
    const text = "Es lógicamente necesario que el binario exista si el build pasó, pero es contingente que los logs se guarden.";
    const r = al.formalize(text, { profile: 'modal' as any });
    const st = r.stCode || '';
    // Debe separar la necesidad lógica [] de la contingencia (Posible ^ Posible Not) <>P & <>~P
    expect(st).toMatch(/box\s*\(|nec\s*\(/i);
    expect(st).toMatch(/dia\s*\(|pos\s*\(/i);
    expect(st).not.toMatch(/EsLogicamenteNecesario/i);
  });

  it('8. Lógica Paraconsistente: Destrucción de la contradicción explícita por limpieza de AST clásica', () => {
    const text = "El paquete de red fue recibido y, de alguna manera inexplicable en el log, no fue recibido al mismo tiempo.";
    const r = al.formalize(text, { profile: 'paraconsistent' as any });
    const st = r.stCode || '';
    // La formalización debe retener la contradicción P & ~P sin explotar el tokenizer de sinónimos
    expect(st).toMatch(/(\w+)\(\)\s*(&|and|y)\s*(!|~|-|not\s*)\1\(\)/);
  });

  it('9. Lógica Probabilística: Falla al parsear el árbol lingüístico de confianza (Degrees of belief)', () => {
    const text = "Existe exactamente un 75.5% de probabilidad de que el disco primario sufra una falla mecánica antes de mañana.";
    const r = al.formalize(text, { profile: 'probabilistic' as any });
    const st = r.stCode || '';
    // Requiere un mapeo a operadores Pr(P) = 0.755
    expect(st).toMatch(/Pr\s*\(.*?\)\s*=\s*0\.755/i);
    expect(st).not.toMatch(/Un75Punto5/i);
  });

  it('10. Lógica Intuicionista (Constructiva): Simplificación peligrosa de dobles negaciones lingüísticas', () => {
    const text = "No es cierto que no tengamos soluciones disponibles en el repertorio.";
    const r = al.formalize(text, { profile: 'intuitionistic' as any });
    const st = r.stCode || '';
    // En intuicionismo ~ ~ P =/= P. El autoloigic tokenizer probablemente simplifique a "TenemosSoluciones" de manera ingenua si tiene una regla tonta
    expect(st).toMatch(/(!|~|-|not\s*)\s*\(?\s*(!|~|-|not\s*)/); 
  });
});
