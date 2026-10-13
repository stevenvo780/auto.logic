import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import dgram from 'node:dgram';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';

// Candidate only: do not run without a reviewed fail-closed runner preloader.
// Suite guards are defense in depth; they start after Vitest initializes its worker.
const loaderBody = 'return import("@huggingface/transformers")';
const originalFunction = globalThis.Function;
let blockedCalls: string[];
let run: typeof import('../src/local-slm-web').runDistilledWebInference;

function installGuards() {
  const block = (name: string) => (..._args: unknown[]): never => {
    blockedCalls.push(name);
    throw new Error(`Unexpected external operation: ${name}`);
  };
  vi.stubGlobal('fetch', vi.fn(block('fetch')));
  vi.spyOn(http, 'request').mockImplementation(block('http.request'));
  vi.spyOn(http, 'get').mockImplementation(block('http.get'));
  vi.spyOn(https, 'request').mockImplementation(block('https.request'));
  vi.spyOn(https, 'get').mockImplementation(block('https.get'));
  vi.spyOn(net, 'connect').mockImplementation(block('net.connect'));
  vi.spyOn(net, 'createConnection').mockImplementation(block('net.createConnection'));
  vi.spyOn(net.Socket.prototype, 'connect').mockImplementation(block('Socket.connect'));
  vi.spyOn(net.Server.prototype, 'listen').mockImplementation(block('Server.listen'));
  vi.spyOn(tls, 'connect').mockImplementation(block('tls.connect'));
  vi.spyOn(dgram, 'createSocket').mockImplementation(block('dgram.createSocket'));
  vi.spyOn(childProcess, 'spawn').mockImplementation(block('child_process.spawn'));
  vi.spyOn(childProcess, 'spawnSync').mockImplementation(block('child_process.spawnSync'));
  vi.spyOn(childProcess, 'exec').mockImplementation(block('child_process.exec'));
  vi.spyOn(childProcess, 'execSync').mockImplementation(block('child_process.execSync'));
  vi.spyOn(childProcess, 'execFile').mockImplementation(block('child_process.execFile'));
  vi.spyOn(childProcess, 'execFileSync').mockImplementation(block('child_process.execFileSync'));
  vi.spyOn(childProcess, 'fork').mockImplementation(block('child_process.fork'));
  syncBuiltinESMExports();
}

function harness(output: unknown = [{ generated_text: '{}' }]) {
  const env: Record<string, unknown> = {};
  const inference = vi.fn(async () => output);
  const factory = vi.fn(async () => inference);
  const loader = vi.fn(async () => ({ pipeline: factory, env }));
  const constructor = vi.fn((...args: unknown[]) => {
    if (args.length !== 1 || args[0] !== loaderBody) {
      throw new Error('Unexpected Function signature');
    }
    return loader;
  });
  function invoke(customModelUrl?: string) {
    let pending: ReturnType<typeof run>;
    try {
      globalThis.Function = constructor as unknown as FunctionConstructor;
      pending = run('Texto de prueba', {} as Parameters<typeof run>[1], 'unused', customModelUrl);
    } finally {
      globalThis.Function = originalFunction;
    }
    // Restoration precedes every await, including rejected load/inference paths.
    expect(globalThis.Function).toBe(originalFunction);
    return pending;
  }
  return { env, inference, factory, loader, constructor, invoke };
}

function ast(text: string) {
  return { axioms: [], conclusions: [{ formulaJSON: { type: 'Atom', id: 'X', text } }] };
}

function expectCalls(h: ReturnType<typeof harness>, customModelUrl?: string, calls = 1) {
  expect(h.constructor).toHaveBeenCalledTimes(1);
  expect(h.constructor).toHaveBeenCalledWith(loaderBody);
  expect(h.loader).toHaveBeenCalledTimes(1);
  expect(h.factory).toHaveBeenCalledTimes(1);
  expect(h.factory).toHaveBeenCalledWith('text-generation',
    customModelUrl ? 'model-web' : 'stevenvo780/autologic-slm-onnx',
    { local_files_only: !!customModelUrl, dtype: 'fp32' });
  expect(h.env).toEqual(customModelUrl
    ? { allowLocalModels: true, localModelPath: customModelUrl, allowRemoteModels: false }
    : { allowLocalModels: true });
  expect(h.inference).toHaveBeenCalledTimes(calls);
  for (const [prompt, options] of h.inference.mock.calls as unknown as [string, unknown][]) {
    expect(prompt).toMatch(/^<\|im_start\|>system\nYou are Autologic's semantic AST parser\./);
    expect(prompt).toContain('Be precise. Return ONLY the raw JSON object. No markdown, no explanation, no codeblocks.');
    expect(prompt).toMatch(/<\|im_end\|>\n<\|im_start\|>user\nFormalize this text:\n\nTexto de prueba<\|im_end\|>\n<\|im_start\|>assistant\n$/);
    expect(prompt).not.toContain('unused');
    expect(options).toEqual({ max_new_tokens: 512, temperature: 0.1, do_sample: false, return_full_text: false });
  }
}

describe.sequential('runDistilledWebInference JSON extraction (real module)', () => {
  beforeEach(async () => {
    blockedCalls = [];
    vi.resetModules();
    installGuards();
    // No barrel import, module replacement, transformer import, or extractor copy.
    ({ runDistilledWebInference: run } = await import('../src/local-slm-web'));
  });
  afterEach(() => {
    try {
      expect(globalThis.Function).toBe(originalFunction);
      expect(blockedCalls).toEqual([]);
    } finally {
      globalThis.Function = originalFunction;
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
      syncBuiltinESMExports();
      vi.resetModules();
    }
  });

  it.each([
    'La llave } pertenece al texto.', // Required red on the original scanner.
    'Una apertura { pertenece al texto.',
    '{{{ texto }',
    '} texto {{{',
    '{ equilibradas }',
    'Unicode: á, 漢字, 🧪; newline\n y tab\t',
    'Comillas " y llave } y otra "',
    'Backslash \\ y }',
    'Acaba en backslash \\',
    'Dos backslashes \\\\',
    'Backslash y comilla \\" y }',
  ])('preserves Atom.text: %s', async text => {
    const expected = ast(text);
    const h = harness([{ generated_text: JSON.stringify(expected) + ' trailing {"second":true}' }]);
    await expect(h.invoke()).resolves.toEqual(expected);
    expectCalls(h);
  });

  it.each([
    ['', ''], ['```json\n', '\n```'], ['```\n', '\n```'], ['```JSON\n', '\n```'],
    ['Here is the result: ', ' trailing prose'], ['} " stray prefix ', ''],
    ['', '{"second":true}'],
  ])('selects first object with prefix %j and suffix %j', async (prefix, suffix) => {
    const expected = ast('} inside text {');
    const h = harness([{ generated_text: prefix + JSON.stringify(expected) + suffix }]);
    await expect(h.invoke()).resolves.toEqual(expected);
    expectCalls(h);
  });

  it.each([{}, { axioms: null, conclusions: 'invalid' },
    { nested: [{ child: { text: '} \\ " {' } }], text: 'outer' },
  ])('returns object without schema normalization: %j', async expected => {
    const h = harness([{ generated_text: JSON.stringify(expected) }]);
    await expect(h.invoke()).resolves.toEqual(expected);
    expectCalls(h);
  });

  it.each([
    '', '   \n\t', 'No JSON here', '{invalid}', '{"a":1,}',
    '{"a":"\\q"}', '{"a":1', '{"a":"truncated }',
    '{invalid}{"valid":true}', 'x'.repeat(250),
    '{"a":"' + 'x'.repeat(240),
  ])('preserves parse failure and raw 200-character excerpt: %j', async raw => {
    const h = harness([{ generated_text: raw }]);
    await expect(h.invoke()).rejects.toThrow(new Error(`Web inference JSON parse failed: ${raw.substring(0, 200)}`));
    expectCalls(h);
  });

  it.each([{ output: [] }, { output: [{}] }, { output: [{ generated_text: '' }] }])('keeps empty-output error: %j', async ({ output }) => {
    const h = harness(output);
    await expect(h.invoke()).rejects.toThrow(new Error('Web inference JSON parse failed: '));
    expectCalls(h);
  });

  it('only reads the first generated output', async () => {
    const h = harness([{ generated_text: '{bad}' }, { generated_text: '{}' }]);
    await expect(h.invoke()).rejects.toThrow(new Error('Web inference JSON parse failed: {bad}'));
    expectCalls(h);
  });

  it('uses custom model options in a fresh module', async () => {
    const h = harness();
    await expect(h.invoke('/synthetic-models/')).resolves.toEqual({});
    expectCalls(h, '/synthetic-models/');
  });

  it('caches only the pipeline across calls in the same module', async () => {
    const h = harness();
    await expect(h.invoke()).resolves.toEqual({});
    await expect(h.invoke()).resolves.toEqual({});
    expectCalls(h, undefined, 2);
  });

  it('wraps a loader rejection', async () => {
    const h = harness();
    h.loader.mockRejectedValueOnce(new Error('synthetic load failure'));
    await expect(h.invoke()).rejects.toThrow(new Error('Web inference blocked: synthetic load failure'));
    expect(h.constructor).toHaveBeenCalledTimes(1);
    expect(h.loader).toHaveBeenCalledTimes(1);
    expect(h.factory).not.toHaveBeenCalled();
    expect(h.inference).not.toHaveBeenCalled();
  });

  it('wraps a factory rejection', async () => {
    const h = harness();
    h.factory.mockRejectedValueOnce(new Error('synthetic factory failure'));
    await expect(h.invoke()).rejects.toThrow(new Error('Web inference blocked: synthetic factory failure'));
    expect(h.constructor).toHaveBeenCalledTimes(1);
    expect(h.factory).toHaveBeenCalledTimes(1);
    expect(h.inference).not.toHaveBeenCalled();
  });

  it('propagates an inference rejection unchanged', async () => {
    const h = harness();
    const failure = new Error('synthetic inference failure');
    h.inference.mockRejectedValueOnce(failure);
    await expect(h.invoke()).rejects.toBe(failure);
    expectCalls(h);
  });
});
