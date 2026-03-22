import { describe, it } from 'vitest';
import { formalize } from '../src';
import { STRESS_MATRIX_CASES } from './fixtures/stress-matrix';
import { expectFormalizationCoreQuality } from './helpers/quality';

const DEBUG_TESTS = process.env.AUTOLOGIC_DEBUG_TESTS === '1';

describe('Stress matrix across logic systems', () => {
  for (const testCase of STRESS_MATRIX_CASES) {
    it(`${testCase.id} — ${testCase.description}`, () => {
      const startedAt = Date.now();
      if (DEBUG_TESTS) {
        console.log(`[start] ${testCase.id} (${testCase.profile})`);
      }

      const result = formalize(testCase.text, {
        profile: testCase.profile,
        language: 'es',
        atomStyle: 'keywords',
        includeComments: true,
        validateOutput: true,
        maxClauseDepth: 5
      });

      if (DEBUG_TESTS) {
        const elapsed = Date.now() - startedAt;
        const exec = result.stExecution;
        console.log(
          `[done] ${testCase.id} total=${elapsed}ms st=${exec?.durationMs ?? 0}ms timeout=${exec?.timedOut ?? false} errors=${exec?.errors.join(' | ') || 'none'}`
        );
      }

      expectFormalizationCoreQuality(testCase, result);
    });
  }
});
