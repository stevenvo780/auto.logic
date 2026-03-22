#!/usr/bin/env node
/**
 * AUTOLOGIC — Generador de Dataset Sintético Masivo
 * Usa el servidor Ollama de la torre (10.88.88.1:11434) con qwen2.5-coder:14b
 * para crear pares perfectos de (Texto Jurídico Ofuscado -> AST JSON).
 *
 * Ejecutar: node distillation/01_dataset_generator.js
 */
const fs = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────
const OLLAMA_URL = 'http://10.88.88.1:11434/api/chat';
const MODEL = 'qwen2.5-coder:14b';
const TOTAL_SAMPLES = 1000;
const OUTPUT = path.join(__dirname, 'dataset.jsonl');
const CONCURRENCY = 8;
// ────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Autologic's semantic AST parser.
Your goal is to read complex human text (often obfuscated legal/technical jargon) and translate it into Situated Propositional Logic.
DO NOT try to resolve or prove the logic. Only extract the claims and their semantic relations.
AVOID deep First-Order combinatorial explosions. Collapse contextual instances into descriptive propositional atoms like: 'CumpleInformesOrdinarios'.

You MUST return a pure JSON object conforming exactly to this interface, nothing else:
{
  "axioms": [ { "name": "a1", "formulaJSON": { "type": "Connective", "operator": "IMPLIES", "left": {...}, "right": {...} } } ],
  "conclusions": [ { "formulaJSON": { "type": "Atom", "id": "X", "text": "..." } } ]
}
Available node types for formulaJSON:
- AtomNode: { "type": "Atom", "id": "CAMEL_CASE_ID", "text": "human readable" }
- ConnectiveNode: { "type": "Connective", "operator": "AND"|"OR"|"IMPLIES"|"IFF"|"NOT", "left": node, "right": node }
- ModalNode: { "type": "Modal", "operator": "K"|"B"|"O"|"P"|"BOX"|"DIA", "child": node }
- QuantifierNode: { "type": "Quantifier", "operator": "FORALL"|"EXISTS", "variables": ["x"], "child": node }

Be precise. Return ONLY the raw JSON object. No markdown, no explanation, no codeblocks.`;

// ── Seed AST Templates (High Diversity) ─────────
const TEMPLATES = [
  // MODUS PONENS
  (v) => ({ pattern: 'modus_ponens', ast: {
    axioms: [
      { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } },
      { name: 'a2', formulaJSON: { type: 'Atom', id: v[0], text: v[2] } }
    ],
    conclusions: [{ formulaJSON: { type: 'Atom', id: v[1], text: v[3] } }]
  }}),
  // MODUS TOLLENS
  (v) => ({ pattern: 'modus_tollens', ast: {
    axioms: [
      { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } },
      { name: 'a2', formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: v[1], text: v[3] } } }
    ],
    conclusions: [{ formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: v[0], text: v[2] } } }]
  }}),
  // HYPOTHETICAL SYLLOGISM
  (v) => ({ pattern: 'hypothetical_syllogism', ast: {
    axioms: [
      { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } },
      { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[1], text: v[3] }, right: { type: 'Atom', id: v[4], text: v[5] } } }
    ],
    conclusions: [{ formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[4], text: v[5] } } }]
  }}),
  // DISJUNCTIVE SYLLOGISM
  (v) => ({ pattern: 'disjunctive_syllogism', ast: {
    axioms: [
      { name: 'a1', formulaJSON: { type: 'Connective', operator: 'OR', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } },
      { name: 'a2', formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: v[0], text: v[2] } } }
    ],
    conclusions: [{ formulaJSON: { type: 'Atom', id: v[1], text: v[3] } }]
  }}),
  // CONJUNCTION
  (v) => ({ pattern: 'conjunction', ast: {
    axioms: [
      { name: 'a1', formulaJSON: { type: 'Atom', id: v[0], text: v[2] } },
      { name: 'a2', formulaJSON: { type: 'Atom', id: v[1], text: v[3] } }
    ],
    conclusions: [{ formulaJSON: { type: 'Connective', operator: 'AND', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } }]
  }}),
  // BICONDITIONAL
  (v) => ({ pattern: 'biconditional', ast: {
    axioms: [
      { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IFF', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } },
      { name: 'a2', formulaJSON: { type: 'Atom', id: v[0], text: v[2] } }
    ],
    conclusions: [{ formulaJSON: { type: 'Atom', id: v[1], text: v[3] } }]
  }}),
  // CHAIN 3
  (v) => ({ pattern: 'chain_3', ast: {
    axioms: [
      { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } },
      { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[1], text: v[3] }, right: { type: 'Atom', id: v[4], text: v[5] } } },
      { name: 'a3', formulaJSON: { type: 'Atom', id: v[0], text: v[2] } }
    ],
    conclusions: [{ formulaJSON: { type: 'Atom', id: v[4], text: v[5] } }]
  }}),
  // CONJUNCTION ANTECEDENT
  (v) => ({ pattern: 'conj_antecedent', ast: {
    axioms: [
      { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Connective', operator: 'AND', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } }, right: { type: 'Atom', id: v[4], text: v[5] } } },
      { name: 'a2', formulaJSON: { type: 'Atom', id: v[0], text: v[2] } },
      { name: 'a3', formulaJSON: { type: 'Atom', id: v[1], text: v[3] } }
    ],
    conclusions: [{ formulaJSON: { type: 'Atom', id: v[4], text: v[5] } }]
  }}),
  // PREMISES ONLY
  (v) => ({ pattern: 'premises_only', ast: {
    axioms: [
      { name: 'a1', formulaJSON: { type: 'Atom', id: v[0], text: v[2] } },
      { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } }
    ],
    conclusions: []
  }}),
  // DEONTIC OBLIGATION
  (v) => ({ pattern: 'deontic_obligation', ast: {
    axioms: [
      { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Modal', operator: 'O', child: { type: 'Atom', id: v[1], text: v[3] } } } },
      { name: 'a2', formulaJSON: { type: 'Atom', id: v[0], text: v[2] } }
    ],
    conclusions: [{ formulaJSON: { type: 'Modal', operator: 'O', child: { type: 'Atom', id: v[1], text: v[3] } } }]
  }}),
];

// ── Vocabulary ───────────────────────────────────
const ATOMS_POOL = [
  ['DictamenFavorable', 'PublicacionRevista', 'dictamen favorable de los evaluadores', 'publicación en la revista'],
  ['ContratoFirmado', 'ObligacionPago', 'contrato firmado por ambas partes', 'obligación de pago exigible'],
  ['PlazoVencido', 'MoraAutomatica', 'plazo contractual vencido', 'mora se configura automáticamente'],
  ['PruebaAdmitida', 'HechoAcreditado', 'prueba fue debidamente admitida', 'hecho queda acreditado procesalmente'],
  ['SentenciaCondenatoria', 'RecursoApelacion', 'sentencia es condenatoria', 'procede recurso de apelación'],
  ['InformePericial', 'ResponsabilidadCivil', 'informe pericial acredita el daño', 'responsabilidad civil del demandado'],
  ['NotificacionLegal', 'TerminoProcesal', 'notificación realizada conforme a derecho', 'término procesal comienza a correr'],
  ['ClausulaAbusiva', 'NulidadParcial', 'cláusula declarada abusiva', 'nulidad parcial del contrato'],
  ['RegistroCatastral', 'DerechoPropiedad', 'registro catastral actualizado', 'derecho de propiedad oponible'],
  ['AudienciaPreliminar', 'AdmisionDemanda', 'audiencia preliminar celebrada', 'demanda admitida a trámite'],
  ['CumplimientoRequisitos', 'AutorizacionFinal', 'cumplimiento de todos los requisitos', 'autorización final del organismo'],
  ['VotacionMayoritaria', 'AprobacionReforma', 'votación por mayoría calificada', 'aprobación de la reforma'],
  ['TesisAprobada', 'TituloOtorgado', 'tesis fue aprobada por el jurado', 'título profesional otorgado'],
  ['CreditosCompletos', 'GraduacionHabilitada', 'créditos académicos completos', 'graduación habilitada'],
  ['InvestigacionPublicada', 'ReconocimientoAcademico', 'investigación publicada en revista indexada', 'reconocimiento académico procedente'],
  ['ExamenAprobado', 'PromocionNivel', 'examen final aprobado', 'promoción al siguiente nivel'],
  ['BecaOtorgada', 'MatriculaExenta', 'beca académica otorgada', 'matrícula queda exenta de pago'],
  ['SolicitudRadicada', 'TramiteIniciado', 'solicitud debidamente radicada', 'trámite administrativo iniciado'],
  ['LicenciaVigente', 'OperacionPermitida', 'licencia de operación vigente', 'operación comercial permitida'],
  ['AuditoriaFavorable', 'CertificacionEmitida', 'auditoría con resultado favorable', 'certificación de cumplimiento emitida'],
  ['PagoRealizado', 'DeudaExtinguida', 'pago total realizado', 'deuda queda extinguida'],
  ['InspeccionAprobada', 'PermisoOperacion', 'inspección sanitaria aprobada', 'permiso de operación otorgado'],
  ['DocumentacionCompleta', 'TramiteAdmitido', 'documentación entregada completa', 'trámite admitido a evaluación'],
  ['PresupuestoAprobado', 'EjecucionAutorizada', 'presupuesto aprobado por junta', 'ejecución de recursos autorizada'],
  ['QuorumAlcanzado', 'SesionValida', 'quórum alcanzado', 'sesión es válida jurídicamente'],
  ['PeritajeContable', 'DeterminacionMonto', 'peritaje contable concluido', 'determinación del monto indemnizatorio'],
  ['ConsentimientoInformado', 'ProcedimientoValido', 'consentimiento informado firmado', 'procedimiento médico es válido'],
  ['FianzaConstituida', 'LiberacionCautelar', 'fianza debidamente constituida', 'liberación cautelar procede'],
  ['PrescripcionAdquisitiva', 'DominioReconocido', 'prescripción adquisitiva acreditada', 'dominio sobre el bien reconocido'],
  ['ActaNotarial', 'FePublica', 'acta notarial levantada', 'fe pública sobre los hechos'],
];

// ── Helpers ──────────────────────────────────────
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

function generateVars() {
  const shuffled = shuffle(ATOMS_POOL);
  const a = shuffled[0];
  const b = shuffled[1];
  return [a[0], a[1], a[2], a[3], b[0], b[2]];
}

async function callOllama(messages, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 60000);
      const response = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, messages, stream: false, options: { temperature: 0.7, num_predict: 600 } }),
        signal: ctrl.signal
      });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.message.content.trim();
    } catch (e) {
      if (attempt === retries) throw e;
      await sleep(2000);
    }
  }
}

async function generateText(ast, pattern) {
  const prompt = `Eres un redactor jurídico-académico experto en español. Escribe UN SOLO párrafo formal, burocrático y denso que represente EXACTAMENTE la siguiente estructura lógica. El patrón lógico subyacente es "${pattern}".

Reglas:
- Usa lenguaje jurídico/académico formal colombiano o español
- NO agregues hechos ni relaciones que no estén en la estructura
- Usa conectores naturales ("si", "entonces", "por lo tanto", "en consecuencia", "siempre que", "dado que")
- Varía el estilo: a veces empieza con la conclusión, a veces con las premisas
- NO uses formato de lista ni numeración
- Escribe entre 2 y 4 oraciones
- NO incluyas explicaciones meta ni comentarios sobre tu proceso

Estructura:
${JSON.stringify(ast, null, 2)}

Párrafo:`;
  return await callOllama([{ role: 'user', content: prompt }]);
}

async function verifyExtraction(text, expectedAST) {
  try {
    const result = await callOllama([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Formalize this text:\n\n${text}` }
    ]);
    const parsed = JSON.parse(result);
    if (!parsed.axioms || !Array.isArray(parsed.axioms)) return null;
    if (!parsed.conclusions || !Array.isArray(parsed.conclusions)) return null;
    if (Math.abs(parsed.axioms.length - expectedAST.axioms.length) > 1) return null;
    return parsed;
  } catch { return null; }
}

// ── Main ─────────────────────────────────────────
async function generateOne(idx) {
  const template = pick(TEMPLATES);
  const vars = generateVars();
  const { pattern, ast } = template(vars);
  try {
    const text = await generateText(ast, pattern);
    if (!text || text.length < 30) return null;
    const verified = await verifyExtraction(text, ast);
    process.stdout.write(verified ? '✓' : '⚠');
    return {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Formalize this text:\n\n${text}` },
        { role: 'assistant', content: JSON.stringify(ast) }
      ],
      metadata: { pattern, verified: !!verified, index: idx }
    };
  } catch (e) {
    process.stdout.write('✗');
    return null;
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  AUTOLOGIC — Dataset Sintético Generator v2.0              ║');
  console.log(`║  Samples: ${TOTAL_SAMPLES} | Model: ${MODEL}              ║`);
  console.log(`║  Server: ${OLLAMA_URL}            ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  const stream = fs.createWriteStream(OUTPUT, { flags: 'a' });
  let generated = 0, failed = 0, verified = 0;
  const t0 = Date.now();

  for (let batch = 0; generated < TOTAL_SAMPLES; batch++) {
    const batchSize = Math.min(CONCURRENCY, TOTAL_SAMPLES - generated);
    const promises = Array.from({ length: batchSize }, (_, j) => generateOne(generated + j));
    const results = await Promise.all(promises);
    for (const r of results) {
      if (r) { stream.write(JSON.stringify(r) + '\n'); generated++; if (r.metadata.verified) verified++; }
      else failed++;
    }
    if ((generated + failed) % 20 < CONCURRENCY) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      const rate = (generated / (elapsed / 60)).toFixed(1);
      console.log(`\n  [${elapsed}s] ✓${generated} ✗${failed} V:${verified} | ${rate}/min`);
    }
  }

  stream.end();
  const totalTime = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n\n✅ Dataset: ${OUTPUT}`);
  console.log(`   ${generated} samples | ${verified} verified | ${failed} failed | ${totalTime}s`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
