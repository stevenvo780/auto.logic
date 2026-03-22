/**
 * ST Emitter — Genera código fuente ST válido y legible
 *
 * Produce código ST con trazabilidad, comentarios y formato estructurado.
 * Sintaxis ST: `axiom name = FORMULA`, `derive FORMULA from {labels}`
 */
import type { FormulaEntry, LogicProfile, AtomEntry, Diagnostic } from '../types';

interface EmitOptions {
  profile: LogicProfile;
  language: 'es' | 'en';
  includeComments: boolean;
  atoms: Map<string, string>;
  formulas: FormulaEntry[];
  detectedPatterns: string[];
}

/**
 * Emite código ST completo a partir de fórmulas construidas.
 */
export function emitST(options: EmitOptions): { code: string; diagnostics: Diagnostic[] } {
  const { profile, language, includeComments, atoms, formulas, detectedPatterns } = options;
  const lines: string[] = [];
  const diagnostics: Diagnostic[] = [];

  // ── Header ──────────────────────────────────
  if (includeComments) {
    lines.push('// ═══════════════════════════════════════');
    lines.push('// Formalización automática — autologic');
    lines.push(`// Perfil: ${profile}`);
    lines.push(`// Idioma: ${language}`);
    if (detectedPatterns.length > 0) {
      lines.push(`// Patrones: ${detectedPatterns.join(', ')}`);
    }
    lines.push('// ═══════════════════════════════════════');
    lines.push('');
  }

  // ── Logic declaration ───────────────────────
  lines.push(`logic ${profile}`);
  lines.push('');

  // ── Interpret declarations ──────────────────
  if (atoms.size > 0) {
    if (includeComments) {
      lines.push('// ── Proposiciones atómicas ────────────');
    }

    for (const [atomId, text] of atoms) {
      lines.push(`interpret "${text}" as ${atomId}`);
    }
    lines.push('');
  }

  // ── Formulas (axioms, derives, checks) ──────
  if (formulas.length > 0) {
    if (includeComments) {
      lines.push('// ── Estructura argumental ─────────────');
      if (detectedPatterns.length > 0) {
        lines.push(`// Patrón detectado: ${detectedPatterns.join(', ')}`);
      }
    }
    lines.push('');

    // Agrupar por tipo
    const axioms = formulas.filter(f => f.stType === 'axiom');
    const derives = formulas.filter(f => f.stType === 'derive');
    const checks = formulas.filter(f => f.stType === 'check');

    // Emitir axiomas — sintaxis ST: `axiom name = FORMULA`
    for (const axiom of axioms) {
      if (includeComments && axiom.comment) {
        lines.push(`// ${axiom.comment}`);
      }
      lines.push(`axiom ${axiom.label} = ${axiom.formula}`);
    }

    if (axioms.length > 0 && derives.length > 0) {
      lines.push('');
    }

    // Emitir derivaciones — sintaxis ST: `derive FORMULA from {labels}`
    for (const derive of derives) {
      if (includeComments && derive.comment) {
        lines.push(`// ${derive.comment}`);
      }
      // Construir la lista de axiomas/premisas para el derive
      const premiseLabels = axioms.map(a => a.label);
      if (premiseLabels.length > 0) {
        lines.push(`derive ${derive.formula} from {${premiseLabels.join(', ')}}`);
      } else {
        lines.push(`derive ${derive.formula}`);
      }
    }

    if (derives.length > 0 && checks.length > 0) {
      lines.push('');
    }

    // Emitir checks
    for (const check of checks) {
      if (includeComments && check.comment) {
        lines.push(`// ${check.comment}`);
      }
      lines.push(`check valid (${check.formula})`);
    }

    // Agregar verificación automática para condicionales
    const conditionalAxioms = axioms.filter(a => a.formula.includes('->'));
    if (conditionalAxioms.length > 0 && checks.length === 0) {
      lines.push('');
      if (includeComments) {
        lines.push('// ── Verificación ──────────────────────');
      }
      for (const ca of conditionalAxioms) {
        lines.push(`check valid (${ca.formula})`);
      }
    }
  }

  // Limpiar líneas en blanco consecutivas
  const code = cleanOutput(lines);

  // Diagnóstico si no hay fórmulas
  if (formulas.length === 0) {
    diagnostics.push({
      severity: 'warning',
      message: 'No se generaron fórmulas. El texto puede ser demasiado simple o no contener estructura lógica detectable.',
      code: 'NO_FORMULAS',
    });
  }

  return { code, diagnostics };
}

/**
 * Limpia el código de salida eliminando líneas en blanco excesivas.
 */
function cleanOutput(lines: string[]): string {
  const result: string[] = [];
  let lastWasEmpty = false;

  for (const line of lines) {
    const isEmpty = line.trim() === '';
    if (isEmpty && lastWasEmpty) continue;
    result.push(line);
    lastWasEmpty = isEmpty;
  }

  // Eliminar trailing newlines excesivos
  while (result.length > 0 && result[result.length - 1].trim() === '') {
    result.pop();
  }

  return result.join('\n') + '\n';
}
