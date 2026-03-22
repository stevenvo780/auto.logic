const fs = require('fs');
let code = fs.readFileSync('src/formula/propositional.ts', 'utf8');

code = code.replace(/const antStr = applyLogicalModifiers\([\s\S]*?;\n/m, 
  "const antStr = getStr(conditionClauses[0]);\n");

code = code.replace(/const consStr = applyLogicalModifiers\([\s\S]*?;\n/m, 
  "const consStr = getStr(consequentClauses[0]);\n");

// Subcláusula condicional
code = code.replace(/formula: applyLogicalModifiers\(\s*atom,\s*clause.modifiers.map[\s\S]*?\),/m, 
  "formula: getStr(clause),");

// Bicondicional
code = code.replace(/formula: `\${applyLogicalModifiers[\s\S]*?`\}/m, 
  "formula: `${getStr(clauses[0])} ${ST_OPERATORS.biconditional} ${getStr(clauses[1])}`");

// conjunción
code = code.replace(/const atoms = clauses.map\(c =>[\s\S]*?\n\s*\);/m, 
  "const atoms = clauses.map(c => getStr(c));");

// disyunción
code = code.replace(/const atoms = clauses.map\(c =>[\s\S]*?\n\s*\);/m, 
  "const atoms = clauses.map(c => getStr(c));");

// Negación
code = code.replace(/formula: applyLogicalModifiers\(atom, \['negation'\], 'classical.propositional'\),/m, 
  "formula: applyLogicalModifiers(atom, ['negation'], profile), // handled directly as it assumes atomId");
// The old text atom for negation needs text for extraction. Let's just fix negation manually!

fs.writeFileSync('src/formula/propositional.ts', code);
