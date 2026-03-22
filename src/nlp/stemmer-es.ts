/**
 * Stemmer Snowball para español
 * Implementación simplificada del algoritmo Snowball Spanish stemmer.
 * Ref: https://snowballstem.org/algorithms/spanish/stemmer.html
 */

const VOWELS = 'aeiouáéíóú';

function isVowel(ch: string): boolean {
  return VOWELS.includes(ch);
}

/**
 * Calcula la región R1 (después de la primera secuencia consonante-vocal tras una vocal)
 */
function findR1(word: string): number {
  let i = 0;
  // Buscar primera vocal
  while (i < word.length && !isVowel(word[i])) i++;
  // Buscar primera consonante después de la vocal
  while (i < word.length && isVowel(word[i])) i++;
  if (i < word.length) i++; // siguiente posición
  return i;
}

function findR2(word: string): number {
  const r1 = findR1(word);
  if (r1 >= word.length) return word.length;
  const sub = word.slice(r1);
  return r1 + findR1(sub);
}

/**
 * Aplica stemming Snowball simplificado al español.
 */
export function stemEs(word: string): string {
  if (word.length <= 3) return word;

  let w = word.toLowerCase()
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u');

  const r1 = findR1(w);
  const r2 = findR2(w);

  // Paso 1: Sufijos estándar
  const suffixes1 = [
    'imientos', 'imiento',
    'amientos', 'amiento',
    'aciones', 'ación',
    'uciones', 'ución',
    'adoras', 'adora', 'adores', 'ador',
    'ancias', 'ancia', 'encias', 'encia',
    'antes', 'ante',
    'ibles', 'ible',
    'istas', 'ista',
    'mente',
    'idades', 'idad',
    'ivas', 'iva', 'ivos', 'ivo',
    'anzas', 'anza',
    'logías', 'logía', 'logias', 'logia',
    'mente',
    'ables', 'able',
  ];

  for (const suf of suffixes1) {
    if (w.endsWith(suf) && w.length - suf.length >= r2) {
      w = w.slice(0, -suf.length);
      return w;
    }
  }

  // Paso 2: Sufijos verbales
  const verbSuffixes = [
    'iéramos', 'aríamos', 'eríamos', 'iríamos',
    'aríais', 'eríais', 'iríais',
    'aremos', 'eremos', 'iremos',
    'ásemos', 'iésemos',
    'aríam', 'eríam', 'iríam',
    'arían', 'erían', 'irían',
    'arías', 'erías', 'irías',
    'iendo', 'ando',
    'ieron', 'aron', 'asen', 'iesen',
    'aban', 'aran', 'irán',
    'ería', 'iría', 'aría',
    'emos', 'amos', 'imos',
    'aste', 'iste',
    'aron', 'aron',
    'aban', 'ían',
    'ado', 'ido',
    'ará', 'erá', 'irá',
    'aré', 'eré', 'iré',
    'aba', 'ase', 'iese',
    'ais', 'áis',
    'ar', 'er', 'ir',
    'an', 'en',
    'as', 'es', 'ís',
  ];

  for (const suf of verbSuffixes) {
    if (w.endsWith(suf) && w.length - suf.length >= r1) {
      w = w.slice(0, -suf.length);
      return w;
    }
  }

  // Paso 3: Sufijos residuales
  if (w.endsWith('os') && w.length > 3) w = w.slice(0, -2);
  else if (w.endsWith('a') && w.length > 3) w = w.slice(0, -1);
  else if (w.endsWith('o') && w.length > 3) w = w.slice(0, -1);
  else if (w.endsWith('e') && w.length > 3) w = w.slice(0, -1);

  return w;
}
