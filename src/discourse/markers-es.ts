/**
 * Diccionario de marcadores discursivos — Español
 * ~100 marcadores con roles lógicos asignados
 */
import type { MarkerDefinition } from '../types';

export const MARKERS_ES: MarkerDefinition[] = [
  // ── Condicionales ───────────────────────────────
  { text: 'si y solo si', role: 'biconditional', language: 'es', priority: 10 },
  { text: 'si y sólo si', role: 'biconditional', language: 'es', priority: 10 },
  { text: 'siempre y cuando', role: 'condition', language: 'es', priority: 9 },
  { text: 'en el caso de que', role: 'condition', language: 'es', priority: 9 },
  { text: 'a condición de que', role: 'condition', language: 'es', priority: 9 },
  { text: 'con tal de que', role: 'condition', language: 'es', priority: 8 },
  { text: 'siempre que', role: 'condition', language: 'es', priority: 8 },
  { text: 'en caso de que', role: 'condition', language: 'es', priority: 8 },
  { text: 'con la condición de que', role: 'condition', language: 'es', priority: 9 },
  { text: 'suponiendo que', role: 'condition', language: 'es', priority: 7 },
  { text: 'supongamos que', role: 'condition', language: 'es', priority: 7 },
  { text: 'en caso de', role: 'condition', language: 'es', priority: 7 },
  { text: 'si', role: 'condition', language: 'es', priority: 3 },

  // ── Consecuentes / Conclusiones ─────────────────
  { text: 'por consiguiente', role: 'conclusion', language: 'es', priority: 8 },
  { text: 'en consecuencia', role: 'conclusion', language: 'es', priority: 8 },
  { text: 'de lo cual se sigue', role: 'conclusion', language: 'es', priority: 9 },
  { text: 'se sigue que', role: 'conclusion', language: 'es', priority: 8 },
  { text: 'se concluye que', role: 'conclusion', language: 'es', priority: 8 },
  { text: 'por lo tanto', role: 'conclusion', language: 'es', priority: 8 },
  { text: 'por lo cual', role: 'conclusion', language: 'es', priority: 7 },
  { text: 'por ende', role: 'conclusion', language: 'es', priority: 7 },
  { text: 'de modo que', role: 'conclusion', language: 'es', priority: 7 },
  { text: 'de manera que', role: 'conclusion', language: 'es', priority: 7 },
  { text: 'de ahí que', role: 'conclusion', language: 'es', priority: 7 },
  { text: 'por eso', role: 'conclusion', language: 'es', priority: 6 },
  { text: 'por tanto', role: 'conclusion', language: 'es', priority: 7 },
  { text: 'por ello', role: 'conclusion', language: 'es', priority: 6 },
  { text: 'en conclusión', role: 'conclusion', language: 'es', priority: 8 },
  { text: 'entonces', role: 'consequent', language: 'es', priority: 5 },
  { text: 'luego', role: 'conclusion', language: 'es', priority: 5 },
  { text: 'así que', role: 'conclusion', language: 'es', priority: 6 },
  { text: 'así pues', role: 'conclusion', language: 'es', priority: 6 },

  // ── Premisas / Razones ──────────────────────────
  { text: 'dado que', role: 'premise', language: 'es', priority: 7 },
  { text: 'puesto que', role: 'premise', language: 'es', priority: 7 },
  { text: 'ya que', role: 'premise', language: 'es', priority: 6 },
  { text: 'debido a que', role: 'premise', language: 'es', priority: 7 },
  { text: 'en virtud de que', role: 'premise', language: 'es', priority: 8 },
  { text: 'considerando que', role: 'premise', language: 'es', priority: 7 },
  { text: 'teniendo en cuenta que', role: 'premise', language: 'es', priority: 8 },
  { text: 'sabiendo que', role: 'premise', language: 'es', priority: 6 },
  { text: 'visto que', role: 'premise', language: 'es', priority: 6 },
  { text: 'porque', role: 'premise', language: 'es', priority: 5 },
  { text: 'pues', role: 'premise', language: 'es', priority: 4 },

  // ── Conjunción ──────────────────────────────────
  { text: 'además de que', role: 'and', language: 'es', priority: 7 },
  { text: 'y además', role: 'and', language: 'es', priority: 6 },
  { text: 'así como', role: 'and', language: 'es', priority: 6 },
  { text: 'asimismo', role: 'and', language: 'es', priority: 6 },
  { text: 'igualmente', role: 'and', language: 'es', priority: 5 },
  { text: 'también', role: 'and', language: 'es', priority: 5 },
  { text: 'además', role: 'and', language: 'es', priority: 5 },

  // ── Disyunción ──────────────────────────────────
  { text: 'o bien', role: 'or', language: 'es', priority: 6 },
  { text: 'ya sea', role: 'or', language: 'es', priority: 6 },
  { text: 'ya sea que', role: 'or', language: 'es', priority: 7 },

  // ── Adversativas ────────────────────────────────
  { text: 'sin embargo', role: 'adversative', language: 'es', priority: 7 },
  { text: 'no obstante', role: 'adversative', language: 'es', priority: 7 },
  { text: 'a pesar de que', role: 'adversative', language: 'es', priority: 8 },
  { text: 'a pesar de', role: 'adversative', language: 'es', priority: 7 },
  { text: 'en cambio', role: 'adversative', language: 'es', priority: 6 },
  { text: 'por el contrario', role: 'adversative', language: 'es', priority: 7 },
  { text: 'con todo', role: 'adversative', language: 'es', priority: 6 },
  { text: 'pero', role: 'adversative', language: 'es', priority: 5 },
  { text: 'aunque', role: 'adversative', language: 'es', priority: 5 },
  { text: 'mas', role: 'adversative', language: 'es', priority: 4 },

  // ── Negación ────────────────────────────────────
  { text: 'no es el caso que', role: 'negation', language: 'es', priority: 9 },
  { text: 'no es cierto que', role: 'negation', language: 'es', priority: 9 },
  { text: 'no es verdad que', role: 'negation', language: 'es', priority: 9 },
  { text: 'de ninguna manera', role: 'negation', language: 'es', priority: 8 },
  { text: 'en ningún caso', role: 'negation', language: 'es', priority: 8 },
  { text: 'nunca', role: 'negation', language: 'es', priority: 5 },
  { text: 'jamás', role: 'negation', language: 'es', priority: 5 },
  { text: 'ningún', role: 'negation', language: 'es', priority: 5 },
  { text: 'ninguno', role: 'negation', language: 'es', priority: 5 },
  { text: 'no', role: 'negation', language: 'es', priority: 3 },

  // ── Cuantificadores universales ─────────────────
  { text: 'para todo', role: 'universal', language: 'es', priority: 7 },
  { text: 'todos los', role: 'universal', language: 'es', priority: 6 },
  { text: 'todas las', role: 'universal', language: 'es', priority: 6 },
  { text: 'cualquier', role: 'universal', language: 'es', priority: 5 },
  { text: 'todo', role: 'universal', language: 'es', priority: 4 },
  { text: 'todos', role: 'universal', language: 'es', priority: 4 },
  { text: 'cada', role: 'universal', language: 'es', priority: 5 },
  { text: 'siempre', role: 'universal', language: 'es', priority: 4 },

  // ── Cuantificadores existenciales ───────────────
  { text: 'existe al menos un', role: 'existential', language: 'es', priority: 8 },
  { text: 'existe al menos', role: 'existential', language: 'es', priority: 7 },
  { text: 'hay al menos', role: 'existential', language: 'es', priority: 7 },
  { text: 'existe algún', role: 'existential', language: 'es', priority: 7 },
  { text: 'algún', role: 'existential', language: 'es', priority: 5 },
  { text: 'alguno', role: 'existential', language: 'es', priority: 5 },
  { text: 'algunos', role: 'existential', language: 'es', priority: 5 },
  { text: 'existe', role: 'existential', language: 'es', priority: 4 },
  { text: 'hay', role: 'existential', language: 'es', priority: 3 },

  // ── Modal: Necesidad ────────────────────────────
  { text: 'es necesario que', role: 'necessity', language: 'es', priority: 8 },
  { text: 'necesariamente', role: 'necessity', language: 'es', priority: 7 },
  { text: 'obligatoriamente', role: 'necessity', language: 'es', priority: 7 },
  { text: 'es obligatorio', role: 'necessity', language: 'es', priority: 7 },
  { text: 'debe', role: 'necessity', language: 'es', priority: 4 },
  { text: 'deben', role: 'necessity', language: 'es', priority: 4 },

  // ── Modal: Posibilidad ──────────────────────────
  { text: 'es posible que', role: 'possibility', language: 'es', priority: 8 },
  { text: 'posiblemente', role: 'possibility', language: 'es', priority: 7 },
  { text: 'está permitido', role: 'possibility', language: 'es', priority: 7 },
  { text: 'puede que', role: 'possibility', language: 'es', priority: 6 },
  { text: 'quizás', role: 'possibility', language: 'es', priority: 5 },
  { text: 'tal vez', role: 'possibility', language: 'es', priority: 5 },
  { text: 'puede', role: 'possibility', language: 'es', priority: 3 },

  // ── Bicondicional ───────────────────────────────
  { text: 'equivale a decir que', role: 'biconditional', language: 'es', priority: 9 },
  { text: 'equivale a', role: 'biconditional', language: 'es', priority: 7 },
  { text: 'es equivalente a', role: 'biconditional', language: 'es', priority: 8 },

  // ── Temporales ──────────────────────────────────
  { text: 'después de que', role: 'temporal_next', language: 'es', priority: 7 },
  { text: 'después de', role: 'temporal_next', language: 'es', priority: 6 },
  { text: 'a continuación', role: 'temporal_next', language: 'es', priority: 6 },
  { text: 'hasta que', role: 'temporal_until', language: 'es', priority: 7 },
  { text: 'mientras que', role: 'temporal', language: 'es', priority: 6 },
  { text: 'mientras', role: 'temporal', language: 'es', priority: 5 },
  { text: 'antes de que', role: 'temporal', language: 'es', priority: 7 },
  { text: 'antes de', role: 'temporal', language: 'es', priority: 6 },
  { text: 'después', role: 'temporal_next', language: 'es', priority: 4 },
];
