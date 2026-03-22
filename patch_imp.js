const fs = require('fs');
let code = fs.readFileSync('src/formula/helpers.ts', 'utf8');
code = code.replace(/import \{ ST_OPERATORS \} from '\.\/connectors';/, "import { ST_OPERATORS, profileSupportsOperator } from './connectors';");
fs.writeFileSync('src/formula/helpers.ts', code);
