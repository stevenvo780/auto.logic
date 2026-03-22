import { LogicNode, AST } from './formula/ast';
import { compileAST } from './formula/ast-compiler';
import { LogicProfile } from './types';
import { runLocalInference } from './local-slm';

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'gemini' | 'custom' | 'local';
  apiKey: string;
  endpoint?: string;
  model?: string;
}

// Interfaz para la respuesta esperada del LLM
export interface LLMParsedResult {
  axioms: Array<{ name: string; formulaJSON: LogicNode }>;
  conclusions: Array<{ formulaJSON: LogicNode }>;
}

/**
 * Prompt maestro isomorfico y ciego al entorno.
 * Instruye al LLM para actuar como un destilador proposicional situado.
 */
function buildSystemPrompt(profile: LogicProfile): string {
  return `You are Autologic's semantic AST parser. 
Your goal is to read complex human text (often obfuscated legal/technical jargon) and translate it into Situated Propositional Logic or bounded First-Order Logic depending on the profile: '${profile}'.
DO NOT try to resolve or prove the logic. Only extract the claims and their semantic relations.
AVOID deep First-Order combinatorial explosions. If passing a specific instance, collapse it into descriptive propositional atoms like: 'CumpleInformesOrdinarios'.

You MUST return a pure JSON object conforming exactly to this TS interface, nothing else:
{
  "axioms": [ { "name": "a1", "formulaJSON": { "type": "Connective", "operator": "IMPLIES", "left": {...}, "right": {...} } } ],
  "conclusions": [ { "formulaJSON": { "type": "Atom", "id": "PasaProgramacionEditorial" } } ]
}
Available types for formulaJSON:
- Atom (id)
- Connective (operator: AND, OR, IMPLIES, IFF, NOT, left, right)
- Modal (operator: K, B, O, P, BOX, DIA, etc., child, agent)
- Quantifier (operator: FORALL, EXISTS, variables, child)
- predicate (name, args: ObjectNode[])

Be precise. Do not include markdown codeblocks around the JSON.`;
}

/**
 * Llama a la API del LLM (usando fetch isomorfico) para abstraer el texto a AST.
 */
export async function parseTextWithLLM(text: string, profile: LogicProfile, config: LLMConfig): Promise<LLMParsedResult> {
  const systemPrompt = buildSystemPrompt(profile);
  
  if (config.provider === 'local') {
    return await runLocalInference(text, profile, systemPrompt);
  }

  let url = config.endpoint || 'https://api.openai.com/v1/chat/completions';
  let headers: any = {
    'Content-Type': 'application/json'
  };
  let body: any = {};

  if (config.provider === 'openai') {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
    body = {
      model: config.model || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Formalize this text:\n\n${text}` }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    };
  } else {
    throw new Error(`Provider ${config.provider} not yet fully implemented in this isomorphic fetch stub.`);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`LLM API Error: ${response.status} - ${errText}`);
  }

  const data: any = await response.json();
  const rawContent = data.choices[0].message.content;
  
  try {
    return JSON.parse(rawContent) as LLMParsedResult;
  } catch (e) {
    throw new Error(`Failed to parse LLM JSON output. Raw: ${rawContent}`);
  }
}

/**
 * Transforma la respuesta estructurada del LLM directamente a líneas de código ST seguras.
 */
export function llmResultToST(result: LLMParsedResult): { formula: string, type: 'axiom' | 'check' }[] {
  const lines: { formula: string, type: 'axiom' | 'check' }[] = [];
  
  for (const ax of result.axioms) {
    lines.push({ formula: compileAST(ax.formulaJSON), type: 'axiom' });
  }
  
  for (const conc of result.conclusions) {
    lines.push({ formula: compileAST(conc.formulaJSON), type: 'check' });
  }
  
  return lines;
}
