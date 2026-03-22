/**
 * Salidas ST esperadas para validación
 */

/** Verifica que un código ST contiene las líneas esperadas (parcial) */
export function expectSTContains(code: string, expected: string[]): void {
  for (const line of expected) {
    if (!code.includes(line)) {
      throw new Error(`Código ST no contiene: "${line}"\n\nCódigo generado:\n${code}`);
    }
  }
}

/** Verifica que empieza con declaración de perfil */
export function expectSTProfile(code: string, profile: string): void {
  if (!code.includes(`logic ${profile}`)) {
    throw new Error(`Código ST no contiene "logic ${profile}"\n\nCódigo generado:\n${code}`);
  }
}

/** Verifica que tiene al menos N axiomas */
export function expectMinAxioms(code: string, min: number): void {
  const axiomCount = (code.match(/^axiom\s/gm) || []).length;
  if (axiomCount < min) {
    throw new Error(`Esperados al menos ${min} axiomas, encontrados ${axiomCount}\n\nCódigo:\n${code}`);
  }
}

/** Verifica que tiene al menos N derives */
export function expectMinDerives(code: string, min: number): void {
  const deriveCount = (code.match(/^derive\s/gm) || []).length;
  if (deriveCount < min) {
    throw new Error(`Esperados al menos ${min} derives, encontrados ${deriveCount}\n\nCódigo:\n${code}`);
  }
}

/** Verifica que tiene interprets */
export function expectHasInterprets(code: string, min: number = 1): void {
  const interpretCount = (code.match(/^interpret\s/gm) || []).length;
  if (interpretCount < min) {
    throw new Error(`Esperados al menos ${min} interprets, encontrados ${interpretCount}\n\nCódigo:\n${code}`);
  }
}
