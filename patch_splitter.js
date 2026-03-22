const fs = require('fs');
let code = fs.readFileSync('src/segmenter/clause-splitter.ts', 'utf8');
code = code.replace(/return normalizeClauses\(mergeLeadingModifierClauses\(clauses\)\);/, 
`let mergedMods = mergeLeadingModifierClauses(clauses);
  console.log("after merge mods:", JSON.stringify(mergedMods, null, 2));
  return normalizeClauses(mergedMods);`);
fs.writeFileSync('src/segmenter/clause-splitter.ts', code);
