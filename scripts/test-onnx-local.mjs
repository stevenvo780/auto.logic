#!/usr/bin/env node
/**
 * E2E test: Load ONNX int8 model from src/model-web/ via Transformers.js
 * and verify it produces valid Autologic AST JSON.
 */
import { pipeline, env } from '@huggingface/transformers';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODEL_DIR = resolve(__dirname, '..', 'src', 'model-web');
const MODEL_PARENT = resolve(__dirname, '..', 'src');

// Force local model loading, disable remote
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = MODEL_PARENT;  // Transformers.js appends model name to this

console.log('═══════════════════════════════════════════════════');
console.log('  Autologic ONNX E2E Test — Transformers.js');
console.log('═══════════════════════════════════════════════════');
console.log(`Model dir: ${MODEL_DIR}`);

// Verify model files exist
const requiredFiles = ['onnx/model.onnx', 'tokenizer.json', 'config.json'];
for (const f of requiredFiles) {
  try {
    readFileSync(resolve(MODEL_DIR, f));
    console.log(`  ✓ ${f}`);
  } catch {
    console.error(`  ✗ ${f} — MISSING`);
    process.exit(1);
  }
}

console.log('\n▸ Loading pipeline (text-generation)...');
const t0 = Date.now();

let generator;
try {
  generator = await pipeline('text-generation', 'model-web', {
    quantized: false,  // already int8, no further quant needed
    local_files_only: true,
  });
} catch (e) {
  console.error('Pipeline load FAILED:', e.message);
  console.error('Full error:', e);
  process.exit(1);
}

const loadMs = Date.now() - t0;
console.log(`  ✓ Pipeline loaded in ${loadMs}ms`);

// System prompt (EXACTLY as used during training)
const systemPrompt = `You are Autologic's semantic AST parser.
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

// Test cases
const testCases = [
  {
    name: 'Modus Ponens simple',
    input: 'Si el contrato es valido entonces las partes estan obligadas. El contrato es valido.',
    expectAxioms: true,
    expectConclusions: true,
  },
  {
    name: 'Conjunción',
    input: 'La empresa es solvente y la empresa tiene licencia.',
    expectAxioms: true,
    expectConclusions: false,
  },
  {
    name: 'Silogismo hipotético',
    input: 'Si llueve entonces el suelo esta mojado. Si el suelo esta mojado entonces hay riesgo de caida. Llueve.',
    expectAxioms: true,
    expectConclusions: true,
  },
];

let passed = 0;
let failed = 0;

for (const tc of testCases) {
  console.log(`\n▸ Test: ${tc.name}`);
  console.log(`  Input: "${tc.input}"`);

  const prompt = `<|im_start|>system\n${systemPrompt}<|im_end|>\n<|im_start|>user\nFormalize this text:\n\n${tc.input}<|im_end|>\n<|im_start|>assistant\n`;

  const t1 = Date.now();
  let output;
  try {
    output = await generator(prompt, {
      max_new_tokens: 512,
      temperature: 0.1,
      do_sample: false,
      return_full_text: false,
    });
  } catch (e) {
    console.error(`  ✗ Inference error: ${e.message}`);
    failed++;
    continue;
  }
  const inferMs = Date.now() - t1;

  const rawText = output[0]?.generated_text || '';
  console.log(`  Inference: ${inferMs}ms`);
  console.log(`  Raw output (first 500 chars):\n    ${rawText.substring(0, 500).replace(/\n/g, '\n    ')}`);

  // Try to parse JSON
  let parsed;
  try {
    // Try to extract the first complete JSON object from response
    let braceCount = 0;
    let jsonStart = -1;
    let jsonEnd = -1;
    for (let i = 0; i < rawText.length; i++) {
      if (rawText[i] === '{') {
        if (jsonStart === -1) jsonStart = i;
        braceCount++;
      } else if (rawText[i] === '}') {
        braceCount--;
        if (braceCount === 0 && jsonStart !== -1) {
          jsonEnd = i + 1;
          break;
        }
      }
    }
    const jsonStr = jsonEnd > 0 ? rawText.substring(jsonStart, jsonEnd) : rawText;
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    console.error(`  ✗ JSON parse failed: ${e.message}`);
    failed++;
    continue;
  }

  // Validate structure
  const hasAxioms = Array.isArray(parsed.axioms) && parsed.axioms.length > 0;
  const hasConclusions = Array.isArray(parsed.conclusions) && parsed.conclusions.length > 0;

  const axiomOk = tc.expectAxioms ? hasAxioms : true;
  const conclusionOk = tc.expectConclusions ? hasConclusions : true;

  if (axiomOk && conclusionOk && parsed.axioms) {
    // Verify each axiom has formulaJSON with type
    const allValid = parsed.axioms.every(a => a.formulaJSON && a.formulaJSON.type);
    if (allValid) {
      console.log(`  ✓ PASS — axioms: ${parsed.axioms.length}, conclusions: ${parsed.conclusions?.length || 0}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL — axiom formulaJSON structure invalid`);
      console.error(`    Parsed:`, JSON.stringify(parsed, null, 2).substring(0, 300));
      failed++;
    }
  } else {
    console.error(`  ✗ FAIL — hasAxioms=${hasAxioms} (expected=${tc.expectAxioms}), hasConclusions=${hasConclusions} (expected=${tc.expectConclusions})`);
    console.error(`    Parsed:`, JSON.stringify(parsed, null, 2).substring(0, 300));
    failed++;
  }
}

console.log('\n═══════════════════════════════════════════════════');
console.log(`  Results: ${passed} passed, ${failed} failed, ${testCases.length} total`);
console.log('═══════════════════════════════════════════════════');

process.exit(failed > 0 ? 1 : 0);
