/**
 * Sentence Splitter — Divide texto en oraciones por puntuación.
 *
 * Estrategia:
 * 1. Split por . ; ? ! (respetando abreviaturas comunes)
 * 2. Filtrar oraciones vacías
 * 3. Preservar texto entre comillas como unidad
 */

/** Abreviaturas comunes que NO deben cortar oraciones */
const ABBREVIATIONS = new Set([
  'dr', 'dra', 'sr', 'sra', 'srta', 'prof', 'ing',
  'lic', 'mr', 'mrs', 'ms', 'etc', 'vs', 'eg', 'ie',
  'p', 'pp', 'vol', 'ed', 'no', 'núm', 'num', 'tel',
  'art', 'cap', 'fig', 'pág', 'pag',
]);

/**
 * Divide un texto en oraciones respetando abreviaturas y comillas.
 */
export function splitSentences(text: string): string[] {
  if (!text || !text.trim()) return [];

  // Proteger texto entre comillas reemplazándolo temporalmente
  const quotes: string[] = [];
  let protected_ = text.replace(/"([^"]+)"/g, (_match, content) => {
    quotes.push(content);
    return `__QUOTE_${quotes.length - 1}__`;
  });

  // Split por puntos, punto y coma, signos de interrogación/exclamación
  const parts: string[] = [];
  let current = '';

  for (let i = 0; i < protected_.length; i++) {
    const ch = protected_[i];

    if (ch === '.' || ch === ';' || ch === '?' || ch === '!') {
      // Verificar si es una abreviatura
      if (ch === '.') {
        const wordBefore = current.trim().split(/\s+/).pop()?.toLowerCase() || '';
        if (ABBREVIATIONS.has(wordBefore)) {
          current += ch;
          continue;
        }
        // Verificar si es un decimal (e.g., 3.14)
        if (/\d$/.test(current) && i + 1 < protected_.length && /\d/.test(protected_[i + 1])) {
          current += ch;
          continue;
        }
      }

      current += ch;
      const trimmed = current.trim();
      if (trimmed) parts.push(trimmed);
      current = '';
    } else {
      current += ch;
    }
  }

  // Agregar el último fragmento si hay
  const lastTrimmed = current.trim();
  if (lastTrimmed) parts.push(lastTrimmed);

  // Restaurar comillas
  return parts.map(part => {
    return part.replace(/__QUOTE_(\d+)__/g, (_m, idx) => `"${quotes[parseInt(idx)]}"`);
  }).filter(s => s.length > 0);
}
