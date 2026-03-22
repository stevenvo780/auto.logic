/**
 * Diccionario de marcadores discursivos — Inglés
 * ~100 marcadores con roles lógicos asignados
 */
import type { MarkerDefinition } from '../types';

export const MARKERS_EN: MarkerDefinition[] = [
  // ── Conditionals ────────────────────────────────
  { text: 'if and only if', role: 'biconditional', language: 'en', priority: 10 },
  { text: 'provided that', role: 'condition', language: 'en', priority: 8 },
  { text: 'on the condition that', role: 'condition', language: 'en', priority: 9 },
  { text: 'assuming that', role: 'condition', language: 'en', priority: 7 },
  { text: 'in the event that', role: 'condition', language: 'en', priority: 8 },
  { text: 'on condition that', role: 'condition', language: 'en', priority: 8 },
  { text: 'as long as', role: 'condition', language: 'en', priority: 7 },
  { text: 'given that', role: 'premise', language: 'en', priority: 7 },
  { text: 'suppose that', role: 'condition', language: 'en', priority: 7 },
  { text: 'whenever', role: 'condition', language: 'en', priority: 6 },
  { text: 'if', role: 'condition', language: 'en', priority: 3 },

  // ── Consequents / Conclusions ───────────────────
  { text: 'it follows that', role: 'conclusion', language: 'en', priority: 9 },
  { text: 'we can conclude that', role: 'conclusion', language: 'en', priority: 9 },
  { text: 'it can be concluded that', role: 'conclusion', language: 'en', priority: 9 },
  { text: 'as a result', role: 'conclusion', language: 'en', priority: 7 },
  { text: 'as a consequence', role: 'conclusion', language: 'en', priority: 7 },
  { text: 'consequently', role: 'conclusion', language: 'en', priority: 7 },
  { text: 'for this reason', role: 'conclusion', language: 'en', priority: 7 },
  { text: 'in conclusion', role: 'conclusion', language: 'en', priority: 8 },
  { text: 'therefore', role: 'conclusion', language: 'en', priority: 7 },
  { text: 'thus', role: 'conclusion', language: 'en', priority: 6 },
  { text: 'hence', role: 'conclusion', language: 'en', priority: 6 },
  { text: 'so', role: 'conclusion', language: 'en', priority: 3 },
  { text: 'then', role: 'consequent', language: 'en', priority: 4 },
  { text: 'ergo', role: 'conclusion', language: 'en', priority: 6 },

  // ── Premises / Reasons ──────────────────────────
  { text: 'since', role: 'premise', language: 'en', priority: 5 },
  { text: 'because', role: 'premise', language: 'en', priority: 5 },
  { text: 'due to the fact that', role: 'premise', language: 'en', priority: 8 },
  { text: 'on account of', role: 'premise', language: 'en', priority: 7 },
  { text: 'considering that', role: 'premise', language: 'en', priority: 7 },
  { text: 'in view of the fact that', role: 'premise', language: 'en', priority: 9 },
  { text: 'inasmuch as', role: 'premise', language: 'en', priority: 7 },
  { text: 'for', role: 'premise', language: 'en', priority: 3 },

  // ── Conjunction ─────────────────────────────────
  { text: 'in addition to', role: 'and', language: 'en', priority: 7 },
  { text: 'furthermore', role: 'and', language: 'en', priority: 6 },
  { text: 'moreover', role: 'and', language: 'en', priority: 6 },
  { text: 'in addition', role: 'and', language: 'en', priority: 6 },
  { text: 'likewise', role: 'and', language: 'en', priority: 5 },
  { text: 'also', role: 'and', language: 'en', priority: 4 },
  { text: 'as well as', role: 'and', language: 'en', priority: 6 },

  // ── Disjunction ─────────────────────────────────
  { text: 'either', role: 'or', language: 'en', priority: 5 },
  { text: 'alternatively', role: 'or', language: 'en', priority: 6 },

  // ── Adversative ─────────────────────────────────
  { text: 'on the other hand', role: 'adversative', language: 'en', priority: 8 },
  { text: 'on the contrary', role: 'adversative', language: 'en', priority: 7 },
  { text: 'in contrast', role: 'adversative', language: 'en', priority: 7 },
  { text: 'nevertheless', role: 'adversative', language: 'en', priority: 7 },
  { text: 'nonetheless', role: 'adversative', language: 'en', priority: 7 },
  { text: 'however', role: 'adversative', language: 'en', priority: 6 },
  { text: 'although', role: 'adversative', language: 'en', priority: 5 },
  { text: 'even though', role: 'adversative', language: 'en', priority: 6 },
  { text: 'but', role: 'adversative', language: 'en', priority: 4 },
  { text: 'yet', role: 'adversative', language: 'en', priority: 4 },

  // ── Negation ────────────────────────────────────
  { text: 'it is not the case that', role: 'negation', language: 'en', priority: 9 },
  { text: 'it is not true that', role: 'negation', language: 'en', priority: 9 },
  { text: 'by no means', role: 'negation', language: 'en', priority: 8 },
  { text: 'in no case', role: 'negation', language: 'en', priority: 8 },
  { text: 'never', role: 'negation', language: 'en', priority: 5 },
  { text: 'neither', role: 'negation', language: 'en', priority: 5 },
  { text: 'not', role: 'negation', language: 'en', priority: 3 },

  // ── Universal ───────────────────────────────────
  { text: 'for all', role: 'universal', language: 'en', priority: 7 },
  { text: 'for every', role: 'universal', language: 'en', priority: 7 },
  { text: 'every', role: 'universal', language: 'en', priority: 5 },
  { text: 'all', role: 'universal', language: 'en', priority: 4 },
  { text: 'each', role: 'universal', language: 'en', priority: 5 },
  { text: 'any', role: 'universal', language: 'en', priority: 4 },
  { text: 'always', role: 'universal', language: 'en', priority: 4 },

  // ── Existential ─────────────────────────────────
  { text: 'there exists at least', role: 'existential', language: 'en', priority: 8 },
  { text: 'there exists', role: 'existential', language: 'en', priority: 7 },
  { text: 'there is at least', role: 'existential', language: 'en', priority: 7 },
  { text: 'there is', role: 'existential', language: 'en', priority: 5 },
  { text: 'there are', role: 'existential', language: 'en', priority: 5 },
  { text: 'some', role: 'existential', language: 'en', priority: 4 },

  // ── Modal: Necessity ────────────────────────────
  { text: 'it is necessary that', role: 'necessity', language: 'en', priority: 8 },
  { text: 'necessarily', role: 'necessity', language: 'en', priority: 7 },
  { text: 'it is obligatory that', role: 'necessity', language: 'en', priority: 8 },
  { text: 'must', role: 'necessity', language: 'en', priority: 4 },
  { text: 'ought to', role: 'necessity', language: 'en', priority: 5 },

  // ── Modal: Possibility ──────────────────────────
  { text: 'it is possible that', role: 'possibility', language: 'en', priority: 8 },
  { text: 'it is permitted that', role: 'possibility', language: 'en', priority: 8 },
  { text: 'possibly', role: 'possibility', language: 'en', priority: 7 },
  { text: 'perhaps', role: 'possibility', language: 'en', priority: 5 },
  { text: 'maybe', role: 'possibility', language: 'en', priority: 5 },
  { text: 'may', role: 'possibility', language: 'en', priority: 3 },
  { text: 'might', role: 'possibility', language: 'en', priority: 4 },

  // ── Biconditional ───────────────────────────────
  { text: 'is equivalent to', role: 'biconditional', language: 'en', priority: 8 },
  { text: 'amounts to saying that', role: 'biconditional', language: 'en', priority: 8 },
  { text: 'iff', role: 'biconditional', language: 'en', priority: 7 },

  // ── Temporal ────────────────────────────────────
  { text: 'after that', role: 'temporal_next', language: 'en', priority: 6 },
  { text: 'after', role: 'temporal_next', language: 'en', priority: 5 },
  { text: 'next', role: 'temporal_next', language: 'en', priority: 4 },
  { text: 'until', role: 'temporal_until', language: 'en', priority: 6 },
  { text: 'while', role: 'temporal', language: 'en', priority: 5 },
  { text: 'before', role: 'temporal', language: 'en', priority: 5 },
  { text: 'eventually', role: 'temporal_eventually', language: 'en', priority: 5 },
];
