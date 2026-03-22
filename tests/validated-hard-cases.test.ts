import { describe, it } from 'vitest';
import { formalize } from '../src';
import { expectFormalizationCoreQuality } from './helpers/quality';
import { VALIDATED_HARD_CASES } from './fixtures/validated-hard-cases';

describe('Validated harder arguments across logic systems', () => {
  for (const testCase of VALIDATED_HARD_CASES) {
    it(`${testCase.id} — ${testCase.description}`, () => {
      const result = formalize(testCase.text, {
        profile: testCase.profile,
        language: 'es',
        atomStyle: 'keywords',
        includeComments: true,
        validateOutput: true,
        maxClauseDepth: 6,
      });

      expectFormalizationCoreQuality(testCase, result);
    });
  }
});