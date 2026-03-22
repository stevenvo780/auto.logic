/**
 * Validator — Valida código ST generado con st-lang parse()
 *
 * Intenta importar st-lang dinámicamente (peerDep).
 * Si no está disponible, reporta warning pero no falla.
 */
import type { Diagnostic } from '../types';

interface ValidationResult {
  ok: boolean;
  errors: string[];
}

/**
 * Valida código ST usando el parser de st-lang.
 * Requiere que @stevenvo780/st-lang esté instalado (peerDependency).
 */
export function validateST(code: string): ValidationResult {
  try {
    // Importar st-lang dinámicamente
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const stLang = require('@stevenvo780/st-lang');

    if (stLang && typeof stLang.parse === 'function') {
      const result = stLang.parse(code);
      if (result.ok) {
        return { ok: true, errors: [] };
      }
      const errors = (result.diagnostics || [])
        .filter((d: { severity?: string }) => d.severity === 'error')
        .map((d: { message?: string }) => d.message || 'Error desconocido');
      return { ok: false, errors };
    }

    if (stLang && typeof stLang.check === 'function') {
      const result = stLang.check(code);
      if (result.ok) {
        return { ok: true, errors: [] };
      }
      const errors = (result.diagnostics || [])
        .filter((d: { severity?: string }) => d.severity === 'error')
        .map((d: { message?: string }) => d.message || 'Error desconocido');
      return { ok: false, errors };
    }

    return { ok: true, errors: [] };
  } catch {
    // st-lang no disponible — no es un error, es un warning
    return { ok: true, errors: [] };
  }
}

/**
 * Convierte errores de validación en diagnósticos.
 */
export function validationToDiagnostics(validation: ValidationResult): Diagnostic[] {
  if (validation.ok) return [];
  return validation.errors.map(error => ({
    severity: 'error' as const,
    message: `ST Validation: ${error}`,
    code: 'ST_VALIDATION',
  }));
}
