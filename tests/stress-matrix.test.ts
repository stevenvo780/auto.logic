import { describe, it } from 'vitest';
import { formalize } from '../src';
import { STRESS_MATRIX_CASES } from './fixtures/stress-matrix';
import { expectFormalizationCoreQuality } from './helpers/quality';

describe('Stress matrix across logic systems', () => {
  for (const testCase of STRESS_MATRIX_CASES) {
    it(`${testCase.id} — ${testCase.description}`, () => {
      const result = formalize(testCase.text, {
        profile: testCase.profile,
        language: 'es',
        atomStyle: 'keywords',
        includeComments: true,
        validateOutput: true,
        maxClauseDepth: 5
      });

      expectFormalizationCoreQuality(testCase, result);
    });
  }
});
