import { describe, it, expect } from 'vitest';
import { Autologic } from '../src/autologic';

describe('Limites Arquitecturales - AST y DRT (Fallos Esperados)', () => {
  const al = new Autologic();

  it('Falla al resolver "exactamente tres" combinatoriamente (Requiere AST Combinatorio)', () => {
    const r = al.formalize("Cada protocolo tiene exactamente tres supervisores.", { profile: 'classical.first_order' });
    const st = r.stCode || '';
    // Un compilador real debe instanciar 3 variables distintas y garantizar que no haya una cuarta
    expect(st).toMatch(/exists\s+[a-z0-9]+,\s*[a-z0-9]+,\s*[a-z0-9]+/);
    expect(st).toMatch(/!=\s*/); // Debe contener axiomas de no identidad (x != y)
  });

  it('Falla al parsear expresiones matemáticas incrustadas (Requiere Miniparser CFG Math)', () => {
    const r = al.formalize("Para todo x y z, si x = y + 2, entonces y = x - 2.", { profile: 'arithmetic' });
    const st = r.stCode || '';
    // Debe reconocer variables limpias, igualdad y suma, en lugar de concatenarlas como texto crudo.
    expect(st).toMatch(/Addition\s*\(/);
    expect(st).toMatch(/Subtraction\s*\(/);
    // Verificamos que el sistema base no genere átomos basura como "SiXEsIgualAYMas2"
    expect(st).not.toMatch(/interpret "si x = y \+ 2"/i);
  });

  it('Falla al referenciar contexto anafórico en lógicas modales (Requiere DRT State Stack)', () => {
    const text = "Ana aprueba el balance. Diego sabe esto. Carlos duda de lo anterior.";
    const r = al.formalize(text, { profile: 'epistemic.s5' });
    const st = r.stCode || '';
    // Diego debe saber la aserción precisa (Ana aprueba el balance)
    // Carlos debe dudar (Negación general o de Creencia) sobre que Diego lo sepa, o sobre el balance
    expect(st).toMatch(/K_Diego\s*\(\s*[A-Z_]+APRUEBA/i); // Diego sabe EL HECHO (referencia correcta)
    // No debe crear átomos sueltos para "esto" o "lo anterior"
    expect(st).not.toMatch(/interpret "Diego sabe esto."/i);
    expect(st).not.toMatch(/interpret "esto"/i);
  });

  it('Falla en agudeza modal deóntica combinada con pasiva y condicionales (Requiere POS-tagging)', () => {
    const text = "Si el sistema falla, los técnicos están obligados a reiniciar el cluster salvo que se lo prohíba el gerente.";
    const r = al.formalize(text, { profile: 'deontic.standard' });
    const st = r.stCode || '';
    // Debe haber un O() para reiniciar y un F() explícito para prohibido, enlazados.
    expect(st).toMatch(/O\s*\(/);
    expect(st).toMatch(/F\s*\(/);
    // La obligación no debe capturarse en crudo como "estan obligados a reiniciar"
    expect(st).not.toMatch(/interpret "los técnicos están obligados"/i);
  });
});
