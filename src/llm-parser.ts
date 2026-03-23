import { LogicNode, AST } from './formula/ast';
import { compileAST } from './formula/ast-compiler';
import { LogicProfile } from './types';
import { runDistilledWebInference } from './local-slm-web';

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'gemini' | 'custom' | 'ollama' | 'openwebui' | 'web-distilled';
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
Your goal is to read complex human text and translate it into Situated Propositional Logic or bounded First-Order Logic depending on the profile: '${profile}'.
DO NOT try to resolve or prove the logic. Only extract the claims and their semantic relations.
AVOID deep First-Order combinatorial explosions. Collapse contextual instances into descriptive propositional atoms like: 'CumpleInformesOrdinarios'.

You MUST return a pure JSON object conforming exactly to this interface, nothing else:
{
  "axioms": [ { "name": "a1", "formulaJSON": <LogicNode> }, ... ],
  "conclusions": [ { "formulaJSON": <LogicNode> } ]
}

Available LogicNode types for formulaJSON:
- AtomNode: { "type": "Atom", "id": "CAMEL_CASE_ID", "text": "human readable description" }
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
}

/**
 * Extracts the first JSON object from a string that may contain markdown fences or trailing text.
 */
function extractFirstJSON(raw: string): string {
  // Strip markdown code fences
  let cleaned = raw.replace(/^```json?\s*/m, '').replace(/```\s*$/m, '').trim();
  let braceCount = 0;
  let jsonStart = -1;
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '{') {
      if (jsonStart === -1) jsonStart = i;
      braceCount++;
    } else if (cleaned[i] === '}') {
      braceCount--;
      if (braceCount === 0 && jsonStart !== -1) {
        return cleaned.substring(jsonStart, i + 1);
      }
    }
  }
  return cleaned;
}

/**
 * Parse raw LLM output to LLMParsedResult with validation.
 */
function parseAndValidateLLMJSON(raw: string): LLMParsedResult {
  const jsonStr = extractFirstJSON(raw);
  try {
    const parsed = JSON.parse(jsonStr) as LLMParsedResult;
    if (!parsed.axioms || !Array.isArray(parsed.axioms)) parsed.axioms = [];
    if (!parsed.conclusions || !Array.isArray(parsed.conclusions)) parsed.conclusions = [];
    return parsed;
  } catch (e) {
    throw new Error(`Failed to parse LLM JSON. Raw (first 300 chars): ${raw.substring(0, 300)}`);
  }
}

/**
 * Llama a la API del LLM (usando fetch isomorfico) para abstraer el texto a AST.
 */
export async function parseTextWithLLM(text: string, profile: LogicProfile, config: LLMConfig): Promise<LLMParsedResult> {
  const systemPrompt = buildSystemPrompt(profile);
  
  if (config.provider === 'web-distilled') {
     return await runDistilledWebInference(text, profile, systemPrompt, config.endpoint);
  }

  if (config.provider === 'ollama') {
    // Ollama native API (direct, no auth)
    const url = config.endpoint || 'http://localhost:11434/api/chat';
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model || 'qwen2.5-coder:14b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Formalize this text:\n\n${text}` }
        ],
        stream: false,
        format: 'json',
        options: {
          temperature: 0.1
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama API Error: ${response.status} - ${errText}`);
    }

    const data: any = await response.json();
    const rawContent = data.message.content;
    return parseAndValidateLLMJSON(rawContent);
  }

  if (config.provider === 'openwebui') {
    // Open WebUI — OpenAI-compatible endpoint with Bearer auth
    if (!config.endpoint) throw new Error('openwebui provider requires an explicit endpoint URL in LLMConfig.endpoint');
    const url = config.endpoint;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model || 'qwen2.5-coder:14b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Formalize this text:\n\n${text}` }
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenWebUI API Error: ${response.status} - ${errText}`);
    }

    const data: any = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;
    if (!rawContent) throw new Error('OpenWebUI returned empty content');
    return parseAndValidateLLMJSON(rawContent);
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
  
  return parseAndValidateLLMJSON(rawContent);
}

/**
 * Transforma la respuesta estructurada del LLM directamente a líneas de código ST seguras.
 * Conclusions become 'derive' statements (derived from all axioms).
 */
export function llmResultToST(result: LLMParsedResult): { formula: string, type: 'axiom' | 'derive' | 'check', deriveSources?: string[] }[] {
  const lines: { formula: string, type: 'axiom' | 'derive' | 'check', deriveSources?: string[] }[] = [];
  const axiomLabels: string[] = [];
  
  for (const ax of result.axioms) {
    const label = ax.name || `a${axiomLabels.length + 1}`;
    axiomLabels.push(label);
    lines.push({ formula: compileAST(ax.formulaJSON), type: 'axiom' });
  }
  
  for (const conc of result.conclusions) {
    lines.push({ 
      formula: compileAST(conc.formulaJSON), 
      type: 'derive',
      deriveSources: [...axiomLabels]
    });
  }
  
  return lines;
}
