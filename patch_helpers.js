const fs = require('fs');
let code = fs.readFileSync('src/formula/helpers.ts', 'utf8');
code = code.replace(/if \(MODAL_PROFILES\.has\(profile\)\)/g, "if (profileSupportsOperator(profile, '<>'))"); // Just for possibility/necessity? Wait...
fs.writeFileSync('src/formula/helpers.ts', code);
