import { describe, expect, it } from 'vitest';
import { formalize } from '../src';
import { FRONTEND_FORMALIZATION_CASES } from './fixtures/frontend-formalization';
import { expectFormalizationCoreQuality } from './helpers/quality';

describe('Frontend formalization coverage', () => {
  it('tracks all formalization snippets exposed by the frontend', () => {
    expect(FRONTEND_FORMALIZATION_CASES.length).toBeGreaterThanOrEqual(18);

    const coveredProfiles = new Set(FRONTEND_FORMALIZATION_CASES.map((testCase) => testCase.profile));
    expect(coveredProfiles).toEqual(
      new Set([
        'classical.propositional',
        'classical.first_order',
        'aristotelian.syllogistic',
        'modal.k',
        'epistemic.s5',
        'deontic.standard',
        'temporal.ltl',
        'intuitionistic.propositional',
        'paraconsistent.belnap',
        'arithmetic',
        'probabilistic.basic'
      ])
    );
  });

  for (const testCase of FRONTEND_FORMALIZATION_CASES) {
    it(`${testCase.id} — ${testCase.description}`, () => {
      const result = formalize(testCase.text, {
        profile: testCase.profile,
        language: 'es',
        atomStyle: 'keywords',
        includeComments: true,
        validateOutput: true
      });

      expectFormalizationCoreQuality(testCase, result);
      expect(result.stCode).toContain('//');
    });
  }
});
