import { describe, it } from 'vitest';
import { formalize } from '../src';
import { expectFormalizationCoreQuality } from './helpers/quality';
import { VALIDATED_HARD_CASES } from './fixtures/validated-hard-cases';

const DEBUG_TESTS = process.env.AUTOLOGIC_DEBUG_TESTS === '1';

describe('Validated harder arguments across logic systems', () => {
  for (const testCase of VALIDATED_HARD_CASES) {
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
        maxClauseDepth: 6,
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