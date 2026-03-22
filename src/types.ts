// ═══════════════════════════════════════════════════════════════
// Autologic — Tipos principales
// ═══════════════════════════════════════════════════════════════

/** Perfiles lógicos soportados por ST */
export type LogicProfile =
  | 'classical.propositional'
  | 'classical.first_order'
  | 'modal.k'
  | 'deontic.standard'
  | 'epistemic.s5'
  | 'intuitionistic.propositional'
  | 'temporal.ltl'
  | 'paraconsistent.belnap'
  | 'aristotelian.syllogistic'
  | 'probabilistic.basic'
  | 'arithmetic';

/** Idiomas soportados */
export type Language = 'es' | 'en';

/** Estilo de nombres para átomos */
export type AtomStyle = 'keywords' | 'letters' | 'numbered';

// ── Opciones ──────────────────────────────────────────────────

export interface FormalizeOptions {
  /** Perfil lógico a utilizar (default: 'classical.propositional') */
  profile?: LogicProfile;
  /** Idioma del texto (default: 'es') */
  language?: Language;
  /** Estilo de nombres para átomos (default: 'keywords') */
  atomStyle?: AtomStyle;
  /** Incluir comentarios en el código ST generado (default: true) */
  includeComments?: boolean;
  /** Validar con st-lang parse() (default: true) */
  validateOutput?: boolean;
  /** Profundidad máxima de subdivisión de cláusulas */
  maxClauseDepth?: number;
}

export interface AutologicConfig {
  language?: Language;
  defaultProfile?: LogicProfile;
  defaultAtomStyle?: AtomStyle;
}

// ── Resultados ────────────────────────────────────────────────

export interface FormalizationResult {
  /** true si se formalizó sin errores */
  ok: boolean;
  /** Código ST completo y válido */
  stCode: string;
  /** Análisis intermedio completo */
  analysis: DiscourseAnalysis;
  /** atomId → texto original */
  atoms: Map<string, string>;
  /** Fórmulas individuales generadas */
  formulas: FormulaEntry[];
  /** Warnings/errores/sugerencias */
  diagnostics: Diagnostic[];
  /** Resultado de validación con st-lang (si validateOutput=true) */
  stValidation?: { ok: boolean; errors: string[] };
}

// ── Segmentación ──────────────────────────────────────────────

export interface Sentence {
  /** Texto original de la oración */
  original: string;
  /** Índice de la oración en el texto */
  index: number;
  /** Cláusulas dentro de esta oración */
  clauses: Clause[];
}

export interface Clause {
  /** Texto limpio de la cláusula */
  text: string;
  /** Marcadores detectados asociados */
  markers: DetectedMarker[];
  /** Rol asignado por el analizador */
  role?: ClauseRole;
  /** Índice dentro de la oración */
  index: number;
}

/** Marcador discursivo detectado en el texto */
export interface DetectedMarker {
  /** Texto del marcador tal como aparece */
  text: string;
  /** Rol lógico que señala */
  role: MarkerRole;
  /** Posición en la cláusula original */
  position: number;
}

// ── Roles y marcadores ────────────────────────────────────────

export type MarkerRole =
  | 'condition'
  | 'consequent'
  | 'conclusion'
  | 'premise'
  | 'and'
  | 'or'
  | 'adversative'
  | 'negation'
  | 'universal'
  | 'existential'
  | 'necessity'
  | 'possibility'
  | 'biconditional'
  | 'temporal'
  | 'temporal_next'
  | 'temporal_until'
  | 'temporal_always'
  | 'temporal_eventually';

export type ClauseRole =
  | 'premise'
  | 'conclusion'
  | 'condition'
  | 'consequent'
  | 'conjunction'
  | 'disjunction'
  | 'negation'
  | 'assertion'
  | 'assumption';

/** Definición de un marcador discursivo */
export interface MarkerDefinition {
  /** Texto del marcador (lowercase) */
  text: string;
  /** Rol lógico */
  role: MarkerRole;
  /** Idioma */
  language: Language;
  /** Prioridad (mayor = más específico) */
  priority?: number;
}

// ── Análisis discursivo ───────────────────────────────────────

export interface DiscourseAnalysis {
  /** Oraciones analizadas */
  sentences: AnalyzedSentence[];
  /** Estructura argumental global */
  argumentStructure: ArgumentStructure;
  /** Patrones detectados */
  detectedPatterns: string[];
}

export interface AnalyzedSentence {
  /** Oración original */
  original: string;
  /** Cláusulas con roles asignados */
  clauses: AnalyzedClause[];
  /** Tipo de oración */
  type: SentenceType;
}

export type SentenceType =
  | 'conditional'
  | 'biconditional'
  | 'conjunction'
  | 'disjunction'
  | 'assertion'
  | 'negation'
  | 'universal'
  | 'existential'
  | 'modal'
  | 'temporal'
  | 'complex';

export interface AnalyzedClause {
  /** Texto limpio */
  text: string;
  /** Rol lógico asignado */
  role: ClauseRole;
  /** Marcadores discursivos encontrados */
  markers: DetectedMarker[];
  /** Modificadores (negación, cuantificación, etc.) */
  modifiers: ClauseModifier[];
}

export interface ClauseModifier {
  type: 'negation' | 'universal' | 'existential' | 'necessity' | 'possibility'
    | 'temporal_next' | 'temporal_until' | 'temporal_always' | 'temporal_eventually';
  /** Texto del modificador original */
  text: string;
}

export interface ArgumentStructure {
  /** Premisas identificadas */
  premises: number[];
  /** Conclusiones identificadas */
  conclusions: number[];
  /** Condiciones */
  conditions: number[];
  /** Relaciones entre oraciones */
  relations: ArgumentRelation[];
}

export interface ArgumentRelation {
  from: number;
  to: number;
  type: 'supports' | 'contradicts' | 'implies' | 'equivalent';
}

// ── Átomos ────────────────────────────────────────────────────

export interface AtomEntry {
  /** Identificador simbólico (e.g., LLUEVE, P, A1) */
  id: string;
  /** Texto natural original */
  text: string;
  /** Índice de la cláusula de origen */
  sourceClause: number;
  /** Rol de la cláusula */
  role?: ClauseRole;
  /** Para first-order: predicado extraído */
  predicate?: string;
  /** Para first-order: variables/constantes */
  terms?: string[];
  /** Huella semántica ligera para unificación */
  subject?: string;
  object?: string;
  polarity?: 'positive' | 'negative';
  relationKind?: 'copula' | 'action' | 'unknown';
  keywords?: string[];
}

// ── Fórmulas ──────────────────────────────────────────────────

export interface FormulaEntry {
  /** Fórmula en sintaxis ST */
  formula: string;
  /** Tipo de statement ST */
  stType: STStatementType;
  /** Nombre/etiqueta */
  label: string;
  /** Texto fuente */
  sourceText: string;
  /** Índice de oración fuente */
  sourceSentence: number;
  /** Comentario descriptivo */
  comment?: string;
}

export type STStatementType =
  | 'axiom'
  | 'derive'
  | 'check'
  | 'prove'
  | 'interpret'
  | 'define';

// ── Patrones argumentales ─────────────────────────────────────

export type ArgumentPattern =
  | 'modus_ponens'
  | 'modus_tollens'
  | 'hypothetical_syllogism'
  | 'disjunctive_syllogism'
  | 'constructive_dilemma'
  | 'reductio_ad_absurdum'
  | 'conditional_chain'
  | 'universal_generalization'
  | 'universal_instantiation'
  | 'simple_assertion'
  | 'conjunction_introduction'
  | 'biconditional_introduction';

// ── Diagnósticos ──────────────────────────────────────────────

export interface Diagnostic {
  /** Nivel de severidad */
  severity: 'error' | 'warning' | 'info' | 'hint';
  /** Mensaje descriptivo */
  message: string;
  /** Código del diagnóstico */
  code?: string;
  /** Índice de la oración relacionada */
  sentenceIndex?: number;
}

// ── NLP ───────────────────────────────────────────────────────

export interface Token {
  /** Texto original del token */
  text: string;
  /** Texto normalizado (lowercase, trimmed) */
  normalized: string;
  /** Stem del token */
  stem?: string;
  /** Es stopword */
  isStopword: boolean;
  /** Posición en el texto original */
  position: number;
}
