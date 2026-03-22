/**
 * Clause Splitter — Divide oraciones en cláusulas usando marcadores discursivos.
 *
 * Estrategia:
 * 1. Detectar marcadores discursivos dentro de la oración
 * 2. Dividir por marcadores (priorizando los más largos)
 * 3. Dividir por comas que separan cláusulas sustantivas
 * 4. Asignar marcadores detectados a cada cláusula
 */
import type { Clause, DetectedMarker, Language, MarkerRole } from '../types';
import { MARKERS_ES } from '../discourse/markers-es';
import { MARKERS_EN } from '../discourse/markers-en';
import type { MarkerDefinition } from '../types';

interface MarkerMatch {
  marker: MarkerDefinition;
  startPos: number;
  endPos: number;
}

/**
 * Divide una oración en cláusulas basándose en marcadores discursivos.
 */
export function splitClauses(sentence: string, language: Language = 'es'): Clause[] {
  const markers = language === 'es' ? MARKERS_ES : MARKERS_EN;

  // 1. Detectar todos los marcadores en la oración
  const allMatches = findMarkers(sentence, markers);

  // 2. Separar marcadores que cortan la oración vs. que solo anotan
  //    Los marcadores de negación cortos (no, nunca, jamás, ningún/o)
  //    y cuantificadores cortos NO deben dividir la oración.
  const NON_SPLITTING_ROLES: Set<MarkerRole> = new Set([
    'negation', 'universal', 'existential', 
    'necessity', 'possibility',
  ]);
  // Excepción: marcadores largos (>= 4 palabras) SÍ pueden dividir
  const splittingMatches = allMatches.filter(m => {
    if (NON_SPLITTING_ROLES.has(m.marker.role)) {
      // Solo dividir si es un marcador largo (compuesto de múltiples palabras)
      const wordCount = m.marker.text.split(/\s+/).length;
      return wordCount >= 3; // "no es el caso que" SÍ divide, "no" NO divide
    }
    return true;
  });

  if (splittingMatches.length === 0) {
    // Sin marcadores que dividan: intentar dividir por comas significativas
    // Pero anotar los marcadores encontrados en la cláusula resultante
    const commaClauses = splitByCommas(sentence);
    // Anotar marcadores de negación/cuantificación en las cláusulas
    if (allMatches.length > 0) {
      for (const match of allMatches) {
        const clauseWithMarker = commaClauses.find(c => {
          const lower = c.text.toLowerCase();
          return lower.includes(match.marker.text);
        });
        if (clauseWithMarker) {
          clauseWithMarker.markers.push({
            text: match.marker.text,
            role: match.marker.role,
            position: match.startPos,
          });
        }
      }
    }
    return commaClauses;
  }

  // 3. Dividir la oración usando las posiciones de los marcadores que sí cortan
  const clauses = buildClauses(sentence, splittingMatches);

  // 4. Anotar marcadores no-splitting en las cláusulas resultantes
  const nonSplittingMatches = allMatches.filter(m => !splittingMatches.includes(m));
  for (const match of nonSplittingMatches) {
    const clauseWithMarker = clauses.find(c => {
      const lower = c.text.toLowerCase();
      return lower.includes(match.marker.text);
    });
    if (clauseWithMarker) {
      clauseWithMarker.markers.push({
        text: match.marker.text,
        role: match.marker.role,
        position: match.startPos,
      });
    }
  }

  return clauses;
}

/**
 * Encuentra todos los marcadores discursivos en un texto.
 * Ordena por longitud descendente para priorizar coincidencias más largas.
 */
function findMarkers(text: string, markers: MarkerDefinition[]): MarkerMatch[] {
  const lower = text.toLowerCase();
  const sorted = [...markers].sort((a, b) => b.text.length - a.text.length);
  const matches: MarkerMatch[] = [];
  const coveredRanges: [number, number][] = [];

  for (const marker of sorted) {
    let searchFrom = 0;
    while (true) {
      const idx = lower.indexOf(marker.text, searchFrom);
      if (idx === -1) break;

      const end = idx + marker.text.length;

      // Verificar que sea una palabra completa (no substring)
      const charBefore = idx > 0 ? lower[idx - 1] : ' ';
      const charAfter = end < lower.length ? lower[end] : ' ';
      const isWordBoundary = !/\p{L}/u.test(charBefore) && !/\p{L}/u.test(charAfter);

      // Verificar que no esté cubierto por un marcador más largo
      const overlaps = coveredRanges.some(([s, e]) => idx >= s && end <= e);

      if (isWordBoundary && !overlaps) {
        matches.push({ marker, startPos: idx, endPos: end });
        coveredRanges.push([idx, end]);
      }

      searchFrom = idx + 1;
    }
  }

  // Ordenar por posición
  matches.sort((a, b) => a.startPos - b.startPos);
  return matches;
}

/**
 * Construye cláusulas a partir de los marcadores detectados.
 */
function buildClauses(sentence: string, matches: MarkerMatch[]): Clause[] {
  const clauses: Clause[] = [];
  let currentStart = 0;
  let clauseIndex = 0;

  for (const match of matches) {
    // Texto antes del marcador (si hay)
    const textBefore = sentence.slice(currentStart, match.startPos).trim();

    // Calcular el inicio de la cláusula después del marcador
    const afterMarker = match.endPos;

    // Encontrar el fin de esta cláusula (siguiente marcador o fin de oración)
    const nextMatch = matches.find(m => m.startPos > match.startPos);
    const clauseEnd = nextMatch ? nextMatch.startPos : sentence.length;
    const clauseText = sentence.slice(afterMarker, clauseEnd).trim();

    // Si hay texto antes del primer marcador, es una cláusula independiente
    if (textBefore && clauseIndex === 0) {
      clauses.push({
        text: cleanClauseText(textBefore),
        markers: [],
        index: clauseIndex++,
      });
    }

    // La cláusula asociada al marcador
    if (clauseText) {
      const detectedMarker: DetectedMarker = {
        text: match.marker.text,
        role: match.marker.role,
        position: match.startPos,
      };

      // Si ya hay una cláusula previa sin texto propio, adjuntar el marcador
      clauses.push({
        text: cleanClauseText(clauseText),
        markers: [detectedMarker],
        index: clauseIndex++,
      });
    }

    currentStart = clauseEnd;
  }

  // Texto después del último marcador
  const remaining = sentence.slice(currentStart).trim();
  if (remaining && clauses.length > 0) {
    // Adjuntar al último clause si no se ha procesado
    const lastClause = clauses[clauses.length - 1];
    if (lastClause.text === '') {
      lastClause.text = cleanClauseText(remaining);
    }
  } else if (remaining) {
    clauses.push({
      text: cleanClauseText(remaining),
      markers: [],
      index: clauseIndex,
    });
  }

  // Si no se generó nada, devolver la oración completa
  if (clauses.length === 0) {
    return [{
      text: cleanClauseText(sentence),
      markers: matches.map(m => ({
        text: m.marker.text,
        role: m.marker.role,
        position: m.startPos,
      })),
      index: 0,
    }];
  }

  // Post-paso: subdividir cláusulas de condición que contienen comas
  // (e.g. "llueve, la calle se moja" → "llueve" + "la calle se moja")
  return postSplitConditionalClauses(clauses);
}

/**
 * Post-procesamiento: si una cláusula con marcador de condición contiene
 * una coma significativa, dividirla en antecedente (condición) y consecuente.
 * Ejemplo: "si" + "llueve, la calle se moja" → "llueve" (condition) + "la calle se moja" (assertion)
 */
function postSplitConditionalClauses(clauses: Clause[]): Clause[] {
  const conditionRoles: MarkerRole[] = ['condition', 'premise'];
  const result: Clause[] = [];
  let reindex = 0;

  for (const clause of clauses) {
    const hasCondMarker = clause.markers.some(m => conditionRoles.indexOf(m.role) !== -1);
    const commaIdx = clause.text.indexOf(',');

    // Solo dividir si: tiene marcador de condición, contiene coma,
    // y ambas partes tienen al menos 2 palabras
    if (hasCondMarker && commaIdx > 0) {
      const before = clause.text.slice(0, commaIdx).trim();
      const after = clause.text.slice(commaIdx + 1).trim();

      if (before.split(/\s+/).length >= 1 && after.split(/\s+/).length >= 2) {
        // Antecedente: hereda los marcadores de condición
        result.push({
          text: cleanClauseText(before),
          markers: clause.markers,
          index: reindex++,
        });
        // Consecuente: cláusula nueva sin marcador (será clasificada como assertion/consequent)
        result.push({
          text: cleanClauseText(after),
          markers: [],
          index: reindex++,
        });
        continue;
      }
    }

    clause.index = reindex++;
    result.push(clause);
  }

  return result;
}

/**
 * Divide por comas cuando no hay marcadores discursivos.
 */
function splitByCommas(sentence: string): Clause[] {
  // Solo dividir si la coma separa cláusulas sustantivas (al menos 3 palabras a cada lado)
  const parts = sentence.split(',').map(s => s.trim()).filter(s => s.length > 0);

  if (parts.length <= 1 || parts.some(p => p.split(/\s+/).length < 2)) {
    return [{
      text: cleanClauseText(sentence),
      markers: [],
      index: 0,
    }];
  }

  return parts.map((part, index) => ({
    text: cleanClauseText(part),
    markers: [],
    index,
  }));
}

/**
 * Limpia el texto de una cláusula.
 */
function cleanClauseText(text: string): string {
  return text
    .replace(/^[,;:\s]+/, '')
    .replace(/[,;:\s]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}
