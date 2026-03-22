/**
 * Role Classifier — Asigna roles lógicos a cláusulas
 *
 * Usa marcadores discursivos y posición contextual para determinar
 * si una cláusula es premisa, conclusión, condición, etc.
 */
import type {
  Clause, ClauseRole, AnalyzedClause, ClauseModifier,
  MarkerRole, Language, AnalyzedSentence, SentenceType,
} from '../types';

/**
 * Clasifica las cláusulas de una oración segmentada, asignando roles y modificadores.
 */
export function classifyClauses(clauses: Clause[], language: Language = 'es'): AnalyzedSentence {
  const analyzed: AnalyzedClause[] = clauses.map(clause => {
    const role = inferRole(clause, clauses);
    const modifiers = extractModifiers(clause, language);

    return {
      text: clause.text,
      role,
      markers: clause.markers,
      modifiers,
    };
  });

  const type = inferSentenceType(analyzed);

  return {
    original: clauses.map(c => c.text).join(', '),
    clauses: analyzed,
    type,
  };
}

/**
 * Infiere el rol de una cláusula basándose en sus marcadores y contexto.
 */
function inferRole(clause: Clause, allClauses: Clause[]): ClauseRole {
  // Si tiene marcadores explícitos, usar el de mayor prioridad
  if (clause.markers.length > 0) {
    const primaryMarker = clause.markers.reduce((best, m) => {
      const bestDef = best;
      return bestDef ? best : m;
    });

    return markerRoleToClauseRole(primaryMarker.role);
  }

  // Sin marcadores: inferir por posición
  if (allClauses.length === 1) return 'assertion';

  // Si es la primera cláusula sin marcador, probablemente es premisa o condición
  if (clause.index === 0) return 'premise';

  // Si es la última cláusula y hay marcadores de conclusión antes, es conclusión
  if (clause.index === allClauses.length - 1) {
    const hasConclusion = allClauses.some(c =>
      c.markers.some(m =>
        m.role === 'conclusion' || m.role === 'consequent'
      )
    );
    if (hasConclusion) return 'conclusion';
  }

  // Default: assertion
  return 'assertion';
}

/**
 * Mapea roles de marcadores a roles de cláusulas.
 */
function markerRoleToClauseRole(role: MarkerRole): ClauseRole {
  switch (role) {
    case 'condition': return 'condition';
    case 'consequent': return 'consequent';
    case 'conclusion': return 'conclusion';
    case 'premise': return 'premise';
    case 'and': return 'conjunction';
    case 'or': return 'disjunction';
    case 'adversative': return 'premise'; // adversativas generalmente introducen contra-premisas
    case 'negation': return 'negation';
    case 'biconditional': return 'condition';
    default: return 'assertion';
  }
}

/**
 * Extrae modificadores lógicos de una cláusula.
 */
function extractModifiers(clause: Clause, _language: Language): ClauseModifier[] {
  const modifiers: ClauseModifier[] = [];

  for (const marker of clause.markers) {
    switch (marker.role) {
      case 'negation':
        modifiers.push({ type: 'negation', text: marker.text });
        break;
      case 'universal':
        modifiers.push({ type: 'universal', text: marker.text });
        break;
      case 'existential':
        modifiers.push({ type: 'existential', text: marker.text });
        break;
      case 'necessity':
        modifiers.push({ type: 'necessity', text: marker.text });
        break;
      case 'possibility':
        modifiers.push({ type: 'possibility', text: marker.text });
        break;
      case 'temporal_next':
        modifiers.push({ type: 'temporal_next', text: marker.text });
        break;
      case 'temporal_until':
        modifiers.push({ type: 'temporal_until', text: marker.text });
        break;
      case 'temporal_always':
        modifiers.push({ type: 'temporal_always', text: marker.text });
        break;
      case 'temporal_eventually':
        modifiers.push({ type: 'temporal_eventually', text: marker.text });
        break;
    }
  }

  return modifiers;
}

/**
 * Infiere el tipo de oración a partir de las cláusulas analizadas.
 */
function inferSentenceType(clauses: AnalyzedClause[]): SentenceType {
  const allMarkerRoles = new Set<MarkerRole>();
  for (const c of clauses) {
    for (const m of c.markers) {
      allMarkerRoles.add(m.role);
    }
  }

  if (allMarkerRoles.has('biconditional')) return 'biconditional';
  if (allMarkerRoles.has('condition') || allMarkerRoles.has('consequent')) return 'conditional';
  if (allMarkerRoles.has('necessity') || allMarkerRoles.has('possibility')) return 'modal';
  if (allMarkerRoles.has('universal') || allMarkerRoles.has('existential')) {
    return allMarkerRoles.has('universal') ? 'universal' : 'existential';
  }
  if (allMarkerRoles.has('temporal') || allMarkerRoles.has('temporal_next') ||
      allMarkerRoles.has('temporal_until') || allMarkerRoles.has('temporal_always') ||
      allMarkerRoles.has('temporal_eventually')) return 'temporal';
  if (allMarkerRoles.has('or')) return 'disjunction';
  if (allMarkerRoles.has('and')) return 'conjunction';
  if (allMarkerRoles.has('negation')) return 'negation';

  if (clauses.some(c => c.role === 'conclusion') && clauses.some(c => c.role === 'premise')) {
    return 'complex';
  }

  return 'assertion';
}
