interface Clause { text: string; markers: any[]; index: number }

function normalizeClauses(clauses: Clause[]): Clause[] {
  if (clauses.length === 0) return clauses;

  // 1. Clean
  const cleaned: Clause[] = [];
  for (const clause of clauses) {
    const normalizedText = clause.text.trim();
    if (!normalizedText && clause.markers.length === 0) continue;
    cleaned.push({ ...clause, text: normalizedText });
  }

  // 2. Merge
  const merged: Clause[] = [];
  for (let index = 0; index < cleaned.length; index++) {
    const current = cleaned[index];
    const next = cleaned[index + 1];

    if (!current) continue;

    // Si la actual no tiene texto pero sí marcadores, pasárselos al siguiente
    if (!current.text && current.markers.length > 0 && next) {
      next.markers = [...current.markers, ...next.markers];
      continue;
    }

    const words = current.text.split(/\s+/).length;
    // Es un preámbulo si no parece cláusula, O termina en "que", "si", "cuando", O es muy corto
    const isPreamble = 
      words <= 3 ||
      current.text.endsWith('que') ||
      current.text.endsWith('si') ||
      current.text.endsWith('como') ||
      current.text.endsWith('cuando') ||
      current.text.endsWith('donde');
      
    // Solo NO fusionar si realmente actúa como entidad separada de peso.
    // Ojo: si hay un marcador de conector (and/or) al final/principio, es natural fusionarlos.
    const isFragment = (!looksClauseLike(current.text) && current.markers.length === 0) || (isPreamble && next);

    if (isFragment && next) {
      // Merge current into next or next into current?
      // Better to push current into next so the loop naturally works over next
      
      const connectorMarkers = next.markers.filter(marker =>
        marker.role === 'and' || marker.role === 'or' || marker.role === 'adversative'
      );
      // ...wait, the connector logic
      const hasLowConnector = connectorMarkers.length > 0;
      
      next.text = `${current.text} ${next.text}`.trim();
      next.markers = [...current.markers, ...next.markers];
      continue;
    }

    merged.push(current);
  }

  return merged.map((clause, index) => ({ ...clause, index }));
}

function looksClauseLike(text: string) { return text.split(' ').length > 2; }

console.dir(normalizeClauses([
  { text: 'establece que', markers: [{role: 'and', text: 'y'}], index: 0 },
  { text: 'una paciente no recibió la vacuna X', markers: [{role: 'condition', text: 'si'}], index: 1 }
]), { depth: null });
console.dir(normalizeClauses([
  { text: 'cada uno sabe que', markers: [{role: 'necessity'}], index: 0 },
  { text: 'debe cerrar las líneas', markers: [], index: 1 }
]), { depth: null });
