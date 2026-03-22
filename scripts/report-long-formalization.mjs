import { createRequire } from 'node:module';
import { LONG_FORMALIZATION_CASES } from './long-formalization-cases.mjs';

const require = createRequire(import.meta.url);
const { formalize } = require('../dist/index.js');

function summarize(result) {
  return {
    ok: result.ok,
    atoms: result.atoms.size,
    formulas: result.formulas.length,
    errors: result.diagnostics.filter((item) => item.severity === 'error').map((item) => item.message),
    validation: result.stValidation?.ok ?? true,
    patterns: result.analysis.detectedPatterns,
  };
}

console.log('=== LONG FORMALIZATION REPORT ===');
for (const testCase of LONG_FORMALIZATION_CASES) {
  const result = formalize(testCase.text, {
    profile: testCase.profile,
    language: 'es',
    atomStyle: 'keywords',
    includeComments: true,
    validateOutput: true,
    maxClauseDepth: 6,
  });

  const summary = summarize(result);
  console.log(`\n[${summary.ok && summary.validation ? 'OK' : 'FAIL'}] ${testCase.id} (${testCase.profile})`);
  console.log(`atoms=${summary.atoms} formulas=${summary.formulas} patterns=${summary.patterns.join(', ') || 'none'}`);
  if (!summary.ok || !summary.validation || summary.errors.length > 0) {
    console.log('errors:');
    for (const error of summary.errors) {
      console.log(`- ${error}`);
    }
    if (result.stValidation?.errors?.length) {
      for (const error of result.stValidation.errors) {
        console.log(`- ST: ${error}`);
      }
    }
  }
}
