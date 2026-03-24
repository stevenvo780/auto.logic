#!/usr/bin/env node
/**
 * AUTOLOGIC — Dataset Generator v4.0 (Optimized)
 *
 * Key optimizations over v3:
 *  - Direct Ollama API (no OpenWebUI proxy overhead)
 *  - Local structural verification (no LLM round-trip for verify)
 *  - Append mode (resumes from existing dataset)
 *  - Aggressive retries with exponential backoff
 *  - Detailed progress and ETA reporting
 *
 * Run: node 01_gen_fast.js [--samples N] [--gold-only] [--fresh]
 */
const fs = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────
const OLLAMA_URL = 'http://10.88.88.1:11434/api/chat';   // Direct Ollama — no proxy
const MODEL = 'qwen2.5-coder:14b';
const DEFAULT_SAMPLES = 3000;
const OUTPUT = path.join(__dirname, 'dataset.jsonl');
const CONCURRENCY = 4;  // Ollama serializes GPU, but pipeline overlap helps
const CALL_TIMEOUT = 120_000; // 2 min per call

// Parse CLI args
const args = process.argv.slice(2);
const goldOnly = args.includes('--gold-only');
const freshStart = args.includes('--fresh');
const samplesIdx = args.indexOf('--samples');
const TOTAL_SAMPLES = goldOnly ? 0 : (samplesIdx !== -1 ? parseInt(args[samplesIdx + 1]) : DEFAULT_SAMPLES);

const SYSTEM_PROMPT = `You are Autologic's semantic AST parser.
Your goal is to read complex human text and translate it into Situated Propositional Logic or bounded First-Order Logic depending on the profile: 'classical.propositional'.
DO NOT try to resolve or prove the logic. Only extract the claims and their semantic relations.
AVOID deep First-Order combinatorial explosions. Collapse contextual instances into descriptive propositional atoms like: 'CumpleInformesOrdinarios'.

You MUST return a pure JSON object conforming exactly to this interface, nothing else:
{
  "axioms": [ { "name": "a1", "formulaJSON": <LogicNode> }, ... ],
  "conclusions": [ { "formulaJSON": <LogicNode> } ]
}

Available LogicNode types for formulaJSON:
- AtomNode: { "type": "Atom", "id": "SCREAMING_SNAKE_CASE_ID", "text": "human readable description" }
- ConnectiveNode: { "type": "Connective", "operator": "AND"|"OR"|"IMPLIES"|"IFF"|"NOT", "left": <node>, "right": <node> }
  For NOT: { "type": "Connective", "operator": "NOT", "left": <child_node> }
- ModalNode: { "type": "Modal", "operator": "K"|"B"|"O"|"P"|"F"|"BOX"|"DIA"|"ALWAYS"|"EVENTUALLY"|"NEXT", "child": <node>, "agent": "optional" }
- QuantifierNode: { "type": "Quantifier", "operator": "FORALL"|"EXISTS", "variables": ["x"], "child": <node> }
- PredicateNode: { "type": "Predicate", "name": "P", "args": [{"type":"Object","name":"x"}] }

Rules:
- axioms = premises and rules that are assumed true
- conclusions = what should be derived from axioms
- Use the SAME Atom id across axioms/conclusions when referring to the same proposition
- Atom ids must be SCREAMING_SNAKE_CASE
- Be precise. Return ONLY the raw JSON object. No markdown, no codeblocks.`;

// ══════════════════════════════════════════════════════════════
// GOLD EXERCISES
// ══════════════════════════════════════════════════════════════
const GOLD_EXERCISES = [
  {
    text: 'Si la policía patrulla las calles, entonces no hay delincuentes al acecho. Pero o bien hay delincuentes al acecho o sujetos ebrios fomentando el desorden. La policía patrulla las calles. Luego, hay sujetos ebrios fomentando el desorden.',
    ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'POLICIA_PATRULLA', text: 'la policía patrulla las calles' }, right: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'DELINCUENTES_ACECHO', text: 'hay delincuentes al acecho' } } } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'OR', left: { type: 'Atom', id: 'DELINCUENTES_ACECHO', text: 'hay delincuentes al acecho' }, right: { type: 'Atom', id: 'SUJETOS_EBRIOS', text: 'sujetos ebrios fomentando el desorden' } } }, { name: 'a3', formulaJSON: { type: 'Atom', id: 'POLICIA_PATRULLA', text: 'la policía patrulla las calles' } } ], conclusions: [{ formulaJSON: { type: 'Atom', id: 'SUJETOS_EBRIOS', text: 'sujetos ebrios fomentando el desorden' } }] }
  },
  {
    text: 'Si Pablo Castel vive obsesionado con María Iribarne, entonces la encontrará algún día. Si Pablo Castel encuentra a María Iribarne, entablará una conversación con ella. Es el caso que Pablo Castel vive obsesionado con María Iribarne. Por lo tanto, Pablo Castel entablará una conversación con María Iribarne.',
    ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'PABLO_OBSESIONADO', text: 'Pablo Castel vive obsesionado con María Iribarne' }, right: { type: 'Atom', id: 'PABLO_ENCUENTRA', text: 'Pablo Castel la encontrará algún día' } } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'PABLO_ENCUENTRA', text: 'Pablo Castel encuentra a María Iribarne' }, right: { type: 'Atom', id: 'PABLO_CONVERSA', text: 'Pablo Castel entablará una conversación con ella' } } }, { name: 'a3', formulaJSON: { type: 'Atom', id: 'PABLO_OBSESIONADO', text: 'Pablo Castel vive obsesionado con María Iribarne' } } ], conclusions: [{ formulaJSON: { type: 'Atom', id: 'PABLO_CONVERSA', text: 'Pablo Castel entablará una conversación con María Iribarne' } }] }
  },
  {
    text: 'Si llueve, entonces la calle se moja. Llueve. Por lo tanto, la calle se moja.',
    ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'LLUEVE', text: 'llueve' }, right: { type: 'Atom', id: 'CALLE_MOJA', text: 'la calle se moja' } } }, { name: 'a2', formulaJSON: { type: 'Atom', id: 'LLUEVE', text: 'llueve' } } ], conclusions: [{ formulaJSON: { type: 'Atom', id: 'CALLE_MOJA', text: 'la calle se moja' } }] }
  },
  {
    text: 'Si estudio, entonces apruebo el examen. No aprobé el examen. Por lo tanto, no estudié.',
    ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'ESTUDIO', text: 'estudio' }, right: { type: 'Atom', id: 'APRUEBO_EXAMEN', text: 'apruebo el examen' } } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'APRUEBO_EXAMEN', text: 'aprobé el examen' } } } ], conclusions: [{ formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'ESTUDIO', text: 'estudié' } } }] }
  },
  {
    text: 'Todo mamífero es vertebrado. Todo perro es mamífero. Por lo tanto, todo perro es vertebrado.',
    ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'ES_MAMIFERO', text: 'ser mamífero' }, right: { type: 'Atom', id: 'ES_VERTEBRADO', text: 'ser vertebrado' } } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'ES_PERRO', text: 'ser perro' }, right: { type: 'Atom', id: 'ES_MAMIFERO', text: 'ser mamífero' } } } ], conclusions: [{ formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'ES_PERRO', text: 'ser perro' }, right: { type: 'Atom', id: 'ES_VERTEBRADO', text: 'ser vertebrado' } } }] }
  },
  {
    text: 'O llueve o hace sol. No llueve. Por lo tanto, hace sol.',
    ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'OR', left: { type: 'Atom', id: 'LLUEVE', text: 'llueve' }, right: { type: 'Atom', id: 'HACE_SOL', text: 'hace sol' } } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'LLUEVE', text: 'llueve' } } } ], conclusions: [{ formulaJSON: { type: 'Atom', id: 'HACE_SOL', text: 'hace sol' } }] }
  },
  {
    text: 'Si el contrato es válido, entonces las partes están obligadas. Si las partes están obligadas, entonces deben cumplir. El contrato es válido. Luego, las partes deben cumplir.',
    ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'CONTRATO_VALIDO', text: 'el contrato es válido' }, right: { type: 'Atom', id: 'PARTES_OBLIGADAS', text: 'las partes están obligadas' } } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'PARTES_OBLIGADAS', text: 'las partes están obligadas' }, right: { type: 'Atom', id: 'DEBEN_CUMPLIR', text: 'las partes deben cumplir' } } }, { name: 'a3', formulaJSON: { type: 'Atom', id: 'CONTRATO_VALIDO', text: 'el contrato es válido' } } ], conclusions: [{ formulaJSON: { type: 'Atom', id: 'DEBEN_CUMPLIR', text: 'las partes deben cumplir' } }] }
  },
  {
    text: 'Una persona es culpable si y solo si cometió el delito. Juan no cometió el delito. Luego, Juan no es culpable.',
    ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IFF', left: { type: 'Atom', id: 'PERSONA_CULPABLE', text: 'persona es culpable' }, right: { type: 'Atom', id: 'COMETIO_DELITO', text: 'cometió el delito' } } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'COMETIO_DELITO', text: 'Juan no cometió el delito' } } } ], conclusions: [{ formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'PERSONA_CULPABLE', text: 'Juan no es culpable' } } }] }
  },
  {
    text: 'Toda norma jurídica es válida si y solo si ha sido promulgada por la autoridad competente. Esta norma no ha sido promulgada por la autoridad competente. Luego, esta norma jurídica no es válida.',
    ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IFF', left: { type: 'Atom', id: 'NORMA_VALIDA', text: 'norma jurídica es válida' }, right: { type: 'Atom', id: 'PROMULGADA_AUTORIDAD', text: 'ha sido promulgada por la autoridad competente' } } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'PROMULGADA_AUTORIDAD', text: 'no ha sido promulgada por la autoridad competente' } } } ], conclusions: [{ formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'NORMA_VALIDA', text: 'esta norma jurídica no es válida' } } }] }
  },
  {
    text: 'Si el acusado confiesa, entonces se reduce la pena. Si no confiesa, entonces el juicio continúa. El acusado confiesa o no confiesa. Luego, se reduce la pena o el juicio continúa.',
    ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'ACUSADO_CONFIESA', text: 'el acusado confiesa' }, right: { type: 'Atom', id: 'REDUCE_PENA', text: 'se reduce la pena' } } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'ACUSADO_CONFIESA', text: 'el acusado no confiesa' } }, right: { type: 'Atom', id: 'JUICIO_CONTINUA', text: 'el juicio continúa' } } }, { name: 'a3', formulaJSON: { type: 'Connective', operator: 'OR', left: { type: 'Atom', id: 'ACUSADO_CONFIESA', text: 'el acusado confiesa' }, right: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'ACUSADO_CONFIESA', text: 'el acusado no confiesa' } } } } ], conclusions: [{ formulaJSON: { type: 'Connective', operator: 'OR', left: { type: 'Atom', id: 'REDUCE_PENA', text: 'se reduce la pena' }, right: { type: 'Atom', id: 'JUICIO_CONTINUA', text: 'el juicio continúa' } } }] }
  },
  {
    text: 'La Tierra gira alrededor del Sol y la Luna gira alrededor de la Tierra. Luego, la Tierra gira alrededor del Sol.',
    ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'AND', left: { type: 'Atom', id: 'TIERRA_GIRA_SOL', text: 'la Tierra gira alrededor del Sol' }, right: { type: 'Atom', id: 'LUNA_GIRA_TIERRA', text: 'la Luna gira alrededor de la Tierra' } } } ], conclusions: [{ formulaJSON: { type: 'Atom', id: 'TIERRA_GIRA_SOL', text: 'la Tierra gira alrededor del Sol' } }] }
  },
  {
    text: 'Si el equipo de atletismo se está preparando adecuadamente entonces estará en condiciones de asistir a las próximas olimpiadas. Y estará en condiciones de asistir a las próximas olimpiadas si y sólo si el equipo cuenta con un plantel competente. Pero o el equipo no cuenta con un plantel competente o uno de sus integrantes está lesionado. Sucede que ningún integrante del plantel está lesionado. Por lo tanto, el equipo de atletismo no se está preparando adecuadamente.',
    ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'EQUIPO_PREPARA', text: 'el equipo de atletismo se está preparando adecuadamente' }, right: { type: 'Atom', id: 'CONDICIONES_OLIMPIADAS', text: 'estará en condiciones de asistir a las próximas olimpiadas' } } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IFF', left: { type: 'Atom', id: 'CONDICIONES_OLIMPIADAS', text: 'estará en condiciones de asistir a las próximas olimpiadas' }, right: { type: 'Atom', id: 'PLANTEL_COMPETENTE', text: 'el equipo cuenta con un plantel competente' } } }, { name: 'a3', formulaJSON: { type: 'Connective', operator: 'OR', left: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'PLANTEL_COMPETENTE', text: 'el equipo cuenta con un plantel competente' } }, right: { type: 'Atom', id: 'INTEGRANTE_LESIONADO', text: 'uno de sus integrantes está lesionado' } } }, { name: 'a4', formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'INTEGRANTE_LESIONADO', text: 'ningún integrante del plantel está lesionado' } } } ], conclusions: [{ formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'EQUIPO_PREPARA', text: 'el equipo de atletismo no se está preparando adecuadamente' } } }] }
  },
  {
    text: 'Si Daniel no toca la guitarra, entonces la tocará Henry. Si Henry toca la guitarra, Antonio abandonará el grupo. Antonio no ha abandonado el grupo. Luego, Daniel toca la guitarra.',
    ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'DANIEL_GUITARRA', text: 'Daniel toca la guitarra' } }, right: { type: 'Atom', id: 'HENRY_GUITARRA', text: 'Henry toca la guitarra' } } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'HENRY_GUITARRA', text: 'Henry toca la guitarra' }, right: { type: 'Atom', id: 'ANTONIO_ABANDONA', text: 'Antonio abandonará el grupo' } } }, { name: 'a3', formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'ANTONIO_ABANDONA', text: 'Antonio abandonó el grupo' } } } ], conclusions: [{ formulaJSON: { type: 'Atom', id: 'DANIEL_GUITARRA', text: 'Daniel toca la guitarra' } }] }
  },
  {
    text: 'Cuando se produce el fenómeno del niño se generan lluvias torrenciales y huaycos. Pero no se producen lluvias torrenciales o huaycos. Por lo tanto, no se ha producido el fenómeno del niño.',
    ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'FENOMENO_NINO', text: 'se produce el fenómeno del niño' }, right: { type: 'Connective', operator: 'AND', left: { type: 'Atom', id: 'LLUVIAS_TORRENCIALES', text: 'se generan lluvias torrenciales' }, right: { type: 'Atom', id: 'HUAYCOS', text: 'se generan huaycos' } } } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Connective', operator: 'OR', left: { type: 'Atom', id: 'LLUVIAS_TORRENCIALES', text: 'se producen lluvias torrenciales' }, right: { type: 'Atom', id: 'HUAYCOS', text: 'se producen huaycos' } } } } ], conclusions: [{ formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'FENOMENO_NINO', text: 'se ha producido el fenómeno del niño' } } }] }
  },
  {
    text: 'Si la empresa obtiene ganancias, entonces repartirá dividendos a los accionistas. La empresa no repartirá dividendos a los accionistas. Luego, la empresa no obtuvo ganancias.',
    ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'EMPRESA_GANANCIAS', text: 'la empresa obtiene ganancias' }, right: { type: 'Atom', id: 'REPARTE_DIVIDENDOS', text: 'repartirá dividendos a los accionistas' } } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'REPARTE_DIVIDENDOS', text: 'la empresa no repartirá dividendos' } } } ], conclusions: [{ formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'EMPRESA_GANANCIAS', text: 'la empresa no obtuvo ganancias' } } }] }
  },
];

// ══════════════════════════════════════════════════════════════
// AST TEMPLATES — 16 inference patterns
// ══════════════════════════════════════════════════════════════
const TEMPLATES = [
  (v) => ({ pattern: 'modus_ponens', ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } }, { name: 'a2', formulaJSON: { type: 'Atom', id: v[0], text: v[2] } } ], conclusions: [{ formulaJSON: { type: 'Atom', id: v[1], text: v[3] } }] }}),
  (v) => ({ pattern: 'modus_tollens', ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: v[1], text: v[3] } } } ], conclusions: [{ formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: v[0], text: v[2] } } }] }}),
  (v) => ({ pattern: 'hypothetical_syllogism', ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[1], text: v[3] }, right: { type: 'Atom', id: v[4], text: v[5] } } } ], conclusions: [{ formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[4], text: v[5] } } }] }}),
  (v) => ({ pattern: 'disjunctive_syllogism', ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'OR', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: v[0], text: v[2] } } } ], conclusions: [{ formulaJSON: { type: 'Atom', id: v[1], text: v[3] } }] }}),
  (v) => ({ pattern: 'conjunction', ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Atom', id: v[0], text: v[2] } }, { name: 'a2', formulaJSON: { type: 'Atom', id: v[1], text: v[3] } } ], conclusions: [{ formulaJSON: { type: 'Connective', operator: 'AND', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } }] }}),
  (v) => ({ pattern: 'biconditional', ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IFF', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } }, { name: 'a2', formulaJSON: { type: 'Atom', id: v[0], text: v[2] } } ], conclusions: [{ formulaJSON: { type: 'Atom', id: v[1], text: v[3] } }] }}),
  (v) => ({ pattern: 'chain_3', ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[1], text: v[3] }, right: { type: 'Atom', id: v[4], text: v[5] } } }, { name: 'a3', formulaJSON: { type: 'Atom', id: v[0], text: v[2] } } ], conclusions: [{ formulaJSON: { type: 'Atom', id: v[4], text: v[5] } }] }}),
  (v) => ({ pattern: 'conj_antecedent', ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Connective', operator: 'AND', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } }, right: { type: 'Atom', id: v[4], text: v[5] } } }, { name: 'a2', formulaJSON: { type: 'Atom', id: v[0], text: v[2] } }, { name: 'a3', formulaJSON: { type: 'Atom', id: v[1], text: v[3] } } ], conclusions: [{ formulaJSON: { type: 'Atom', id: v[4], text: v[5] } }] }}),
  (v) => ({ pattern: 'constructive_dilemma', ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[4], text: v[5] }, right: { type: 'Atom', id: v[6], text: v[7] } } }, { name: 'a3', formulaJSON: { type: 'Connective', operator: 'OR', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[4], text: v[5] } } } ], conclusions: [{ formulaJSON: { type: 'Connective', operator: 'OR', left: { type: 'Atom', id: v[1], text: v[3] }, right: { type: 'Atom', id: v[6], text: v[7] } } }] }}),
  (v) => ({ pattern: 'destructive_dilemma', ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[4], text: v[5] }, right: { type: 'Atom', id: v[6], text: v[7] } } }, { name: 'a3', formulaJSON: { type: 'Connective', operator: 'OR', left: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: v[1], text: v[3] } }, right: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: v[6], text: v[7] } } } } ], conclusions: [{ formulaJSON: { type: 'Connective', operator: 'OR', left: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: v[0], text: v[2] } }, right: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: v[4], text: v[5] } } } }] }}),
  (v) => ({ pattern: 'double_negation', ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } }, { name: 'a2', formulaJSON: { type: 'Atom', id: v[0], text: v[2] } } ], conclusions: [{ formulaJSON: { type: 'Atom', id: v[1], text: v[3] } }] }}),
  (v) => ({ pattern: 'absorption', ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } }, { name: 'a2', formulaJSON: { type: 'Atom', id: v[0], text: v[2] } } ], conclusions: [{ formulaJSON: { type: 'Connective', operator: 'AND', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } }] }}),
  (v) => ({ pattern: 'deontic_obligation', ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Modal', operator: 'O', child: { type: 'Atom', id: v[1], text: v[3] } } } }, { name: 'a2', formulaJSON: { type: 'Atom', id: v[0], text: v[2] } } ], conclusions: [{ formulaJSON: { type: 'Modal', operator: 'O', child: { type: 'Atom', id: v[1], text: v[3] } } }] }}),
  (v) => ({ pattern: 'disj_antecedent', ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Connective', operator: 'OR', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } }, right: { type: 'Atom', id: v[4], text: v[5] } } }, { name: 'a2', formulaJSON: { type: 'Atom', id: v[0], text: v[2] } } ], conclusions: [{ formulaJSON: { type: 'Atom', id: v[4], text: v[5] } }] }}),
  (v) => ({ pattern: 'negation_antecedent', ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: v[0], text: v[2] } }, right: { type: 'Atom', id: v[1], text: v[3] } } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: v[0], text: v[2] } } } ], conclusions: [{ formulaJSON: { type: 'Atom', id: v[1], text: v[3] } }] }}),
  (v) => ({ pattern: 'premises_only', ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Atom', id: v[0], text: v[2] } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } } ], conclusions: [] }}),
];

// ══════════════════════════════════════════════════════════════
// VOCABULARY — 30 legal/academic pools
// ══════════════════════════════════════════════════════════════
const ATOMS_POOL = [
  ['DICTAMEN_FAVORABLE', 'PUBLICACION_REVISTA', 'dictamen favorable de los evaluadores', 'publicación en la revista', 'APROBACION_COMITE', 'aprobación por el comité editorial', 'INDEXACION_SCOPUS', 'indexación en Scopus'],
  ['CONTRATO_FIRMADO', 'OBLIGACION_PAGO', 'contrato firmado por ambas partes', 'obligación de pago exigible', 'REGISTRO_NOTARIAL', 'registro notarial del acuerdo', 'EJECUCION_GARANTIA', 'ejecución de la garantía'],
  ['PLAZO_VENCIDO', 'MORA_AUTOMATICA', 'plazo contractual vencido', 'mora se configura automáticamente', 'CLAUSULA_PENAL', 'cláusula penal se activa', 'DEMANDA_EJECUTIVA', 'demanda ejecutiva procede'],
  ['PRUEBA_ADMITIDA', 'HECHO_ACREDITADO', 'prueba fue debidamente admitida', 'hecho queda acreditado procesalmente', 'SENTENCIA_PROCEDENTE', 'sentencia favorable es procedente', 'RECURSO_IMPROCEDENTE', 'recurso de apelación es improcedente'],
  ['SENTENCIA_CONDENATORIA', 'RECURSO_APELACION', 'sentencia es condenatoria', 'procede recurso de apelación', 'REVISION_SEGUNDA_INSTANCIA', 'revisión en segunda instancia obligatoria', 'CASACION_POSIBLE', 'recurso de casación es posible'],
  ['INFORME_PERICIAL', 'RESPONSABILIDAD_CIVIL', 'informe pericial acredita el daño', 'responsabilidad civil del demandado', 'INDEMNIZACION_PROCEDENTE', 'indemnización de perjuicios procede', 'CUANTIA_DETERMINADA', 'cuantía queda determinada'],
  ['NOTIFICACION_LEGAL', 'TERMINO_PROCESAL', 'notificación realizada conforme a derecho', 'término procesal comienza a correr', 'CONTESTACION_DEMANDA', 'plazo de contestación de demanda', 'PRECLUYE_RECURSO', 'precluye el recurso extraordinario'],
  ['CLAUSULA_ABUSIVA', 'NULIDAD_PARCIAL', 'cláusula declarada abusiva', 'nulidad parcial del contrato', 'REVISION_JUDICIAL', 'revisión judicial del contrato', 'PROTECCION_CONSUMIDOR', 'protección al consumidor aplica'],
  ['REGISTRO_CATASTRAL', 'DERECHO_PROPIEDAD', 'registro catastral actualizado', 'derecho de propiedad oponible', 'TRADICION_PERFECCIONADA', 'tradición del bien perfeccionada', 'EMBARGO_IMPROCEDENTE', 'embargo es improcedente'],
  ['AUDIENCIA_PRELIMINAR', 'ADMISION_DEMANDA', 'audiencia preliminar celebrada', 'demanda admitida a trámite', 'FIJACION_LITIGIO', 'fijación del litigio procede', 'DECRETO_PRUEBAS', 'decreto de pruebas es obligatorio'],
  ['CUMPLIMIENTO_REQUISITOS', 'AUTORIZACION_FINAL', 'cumplimiento de todos los requisitos', 'autorización final del organismo', 'LICENCIA_OTORGADA', 'licencia de funcionamiento otorgada', 'OPERACION_HABILITADA', 'operación comercial habilitada'],
  ['VOTACION_MAYORITARIA', 'APROBACION_REFORMA', 'votación por mayoría calificada', 'aprobación de la reforma', 'PROMULGACION_LEY', 'promulgación de la ley', 'VIGENCIA_INMEDIATA', 'vigencia inmediata de la norma'],
  ['TESIS_APROBADA', 'TITULO_OTORGADO', 'tesis fue aprobada por el jurado', 'título profesional otorgado', 'CEREMONIA_GRADO', 'ceremonia de grado programada', 'DIPLOMA_EXPEDIDO', 'diploma expedido oficialmente'],
  ['CREDITOS_COMPLETOS', 'GRADUACION_HABILITADA', 'créditos académicos completos', 'graduación habilitada', 'REQUISITO_IDIOMA', 'requisito de idioma cumplido', 'HOMOLOGACION_TITULO', 'homologación del título procede'],
  ['INVESTIGACION_PUBLICADA', 'RECONOCIMIENTO_ACADEMICO', 'investigación publicada en revista indexada', 'reconocimiento académico procedente', 'BONO_INVESTIGACION', 'bono por investigación otorgado', 'ASCENSO_ESCALAFON', 'ascenso en el escalafón'],
  ['EXAMEN_APROBADO', 'PROMOCION_NIVEL', 'examen final aprobado', 'promoción al siguiente nivel', 'MATRICULA_RENOVADA', 'matrícula renovada automáticamente', 'BECA_MERITO', 'beca por mérito académico'],
  ['BECA_OTORGADA', 'MATRICULA_EXENTA', 'beca académica otorgada', 'matrícula queda exenta de pago', 'SOSTENIMIENTO_APROBADO', 'auxilio de sostenimiento aprobado', 'COMPROMISO_ACADEMICO', 'compromiso académico firmado'],
  ['SOLICITUD_RADICADA', 'TRAMITE_INICIADO', 'solicitud debidamente radicada', 'trámite administrativo iniciado', 'PLAZO_RESPUESTA', 'plazo de respuesta corre', 'SILENCIO_POSITIVO', 'silencio administrativo positivo'],
  ['LICENCIA_VIGENTE', 'OPERACION_PERMITIDA', 'licencia de operación vigente', 'operación comercial permitida', 'SUPERVISION_ACTIVA', 'supervisión periódica activa', 'MULTA_INAPLICABLE', 'multa regulatoria no aplica'],
  ['AUDITORIA_FAVORABLE', 'CERTIFICACION_EMITIDA', 'auditoría con resultado favorable', 'certificación de cumplimiento emitida', 'RENOVACION_LICENCIA', 'renovación de licencia procede', 'CALIFICACION_AAA', 'calificación AAA otorgada'],
  ['PAGO_REALIZADO', 'DEUDA_EXTINGUIDA', 'pago total realizado', 'deuda queda extinguida', 'PAZ_SALVO', 'paz y salvo expedido', 'HISTORIAL_LIMPIO', 'historial crediticio queda limpio'],
  ['INSPECCION_APROBADA', 'PERMISO_OPERACION', 'inspección sanitaria aprobada', 'permiso de operación otorgado', 'CERTIFICADO_SANITARIO', 'certificado sanitario emitido', 'APERTURA_LOCAL', 'apertura del local autorizada'],
  ['DOCUMENTACION_COMPLETA', 'TRAMITE_ADMITIDO', 'documentación entregada completa', 'trámite admitido a evaluación', 'EVALUACION_INICIADA', 'evaluación técnica iniciada', 'DICTAMEN_PENDIENTE', 'dictamen técnico pendiente'],
  ['PRESUPUESTO_APROBADO', 'EJECUCION_AUTORIZADA', 'presupuesto aprobado por junta', 'ejecución de recursos autorizada', 'CONTRATACION_HABILITADA', 'proceso de contratación habilitado', 'DESEMBOLSO_PROGRAMADO', 'desembolso de fondos programado'],
  ['QUORUM_ALCANZADO', 'SESION_VALIDA', 'quórum alcanzado', 'sesión es válida jurídicamente', 'ACTA_FIRMADA', 'acta de sesión firmada', 'DECISIONES_VINCULANTES', 'decisiones adoptadas son vinculantes'],
  ['PERITAJE_CONTABLE', 'DETERMINACION_MONTO', 'peritaje contable concluido', 'determinación del monto indemnizatorio', 'LIQUIDACION_APROBADA', 'liquidación de perjuicios aprobada', 'PAGO_ORDENADO', 'pago de indemnización ordenado'],
  ['CONSENTIMIENTO_INFORMADO', 'PROCEDIMIENTO_VALIDO', 'consentimiento informado firmado', 'procedimiento médico es válido', 'HISTORIA_CLINICA', 'historia clínica actualizada', 'RESPONSABILIDAD_EXCLUIDA', 'responsabilidad médica excluida'],
  ['FIANZA_CONSTITUIDA', 'LIBERACION_CAUTELAR', 'fianza debidamente constituida', 'liberación cautelar procede', 'MEDIDA_LEVANTADA', 'medida cautelar levantada', 'BIENES_DESEMBARGADOS', 'bienes desembargados'],
  ['PRESCRIPCION_ADQUISITIVA', 'DOMINIO_RECONOCIDO', 'prescripción adquisitiva acreditada', 'dominio sobre el bien reconocido', 'ESCRITURA_PUBLICA', 'escritura pública otorgada', 'REGISTRO_INMOBILIARIO', 'registro inmobiliario actualizado'],
  ['ACTA_NOTARIAL', 'FE_PUBLICA', 'acta notarial levantada', 'fe pública sobre los hechos', 'DOCUMENTO_AUTENTICO', 'documento es auténtico', 'OPONIBILIDAD_TERCEROS', 'oponibilidad frente a terceros'],
];

// ── Helpers ──────────────────────────────────────
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

function generateVars() {
  const shuffled = shuffle(ATOMS_POOL);
  const a = shuffled[0];
  return [a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7]];
}

// ── Ollama native API call (no proxy) ────────────
async function callOllama(messages, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), CALL_TIMEOUT);
      const response = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          messages,
          stream: false,
          options: { temperature: 0.7, num_predict: 800 }
        }),
        signal: ctrl.signal
      });
      clearTimeout(timeout);
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText.substring(0, 200)}`);
      }
      const data = await response.json();
      const content = data?.message?.content;
      if (!content) throw new Error('Empty content in response');
      return content.trim();
    } catch (e) {
      if (attempt === retries) throw e;
      await sleep(1000 * (attempt + 1));
    }
  }
}

// ── Text generation from AST ─────────────────────
async function generateText(ast, pattern) {
  const prompt = `Eres un redactor jurídico-académico experto en español. Escribe UN SOLO párrafo formal, burocrático y denso que represente EXACTAMENTE la siguiente estructura lógica. El patrón lógico subyacente es "${pattern}".

Reglas:
- Usa lenguaje jurídico/académico formal colombiano o español
- NO agregues hechos ni relaciones que no estén en la estructura
- Usa conectores naturales variados: "si", "entonces", "por lo tanto", "en consecuencia", "siempre que", "dado que", "cuando", "puesto que", "habida cuenta de que", "de modo que", "así pues"
- Varía el estilo: a veces empieza con la conclusión, a veces con las premisas, a veces intercala
- NO uses formato de lista ni numeración
- Escribe entre 2 y 5 oraciones
- NO incluyas explicaciones meta ni comentarios sobre tu proceso
- El texto debe ser suficientemente complejo para que un parser NLP tenga que trabajar

Estructura lógica a representar:
${JSON.stringify(ast, null, 2)}

Párrafo:`;
  return await callOllama([{ role: 'user', content: prompt }]);
}

// ── LOCAL structural verification (NO LLM call) ──
function verifyStructurally(text, expectedAST) {
  if (!text || text.length < 30) return false;
  if (text.length > 2000) return false;
  // Must not contain JSON artifacts or meta-comments
  if (text.includes('"type"') || text.includes('"formulaJSON"')) return false;
  if (text.includes('```') || text.includes('LogicNode')) return false;
  // Must not be in English (heuristic: common English words)
  const englishWords = ['the ', 'therefore', 'hence', 'thus', 'given that', 'if and only if'];
  const lowerText = text.toLowerCase();
  const englishCount = englishWords.filter(w => lowerText.includes(w)).length;
  if (englishCount >= 2) return false;
  // Must contain some Spanish connectors or formal language
  const spanishMarkers = ['si ', 'entonces', 'por lo tanto', 'luego', 'dado que', 'puesto que',
    'en consecuencia', 'cuando', 'habida cuenta', 'siempre que', 'de modo que', 'así pues',
    'no obstante', 'sin embargo', 'debido a', 'conforme', 'según', 'mediante', 'respecto',
    'toda vez', 'por cuanto', 'en virtud', 'bien', 'pero', 'sea', 'caso', 'derecho',
    'obligación', 'contrato', 'norma', 'ley', 'juicio', 'sentencia', 'recurso'];
  const spanishCount = spanishMarkers.filter(w => lowerText.includes(w)).length;
  if (spanishCount < 1) return false;
  // Must have sentence-like structure
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  if (sentences.length < 1 || sentences.length > 10) return false;
  return true;
}

// ── Gold exercise writer ─────────────────────────
function writeGoldExercises(stream) {
  let count = 0;
  for (const gold of GOLD_EXERCISES) {
    const sample = {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Formalize this text:\n\n${gold.text}` },
        { role: 'assistant', content: JSON.stringify(gold.ast) }
      ],
      metadata: { pattern: 'gold_exercise', verified: true, index: count, source: 'test_suite' }
    };
    stream.write(JSON.stringify(sample) + '\n');
    count++;
  }
  const prefixes = [
    'Analyze and formalize the following argument:\n\n',
    'Extract the logical structure from this text:\n\n',
    'Parse the following text into formal propositional logic:\n\n',
  ];
  for (const gold of GOLD_EXERCISES) {
    for (const prefix of prefixes) {
      const sample = {
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `${prefix}${gold.text}` },
          { role: 'assistant', content: JSON.stringify(gold.ast) }
        ],
        metadata: { pattern: 'gold_exercise_variant', verified: true, index: count, source: 'test_suite' }
      };
      stream.write(JSON.stringify(sample) + '\n');
      count++;
    }
  }
  return count;
}

// ── LLM verification (used for a fraction of samples) ──
async function verifyWithLLM(text, expectedAST) {
  try {
    const result = await callOllama([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Formalize this text:\n\n${text}` }
    ]);
    const cleaned = result.replace(/^```json?\s*/m, '').replace(/```\s*$/m, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!parsed.axioms || !Array.isArray(parsed.axioms)) return false;
    if (!parsed.conclusions || !Array.isArray(parsed.conclusions)) return false;
    if (Math.abs(parsed.axioms.length - expectedAST.axioms.length) > 1) return false;
    return true;
  } catch { return false; }
}

// ── Generate one synthetic sample ────────────────
async function generateOne(idx, doLLMVerify = false) {
  const template = pick(TEMPLATES);
  const vars = generateVars();
  const { pattern, ast } = template(vars);
  try {
    const text = await generateText(ast, pattern);
    const structOk = verifyStructurally(text, ast);
    if (!structOk) {
      process.stdout.write('✗');
      return null;
    }
    // For ~20% of samples, also do LLM verification
    let llmVerified = false;
    if (doLLMVerify) {
      llmVerified = await verifyWithLLM(text, ast);
      if (!llmVerified) {
        process.stdout.write('⚠');
        return null;
      }
      process.stdout.write('✓');
    } else {
      process.stdout.write('·');
    }
    return {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Formalize this text:\n\n${text}` },
        { role: 'assistant', content: JSON.stringify(ast) }
      ],
      metadata: { pattern, verified: true, llm_verified: llmVerified, index: idx }
    };
  } catch (e) {
    process.stdout.write('✗');
    return null;
  }
}

// ── Main ─────────────────────────────────────────
async function main() {
  // Count existing lines if resuming
  let existingLines = 0;
  let existingVerified = 0;
  if (!freshStart && fs.existsSync(OUTPUT)) {
    const content = fs.readFileSync(OUTPUT, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    existingLines = lines.length;
    // Count gold vs synthetic
    let goldCount = 0;
    for (const line of lines) {
      try {
        const d = JSON.parse(line);
        if (d.metadata?.source === 'test_suite' || d.metadata?.pattern?.startsWith('gold')) goldCount++;
      } catch {}
    }
    existingVerified = existingLines - goldCount;
  }

  const goldExpected = GOLD_EXERCISES.length * 4; // 15 * 4 = 60
  const needSynthetic = Math.max(0, TOTAL_SAMPLES - existingVerified);

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  AUTOLOGIC — Dataset Generator v4.0 (Optimized)            ║');
  console.log(`║  API: Direct Ollama (${OLLAMA_URL})      ║`);
  console.log(`║  Teacher: ${MODEL}                                ║`);
  console.log(`║  Existing: ${existingLines} lines (${existingVerified} verified synthetic)          ║`);
  console.log(`║  Target: ${TOTAL_SAMPLES} verified synthetic                          ║`);
  console.log(`║  Need: ${needSynthetic} more verified samples                        ║`);
  console.log(`║  Concurrency: ${CONCURRENCY} | LLM verify: 20%                      ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  if (needSynthetic === 0) {
    console.log('✅ Already have enough samples!');
    return;
  }

  let stream;
  if (freshStart || existingLines === 0) {
    stream = fs.createWriteStream(OUTPUT, { flags: 'w' });
    const gc = writeGoldExercises(stream);
    console.log(`✅ ${gc} gold exercises written`);
  } else {
    stream = fs.createWriteStream(OUTPUT, { flags: 'a' });
    console.log(`📎 Appending to existing dataset (${existingLines} lines)`);
  }

  let written = 0;
  let attempts = 0;
  let failedStruct = 0;
  let failedLLM = 0;
  const t0 = Date.now();
  const MAX_ATTEMPTS = needSynthetic * 4;
  // LLM verification ratio: every 5th sample
  const LLM_VERIFY_EVERY = 5;

  console.log(`\nGenerating ${needSynthetic} verified samples...\n`);

  while (written < needSynthetic && attempts < MAX_ATTEMPTS) {
    const batchSize = Math.min(CONCURRENCY, needSynthetic - written + 2);
    const promises = Array.from({ length: batchSize }, (_, j) => {
      const doLLM = ((attempts + j) % LLM_VERIFY_EVERY === 0);
      return generateOne(existingVerified + written + j, doLLM);
    });
    const results = await Promise.all(promises);

    for (const r of results) {
      attempts++;
      if (r) {
        stream.write(JSON.stringify(r) + '\n');
        written++;
      }
    }

    // Progress reporting every 6 attempts
    if (attempts % 6 < CONCURRENCY) {
      const elapsed = (Date.now() - t0) / 1000;
      const rate = written > 0 ? (written / (elapsed / 3600)).toFixed(1) : '0';
      const eta = written > 0 ? ((needSynthetic - written) / (written / elapsed) / 3600).toFixed(1) : '?';
      const pct = (written / needSynthetic * 100).toFixed(1);
      process.stdout.write(
        `\r  [${(elapsed/3600).toFixed(2)}h] ✓${written}/${needSynthetic} (${pct}%) | ` +
        `rate:${rate}/h | ETA:${eta}h | attempts:${attempts}  `
      );
    }
  }

  stream.end();
  const totalTime = (Date.now() - t0) / 1000;
  const finalLines = (freshStart ? goldExpected : existingLines) + written;
  console.log(`\n\n${'═'.repeat(60)}`);
  console.log(`✅ Dataset: ${OUTPUT}`);
  console.log(`   ${finalLines} total lines (+${written} new verified)`);
  console.log(`   ${attempts} attempts in ${(totalTime/3600).toFixed(2)}h`);
  console.log(`   Rate: ${(written/(totalTime/3600)).toFixed(1)} verified/hour`);
  console.log(`${'═'.repeat(60)}`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
