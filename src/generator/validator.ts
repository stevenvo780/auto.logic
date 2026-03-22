/**
 * Validator — Valida código ST generado con st-lang parse()
 *
 * Intenta importar st-lang dinámicamente (peerDep).
 * Si no está disponible, reporta warning pero no falla.
 *
 * NOTE: child_process is loaded dynamically to keep this module
 *       importable in browser/webpack contexts (Next.js client bundles).
 */
import type { Diagnostic } from '../types';

interface ValidationResult {
  ok: boolean;
  errors: string[];
}

interface ExecutionResult {
  ok: boolean;
  exitCode: number;
  timedOut: boolean;
  durationMs: number;
  errors: string[];
  resultStatuses: string[];
}

const DEFAULT_EXECUTION_TIMEOUT_MS = 4000;

function getExecutionTimeoutMs(): number {
  const raw = process.env.AUTOLOGIC_ST_EXEC_TIMEOUT_MS;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_EXECUTION_TIMEOUT_MS;
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
 * Ejecuta código ST para detectar errores reales de parser/runtime.
 * Si st-lang no está disponible, no bloquea la formalización.
 */
export function executeST(code: string): ExecutionResult {
  const startedAt = Date.now();
  try {
    // Dynamic require to avoid breaking browser/webpack bundles
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cp = require('child_process');
    const spawnSync: typeof import('child_process').spawnSync = cp.spawnSync;

    const runner = String.raw`
const fs = require('node:fs');
const input = fs.readFileSync(0, 'utf8');
const stLang = require('@stevenvo780/st-lang');
const result = stLang.evaluate(input);
const diagnostics = Array.isArray(result?.diagnostics) ? result.diagnostics : [];
const stderr = typeof result?.stderr === 'string' ? result.stderr.trim() : '';
const errors = diagnostics
  .filter((d) => d?.severity === 'error')
  .map((d) => d?.message || 'Error desconocido');
if (stderr) errors.push(stderr);
process.stdout.write(JSON.stringify({
  ok: result?.exitCode === 0,
  exitCode: typeof result?.exitCode === 'number' ? result.exitCode : 0,
  errors: Array.from(new Set(errors)).filter((error) => typeof error === 'string' && error.length > 0),
  resultStatuses: Array.isArray(result?.results)
    ? result.results.map((entry) => entry?.status || 'unknown')
    : [],
}));`;

    const child = spawnSync(process.execPath, ['-e', runner], {
      input: code,
      encoding: 'utf8',
      timeout: getExecutionTimeoutMs(),
      maxBuffer: 1024 * 1024,
      env: process.env,
      cwd: process.cwd(),
    });

    const durationMs = Date.now() - startedAt;

    if (child.error && 'code' in child.error && child.error.code === 'ETIMEDOUT') {
      return {
        ok: false,
        exitCode: -1,
        timedOut: true,
        durationMs,
        errors: [`Tiempo de ejecución ST excedido (${getExecutionTimeoutMs()} ms)`],
        resultStatuses: [],
      };
    }

    if (child.error) {
      return {
        ok: false,
        exitCode: -1,
        timedOut: false,
        durationMs,
        errors: [child.error.message],
        resultStatuses: [],
      };
    }

    const stdout = (child.stdout || '').trim();
    if (!stdout) {
      const stderr = (child.stderr || '').trim();
      return {
        ok: false,
        exitCode: child.status ?? -1,
        timedOut: false,
        durationMs,
        errors: stderr ? [stderr] : ['ST no devolvió salida estructurada'],
        resultStatuses: [],
      };
    }

    const parsed = JSON.parse(stdout) as Omit<ExecutionResult, 'timedOut' | 'durationMs'>;
    return {
      ok: parsed.ok,
      exitCode: parsed.exitCode,
      timedOut: false,
      durationMs,
      errors: parsed.errors,
      resultStatuses: parsed.resultStatuses,
    };
  } catch {
    return {
      ok: true,
      exitCode: 0,
      timedOut: false,
      durationMs: Date.now() - startedAt,
      errors: [],
      resultStatuses: [],
    };
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

/**
 * Convierte errores de ejecución en diagnósticos.
 */
export function executionToDiagnostics(execution: ExecutionResult): Diagnostic[] {
  if (execution.ok) return [];
  return execution.errors.map(error => ({
    severity: execution.timedOut ? ('warning' as const) : ('error' as const),
    message: `ST Execution (${execution.durationMs} ms${execution.timedOut ? ', timeout' : ''}): ${error}`,
    code: 'ST_EXECUTION',
  }));
}
