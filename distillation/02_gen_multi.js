#!/usr/bin/env node
/**
 * AUTOLOGIC — Multi-GPU Dataset Generator v5.0
 *
 * Uses 3 Ollama instances in parallel on pc-stev (torre):
 *   GPU 0 (RTX 5070 Ti): qwen2.5-coder:14b  → text generation (fast)
 *   GPU 1 (RTX 2060):    qwen2.5-coder:7b   → text generation (volume)
 *   CPU  (128GB RAM):    qwen2.5:72b         → verification oracle (quality)
 *
 * Strategy:
 *  - GPU workers generate text from AST templates
 *  - CPU worker (72b) does round-trip verification on a % of samples
 *  - All workers write to the same dataset file (with locking)
 *
 * Run: node 02_gen_multi.js [--samples N] [--fresh] [--verify-pct N]
 */
const fs = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────
const WORKERS = [
  {
    name: 'gpu0-14b',
    url: 'http://10.88.88.1:11434/api/chat',
    model: 'qwen2.5-coder:14b',
    concurrency: 3,      // GPU can pipeline
    timeout: 90_000,
    role: 'generator',    // primary text generation
    options: { temperature: 0.75, num_predict: 800 },
  },
  {
    name: 'gpu1-7b',
    url: 'http://10.88.88.1:11435/api/chat',
    model: 'qwen2.5-coder:7b',
    concurrency: 3,
    timeout: 60_000,
    role: 'generator',    // volume generation
    options: { temperature: 0.8, num_predict: 600 },
  },
  {
    name: 'cpu-72b',
    url: 'http://10.88.88.1:11436/api/chat',
    model: 'qwen2.5:72b',
    concurrency: 1,       // CPU is slower, no pipeline benefit
    timeout: 300_000,     // 5 min — 72b on CPU is slow
    role: 'verifier',     // high-quality verification oracle
    options: { temperature: 0.3, num_predict: 1200, num_gpu: 0 },
  },
];

const DEFAULT_SAMPLES = 3000;
const OUTPUT = path.join(__dirname, 'dataset.jsonl');
const VERIFY_PCT_DEFAULT = 25;    // % of samples verified by 72b oracle

// Parse CLI args
const args = process.argv.slice(2);
const freshStart = args.includes('--fresh');
const samplesIdx = args.indexOf('--samples');
const verifyIdx = args.indexOf('--verify-pct');
const TOTAL_SAMPLES = samplesIdx !== -1 ? parseInt(args[samplesIdx + 1]) : DEFAULT_SAMPLES;
const VERIFY_PCT = verifyIdx !== -1 ? parseInt(args[verifyIdx + 1]) : VERIFY_PCT_DEFAULT;

// ── System prompt (same as llm-parser.ts) ────────
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

// ── Gold Exercises ───────────────────────────────
const GOLD_EXERCISES = [
  { text: 'Si la policía patrulla las calles, entonces no hay delincuentes al acecho. Pero o bien hay delincuentes al acecho o sujetos ebrios fomentando el desorden. La policía patrulla las calles. Luego, hay sujetos ebrios fomentando el desorden.', ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'POLICIA_PATRULLA', text: 'la policía patrulla las calles' }, right: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'DELINCUENTES_ACECHO', text: 'hay delincuentes al acecho' } } } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'OR', left: { type: 'Atom', id: 'DELINCUENTES_ACECHO', text: 'hay delincuentes al acecho' }, right: { type: 'Atom', id: 'SUJETOS_EBRIOS', text: 'sujetos ebrios fomentando el desorden' } } }, { name: 'a3', formulaJSON: { type: 'Atom', id: 'POLICIA_PATRULLA', text: 'la policía patrulla las calles' } } ], conclusions: [{ formulaJSON: { type: 'Atom', id: 'SUJETOS_EBRIOS', text: 'sujetos ebrios fomentando el desorden' } }] } },
  { text: 'Si Pablo Castel vive obsesionado con María Iribarne, entonces la encontrará algún día. Si Pablo Castel encuentra a María Iribarne, entablará una conversación con ella. Es el caso que Pablo Castel vive obsesionado con María Iribarne. Por lo tanto, Pablo Castel entablará una conversación con María Iribarne.', ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'PABLO_OBSESIONADO', text: 'Pablo Castel vive obsesionado con María Iribarne' }, right: { type: 'Atom', id: 'PABLO_ENCUENTRA', text: 'Pablo Castel la encontrará algún día' } } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'PABLO_ENCUENTRA', text: 'Pablo Castel encuentra a María Iribarne' }, right: { type: 'Atom', id: 'PABLO_CONVERSA', text: 'Pablo Castel entablará una conversación con ella' } } }, { name: 'a3', formulaJSON: { type: 'Atom', id: 'PABLO_OBSESIONADO', text: 'Pablo Castel vive obsesionado con María Iribarne' } } ], conclusions: [{ formulaJSON: { type: 'Atom', id: 'PABLO_CONVERSA', text: 'Pablo Castel entablará una conversación con María Iribarne' } }] } },
  { text: 'Si llueve, entonces la calle se moja. Llueve. Por lo tanto, la calle se moja.', ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'LLUEVE', text: 'llueve' }, right: { type: 'Atom', id: 'CALLE_MOJA', text: 'la calle se moja' } } }, { name: 'a2', formulaJSON: { type: 'Atom', id: 'LLUEVE', text: 'llueve' } } ], conclusions: [{ formulaJSON: { type: 'Atom', id: 'CALLE_MOJA', text: 'la calle se moja' } }] } },
  { text: 'Si estudio, entonces apruebo el examen. No aprobé el examen. Por lo tanto, no estudié.', ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'ESTUDIO', text: 'estudio' }, right: { type: 'Atom', id: 'APRUEBO_EXAMEN', text: 'apruebo el examen' } } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'APRUEBO_EXAMEN', text: 'aprobé el examen' } } } ], conclusions: [{ formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'ESTUDIO', text: 'estudié' } } }] } },
  { text: 'Todo mamífero es vertebrado. Todo perro es mamífero. Por lo tanto, todo perro es vertebrado.', ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'ES_MAMIFERO', text: 'ser mamífero' }, right: { type: 'Atom', id: 'ES_VERTEBRADO', text: 'ser vertebrado' } } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'ES_PERRO', text: 'ser perro' }, right: { type: 'Atom', id: 'ES_MAMIFERO', text: 'ser mamífero' } } } ], conclusions: [{ formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'ES_PERRO', text: 'ser perro' }, right: { type: 'Atom', id: 'ES_VERTEBRADO', text: 'ser vertebrado' } } }] } },
  { text: 'O llueve o hace sol. No llueve. Por lo tanto, hace sol.', ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'OR', left: { type: 'Atom', id: 'LLUEVE', text: 'llueve' }, right: { type: 'Atom', id: 'HACE_SOL', text: 'hace sol' } } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'LLUEVE', text: 'llueve' } } } ], conclusions: [{ formulaJSON: { type: 'Atom', id: 'HACE_SOL', text: 'hace sol' } }] } },
  { text: 'Si el contrato es válido, entonces las partes están obligadas. Si las partes están obligadas, entonces deben cumplir. El contrato es válido. Luego, las partes deben cumplir.', ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'CONTRATO_VALIDO', text: 'el contrato es válido' }, right: { type: 'Atom', id: 'PARTES_OBLIGADAS', text: 'las partes están obligadas' } } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'PARTES_OBLIGADAS', text: 'las partes están obligadas' }, right: { type: 'Atom', id: 'DEBEN_CUMPLIR', text: 'las partes deben cumplir' } } }, { name: 'a3', formulaJSON: { type: 'Atom', id: 'CONTRATO_VALIDO', text: 'el contrato es válido' } } ], conclusions: [{ formulaJSON: { type: 'Atom', id: 'DEBEN_CUMPLIR', text: 'las partes deben cumplir' } }] } },
  { text: 'Una persona es culpable si y solo si cometió el delito. Juan no cometió el delito. Luego, Juan no es culpable.', ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IFF', left: { type: 'Atom', id: 'PERSONA_CULPABLE', text: 'persona es culpable' }, right: { type: 'Atom', id: 'COMETIO_DELITO', text: 'cometió el delito' } } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'COMETIO_DELITO', text: 'Juan no cometió el delito' } } } ], conclusions: [{ formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'PERSONA_CULPABLE', text: 'Juan no es culpable' } } }] } },
  { text: 'Toda norma jurídica es válida si y solo si ha sido promulgada por la autoridad competente. Esta norma no ha sido promulgada por la autoridad competente. Luego, esta norma jurídica no es válida.', ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IFF', left: { type: 'Atom', id: 'NORMA_VALIDA', text: 'norma jurídica es válida' }, right: { type: 'Atom', id: 'PROMULGADA_AUTORIDAD', text: 'ha sido promulgada por la autoridad competente' } } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'PROMULGADA_AUTORIDAD', text: 'no ha sido promulgada por la autoridad competente' } } } ], conclusions: [{ formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'NORMA_VALIDA', text: 'esta norma jurídica no es válida' } } }] } },
  { text: 'Si el acusado confiesa, entonces se reduce la pena. Si no confiesa, entonces el juicio continúa. El acusado confiesa o no confiesa. Luego, se reduce la pena o el juicio continúa.', ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'ACUSADO_CONFIESA', text: 'el acusado confiesa' }, right: { type: 'Atom', id: 'REDUCE_PENA', text: 'se reduce la pena' } } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'ACUSADO_CONFIESA', text: 'el acusado no confiesa' } }, right: { type: 'Atom', id: 'JUICIO_CONTINUA', text: 'el juicio continúa' } } }, { name: 'a3', formulaJSON: { type: 'Connective', operator: 'OR', left: { type: 'Atom', id: 'ACUSADO_CONFIESA', text: 'el acusado confiesa' }, right: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'ACUSADO_CONFIESA', text: 'el acusado no confiesa' } } } } ], conclusions: [{ formulaJSON: { type: 'Connective', operator: 'OR', left: { type: 'Atom', id: 'REDUCE_PENA', text: 'se reduce la pena' }, right: { type: 'Atom', id: 'JUICIO_CONTINUA', text: 'el juicio continúa' } } }] } },
  { text: 'La Tierra gira alrededor del Sol y la Luna gira alrededor de la Tierra. Luego, la Tierra gira alrededor del Sol.', ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'AND', left: { type: 'Atom', id: 'TIERRA_GIRA_SOL', text: 'la Tierra gira alrededor del Sol' }, right: { type: 'Atom', id: 'LUNA_GIRA_TIERRA', text: 'la Luna gira alrededor de la Tierra' } } } ], conclusions: [{ formulaJSON: { type: 'Atom', id: 'TIERRA_GIRA_SOL', text: 'la Tierra gira alrededor del Sol' } }] } },
  { text: 'Si el equipo de atletismo se está preparando adecuadamente entonces estará en condiciones de asistir a las próximas olimpiadas. Y estará en condiciones de asistir a las próximas olimpiadas si y sólo si el equipo cuenta con un plantel competente. Pero o el equipo no cuenta con un plantel competente o uno de sus integrantes está lesionado. Sucede que ningún integrante del plantel está lesionado. Por lo tanto, el equipo de atletismo no se está preparando adecuadamente.', ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'EQUIPO_PREPARA', text: 'el equipo de atletismo se está preparando adecuadamente' }, right: { type: 'Atom', id: 'CONDICIONES_OLIMPIADAS', text: 'estará en condiciones de asistir a las próximas olimpiadas' } } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IFF', left: { type: 'Atom', id: 'CONDICIONES_OLIMPIADAS', text: 'estará en condiciones de asistir a las próximas olimpiadas' }, right: { type: 'Atom', id: 'PLANTEL_COMPETENTE', text: 'el equipo cuenta con un plantel competente' } } }, { name: 'a3', formulaJSON: { type: 'Connective', operator: 'OR', left: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'PLANTEL_COMPETENTE', text: 'el equipo cuenta con un plantel competente' } }, right: { type: 'Atom', id: 'INTEGRANTE_LESIONADO', text: 'uno de sus integrantes está lesionado' } } }, { name: 'a4', formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'INTEGRANTE_LESIONADO', text: 'ningún integrante del plantel está lesionado' } } } ], conclusions: [{ formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'EQUIPO_PREPARA', text: 'el equipo de atletismo no se está preparando adecuadamente' } } }] } },
  { text: 'Si Daniel no toca la guitarra, entonces la tocará Henry. Si Henry toca la guitarra, Antonio abandonará el grupo. Antonio no ha abandonado el grupo. Luego, Daniel toca la guitarra.', ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'DANIEL_GUITARRA', text: 'Daniel toca la guitarra' } }, right: { type: 'Atom', id: 'HENRY_GUITARRA', text: 'Henry toca la guitarra' } } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'HENRY_GUITARRA', text: 'Henry toca la guitarra' }, right: { type: 'Atom', id: 'ANTONIO_ABANDONA', text: 'Antonio abandonará el grupo' } } }, { name: 'a3', formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'ANTONIO_ABANDONA', text: 'Antonio abandonó el grupo' } } } ], conclusions: [{ formulaJSON: { type: 'Atom', id: 'DANIEL_GUITARRA', text: 'Daniel toca la guitarra' } }] } },
  { text: 'Cuando se produce el fenómeno del niño se generan lluvias torrenciales y huaycos. Pero no se producen lluvias torrenciales o huaycos. Por lo tanto, no se ha producido el fenómeno del niño.', ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'FENOMENO_NINO', text: 'se produce el fenómeno del niño' }, right: { type: 'Connective', operator: 'AND', left: { type: 'Atom', id: 'LLUVIAS_TORRENCIALES', text: 'se generan lluvias torrenciales' }, right: { type: 'Atom', id: 'HUAYCOS', text: 'se generan huaycos' } } } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Connective', operator: 'OR', left: { type: 'Atom', id: 'LLUVIAS_TORRENCIALES', text: 'se producen lluvias torrenciales' }, right: { type: 'Atom', id: 'HUAYCOS', text: 'se producen huaycos' } } } } ], conclusions: [{ formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'FENOMENO_NINO', text: 'se ha producido el fenómeno del niño' } } }] } },
  { text: 'Si la empresa obtiene ganancias, entonces repartirá dividendos a los accionistas. La empresa no repartirá dividendos a los accionistas. Luego, la empresa no obtuvo ganancias.', ast: { axioms: [ { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'EMPRESA_GANANCIAS', text: 'la empresa obtiene ganancias' }, right: { type: 'Atom', id: 'REPARTE_DIVIDENDOS', text: 'repartirá dividendos a los accionistas' } } }, { name: 'a2', formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'REPARTE_DIVIDENDOS', text: 'la empresa no repartirá dividendos' } } } ], conclusions: [{ formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'EMPRESA_GANANCIAS', text: 'la empresa no obtuvo ganancias' } } }] } },
];

// ── AST Templates (16 patterns) ─────────────────
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

// ── Vocabulary pools (30) ────────────────────────
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
  return [shuffled[0][0], shuffled[0][1], shuffled[0][2], shuffled[0][3],
          shuffled[0][4], shuffled[0][5], shuffled[0][6], shuffled[0][7]];
}

// ── API call with worker config ──────────────────
async function callWorker(worker, messages) {
  for (let attempt = 0; attempt <= 3; attempt++) {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), worker.timeout);
      const response = await fetch(worker.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: worker.model,
          messages,
          stream: false,
          options: worker.options,
        }),
        signal: ctrl.signal,
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
      if (attempt === 3) throw e;
      await sleep(1000 * (attempt + 1));
    }
  }
}

// ── Text generation from AST ─────────────────────
async function generateText(worker, ast, pattern) {
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
  return await callWorker(worker, [{ role: 'user', content: prompt }]);
}

// ── Local structural verification ────────────────
function verifyStructurally(text) {
  if (!text || text.length < 30 || text.length > 2000) return false;
  if (text.includes('"type"') || text.includes('"formulaJSON"')) return false;
  if (text.includes('```') || text.includes('LogicNode')) return false;
  const lowerText = text.toLowerCase();
  const englishWords = ['the ', 'therefore', 'hence', 'thus', 'given that', 'if and only if'];
  if (englishWords.filter(w => lowerText.includes(w)).length >= 2) return false;
  const spanishMarkers = ['si ', 'entonces', 'por lo tanto', 'luego', 'dado que', 'puesto que',
    'en consecuencia', 'cuando', 'habida cuenta', 'siempre que', 'de modo que', 'así pues',
    'no obstante', 'sin embargo', 'debido a', 'conforme', 'según', 'mediante', 'respecto',
    'toda vez', 'por cuanto', 'en virtud', 'bien', 'pero', 'sea', 'caso', 'derecho',
    'obligación', 'contrato', 'norma', 'ley', 'juicio', 'sentencia', 'recurso'];
  if (spanishMarkers.filter(w => lowerText.includes(w)).length < 1) return false;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  if (sentences.length < 1 || sentences.length > 10) return false;
  return true;
}

// ── LLM round-trip verification (72b oracle) ─────
async function verifyWithOracle(text, expectedAST) {
  const verifier = WORKERS.find(w => w.role === 'verifier');
  if (!verifier) return true; // No verifier available
  try {
    const result = await callWorker(verifier, [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Formalize this text:\n\n${text}` },
    ]);
    const cleaned = result.replace(/^```json?\s*/m, '').replace(/```\s*$/m, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!parsed.axioms || !Array.isArray(parsed.axioms)) return false;
    if (!parsed.conclusions || !Array.isArray(parsed.conclusions)) return false;
    // Check structural similarity
    if (Math.abs(parsed.axioms.length - expectedAST.axioms.length) > 1) return false;
    if (Math.abs(parsed.conclusions.length - expectedAST.conclusions.length) > 1) return false;
    return true;
  } catch {
    return false;
  }
}

// ── Gold exercise writer ─────────────────────────
function writeGoldExercises(stream) {
  let count = 0;
  for (const gold of GOLD_EXERCISES) {
    stream.write(JSON.stringify({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Formalize this text:\n\n${gold.text}` },
        { role: 'assistant', content: JSON.stringify(gold.ast) },
      ],
      metadata: { pattern: 'gold_exercise', verified: true, index: count, source: 'test_suite' },
    }) + '\n');
    count++;
  }
  const prefixes = [
    'Analyze and formalize the following argument:\n\n',
    'Extract the logical structure from this text:\n\n',
    'Parse the following text into formal propositional logic:\n\n',
  ];
  for (const gold of GOLD_EXERCISES) {
    for (const prefix of prefixes) {
      stream.write(JSON.stringify({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `${prefix}${gold.text}` },
          { role: 'assistant', content: JSON.stringify(gold.ast) },
        ],
        metadata: { pattern: 'gold_exercise_variant', verified: true, index: count, source: 'test_suite' },
      }) + '\n');
      count++;
    }
  }
  return count;
}

// ── Generate one sample using a specific worker (no oracle blocking) ──
async function generateOne(worker, idx) {
  const template = pick(TEMPLATES);
  const vars = generateVars();
  const { pattern, ast } = template(vars);
  try {
    const text = await generateText(worker, ast, pattern);
    if (!verifyStructurally(text)) return { ok: false, reason: 'struct' };

    return {
      ok: true,
      text,
      pattern,
      ast,
      sample: {
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Formalize this text:\n\n${text}` },
          { role: 'assistant', content: JSON.stringify(ast) },
        ],
        metadata: {
          pattern,
          verified: true,
          oracle_verified: false,
          worker: worker.name,
          index: idx,
        },
      },
    };
  } catch (e) {
    return { ok: false, reason: 'error', error: e.message };
  }
}

// ── GPU Worker loop (never blocks on oracle) ────
async function workerLoop(worker, state) {
  const isGenerator = worker.role === 'generator';
  if (!isGenerator) return;

  while (state.written < state.target && state.attempts < state.maxAttempts) {
    const batch = Math.min(worker.concurrency, state.target - state.written + 2);
    const promises = Array.from({ length: batch }, () => {
      const idx = state.nextIdx++;
      state.attempts++;
      return generateOne(worker, idx);
    });

    const results = await Promise.all(promises);

    for (const r of results) {
      if (r.ok) {
        // Write immediately — GPU never waits for oracle
        state.stream.write(JSON.stringify(r.sample) + '\n');
        state.written++;
        state.byWorker[worker.name] = (state.byWorker[worker.name] || 0) + 1;
        process.stdout.write(worker.name === 'gpu0-14b' ? '●' : '○');

        // Enqueue for async oracle verification (probabilistic)
        if (Math.random() * 100 < VERIFY_PCT) {
          state.oracleQueue.push({ text: r.text, ast: r.ast, pattern: r.pattern });
        }
      } else {
        state.failed++;
        process.stdout.write(r.reason === 'struct' ? '✗' : '✗');
      }
    }

    printProgress(state);
  }
}

// ── Async Oracle verification loop (runs independently) ──
async function oracleLoop(state) {
  const verifier = WORKERS.find(w => w.role === 'verifier');
  if (!verifier) return;

  while (!state.generationDone || state.oracleQueue.length > 0) {
    if (state.oracleQueue.length === 0) {
      await sleep(2000);
      continue;
    }
    const item = state.oracleQueue.shift();
    try {
      const ok = await verifyWithOracle(item.text, item.ast);
      if (ok) {
        state.oracleVerified++;
      } else {
        state.oracleFailed++;
      }
      state.oracleProcessed++;
      printProgress(state);
    } catch {
      state.oracleFailed++;
      state.oracleProcessed++;
    }
  }
}

// ── Progress printer ─────────────────────────────
function printProgress(state) {
  const elapsed = (Date.now() - state.t0) / 1000;
  const rate = state.written > 0 ? (state.written / (elapsed / 3600)).toFixed(0) : '0';
  const eta = state.written > 0 ? ((state.target - state.written) / (state.written / elapsed) / 3600).toFixed(1) : '?';
  const pct = (state.written / state.target * 100).toFixed(1);
  const oq = state.oracleQueue.length;
  process.stdout.write(
    `\r  [${(elapsed / 3600).toFixed(2)}h] ✓${state.written}/${state.target} (${pct}%) | ` +
    `rate:${rate}/h | ETA:${eta}h | oracle✓:${state.oracleVerified}/${state.oracleProcessed} q:${oq} | ` +
    `${Object.entries(state.byWorker).map(([k, v]) => `${k}:${v}`).join(' ')}  `
  );
}

// ── Health check ─────────────────────────────────
async function healthCheck() {
  const results = [];
  for (const w of WORKERS) {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 10_000);
      const resp = await fetch(w.url.replace('/api/chat', '/api/tags'), { signal: ctrl.signal });
      clearTimeout(timeout);
      if (resp.ok) {
        results.push({ name: w.name, status: '✅', model: w.model });
      } else {
        results.push({ name: w.name, status: '❌', error: `HTTP ${resp.status}` });
      }
    } catch (e) {
      results.push({ name: w.name, status: '❌', error: e.message?.substring(0, 50) });
    }
  }
  return results;
}

// ── Main ─────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  AUTOLOGIC — Multi-GPU Dataset Generator v5.0              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  // Health check
  console.log('🔍 Checking worker endpoints...');
  const health = await healthCheck();
  for (const h of health) {
    console.log(`   ${h.status} ${h.name} (${h.model || h.error})`);
  }
  const aliveGenerators = health.filter(h => h.status === '✅' &&
    WORKERS.find(w => w.name === h.name)?.role === 'generator');
  if (aliveGenerators.length === 0) {
    console.error('\n❌ No generator workers available. Run setup_multi_ollama.sh first.');
    process.exit(1);
  }
  const activeWorkers = WORKERS.filter(w =>
    health.find(h => h.name === w.name)?.status === '✅');
  console.log(`\n   Active workers: ${activeWorkers.map(w => w.name).join(', ')}`);

  // Count existing
  let existingLines = 0;
  let existingVerified = 0;
  if (!freshStart && fs.existsSync(OUTPUT)) {
    const content = fs.readFileSync(OUTPUT, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    existingLines = lines.length;
    let goldCount = 0;
    for (const line of lines) {
      try {
        const d = JSON.parse(line);
        if (d.metadata?.source === 'test_suite' || d.metadata?.pattern?.startsWith('gold')) goldCount++;
      } catch {}
    }
    existingVerified = existingLines - goldCount;
  }

  const needSynthetic = Math.max(0, TOTAL_SAMPLES - existingVerified);

  console.log('');
  console.log(`   📊 Existing: ${existingLines} lines (${existingVerified} synthetic)`);
  console.log(`   🎯 Target: ${TOTAL_SAMPLES} synthetic samples`);
  console.log(`   📝 Need: ${needSynthetic} more`);
  console.log(`   🔬 Oracle verification: ${VERIFY_PCT}% of samples`);
  console.log('');

  if (needSynthetic === 0) {
    console.log('✅ Already have enough samples!');
    return;
  }

  // Prepare output stream
  let stream;
  if (freshStart || existingLines === 0) {
    stream = fs.createWriteStream(OUTPUT, { flags: 'w' });
    const gc = writeGoldExercises(stream);
    console.log(`✅ ${gc} gold exercises written`);
  } else {
    stream = fs.createWriteStream(OUTPUT, { flags: 'a' });
    console.log(`📎 Appending to existing dataset (${existingLines} lines)`);
  }

  // Shared state with async oracle queue
  const state = {
    written: 0,
    target: needSynthetic,
    attempts: 0,
    maxAttempts: needSynthetic * 4,
    failed: 0,
    oracleVerified: 0,
    oracleFailed: 0,
    oracleProcessed: 0,
    oracleQueue: [],           // async queue for oracle verification
    generationDone: false,     // signal for oracle loop to stop
    nextIdx: existingVerified,
    byWorker: {},
    stream,
    t0: Date.now(),
  };

  const genCount = activeWorkers.filter(w => w.role === 'generator').length;
  const hasOracle = activeWorkers.some(w => w.role === 'verifier');
  console.log(`\n🚀 Generating ${needSynthetic} samples with ${genCount} GPU workers${hasOracle ? ' + async oracle (72b CPU)' : ''}...\n`);

  // Launch GPU generators + oracle loop IN PARALLEL (non-blocking)
  const generators = activeWorkers.filter(w => w.role === 'generator');
  const genPromise = Promise.all(generators.map(w => workerLoop(w, state)));
  const oraclePromise = hasOracle ? oracleLoop(state) : Promise.resolve();

  // Wait for generation to finish first
  await genPromise;
  state.generationDone = true;
  console.log('\n\n   ⏳ GPU generation done. Draining oracle queue...');

  // Wait for remaining oracle verifications (with timeout)
  const oracleTimeout = setTimeout(() => {
    state.oracleQueue.length = 0; // drain if stuck
  }, 600_000); // 10 min max for remaining oracle
  await oraclePromise;
  clearTimeout(oracleTimeout);

  stream.end();
  const totalTime = (Date.now() - state.t0) / 1000;
  const finalLines = (freshStart ? GOLD_EXERCISES.length * 4 : existingLines) + state.written;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ Dataset generation complete!`);
  console.log(`   📁 ${OUTPUT}`);
  console.log(`   📊 ${finalLines} total lines (+${state.written} new)`);
  console.log(`   ⏱️  ${(totalTime / 3600).toFixed(2)} hours`);
  console.log(`   📈 Rate: ${(state.written / (totalTime / 3600)).toFixed(0)} samples/hour`);
  console.log(`   🔬 Oracle: ${state.oracleVerified}/${state.oracleProcessed} verified (${state.oracleProcessed > 0 ? (state.oracleVerified / state.oracleProcessed * 100).toFixed(0) : 0}%)`);
  console.log(`   📋 By worker:`);
  for (const [k, v] of Object.entries(state.byWorker)) {
    console.log(`       ${k}: ${v} samples`);
  }
  console.log(`   ❌ Failed: ${state.failed} (oracle rejected: ${state.oracleFailed})`);
  console.log(`${'═'.repeat(60)}`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
