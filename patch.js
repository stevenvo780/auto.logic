const fs = require('fs');
let code = fs.readFileSync('src/segmenter/clause-splitter.ts', 'utf8');
code = code.replace(/const isFragment = \(\!looksClauseLike\(current\.text\) && current\.markers\.length === 0\) \|\| \(isPreamble && next\);/,
"const isFragment = (!looksClauseLike(current.text) && current.markers.length === 0) || (isPreamble && current.markers.length === 0 && next);");
fs.writeFileSync('src/segmenter/clause-splitter.ts', code);
