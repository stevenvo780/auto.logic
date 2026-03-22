import { describe, it } from 'vitest';
import { formalize } from '../src';
import { LONG_FORMALIZATION_CASES } from './fixtures/long-formalization-cases';
import { expectFormalizationCoreQuality } from './helpers/quality';

describe('Long formalization battery across logic systems', () => {
  for (const testCase of LONG_FORMALIZATION_CASES) {
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
