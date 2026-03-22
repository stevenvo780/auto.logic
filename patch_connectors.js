const fs = require('fs');
let code = fs.readFileSync('src/formula/connectors.ts', 'utf8');
code = code.replace(/case 'probabilistic\.basic':\n\s+return propositional\.includes\(operator\);/, "case 'probabilistic.basic':\n      return [...propositional, '<>', '[]', 'Pr'].includes(operator);");
fs.writeFileSync('src/formula/connectors.ts', code);
