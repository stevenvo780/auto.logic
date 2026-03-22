const text = "establece que";
const tokens = text.toLowerCase().split(/\s+/).map(t => t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')).filter(Boolean);
const commonVerbs = new Set(['es', 'son', 'era', 'eran', 'fue', 'fueron', 'sea', 'sean', 'está', 'están', 'estaba', 'estaban', 'esté', 'estén', 'hay', 'ha', 'han', 'había', 'habían', 'hubo', 'hubieron', 'tiene', 'tienen', 'sabe', 'saben', 'sabemos', 'conoce', 'conocen', 'ignora', 'ignoran', 'debe', 'deben', 'puede', 'pueden', 'paga', 'pagó', 'pagan', 'recibe', 'reciben', 'puede', 'pueden', 'entra', 'entran', 'vuelve', 'vuelven', 'pasa', 'pasan', 'detecta', 'detectan', 'registra', 'registra', 'permanece', 'permanece', 'comienza', 'continúa', 'termina', 'ocurre', 'completa', 'conserva', 'invalide', 'dirigirse', 'leer', 'leído', 'oyen', 'observan', 'queda', 'establecida', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'will', 'would', 'have', 'has', 'had', 'do', 'does', 'did', 'can', 'could', 'may', 'might', 'must', 'study', 'studies', 'continue', 'continues', 'pass', 'passes', 'passing', 'rain', 'rains', 'grow', 'grows', 'increase', 'increases', 'rise', 'rises', 'prosper', 'prospers', 'improve', 'improves', 'find', 'finds', 'protect', 'protects', 'obey', 'obeys', 'activate', 'activates', 'respond', 'responds', 'register', 'registers']);

function isVerbLikeToken(token: string) {
  if (commonVerbs.has(token)) return true;
  if (token.length <= 3) return false;
  return /(?:ar|er|ir|ado|ido|ando|iendo|aba|aban|ía|ían|ará|erá|irá|ría|rían|aste|iste|aron|ieron|ado|ido|ando|iendo)$/u.test(token);
}

console.log(tokens.some(isVerbLikeToken));
