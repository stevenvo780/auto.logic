import { LLMParsedResult } from './llm-parser';
import { LogicProfile } from './types';

let pipeline: any = null;

const TRAINING_SYSTEM_PROMPT = `You are Autologic's semantic AST parser.
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

/**
 * Extracts the first complete JSON object from a string,
 * handling trailing garbage that the model may produce after the JSON.
 */
function extractFirstJSON(text: string): string {
  let braceCount = 0;
  let jsonStart = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (jsonStart === -1) jsonStart = i;
      braceCount++;
    } else if (text[i] === '}') {
      braceCount--;
      if (braceCount === 0 && jsonStart !== -1) {
        return text.substring(jsonStart, i + 1);
      }
    }
  }
  return text;
}

/**
 * Loads @huggingface/transformers asynchronously and runs local ONNX inference
 * using our fine-tuned Qwen2.5-0.5B model hosted on HuggingFace or loaded locally.
 */
export async function runDistilledWebInference(text: string, profile: LogicProfile, systemPrompt: string, customModelUrl?: string): Promise<LLMParsedResult> {
  if (!pipeline) {
    try {
      // Dynamic import for @huggingface/transformers (ESM)
      const transformers = await Function('return import("@huggingface/transformers")')();
      const { pipeline: trPipeline, env } = transformers;
      
      env.allowLocalModels = true;
      if (customModelUrl) {
        env.localModelPath = customModelUrl;
        env.allowRemoteModels = false;
      }
      
      // HuggingFace CDN model (fp32 ONNX, ~2.4GB lazy download)
      const modelName = customModelUrl ? 'model-web' : 'stevenvo780/autologic-slm-onnx';
      
      pipeline = await trPipeline('text-generation', modelName, { 
        local_files_only: !!customModelUrl,
        dtype: 'fp32',
      });
    } catch (e: any) {
      throw new Error(`Web inference blocked: ${e.message}`);
    }
  }

  // Use the EXACT system prompt from training for best results
  const prompt = `<|im_start|>system\n${TRAINING_SYSTEM_PROMPT}<|im_end|>\n<|im_start|>user\nFormalize this text:\n\n${text}<|im_end|>\n<|im_start|>assistant\n`;

  const output = await pipeline(prompt, {
    max_new_tokens: 512,
    temperature: 0.1,
    do_sample: false,
    return_full_text: false,
  });

  const rawContent = output[0]?.generated_text || '';
  
  try {
    const jsonStr = extractFirstJSON(rawContent);
    return JSON.parse(jsonStr) as LLMParsedResult;
  } catch (e) {
    throw new Error(`Web inference JSON parse failed: ${rawContent.substring(0, 200)}`);
  }
}
