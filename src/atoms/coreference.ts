/**
 * Coreference — Resolución de coreferencia por similitud léxica + morfológica
 *
 * Detecta cuando dos cláusulas se refieren a la misma proposición:
 * "llueve" ≈ "está lloviendo" → mismo átomo
 * "la calle se moja" ≈ "la calle está mojada" → mismo átomo
 *
 * Usa:
 * 1. Coeficiente Dice sobre bags-of-stems
 * 2. Normalización de formas verbales (gerundio, participio, conjugaciones)
 * 3. Eliminación de verbos copulativos/auxiliares
 */
import type { Language } from '../types';
import { bagOfStems } from './keyword-extractor';

/** Umbral de similitud para considerar coreferencia */
const COREFERENCE_THRESHOLD = 0.55;

/** Verbos auxiliares/copulativos que no aportan contenido semántico */
const AUX_VERBS_ES = new Set([
  'es', 'son', 'está', 'están', 'fue', 'era', 'eran', 'será', 'serán',
  'estaba', 'estaban', 'siendo', 'estado', 'sido', 'estar', 'ser',
  'ha', 'han', 'haber', 'había', 'hay',
]);

const AUX_VERBS_EN = new Set([
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'has', 'have', 'had', 'having',
  'do', 'does', 'did',
]);

/**
 * Mapa de raíces irregulares: el stemmer Snowball no unifica verbos con
 * cambio de raíz (e→ie, o→ue, etc.), así que "llueve" (raíz `lluev`) y
 * "lloviendo" (raíz `llov`) quedan separados. Normalizamos las raíces más
 * comunes del español a una forma canónica para que el átomo coincida.
 *
 * Sólo cubre lo tratable con un mapa estático. La coreferencia profunda
 * (p.ej. sinonimia "auto"≈"coche", o nominalización "la lluvia"≈"llueve")
 * queda DIFERIDA: requiere lexicón semántico, no es tratable con reglas.
 */
const IRREGULAR_ROOT_CANON: Record<string, string> = {
  // llover: llueve/lluev → llov
  lluev: 'llov',
  lluv: 'llov',
  // contar/cuenta, recordar/recuerda, mover/mueve, doler/duele, poder/puede
  cuent: 'cont',
  recuerd: 'record',
  muev: 'mov',
  duel: 'dol',
  pued: 'pod',
  // pensar/piensa, perder/pierde, querer/quiere, sentir/siente, mentir/miente
  piens: 'pens',
  pierd: 'perd',
  quier: 'quer',
  sient: 'sent',
  mient: 'ment',
  // jugar/juega, volver/vuelve, encontrar/encuentra, contar ya cubierto
  jueg: 'jug',
  vuelv: 'volv',
  encuentr: 'encontr',
  // dormir/duerme, morir/muere
  duerm: 'dorm',
  muer: 'mor',
};

export function canonicalRoot(root: string): string {
  return IRREGULAR_ROOT_CANON[root] ?? root;
}

/**
 * Stems del español sufren sobre-stemming en participios femeninos:
 * "mojada" → `mojad` mientras que "mojado"/"moja" → `moj`. Esto rompe la
 * unificación de átomos (LLUEVE vs LLOVIENDO ya lo cubre el mapa irregular;
 * aquí cubrimos la variante flexiva de participio). Plegamos el residuo
 * `-ad`/`-id` cuando deja una raíz de ≥3 caracteres y la raíz original
 * tiene ≥5, evitando colapsar sustantivos como `edad`, `verdad`, `ciudad`
 * (raíz < 5) o cualquier raíz corta.
 */
export function canonicalStem(root: string): string {
  const r = canonicalRoot(root);
  if (r.length >= 5 && (r.endsWith('ad') || r.endsWith('id'))) {
    const folded = r.slice(0, -1); // mojad → moja, cansad → cansa
    // El stem base de la 3ª persona ("moja") es `moj`; plegamos también la
    // vocal temática para igualar (moja→moj).
    const themeless = folded.replace(/[ae]$/, '');
    return themeless.length >= 3 ? themeless : folded;
  }
  return r;
}

/**
 * Sufijos comunes de gerundio/participio español para normalización.
 * Mapa: sufijo → raíces comunes que produce.
 */
const ES_VERB_SUFFIXES: [RegExp, string][] = [
  // Gerundios → infinitivo-root
  [/ando$/, ''],    // hablando → habl
  [/iendo$/, ''],   // comiendo → com, lloviendo → llov
  [/yendo$/, ''],   // leyendo → le
  // Participios
  [/ado$/, ''],     // hablado → habl
  [/ido$/, ''],     // comido → com
  [/ada$/, ''],     // mojada → moj
  [/idos$/, ''],
  [/adas$/, ''],
  // Conjugaciones presentes
  [/amos$/, ''],
  [/emos$/, ''],
  [/imos$/, ''],
  [/áis$/, ''],
  [/éis$/, ''],
  [/ís$/, ''],
  // 3ra persona
  [/an$/, ''],
  [/en$/, ''],
];

/**
 * Normaliza un token quitando flexión verbal española.
 * Retorna la raíz normalizada.
 */
function normalizeVerbRoot(word: string): string {
  const lower = word.toLowerCase();
  
  // Quitar auxiliar "está/están" ya que se eliminan como stopwords
  if (AUX_VERBS_ES.has(lower)) return '';

  for (const [suffix, replacement] of ES_VERB_SUFFIXES) {
    if (suffix.test(lower) && lower.length > 4) {
      return lower.replace(suffix, replacement);
    }
  }
  return lower;
}

/**
 * Genera un bag-of-roots normalizado para comparación mejorada.
 * Combina stems + raíces verbales normalizadas.
 */
function normalizedBag(text: string, language: Language): Set<string> {
  const rawStems = bagOfStems(text, language);
  const stems = new Set<string>();
  // Canonicalizar raíces irregulares en los stems (sólo español).
  for (const s of rawStems) {
    stems.add(language === 'es' ? canonicalRoot(s) : s);
  }

  // Agregar raíces verbales normalizadas. Limpiamos puntuación adyacente
  // para que "lloviendo." se reconozca como gerundio (si no, el sufijo no
  // matchea y la palabra cruda diluye el coeficiente Dice).
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ''));
  const auxVerbs = language === 'es' ? AUX_VERBS_ES : AUX_VERBS_EN;

  for (const w of words) {
    if (auxVerbs.has(w) || w.length <= 2) continue;

    if (language === 'es') {
      const root = canonicalRoot(normalizeVerbRoot(w));
      if (root && root.length > 2) {
        stems.add(root);
      }
    }
  }

  return stems;
}

/**
 * Calcula la similitud Dice entre dos conjuntos de stems.
 * Dice = 2|A∩B| / (|A| + |B|)
 */
export function diceSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }

  return (2 * intersection) / (setA.size + setB.size);
}

/**
 * Calcula la similitud Jaccard entre dos conjuntos.
 * Jaccard = |A∩B| / |A∪B|
 */
export function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  const union = new Set([...setA, ...setB]);
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }

  return intersection / union.size;
}

/**
 * Determina si dos textos son correferentes (hablan de lo mismo).
 * Usa similitud mejorada con normalización morfológica.
 */
export function areCoreferent(
  textA: string,
  textB: string,
  language: Language = 'es',
  threshold: number = COREFERENCE_THRESHOLD,
): boolean {
  // Primero intentar con bags normalizados (incluye raíces verbales)
  const bagsA = normalizedBag(textA, language);
  const bagsB = normalizedBag(textB, language);
  const normalizedSim = diceSimilarity(bagsA, bagsB);
  if (normalizedSim >= threshold) return true;

  // Fallback: stems puros
  const stemsA = bagOfStems(textA, language);
  const stemsB = bagOfStems(textB, language);
  return diceSimilarity(stemsA, stemsB) >= threshold;
}

/**
 * Dado un array de textos, agrupa los correferentes y retorna
 * un mapa de texto → índice del grupo representativo.
 */
export function resolveCoreferenceGroups(
  texts: string[],
  language: Language = 'es',
  threshold: number = COREFERENCE_THRESHOLD,
): Map<number, number> {
  const normalizedBags = texts.map(t => normalizedBag(t, language));
  const stemSets = texts.map(t => bagOfStems(t, language));
  const groups = new Map<number, number>(); // idx → representative idx

  for (let i = 0; i < texts.length; i++) {
    let found = false;
    for (let j = 0; j < i; j++) {
      if (groups.has(j) && groups.get(j) !== j) continue;
      
      // Intentar con bags normalizados primero
      const normalizedSim = diceSimilarity(normalizedBags[i], normalizedBags[j]);
      if (normalizedSim >= threshold) {
        groups.set(i, j);
        found = true;
        break;
      }
      
      // Fallback: stems puros
      if (diceSimilarity(stemSets[i], stemSets[j]) >= threshold) {
        groups.set(i, j);
        found = true;
        break;
      }
    }
    if (!found) {
      groups.set(i, i); // es su propio representante
    }
  }

  return groups;
}
