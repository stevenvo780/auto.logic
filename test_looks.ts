function isVerbLikeToken(token: string): boolean {
  const commonVerbs = new Set(['es', 'son', 'era', 'eran', 'fue', 'fueron', 'sea', 'sean', 'está', 'están', 'estaba', 'estaban', 'esté', 'estén', 'hay', 'ha', 'han', 'había', 'habían', 'hubo', 'hubieron', 'tiene', 'tienen', 'sabe']);
  if (commonVerbs.has(token)) return true;
  if (token.length <= 3) return false;
  return /(?:ar|er|ir|ado|ido|ando|iendo|aba|aban|ía|ían|ará|erá|irá|ría|rían|aste|iste|aron|ieron|ado|ido|ando|iendo)$/u.test(token);
}

function looksClauseLike(text: string): boolean {
  const tokens = text
    .toLowerCase()
    .split(/\s+/)
    .map(token => token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter(Boolean);

  if (tokens.length === 0) return false;

  return tokens.some(token => isVerbLikeToken(token));
}
console.log("left:", looksClauseLike("O viajamos en tren "));
console.log("right:", looksClauseLike(" viajamos en avión."));
