function looksClauseLike(text: string) { 
  const tokens = text.toLowerCase().split(/\s+/).map(t => t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')).filter(Boolean);
  const commonVerbs = new Set(['es', 'son', 'era', 'eran', 'fue', 'fueron', 'sea', 'sean', 'está', 'están', 'estaba', 'estaban', 'esté', 'estén', 'hay', 'ha', 'han', 'había', 'habían', 'hubo', 'hubieron', 'tiene', 'tienen', 'sabe', 'saben', 'sabemos', 'conoce', 'conocen', 'ignora', 'ignoran', 'debe', 'deben', 'puede', 'pueden', 'paga', 'pagó', 'pagan', 'recibe', 'reciben', 'puede', 'pueden', 'entra', 'entran', 'vuelve', 'vuelven', 'pasa', 'pasan', 'detecta', 'detectan', 'registra', 'registra', 'permanece', 'permanece', 'comienza', 'continúa', 'termina', 'ocurre', 'completa', 'conserva', 'invalide', 'dirigirse', 'leer', 'leído', 'oyen', 'observan', 'queda', 'establecida', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'will', 'would', 'have', 'has', 'had', 'do', 'does', 'did', 'can', 'could', 'may', 'might', 'must', 'study', 'studies', 'continue', 'continues', 'pass', 'passes', 'passing', 'rain', 'rains', 'grow', 'grows', 'increase', 'increases', 'rise', 'rises', 'prosper', 'prospers', 'improve', 'improves', 'find', 'finds', 'protect', 'protects', 'obey', 'obeys', 'activate', 'activates', 'respond', 'responds', 'register', 'registers']);
  if (tokens.length < 2) return false;
  return tokens.some(token => {
    if (commonVerbs.has(token)) return true;
    if (token.length <= 3) return false;
    return /(?:ar|er|ir|ado|ido|ando|iendo|aba|aban|ía|ían|ará|erá|irá|ría|rían|aste|iste|aron|ieron|ado|ido|ando|iendo)$/u.test(token);
  });
}

function normalizeClauses(clauses: any[]): any[] {
  if (clauses.length === 0) return clauses;

  const cleaned: any[] = [];
  for (const clause of clauses) {
    const normalizedText = clause.text.trim();
    if (!normalizedText && clause.markers.length === 0) continue;
    cleaned.push({ ...clause, text: normalizedText });
  }

  const merged: any[] = [];
  for (let index = 0; index < cleaned.length; index++) {
    const current = cleaned[index];
    const next = cleaned[index + 1];

    if (!current) continue;

    if (!current.text && current.markers.length > 0 && next) {
      next.markers = [...current.markers, ...next.markers];
      continue;
    }

    const currentText = current.text.toLowerCase();
    const words = currentText.split(/\s+/).length;
    
    const isPreamble = 
      currentText.endsWith(' que') ||
      currentText.endsWith(' si') ||
      currentText.endsWith(' como') ||
      currentText.endsWith(' cuando') ||
      currentText.endsWith(' donde') ||
      currentText === 'que' || currentText === 'si' ||
      (words <= 3 && !looksClauseLike(current.text));

    const isFragment = (!looksClauseLike(current.text) && current.markers.length === 0) || (isPreamble && next);

    if (isFragment && next) {
      next.text = `${current.text} ${next.text}`.trim();
      next.markers = [...current.markers, ...next.markers];
      continue;
    }

    merged.push(current);
  }

  return merged.map((clause, index) => ({ ...clause, index }));
}

console.log(normalizeClauses([
  { text: 'establece que', markers: [{role: 'and'}], index: 0 },
  { text: 'una paciente no recibió la vacuna X', markers: [{role: 'condition'}], index: 1 }
]));

console.log(normalizeClauses([
  { text: 'Ana sabe que', markers: [{role: 'necessity'}], index: 0 },
  { text: 'la llave está aquí', markers: [], index: 1 }
]));

console.log(normalizeClauses([
  { text: 'Ana, Bruno y Carla asistieron juntos a una inducción pública', markers: [], index: 0 },
  { text: 'en la que se anunció que', markers: [], index: 1 },
  { text: 'si el tablero marca nivel rojo', markers: [{role: 'condition'}], index: 2 },
  { text: 'todos deben cerrar simultáneamente las líneas auxiliares', markers: [], index: 3 }
]));
