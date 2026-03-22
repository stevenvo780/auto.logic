/**
 * Atoms — Extractor de átomos proposicionales
 */
export { extractKeywords, extractStems, bagOfStems, extractSubjectPredicate, extractSemanticHint } from './keyword-extractor';
export { generateId, generatePredicateId, generateVariableId } from './identifier-gen';
export { areCoreferent, resolveCoreferenceGroups, diceSimilarity } from './coreference';

import type { AtomEntry, AtomStyle, Language, AnalyzedSentence, LogicProfile } from '../types';
import { extractKeywords, extractSemanticHint, extractSubjectPredicate } from './keyword-extractor';
import { generateId, generatePredicateId, generateVariableId } from './identifier-gen';
import { resolveCoreferenceGroups } from './coreference';

/**
 * Extrae átomos proposicionales de oraciones analizadas.
 * Resuelve coreferencia y asigna IDs simbólicos.
 */
export function extractAtoms(
  sentences: AnalyzedSentence[],
  options: {
    language?: Language;
    atomStyle?: AtomStyle;
    profile?: LogicProfile;
  } = {},
): { atoms: Map<string, string>; entries: AtomEntry[] } {
  const language = options.language || 'es';
  const style = options.atomStyle || 'keywords';
  const profile = options.profile || 'classical.propositional';

  const buildSemanticFields = (text: string) => extractSemanticHint(text, language);
  const semanticCache = new Map<string, ReturnType<typeof extractSemanticHint>>();

  const getSemantic = (text: string) => {
    const cached = semanticCache.get(text);
    if (cached) return cached;
    const semantic = buildSemanticFields(text);
    semanticCache.set(text, semantic);
    return semantic;
  };

  // 1. Recopilar todos los textos de cláusulas
  const clauseTexts: { text: string; sentIdx: number; clauseIdx: number; role?: string }[] = [];
  for (let sIdx = 0; sIdx < sentences.length; sIdx++) {
    for (let cIdx = 0; cIdx < sentences[sIdx].clauses.length; cIdx++) {
      const clause = sentences[sIdx].clauses[cIdx];
      clauseTexts.push({
        text: clause.text,
        sentIdx: sIdx,
        clauseIdx: cIdx,
        role: clause.role,
      });
    }
  }

  // 2. Resolver coreferencia
  const texts = clauseTexts.map(ct => ct.text);
  const corefGroups = resolveCoreferenceGroups(texts, language);

  // 2b. Separar conclusiones de la coreferencia:
  // Una cláusula con rol 'conclusion' no debe fusionarse con premisas/aserciones
  // porque representa una proposición derivada distinta.
  for (let i = 0; i < clauseTexts.length; i++) {
    const ct = clauseTexts[i];
    if (ct.role === 'conclusion') {
      const rep = corefGroups.get(i);
      // Si fue fusionada con otra cláusula que NO es conclusión, separarla
      if (rep !== undefined && rep !== i) {
        const repClause = clauseTexts[rep];
        if (repClause && repClause.role !== 'conclusion') {
          corefGroups.set(i, i); // se convierte en su propio representante
        }
      }
    }
  }

  // 3. Generar átomos únicos
  const atoms = new Map<string, string>();
  const entries: AtomEntry[] = [];
  const representativeIds = new Map<number, string>(); // groupIdx → atomId
  let atomCounter = 0;

  for (let i = 0; i < clauseTexts.length; i++) {
    const ct = clauseTexts[i];
    let representative = profile === 'probabilistic.basic'
      || profile === 'epistemic.s5'
      || profile === 'classical.first_order'
      || profile === 'aristotelian.syllogistic'
      ? i
      : (corefGroups.get(i) ?? i);

    if (representative !== i) {
      const repSemantic = getSemantic(clauseTexts[representative].text);
      const currentSemantic = getSemantic(ct.text);

      if (shouldKeepSeparate(repSemantic, currentSemantic)) {
        representative = i;
        corefGroups.set(i, i);
      }
    }

    if (representativeIds.has(representative)) {
      // Ya existe un átomo para este grupo de coreferencia
      const existingId = representativeIds.get(representative)!;
      const semantic = getSemantic(ct.text);
      entries.push({
        id: existingId,
        text: ct.text,
        sourceClause: i,
        role: ct.role as AtomEntry['role'],
        subject: semantic.subject,
        predicate: semantic.predicate,
        object: semantic.object,
        polarity: semantic.polarity,
        relationKind: semantic.relationKind,
        keywords: semantic.keywords,
      });
      continue;
    }

    // Crear nuevo átomo
    let atomId: string;
    const semantic = getSemantic(ct.text);

    if (profile === 'classical.first_order' || profile === 'aristotelian.syllogistic' || profile === 'arithmetic') {
      // Para primer orden: extraer predicado y términos
      const sp = extractSubjectPredicate(ct.text, language);
      if (sp) {
        const predicate = generatePredicateId(sp.predicate.split('_'));
        const variable = generateVariableId(sp.subject);
        atomId = `${predicate}(${variable})`;
        entries.push({
          id: atomId,
          text: ct.text,
          sourceClause: i,
          role: ct.role as AtomEntry['role'],
          predicate,
          terms: [variable],
          subject: sp.subject,
          object: undefined,
          polarity: semantic.polarity,
          relationKind: 'copula',
          keywords: semantic.keywords,
        });
      } else {
        const keywords = extractKeywords(ct.text, language);
        atomId = generateId(keywords, style, atomCounter);
        entries.push({
          id: atomId,
          text: ct.text,
          sourceClause: i,
          role: ct.role as AtomEntry['role'],
          subject: semantic.subject,
          predicate: semantic.predicate,
          object: semantic.object,
          polarity: semantic.polarity,
          relationKind: semantic.relationKind,
          keywords: semantic.keywords,
        });
      }
    } else {
      const keywords = extractKeywords(ct.text, language);
      atomId = generateId(keywords, style, atomCounter);
      atomId = ensureUniqueAtomId(atomId, ct.text, atoms, profile, atomCounter);
      entries.push({
        id: atomId,
        text: ct.text,
        sourceClause: i,
        role: ct.role as AtomEntry['role'],
        subject: semantic.subject,
        predicate: semantic.predicate,
        object: semantic.object,
        polarity: semantic.polarity,
        relationKind: semantic.relationKind,
        keywords: semantic.keywords,
      });
    }

    atoms.set(atomId, ct.text);
    representativeIds.set(representative, atomId);
    atomCounter++;
  }

  return { atoms, entries };
}

function ensureUniqueAtomId(
  atomId: string,
  text: string,
  atoms: Map<string, string>,
  profile: LogicProfile,
  atomCounter: number,
): string {
  if (!atoms.has(atomId) || atoms.get(atomId) === text) {
    return atomId;
  }

  if (true) {
    return `${atomId}_${atomCounter}`;
  }

  return atomId;
}

function shouldKeepSeparate(
  representative: ReturnType<typeof extractSemanticHint>,
  candidate: ReturnType<typeof extractSemanticHint>,
): boolean {
  if (representative.polarity !== candidate.polarity) {
    return true;
  }

  const subjectConflict = representative.subject && candidate.subject && representative.subject !== candidate.subject;
  const predicateConflict = representative.predicate && candidate.predicate && representative.predicate !== candidate.predicate;
  const objectConflict = representative.object && candidate.object && representative.object !== candidate.object;

  const sharedKeywords = representative.keywords.filter(keyword => candidate.keywords.includes(keyword));

  if ((subjectConflict || predicateConflict || objectConflict) && sharedKeywords.length < 3) {
    return true;
  }

  return false;
}
