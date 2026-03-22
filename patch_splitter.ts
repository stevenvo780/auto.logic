import fs from 'fs';
let code = fs.readFileSync('src/segmenter/clause-splitter.ts', 'utf8');
code = code.replace(/return normalizeClauses\\(mergeLeadingModifierClauses/, 'let mergedMods = mergeLeadingModifierClauses(clauses);\n  console.log("after merge mods:", JSON.stringify(mergedMods, null, 2));\n  return normalizeClauses(mergedMods');//');
fs.writeFileSync('src/segmenter/clause-splitter.ts', code);
