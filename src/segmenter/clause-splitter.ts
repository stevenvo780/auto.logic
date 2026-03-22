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
    'temporal_next', 'temporal_always', 'temporal_eventually',
  ]);
  const splittingMatches = allMatches.filter(m => {
    return !NON_SPLITTING_ROLES.has(m.marker.role);
  });

  if (splittingMatches.length === 0) {
    const coordinatedClauses = splitBySimpleCoordinators(sentence, allMatches);
    if (coordinatedClauses.length > 1) {
      return normalizeClauses(coordinatedClauses);
    }

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
    return normalizeClauses(commaClauses);
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

  return normalizeClauses(mergeLeadingModifierClauses(clauses));
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

  // Post-paso: subdividir cláusulas de condición y cláusulas largas con comas
  // (e.g. "llueve, la calle se moja" → "llueve" + "la calle se moja")
  return postSplitCommaRichClauses(postSplitConditionalClauses(clauses));
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

function postSplitCommaRichClauses(clauses: Clause[]): Clause[] {
  const result: Clause[] = [];
  let reindex = 0;

  for (const clause of clauses) {
    const commaParts = clause.text.split(',').map(part => cleanClauseText(part)).filter(Boolean);

    if (commaParts.length <= 1 || !shouldSplitCommaParts(commaParts)) {
      result.push({
        ...clause,
        index: reindex++,
      });
      continue;
    }

    commaParts.forEach((part, partIndex) => {
      result.push({
        text: part,
        markers: partIndex === 0 ? clause.markers : [],
        index: reindex++,
      });
    });
  }

  return result;
}

function shouldSplitCommaParts(parts: string[]): boolean {
  return parts.every(part => looksClauseLike(stripClauseLead(part)));
}

function stripClauseLead(text: string): string {
  return cleanClauseText(text).replace(/^(?:y|o|pero|aunque|además|también|no solo|sino que|ni que|sí)\s+/iu, '');
}

function mergeLeadingModifierClauses(clauses: Clause[]): Clause[] {
  if (clauses.length < 2) return clauses;

  const unaryRoles: Set<MarkerRole> = new Set([
    'negation',
    'universal',
    'existential',
    'necessity',
    'possibility',
    'temporal_next',
    'temporal_always',
    'temporal_eventually'
  ]);

  const [first, second, ...rest] = clauses;
  const isUnaryLead =
    first.markers.length > 0 &&
    first.markers.every((marker) => unaryRoles.has(marker.role)) &&
    first.text.split(/\s+/).filter(Boolean).length <= 4;

  if (!isUnaryLead) return clauses;

  const mergedSecond: Clause = {
    ...second,
    markers: [...first.markers, ...second.markers],
  };

  return [mergedSecond, ...rest].map((clause, index) => ({
    ...clause,
    index,
  }));
}

function normalizeClauses(clauses: Clause[]): Clause[] {
  if (clauses.length === 0) return clauses;

  const cleaned: Clause[] = [];

  for (const clause of clauses) {
    const normalizedText = cleanClauseText(clause.text);
    if (!normalizedText && clause.markers.length === 0) {
      continue;
    }

    cleaned.push({
      ...clause,
      text: normalizedText,
    });
  }

  const merged: Clause[] = [];

  for (let index = 0; index < cleaned.length; index++) {
    const current = cleaned[index];
    const next = cleaned[index + 1];

    if (!current) continue;

    if (!current.text && current.markers.length > 0 && next) {
      next.markers = [...current.markers, ...next.markers];
      continue;
    }

    const currentLooksLikeClause = looksClauseLike(current.text);
    const nextHasLowConnector = Boolean(next?.markers.some(marker =>
      marker.role === 'and' || marker.role === 'or' || marker.role === 'adversative'
    ));

    if (!currentLooksLikeClause && next && current.markers.length === 0) {
      const connectorMarkers = next.markers.filter(marker =>
        marker.role === 'and' || marker.role === 'or' || marker.role === 'adversative'
      );
      const connector = connectorMarkers[0]?.text ?? '';

      next.text = cleanClauseText(
        `${current.text}${connector ? ` ${connector}` : ''} ${next.text}`
      );

      if (nextHasLowConnector) {
        next.markers = next.markers.filter(marker =>
          marker.role !== 'and' && marker.role !== 'or' && marker.role !== 'adversative'
        );
      }

      next.markers = [...current.markers, ...next.markers];
      continue;
    }

    merged.push(current);
  }

  return merged.map((clause, index) => ({
    ...clause,
    text: cleanClauseText(clause.text),
    index,
  }));
}

function looksClauseLike(text: string): boolean {
  const tokens = text
    .toLowerCase()
    .split(/\s+/)
    .map(token => token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter(Boolean);

  if (tokens.length < 2) return false;

  return tokens.some(token => isVerbLikeToken(token));
}

function isVerbLikeToken(token: string): boolean {
  const commonVerbs = new Set([
    'es', 'son', 'era', 'eran', 'fue', 'fueron', 'sea', 'sean',
    'está', 'están', 'estaba', 'estaban', 'esté', 'estén',
    'hay', 'ha', 'han', 'había', 'habían', 'hubo', 'hubieron',
    'tiene', 'tienen',
    'sabe', 'saben', 'sabemos', 'conoce', 'conocen', 'ignora', 'ignoran',
    'debe', 'deben', 'puede', 'pueden', 'paga', 'pagó', 'pagan',
    'recibe', 'reciben', 'puede', 'pueden', 'entra', 'entran',
    'vuelve', 'vuelven', 'pasa', 'pasan', 'detecta', 'detectan',
    'registra', 'registra', 'permanece', 'permanece', 'comienza', 'continúa',
    'termina', 'ocurre', 'completa', 'conserva', 'invalide', 'dirigirse',
    'leer', 'leído', 'oyen', 'observan', 'queda', 'establecida',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'will', 'would',
    'have', 'has', 'had', 'do', 'does', 'did', 'can', 'could', 'may', 'might', 'must',
    'study', 'studies', 'continue', 'continues', 'pass', 'passes', 'passing',
    'rain', 'rains', 'grow', 'grows', 'increase', 'increases', 'rise', 'rises',
    'prosper', 'prospers', 'improve', 'improves', 'find', 'finds', 'protect', 'protects',
    'obey', 'obeys', 'activate', 'activates', 'respond', 'responds', 'register', 'registers'
  ]);

  if (commonVerbs.has(token)) return true;

  if (token.length <= 3) return false;

  return /(?:ar|er|ir|ado|ido|ando|iendo|aba|aban|ía|ían|ará|erá|irá|ría|rían|aste|iste|aron|ieron|ado|ido|ando|iendo)$/u.test(token);
}

/**
 * Divide por comas cuando no hay marcadores discursivos.
 */
function splitByCommas(sentence: string): Clause[] {
  // Solo dividir si la coma separa cláusulas sustantivas (al menos 3 palabras a cada lado)
  const parts = sentence.split(',').map(s => s.trim()).filter(s => s.length > 0);

  if (parts.length <= 1 || parts.some(p => !looksClauseLike(p))) {
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

function splitBySimpleCoordinators(sentence: string, allMatches: MarkerMatch[]): Clause[] {
  for (const connector of [
    { text: ' y ', role: 'and' as const },
    { text: ' o ', role: 'or' as const },
  ]) {
    const index = sentence.toLowerCase().indexOf(connector.text);
    if (index === -1) continue;

    const left = cleanClauseText(sentence.slice(0, index));
    const right = cleanClauseText(sentence.slice(index + connector.text.length));

    if (!left || !right) continue;
    if (!looksClauseLike(stripClauseLead(left)) || !looksClauseLike(stripClauseLead(right))) continue;

    const rightMarkers = allMatches
      .filter(match => match.startPos >= index)
      .map(match => ({
        text: match.marker.text,
        role: match.marker.role,
        position: match.startPos,
      }));

    return [
      {
        text: left,
        markers: allMatches
          .filter(match => match.startPos < index)
          .map(match => ({
            text: match.marker.text,
            role: match.marker.role,
            position: match.startPos,
          })),
        index: 0,
      },
      {
        text: right,
        markers: [
          { text: connector.text.trim(), role: connector.role, position: index },
          ...rightMarkers,
        ],
        index: 1,
      },
    ];
  }

  return [];
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
