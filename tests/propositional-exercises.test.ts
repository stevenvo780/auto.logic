/**
 * Intensive propositional-logic exercises (a – ñ).
 *
 * Two suites:
 *  1. NLP  — sync formalize()           (~30 ms each)
 *  2. LLM  — async formalizeWithLLM()    (~3-8 s each, requires Ollama tower)
 *
 * LLM suite runs only when AUTOLOGIC_LLM_TEST=1 is set.
 */
import { describe, it, expect } from 'vitest';
import { formalize, formalizeWithLLM } from '../src';
import type { FormalizeWithLLMOptions } from '../src';
import { expectFormalizationCoreQuality } from './helpers/quality';
import { PROPOSITIONAL_EXERCISES } from './fixtures/propositional-exercises';

const DEBUG = process.env.AUTOLOGIC_DEBUG_TESTS === '1';
const LLM_ENABLED = process.env.AUTOLOGIC_LLM_TEST === '1';

// ── Shared NLP options ────────────────────────
const nlpOpts = {
  language: 'es' as const,
  atomStyle: 'keywords' as const,
  includeComments: true,
  validateOutput: true,
  maxClauseDepth: 6,
};

// ── NLP suite ─────────────────────────────────
describe('Propositional exercises — NLP (sync)', () => {
  for (const ex of PROPOSITIONAL_EXERCISES) {
    it(`[${ex.label}] ${ex.id} — ${ex.description}`, () => {
      const t0 = Date.now();
      const result = formalize(ex.text, { ...nlpOpts, profile: ex.profile });
      const elapsed = Date.now() - t0;

      if (DEBUG) {
        console.log(
          `[NLP ${ex.label}] ${ex.id} atoms=${result.atoms.size} formulas=${result.formulas.length} elapsed=${elapsed}ms`,
        );
        console.log(result.stCode);
      }

      expectFormalizationCoreQuality(ex, result);
    });
  }
});

// ── LLM suite ─────────────────────────────────
describe.skipIf(!LLM_ENABLED)('Propositional exercises — LLM (async)', () => {
  const llmOpts: FormalizeWithLLMOptions = {
    ...nlpOpts,
    profile: 'classical.propositional',
    llmConfig: {
      provider: 'openwebui',
      endpoint: process.env.AUTOLOGIC_LLM_ENDPOINT || 'https://ollama.humanizar-dev.cloud',
      apiKey: process.env.AUTOLOGIC_LLM_API_KEY || '',
      model: process.env.AUTOLOGIC_LLM_MODEL || 'qwen2.5-coder:14b',
    },
    abortOnLinterErrors: false,
  };

  for (const ex of PROPOSITIONAL_EXERCISES) {
    it(
      `[${ex.label}] ${ex.id} — ${ex.description}`,
      async () => {
        const t0 = Date.now();
        const result = await formalizeWithLLM(ex.text, {
          ...llmOpts,
          profile: ex.profile,
        });
        const elapsed = Date.now() - t0;

        if (DEBUG) {
          console.log(
            `[LLM ${ex.label}] ${ex.id} ok=${result.ok} elapsed=${elapsed}ms`,
          );
          console.log(result.stCode);
        }

        // LLM pipeline does not populate atoms/formulas maps, so we check
        // structural quality directly on the ST output instead.
        expect(result.ok, `${ex.id} should formalize successfully`).toBe(true);
        expect(result.stCode, `${ex.id} should emit ST`).toContain(`logic ${ex.profile}`);
        expect(result.stCode.trim().length, `${ex.id} should emit non-trivial ST`).toBeGreaterThan(40);
        expect(result.stCode, `${ex.id} should contain axioms`).toMatch(/axiom\s/);
        expect(result.stCode, `${ex.id} should contain a derive`).toMatch(/derive\s/);
        expect(result.stCode, `${ex.id} should contain implication`).toContain('->');
        expect(
          result.stValidation?.ok ?? true,
          `${ex.id} should pass ST parser validation`,
        ).toBe(true);
        expect(
          result.stExecution ? result.stExecution.ok || result.stExecution.timedOut : true,
          `${ex.id} should execute without runtime errors`,
        ).toBe(true);
        expect(
          result.diagnostics.filter((d) => d.severity === 'error'),
          `${ex.id} should not emit fatal diagnostics`,
        ).toHaveLength(0);
      },
      { timeout: 30_000 },
    );
  }
});
