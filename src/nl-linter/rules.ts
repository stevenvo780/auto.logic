import type { NLRule, NLLinterDiagnostic } from './types';

// 1. Ambigüedad Anafórica
export const anaphoricRule: NLRule = {
  id: 'nl-anaphoric-ambiguity',
  name: 'Ambigüedad Anafórica',
  severity: 'warning',
  evaluate: (text) => {
    const diags: NLLinterDiagnostic[] = [];
    const regex = /\b(este|ese|aquel|el cual|los cuales|lo anterior|su)\b/gi;
    let match;
    while ((match = regex.exec(text)) !== null) {
      diags.push({
        id: 'nl-anaphoric-ambiguity',
        severity: 'warning',
        message: `El pronombre anafórico '${match[1]}' puede confundir al modelo o diluir la abstracción. Si es posible, usa el sujeto explícito.`,
        start: match.index,
        end: match.index + match[0].length
      });
    }
    return diags;
  }
};

// 2. Densidad Cognitiva (Oraciones extremadamente largas)
export const cognitiveDensityRule: NLRule = {
  id: 'nl-cognitive-density',
  name: 'Densidad Cognitiva Alta',
  severity: 'warning',
  evaluate: (text) => {
    const diags: NLLinterDiagnostic[] = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    let currentOffset = 0;
    
    for (const sentence of sentences) {
      const wordCount = sentence.split(/\s+/).filter(w => w.length > 0).length;
      if (wordCount > 40) {
        const startIndex = text.indexOf(sentence, currentOffset);
        diags.push({
          id: 'nl-cognitive-density',
          severity: 'warning',
          message: `Oración muy larga (${wordCount} palabras). El contexto semántico formal pierde precisión en oraciones kilométricas sin puntuación. Divídela.`,
          start: startIndex >= 0 ? startIndex : currentOffset,
          end: startIndex >= 0 ? startIndex + sentence.length : currentOffset + sentence.length
        });
      }
      currentOffset += sentence.length;
    }
    return diags;
  }
};

// 3. Cuantificación difusa
export const fuzzyQuantifiersRule: NLRule = {
  id: 'nl-fuzzy-quantifier',
  name: 'Cuantificador Difuso',
  severity: 'error',
  evaluate: (text) => {
    const diags: NLLinterDiagnostic[] = [];
    const regex = /\b(frecuentemente|la mayoría de|casi nunca|a veces|probablemente|en ocasiones)\b/gi;
    let match;
    while ((match = regex.exec(text)) !== null) {
      diags.push({
        id: 'nl-fuzzy-quantifier',
        severity: 'error',
        message: `Término difuso '${match[1]}'. La lógica proposicional exacta requiere condicionales definidos o cuantificadores absolutos (todos, ninguno).`,
        start: match.index,
        end: match.index + match[0].length
      });
    }
    return diags;
  }
};

// 4. Completitud lógica (ausencia de conectores de inferencia en textos argumentativos)
export const logicalCompletenessRule: NLRule = {
  id: 'nl-missing-relations',
  name: 'Falta de Relaciones Estructurales',
  severity: 'warning',
  evaluate: (text) => {
    const diags: NLLinterDiagnostic[] = [];
    const hasConclusion = /\b(por lo tanto|en consecuencia|ergo|luego|se concluye|por ende)\b/i.test(text);
    const hasImplication = /\b(si\s.*entonces|solo si|siempre que)\b/i.test(text);
    
    if (!hasConclusion && !hasImplication && text.length > 60) {
       diags.push({
         id: 'nl-missing-relations',
         severity: 'warning',
         message: 'El texto carece de conectores lógicos evidentes (ej. "si... entonces", "por lo tanto"). ¿Deseas evaluarlo solo como premisas aisladas?',
         start: 0,
         end: Math.min(text.length, 60)
       });
    }
    return diags;
  }
};
