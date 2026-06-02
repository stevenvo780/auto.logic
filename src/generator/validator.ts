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
  semanticOk: boolean;
  failingStatuses: string[];
  exitCode: number;
  timedOut: boolean;
  durationMs: number;
  errors: string[];
  resultStatuses: string[];
}

const DEFAULT_EXECUTION_TIMEOUT_MS = 4000;

/**
 * Estados de resultado de st-lang que indican que una afirmación NO se
 * sostiene lógicamente. `derive`/`prove` refutables o no demostrables, y
 * `check` inválidos/contrasatisfacibles. NO incluimos `invalid` para
 * `countermodel` porque ahí `invalid` es justamente el resultado esperado;
 * eso se discrimina en `computeSemanticOk`.
 */
const FAILING_STATUSES = new Set([
  'refutable',
  'unprovable',
  'underivable',
  'not_provable',
  'countersat',
  'falsifiable',
  'failed',
  'unsatisfiable',
]);

/**
 * Determina la validez semántica a partir de los estados de resultado.
 * Devuelve los estados "fallidos" encontrados (vacío = todo se sostiene).
 *
 * `invalid` se considera fallido SALVO que el código contenga un
 * `countermodel`/`refute`, donde `invalid` es el resultado correcto.
 *
 * `unknown` (st-lang 4.x) se considera fallido cuando el código contiene
 * un `derive`/`prove`: significa que la conclusión no es derivable de las
 * premisas. Para `check`/`countermodel` se tolera porque puede reflejar
 * incomplitud del solucionador, no una violación semántica.
 */
function computeFailingStatuses(resultStatuses: string[], code: string): string[] {
  const expectsInvalid = /\b(countermodel|refute|falsify)\b/i.test(code);
  const expectsEntailment = /\b(derive|prove)\b/i.test(code);
  return resultStatuses.filter((status) => {
    const s = status.toLowerCase();
    if (FAILING_STATUSES.has(s)) return true;
    if (s === 'invalid' && !expectsInvalid) return true;
    if (s === 'unknown' && expectsEntailment) return true;
    return false;
  });
}

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
        semanticOk: false,
        failingStatuses: [],
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
        semanticOk: false,
        failingStatuses: [],
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
        semanticOk: false,
        failingStatuses: [],
        exitCode: child.status ?? -1,
        timedOut: false,
        durationMs,
        errors: stderr ? [stderr] : ['ST no devolvió salida estructurada'],
        resultStatuses: [],
      };
    }

    const parsed = JSON.parse(stdout) as Pick<ExecutionResult, 'ok' | 'exitCode' | 'errors' | 'resultStatuses'>;
    const failingStatuses = computeFailingStatuses(parsed.resultStatuses, code);
    return {
      ok: parsed.ok,
      semanticOk: parsed.ok && failingStatuses.length === 0,
      failingStatuses,
      exitCode: parsed.exitCode,
      timedOut: false,
      durationMs,
      errors: parsed.errors,
      resultStatuses: parsed.resultStatuses,
    };
  } catch (err) {
    return {
      ok: false,
      semanticOk: false,
      failingStatuses: [],
      exitCode: -1,
      timedOut: false,
      durationMs: Date.now() - startedAt,
      errors: [err instanceof Error ? err.message : 'Error inesperado al ejecutar ST'],
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
 *
 * Dos clases de diagnóstico:
 *  - ST_EXECUTION: error/timeout de runtime (parser/crash/timeout).
 *  - ST_SEMANTIC: la corrida terminó bien pero una derivación/prueba es
 *    refutable o no demostrable. Antes (BUG-C7) esto se perdía en silencio
 *    con `ok=true`. Se emite como `warning` para no enmascarar éxitos de
 *    runtime, pero `formalize().ok` lo refleja vía `semanticOk`.
 */
export function executionToDiagnostics(execution: ExecutionResult): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  if (!execution.ok) {
    for (const error of execution.errors) {
      diagnostics.push({
        severity: execution.timedOut ? ('warning' as const) : ('error' as const),
        message: `ST Execution (${execution.durationMs} ms${execution.timedOut ? ', timeout' : ''}): ${error}`,
        code: 'ST_EXECUTION',
      });
    }
  }

  if (execution.ok && !execution.timedOut && execution.failingStatuses.length > 0) {
    diagnostics.push({
      severity: 'warning',
      message: `ST Semántica: la formalización ejecutó sin errores de runtime pero una afirmación no se sostiene (${execution.failingStatuses.join(', ')}). La derivación es refutable o no demostrable a partir de las premisas extraídas.`,
      code: 'ST_SEMANTIC',
    });
  }

  return diagnostics;
}
