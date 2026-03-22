/**
 * Autologic — Clase facade con estado (para sesiones)
 *
 * Envuelve formalize() con configuración persistente y
 * permite agregar marcadores personalizados.
 */
import type {
  FormalizeOptions, FormalizationResult, AutologicConfig,
  LogicProfile, Language, MarkerDefinition, DiscourseAnalysis,
} from './types';
import { formalize } from './formalize';
import { segment } from './segmenter';
import { analyzeDiscourse, createCustomMarker } from './discourse';
import { MARKERS_ES } from './discourse/markers-es';
import { MARKERS_EN } from './discourse/markers-en';
import { validateST } from './generator/validator';

/**
 * Clase principal con estado para sesiones de formalización.
 *
 * @example
 * ```ts
 * const al = new Autologic({ language: 'es', defaultProfile: 'classical.propositional' });
 * const r1 = al.formalize("Si llueve, la calle se moja.");
 * const analysis = al.analyze("Si P entonces Q, pero no Q, luego no P.");
 * ```
 */
export class Autologic {
  private config: Required<AutologicConfig>;
  private customMarkers: MarkerDefinition[] = [];
  private history: FormalizationResult[] = [];

  constructor(config: AutologicConfig = {}) {
    this.config = {
      language: config.language || 'es',
      defaultProfile: config.defaultProfile || 'classical.propositional',
      defaultAtomStyle: config.defaultAtomStyle || 'keywords',
    };
  }

  /**
   * Formaliza texto natural a código ST.
   */
  formalize(text: string, options: FormalizeOptions = {}): FormalizationResult {
    const mergedOptions: FormalizeOptions = {
      profile: options.profile || this.config.defaultProfile,
      language: options.language || this.config.language,
      atomStyle: options.atomStyle || this.config.defaultAtomStyle,
      includeComments: options.includeComments ?? true,
      validateOutput: options.validateOutput ?? true,
      maxClauseDepth: options.maxClauseDepth ?? 3,
    };

    const result = formalize(text, mergedOptions);
    this.history.push(result);
    return result;
  }

  /**
   * Solo analiza sin generar ST. Retorna el análisis discursivo.
   */
  analyze(text: string, language?: Language): DiscourseAnalysis {
    const lang = language || this.config.language;
    const sentences = segment(text, lang);
    return analyzeDiscourse(sentences, lang);
  }

  /**
   * Valida código ST existente.
   */
  validate(stCode: string): { ok: boolean; errors: string[] } {
    return validateST(stCode);
  }

  /**
   * Agrega un marcador discursivo personalizado.
   */
  addMarker(marker: { text: string; role: MarkerDefinition['role']; language?: Language }): void {
    const lang = marker.language || this.config.language;
    const custom = createCustomMarker(marker.text, marker.role, lang);
    this.customMarkers.push(custom);

    // Agregar al diccionario correspondiente
    if (lang === 'es') {
      MARKERS_ES.push(custom);
    } else {
      MARKERS_EN.push(custom);
    }
  }

  /**
   * Obtiene el historial de formalizaciones.
   */
  getHistory(): FormalizationResult[] {
    return [...this.history];
  }

  /**
   * Limpia el historial.
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Obtiene la configuración actual.
   */
  getConfig(): Required<AutologicConfig> {
    return { ...this.config };
  }

  /**
   * Actualiza la configuración.
   */
  setConfig(config: Partial<AutologicConfig>): void {
    if (config.language) this.config.language = config.language;
    if (config.defaultProfile) this.config.defaultProfile = config.defaultProfile;
    if (config.defaultAtomStyle) this.config.defaultAtomStyle = config.defaultAtomStyle;
  }
}
