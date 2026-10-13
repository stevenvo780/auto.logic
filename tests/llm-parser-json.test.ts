import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseTextWithLLM } from '../src/llm-parser';
import type { LLMConfig, LLMParsedResult } from '../src/llm-parser';

const providers = [
  {
    provider: 'ollama' as const,
    config: { provider: 'ollama', apiKey: '', endpoint: 'https://ollama.invalid/api/chat' } satisfies LLMConfig,
    error: 'Ollama API Error',
  },
  {
    provider: 'openai' as const,
    config: { provider: 'openai', apiKey: 'test-key', endpoint: 'https://openai.invalid/v1/chat/completions' } satisfies LLMConfig,
    error: 'LLM API Error',
  },
  {
    provider: 'openwebui' as const,
    config: { provider: 'openwebui', apiKey: 'test-key', endpoint: 'https://openwebui.invalid' } satisfies LLMConfig,
    error: 'OpenWebUI API Error',
  },
];

function resultWithText(text: string): LLMParsedResult {
  return {
    axioms: [{ name: 'a1', formulaJSON: { type: 'Atom', id: 'CLAIM', text } }],
    conclusions: [{ formulaJSON: { type: 'Atom', id: 'CLAIM', text } }],
  };
}

const textCases = [
  ['plain text', 'Una afirmación.'],
  ['literal closing brace', 'La llave } pertenece al texto.'],
  ['literal opening brace', 'La llave { pertenece al texto.'],
  ['balanced literal braces', 'Un objeto literal: { ejemplo }.'],
  ['multiple unbalanced literal braces', '}} {{{ }'],
  ['escaped quotes around braces', 'Dijo "}" y después "{".'],
  ['escaped backslashes and braces', 'C:\\documentos\\}registro\\{entrada'],
  ['backslash immediately before the closing quote', 'C:\\documentos\\'],
  ['backslash followed by an escaped quote', 'Una barra \\ y una cita \\"} todavía en el texto.'],
  ['Unicode with literal braces', 'Español: ñ, café; 中文; 😀 } العربية'],
  ['escaped newline and tab with braces', 'Primera línea\n}\t{ segunda línea'],
] as const;

const plainResult = resultWithText('Una afirmación.');
const plainJSON = JSON.stringify(plainResult);
const braceResult = resultWithText('Texto } con "citas" y una barra \\.');
const braceJSON = JSON.stringify(braceResult);
const nestedResult: LLMParsedResult = {
  axioms: [{
    name: 'a1',
    formulaJSON: {
      type: 'Connective', operator: 'IMPLIES',
      left: {
        type: 'Quantifier', operator: 'FORALL', variables: ['x'],
        child: {
          type: 'Connective', operator: 'AND',
          left: { type: 'Atom', id: 'CLAIM', text: 'Anidado } con "citas".' },
          right: { type: 'Predicate', name: 'P', args: [{ type: 'Object', name: 'x' }] },
        },
      },
      right: {
        type: 'Modal', operator: 'K', agent: 'agente }',
        child: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'OTHER', text: '{ Otro }' } },
      },
    },
  }],
  conclusions: [{ formulaJSON: { type: 'Atom', id: 'OTHER', text: 'Conclusión } 😀' } }],
};

const wrappedCases = [
  { name: 'json markdown fence', raw: '```json\n' + braceJSON + '\n```', expected: braceResult },
  { name: 'unlabelled markdown fence', raw: '```\n' + braceJSON + '\n```', expected: braceResult },
  { name: 'uppercase markdown fence', raw: '```JSON\n' + braceJSON + '\n```', expected: braceResult },
  { name: 'prefix and suffix', raw: 'Aquí está el resultado:\n' + braceJSON + '\nFin del resultado.', expected: braceResult },
  { name: 'fence with prefix and suffix', raw: 'Resultado:\n```json\n' + braceJSON + '\n```\nFin.', expected: braceResult },
  { name: 'closing brace in the prefix', raw: 'Nota } antes del JSON:\n' + plainJSON, expected: plainResult },
  { name: 'unmatched quote in the prefix', raw: 'Nota " antes del JSON:\n' + braceJSON, expected: braceResult },
  { name: 'braces in the suffix', raw: braceJSON + '\nTexto extra } { incompleto', expected: braceResult },
  { name: 'two concatenated objects', raw: braceJSON + JSON.stringify(resultWithText('Segundo objeto')), expected: braceResult },
  {
    name: 'opening brace in the first of two objects',
    raw: JSON.stringify(resultWithText('{ inicio')) + plainJSON,
    expected: resultWithText('{ inicio'),
  },
  {
    name: 'escaped backslash at the end of the first object text',
    raw: JSON.stringify(resultWithText('Ruta\\')) + plainJSON,
    expected: resultWithText('Ruta\\'),
  },
  {
    name: 'escaped quotes around braces followed by a second object',
    raw: JSON.stringify(resultWithText('Dijo "}" y "{".')) + plainJSON,
    expected: resultWithText('Dijo "}" y "{".'),
  },
  { name: 'nested objects and arrays', raw: JSON.stringify(nestedResult), expected: nestedResult },
  {
    name: 'Unicode escape sequences',
    raw: String.raw`{"axioms":[{"name":"a1","formulaJSON":{"type":"Atom","id":"CLAIM","text":"\u007d \u0022 \u005c \ud83d\ude00"}}],"conclusions":[]}`,
    expected: { axioms: [{ name: 'a1', formulaJSON: { type: 'Atom', id: 'CLAIM', text: '} " \\ 😀' } }], conclusions: [] },
  },
];

const invalidCases = [
  ['no JSON object', 'Respuesta sin JSON.'],
  ['whitespace only', ' \n\t '],
  ['invalid balanced object', '{"axioms": [invalid], "conclusions": []}'],
  ['trailing comma', '{"axioms": [], "conclusions": [],}'],
  ['invalid escape', String.raw`{"axioms": [], "conclusions": [], "note": "\q}"}`],
  ['truncated root object', braceJSON.slice(0, -1)],
  ['truncated nested object', '{"axioms": [{"name": "a1", "formulaJSON": {"type": "Atom"'],
  ['unterminated string containing a brace', '{"axioms": [{"name": "a1", "formulaJSON": {"type": "Atom", "id": "CLAIM", "text": "} incompleto'],
  ['invalid first object followed by a valid object', '{invalid}' + plainJSON],
] as const;

describe.each(providers)('$provider HTTP JSON extraction', ({ provider, config, error }) => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeEach(() => {
    // Every request is intercepted; an unexpected extra request fails locally.
    fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error('Unexpected HTTP request in JSON extraction test'));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function respondWith(raw: string): void {
    const body = provider === 'ollama'
      ? { message: { role: 'assistant', content: raw }, done: true }
      : { choices: [{ index: 0, message: { role: 'assistant', content: raw }, finish_reason: 'stop' }] };
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));
  }

  it.each(textCases)('preserves %s in AST text', async (_name, text) => {
    const expected = resultWithText(text);
    respondWith(JSON.stringify(expected));
    await expect(parseTextWithLLM('Texto de entrada.', 'classical.propositional', config)).resolves.toEqual(expected);
  });

  it.each(wrappedCases)('extracts the first object: $name', async ({ raw, expected }) => {
    respondWith(raw);
    await expect(parseTextWithLLM('Texto de entrada.', 'classical.propositional', config)).resolves.toEqual(expected);
  });

  it.each(invalidCases)('rejects %s', async (_name, raw) => {
    respondWith(raw);
    await expect(parseTextWithLLM('Texto de entrada.', 'classical.propositional', config))
      .rejects.toThrow('Failed to parse LLM JSON. Raw (first 300 chars): ' + raw.substring(0, 300));
  });

  it.each([400, 503])('preserves HTTP %i errors', async (status) => {
    fetchMock.mockResolvedValueOnce(new Response('Service unavailable', { status }));
    await expect(parseTextWithLLM('Texto de entrada.', 'classical.propositional', config))
      .rejects.toThrow(`${error}: ${status} - Service unavailable`);
  });

  it('preserves the normalization of missing or non-array collections', async () => {
    respondWith('{"axioms": null, "conclusions": "invalid"}');
    await expect(parseTextWithLLM('Texto de entrada.', 'classical.propositional', config))
      .resolves.toEqual({ axioms: [], conclusions: [] });
  });

  it('keeps the provider request contract', async () => {
    respondWith(plainJSON);
    await expect(parseTextWithLLM('Texto de entrada.', 'classical.propositional', config)).resolves.toEqual(plainResult);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(config.endpoint + (provider === 'openwebui' ? '/api/chat/completions' : ''));
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual(provider === 'ollama'
      ? { 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json', Authorization: 'Bearer test-key' });
    const body = JSON.parse(init?.body as string);
    expect(body.messages).toEqual([
      { role: 'system', content: expect.stringContaining("profile: 'classical.propositional'") },
      { role: 'user', content: 'Formalize this text:\n\nTexto de entrada.' },
    ]);
    expect(body.model).toBe(provider === 'openai' ? 'gpt-4o' : 'autologic-formalizer');
    if (provider === 'ollama') {
      expect(body).toMatchObject({ stream: false, format: 'json', options: { temperature: 0.1 } });
    } else {
      expect(body.temperature).toBe(0.1);
      if (provider === 'openai') expect(body.response_format).toEqual({ type: 'json_object' });
    }
  });
});
