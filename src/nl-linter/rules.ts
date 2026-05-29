import type { NLRule, NLLinterDiagnostic } from './types';

/**
 * Normaliza acentos/tildes para que las reglas no sean evadidas por la
 * ausencia de diacríticos ("la mayoria" sin tilde debe matchear igual que
 * "la mayoría"). Devuelve una cadena de la MISMA longitud que la original
 * (NFD podría descomponer en 2 code points, así que recomponemos a ASCII
 * 1:1 reemplazando sólo la vocal acentuada) para preservar los offsets
 * start/end que se reportan al editor.
 */
function stripAccents(text: string): string {
  return text
    .replace(/[áàäâã]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöôõ]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/[ÁÀÄÂÃ]/g, 'A')
    .replace(/[ÉÈËÊ]/g, 'E')
    .replace(/[ÍÌÏÎ]/g, 'I')
    .replace(/[ÓÒÖÔÕ]/g, 'O')
    .replace(/[ÚÙÜÛ]/g, 'U');
}

/**
 * Divide el texto en oraciones devolviendo el offset absoluto de cada una,
 * para poder anclar reglas por oración sin perder las posiciones globales.
 */
function splitSentencesWithOffset(text: string): { sentence: string; offset: number }[] {
  const out: { sentence: string; offset: number }[] = [];
  const regex = /[^.!?¡¿]+[.!?]*/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match[0].trim().length === 0) continue;
    out.push({ sentence: match[0], offset: match.index });
  }
  if (out.length === 0 && text.trim().length > 0) {
    out.push({ sentence: text, offset: 0 });
  }
  return out;
}

// 1. Ambigüedad Anafórica
export const anaphoricRule: NLRule = {
  id: 'nl-anaphoric-ambiguity',
  name: 'Ambigüedad Anafórica',
  severity: 'warning',
  evaluate: (text) => {
    const diags: NLLinterDiagnostic[] = [];
    const normalized = stripAccents(text);
    // Pronombres/determinantes anafóricos. "su/sus/suyo/suya/..." pueden ser
    // posesivos matemáticos legítimos ("su derivada", "su límite"), por eso se
    // tratan con una lista de excepciones de dominio para reducir falsos
    // positivos.
    const regex = /\b(este|ese|aquel|esto|eso|aquello|el cual|los cuales|lo anterior|sus|suyo|suya|suyos|suyas|su)\b/gi;
    // Palabras que tras un posesivo indican uso técnico/matemático, no anáfora
    // discursiva ambigua.
    const MATH_NOUNS = new Set([
      'derivada', 'derivadas', 'integral', 'integrales', 'limite', 'limites',
      'valor', 'valores', 'magnitud', 'modulo', 'norma', 'inversa', 'transpuesta',
      'dominio', 'rango', 'imagen', 'grafica', 'pendiente', 'area', 'volumen',
      'longitud', 'medida', 'cardinalidad', 'complemento', 'union', 'interseccion',
      'frontera', 'cierre', 'interior', 'gradiente', 'divergencia', 'rotacional',
    ]);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const token = match[1].toLowerCase();
      const isPossessive = /^(su|sus|suyo|suya|suyos|suyas)$/.test(token);
      if (isPossessive) {
        // Mirar la siguiente palabra (sobre el texto sin tildes) para detectar
        // uso matemático y omitir el aviso en ese caso.
        const after = normalized.slice(match.index + match[0].length).match(/^\s+([\p{L}]+)/u);
        const nextWord = after ? after[1].toLowerCase() : '';
        if (nextWord && MATH_NOUNS.has(nextWord)) {
          continue;
        }
      }
      diags.push({
        id: 'nl-anaphoric-ambiguity',
        severity: 'warning',
        message: `El pronombre anafórico '${match[1]}' puede confundir al modelo o diluir la abstracción. Si es posible, usa el sujeto explícito.`,
        start: match.index,
        end: match.index + match[0].length
      });
    }
    return diags;
  }
};

// 2. Densidad Cognitiva (Oraciones extremadamente largas)
export const cognitiveDensityRule: NLRule = {
  id: 'nl-cognitive-density',
  name: 'Densidad Cognitiva Alta',
  severity: 'warning',
  evaluate: (text) => {
    const diags: NLLinterDiagnostic[] = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    let currentOffset = 0;

    for (const sentence of sentences) {
      const wordCount = sentence.split(/\s+/).filter(w => w.length > 0).length;
      if (wordCount > 40) {
        const startIndex = text.indexOf(sentence, currentOffset);
        diags.push({
          id: 'nl-cognitive-density',
          severity: 'warning',
          message: `Oración muy larga (${wordCount} palabras). El contexto semántico formal pierde precisión en oraciones kilométricas sin puntuación. Divídela.`,
          start: startIndex >= 0 ? startIndex : currentOffset,
          end: startIndex >= 0 ? startIndex + sentence.length : currentOffset + sentence.length
        });
      }
      currentOffset += sentence.length;
    }
    return diags;
  }
};

// 3. Cuantificación difusa
export const fuzzyQuantifiersRule: NLRule = {
  id: 'nl-fuzzy-quantifier',
  name: 'Cuantificador Difuso',
  severity: 'error',
  evaluate: (text) => {
    const diags: NLLinterDiagnostic[] = [];
    const normalized = stripAccents(text);
    // Lista ampliada de términos difusos. El orden importa: las variantes
    // multi-palabra deben ir antes que las de una palabra para que la
    // alternancia regex capture el match más largo.
    const regex = /\b(la mayoria de|la mayor parte de|gran parte de|buena parte de|por lo general|por regla general|en general|a menudo|de vez en cuando|en ocasiones|las mas de las veces|muchas veces|pocas veces|rara vez|raras veces|casi siempre|casi nunca|a veces|usualmente|habitualmente|generalmente|normalmente|comunmente|frecuentemente|ocasionalmente|esporadicamente|tipicamente|mayormente|probablemente|posiblemente|quizas|tal vez|acaso|suele|suelen|tiende a|tienden a|la mayoria|casi todos|casi todas)\b/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(normalized)) !== null) {
      diags.push({
        id: 'nl-fuzzy-quantifier',
        severity: 'error',
        // Reportamos el texto ORIGINAL (con tildes) usando los offsets, no la
        // versión normalizada.
        message: `Término difuso '${text.slice(match.index, match.index + match[0].length)}'. La lógica proposicional exacta requiere condicionales definidos o cuantificadores absolutos (todos, ninguno).`,
        start: match.index,
        end: match.index + match[0].length
      });
    }
    return diags;
  }
};

// 4. Completitud lógica (ausencia de conectores de inferencia en textos argumentativos)
export const logicalCompletenessRule: NLRule = {
  id: 'nl-missing-relations',
  name: 'Falta de Relaciones Estructurales',
  severity: 'warning',
  evaluate: (text) => {
    const diags: NLLinterDiagnostic[] = [];
    const normalized = stripAccents(text);
    const hasConclusion = /\b(por lo tanto|en consecuencia|ergo|luego|se concluye|por ende)\b/i.test(normalized);
    // La implicación 'si ... entonces' debe anclarse POR ORACIÓN: con un
    // .* greedy sobre todo el texto, un "si" en la oración A y un "entonces"
    // en la oración D darían un falso positivo de condicional. Comprobamos
    // que ambos marcadores aparezcan dentro de la misma oración.
    const hasImplication =
      /\b(solo si|sólo si|siempre que)\b/i.test(normalized) ||
      splitSentencesWithOffset(normalized).some((s) =>
        /\bsi\b[^.!?¡¿]*\bentonces\b/i.test(s.sentence)
      );

    if (!hasConclusion && !hasImplication && text.length > 60) {
       diags.push({
         id: 'nl-missing-relations',
         severity: 'warning',
         message: 'El texto carece de conectores lógicos evidentes (ej. "si... entonces", "por lo tanto"). ¿Deseas evaluarlo solo como premisas aisladas?',
         start: 0,
         end: Math.min(text.length, 60)
       });
    }
    return diags;
  }
};
