/**
 * Stemmer Snowball para inglés
 * Implementación simplificada del algoritmo Snowball English (Porter2).
 * Ref: https://snowballstem.org/algorithms/english/stemmer.html
 */

const VOWELS = 'aeiouy';

function isVowel(ch: string): boolean {
  return VOWELS.includes(ch);
}

function findR1(word: string): number {
  let i = 0;
  while (i < word.length && !isVowel(word[i])) i++;
  while (i < word.length && isVowel(word[i])) i++;
  if (i < word.length) i++;
  return Math.min(i, word.length);
}

function findR2(word: string): number {
  const r1 = findR1(word);
  if (r1 >= word.length) return word.length;
  return r1 + findR1(word.slice(r1));
}

/**
 * Aplica stemming Snowball simplificado al inglés.
 */
export function stemEn(word: string): string {
  if (word.length <= 3) return word.toLowerCase();

  let w = word.toLowerCase();

  // Excepciones especiales
  const exceptions: Record<string, string> = {
    'skis': 'ski', 'skies': 'sky', 'dying': 'die', 'lying': 'lie',
    'tying': 'tie', 'idly': 'idl', 'gently': 'gentl', 'ugly': 'ugli',
    'early': 'earli', 'only': 'onli', 'singly': 'singl',
  };
  if (exceptions[w]) return exceptions[w];

  // Paso 0: eliminar 's y 's
  if (w.endsWith("'s'")) w = w.slice(0, -3);
  else if (w.endsWith("'s")) w = w.slice(0, -2);
  else if (w.endsWith("'")) w = w.slice(0, -1);

  // Paso 1a
  if (w.endsWith('sses')) w = w.slice(0, -2);
  else if (w.endsWith('ied') || w.endsWith('ies')) {
    w = w.length > 4 ? w.slice(0, -2) : w.slice(0, -1);
  } else if (w.endsWith('ss') || w.endsWith('us')) {
    // no cambio
  } else if (w.endsWith('s') && w.length > 2) {
    const preceding = w.slice(0, -1);
    if (preceding.split('').some((c, i) => i > 0 && isVowel(c))) {
      w = preceding;
    }
  }

  const r1 = findR1(w);
  const r2 = findR2(w);

  // Paso 1b
  const step1b = ['eed', 'eedly'];
  let didStep1b = false;
  for (const suf of step1b) {
    if (w.endsWith(suf)) {
      if (w.length - suf.length >= r1) {
        w = w.slice(0, -suf.length) + 'ee';
      }
      didStep1b = true;
      break;
    }
  }
  if (!didStep1b) {
    const step1b2 = ['ing', 'ingly', 'ed', 'edly'];
    for (const suf of step1b2) {
      if (w.endsWith(suf)) {
        const stem = w.slice(0, -suf.length);
        if (stem.split('').some(c => isVowel(c))) {
          w = stem;
          if (w.endsWith('at') || w.endsWith('bl') || w.endsWith('iz')) {
            w += 'e';
          } else if (w.length >= 2 && w[w.length - 1] === w[w.length - 2] &&
            !['l', 's', 'z'].includes(w[w.length - 1])) {
            w = w.slice(0, -1);
          }
        }
        break;
      }
    }
  }

  // Paso 2: sufijos derivacionales
  const step2: [string, string][] = [
    ['ational', 'ate'], ['tional', 'tion'], ['enci', 'ence'], ['anci', 'ance'],
    ['izer', 'ize'], ['abli', 'able'], ['alli', 'al'], ['entli', 'ent'],
    ['eli', 'e'], ['ousli', 'ous'], ['ization', 'ize'], ['ation', 'ate'],
    ['ator', 'ate'], ['alism', 'al'], ['iveness', 'ive'], ['fulness', 'ful'],
    ['ousness', 'ous'], ['aliti', 'al'], ['iviti', 'ive'], ['biliti', 'ble'],
    ['fulli', 'ful'], ['lessli', 'less'],
  ];

  for (const [suf, rep] of step2) {
    if (w.endsWith(suf) && w.length - suf.length >= r1) {
      w = w.slice(0, -suf.length) + rep;
      break;
    }
  }

  // Paso 3
  const step3: [string, string][] = [
    ['ational', 'ate'], ['tional', 'tion'], ['alize', 'al'], ['icate', 'ic'],
    ['iciti', 'ic'], ['ical', 'ic'], ['ful', ''], ['ness', ''],
  ];

  for (const [suf, rep] of step3) {
    if (w.endsWith(suf) && w.length - suf.length >= r1) {
      w = w.slice(0, -suf.length) + rep;
      break;
    }
  }

  // Paso 4: eliminar sufijos
  const step4 = [
    'ement', 'ment', 'ence', 'ance', 'able', 'ible', 'ant', 'ent',
    'ism', 'ate', 'iti', 'ous', 'ive', 'ize', 'al', 'er', 'ic',
  ];

  for (const suf of step4) {
    if (w.endsWith(suf) && w.length - suf.length >= r2) {
      w = w.slice(0, -suf.length);
      break;
    }
  }

  // Paso 5
  if (w.endsWith('e')) {
    if (w.length - 1 >= r2) {
      w = w.slice(0, -1);
    } else if (w.length - 1 >= r1) {
      const ch = w[w.length - 2];
      if (ch && !isVowel(ch)) w = w.slice(0, -1);
    }
  }

  return w;
}
