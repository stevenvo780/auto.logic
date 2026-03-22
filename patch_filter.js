const fs = require('fs');
let code = fs.readFileSync('src/segmenter/clause-splitter.ts', 'utf8');
code = code.replace(/if \(\!looksClauseLike\(left\) \|\| \!looksClauseLike\(right\)\) return false;/,
  `if (left.trim().split(/\\s+/).length < 2 || right.trim().split(/\\s+/).length < 2) return false;`);
fs.writeFileSync('src/segmenter/clause-splitter.ts', code);
