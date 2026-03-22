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

  // Post-procesamiento: si hay condición sin consecuente, la cláusula sin marcador es consecuente
  const hasCondition = analyzed.some(c => c.role === 'condition');
  const hasConsequent = analyzed.some(c => c.role === 'consequent' || c.role === 'conclusion');
  if (hasCondition && !hasConsequent) {
    const assertionClauses = analyzed.filter(c => c.role === 'assertion');
    if (assertionClauses.length > 0) {
      // La última assertion después de la condición se convierte en consequent
      const lastAssertion = assertionClauses[assertionClauses.length - 1];
      lastAssertion.role = 'consequent';
    }
  }

  // Post-procesamiento: si hay premisa (dado que/puesto que) sin conclusión,
  // la cláusula sin marcador después de la premisa es conclusión implícita
  const hasPremise = analyzed.some(c => c.role === 'premise');
  const hasConclusion = analyzed.some(c => c.role === 'conclusion');
  if (hasPremise && !hasConclusion && !hasCondition) {
    const nonPremiseClauses = analyzed.filter(c => 
      c.role === 'assertion' || c.role === 'consequent'
    );
    if (nonPremiseClauses.length > 0) {
      // La última cláusula no-premisa es conclusión implícita
      nonPremiseClauses[nonPremiseClauses.length - 1].role = 'conclusion';
    }
  }

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
    // Ordenar por prioridad si disponible, o usar el primero
    const primaryMarker = clause.markers.reduce((best, current) => {
      // Si ambos son iguales, mantener el primero
      return best;
    });

    return markerRoleToClauseRole(primaryMarker.role);
  }

  // Sin marcadores: inferir por posición y contexto
  if (allClauses.length === 1) return 'assertion';

  // Si la cláusula anterior tenía un marcador de condición, esta es consecuente
  if (clause.index > 0) {
    const prevClause = allClauses[clause.index - 1];
    if (prevClause?.markers.some(m => m.role === 'condition')) {
      return 'consequent';
    }
  }

  // Si es la primera cláusula sin marcador, probablemente es premisa
  if (clause.index === 0) return 'premise';

  // Si hay cláusulas con marcador de conclusión en la oración, la sin-marcador es premisa
  const hasConclusionMarker = allClauses.some(c =>
    c.markers.some(m => m.role === 'conclusion' || m.role === 'consequent')
  );
  if (hasConclusionMarker) return 'premise';

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

  // Si hay una cláusula condition Y una consequent (por inferencia), es conditional
  const hasCondRole = clauses.some(c => c.role === 'condition');
  const hasConsRole = clauses.some(c => c.role === 'consequent');
  if (hasCondRole && hasConsRole) return 'conditional';

  // Si hay premisas Y conclusiones explícitas → complex (más específico que modal/universal)
  // Ej: "Puesto que X, necesariamente Y" → causal, no modal
  const hasPremiseRole = clauses.some(c => c.role === 'premise');
  const hasConclusionRole = clauses.some(c => c.role === 'conclusion');
  if (hasPremiseRole && hasConclusionRole) return 'complex';

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

  return 'assertion';
}
