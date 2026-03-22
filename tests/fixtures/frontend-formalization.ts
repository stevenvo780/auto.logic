import type { LogicProfile } from '../../src/types';
import type { QualityCase } from '../helpers/quality';

function frontendCase(
  id: string,
  description: string,
  text: string,
  profile: LogicProfile,
  extra: Partial<Omit<QualityCase, 'id' | 'description' | 'text' | 'profile'>> = {}
): QualityCase {
  return {
    id,
    description,
    text,
    profile,
    minAtoms: 1,
    minFormulas: 1,
    minInterprets: 1,
    minAxioms: 1,
    ...extra
  };
}

export const FRONTEND_FORMALIZATION_CASES: QualityCase[] = [
  frontendCase(
    'frontend-prop-modus-ponens',
    'Snippet frontend: PROP · Modus Ponens',
    'Si llueve entonces la calle se moja. Llueve. Por lo tanto, la calle se moja.',
    'classical.propositional',
    {
      minAtoms: 2,
      minFormulas: 3,
      expectedPatterns: ['modus_ponens'],
      expectedFormulaSnippets: ['->']
    }
  ),
  frontendCase(
    'frontend-prop-modus-tollens',
    'Snippet frontend: PROP · Modus Tollens',
    'Si el coche avanza, entonces hay gasolina. El coche no avanza. Por lo tanto, no hay gasolina.',
    'classical.propositional',
    {
      minAtoms: 2,
      minFormulas: 3,
      expectedFormulaSnippets: ['!']
    }
  ),
  frontendCase(
    'frontend-prop-hypothetical-syllogism',
    'Snippet frontend: PROP · Silogismo Hipotético',
    'Si estudio, apruebo el examen. Si apruebo el examen, obtengo el título. Si obtengo el título, consigo trabajo.',
    'classical.propositional',
    {
      minAtoms: 3,
      minFormulas: 3,
      expectedPatterns: ['hypothetical_syllogism'],
      expectedFormulaSnippets: ['derive']
    }
  ),
  frontendCase(
    'frontend-prop-conjunction',
    'Snippet frontend: PROP · Conjunción',
    'El gato es negro y el perro es grande.',
    'classical.propositional',
    {
      minAtoms: 2,
      expectedFormulaSnippets: ['&']
    }
  ),
  frontendCase(
    'frontend-prop-disjunction',
    'Snippet frontend: PROP · Disyunción',
    'O viajamos en tren o viajamos en avión.',
    'classical.propositional',
    {
      minAtoms: 2,
      expectedFormulaSnippets: ['|']
    }
  ),
  frontendCase(
    'frontend-prop-biconditional',
    'Snippet frontend: PROP · Bicondicional',
    'Un número es par si y solo si es divisible entre dos.',
    'classical.propositional',
    {
      expectedFormulaSnippets: ['<->']
    }
  ),
  frontendCase(
    'frontend-prop-mammal-chain',
    'Snippet frontend: PROP · Cadena + MP',
    'Si un animal es mamífero, entonces tiene sangre caliente. Si tiene sangre caliente, entonces puede regular su temperatura. Los perros son mamíferos. Por lo tanto, los perros pueden regular su temperatura.',
    'classical.propositional',
    {
      minAtoms: 3,
      minFormulas: 4,
      expectedPatterns: ['hypothetical_syllogism', 'modus_ponens'],
      expectedFormulaSnippets: ['derive']
    }
  ),
  frontendCase(
    'frontend-fol-universal',
    'Snippet frontend: FOL · Silogismo universal',
    'Todos los filósofos buscan la verdad. Sócrates es filósofo. Por lo tanto, Sócrates busca la verdad.',
    'classical.first_order',
    {
      minAtoms: 2,
      minFormulas: 2,
      expectedFormulaSnippets: ['forall']
    }
  ),
  frontendCase(
    'frontend-syl-barbara',
    'Snippet frontend: SYL · Barbara clásico',
    'Todos los humanos son mortales. Sócrates es humano. Por lo tanto, Sócrates es mortal.',
    'aristotelian.syllogistic',
    {
      minFormulas: 2,
      expectedFormulaSnippets: ['forall']
    }
  ),
  frontendCase(
    'frontend-mod-necessity-possibility',
    'Snippet frontend: MOD · Necesidad + posibilidad',
    'Es necesario que si llueve, la calle se moje. Posiblemente llueve.',
    'modal.k',
    {
      minFormulas: 2,
      expectedFormulaSnippets: ['<>', '->']
    }
  ),
  frontendCase(
    'frontend-epi-knowledge-mp',
    'Snippet frontend: EPI · Conocimiento + MP',
    'Se sabe que la tierra es redonda. Si la tierra es redonda, entonces tiene gravedad.',
    'epistemic.s5',
    {
      minFormulas: 2,
      expectedFormulaSnippets: ['->']
    }
  ),
  frontendCase(
    'frontend-deo-obligation-permission',
    'Snippet frontend: DEO · Obligación + permiso',
    'Es obligatorio que todos respeten las leyes. Es permitido que se proteste pacíficamente.',
    'deontic.standard',
    {
      minFormulas: 2,
      expectedFormulaSnippets: ['O', 'P']
    }
  ),
  frontendCase(
    'frontend-tmp-always-eventually',
    'Snippet frontend: TMP · Siempre + eventualmente',
    'Siempre que llueve, eventualmente sale el sol. Actualmente llueve.',
    'temporal.ltl',
    {
      minFormulas: 2,
      expectedFormulaSnippets: ['->']
    }
  ),
  frontendCase(
    'frontend-int-double-negation',
    'Snippet frontend: INT · Doble negación',
    'No es cierto que no llueve. Si llueve entonces la calle se moja.',
    'intuitionistic.propositional',
    {
      minFormulas: 2,
      expectedFormulaSnippets: ['!']
    }
  ),
  frontendCase(
    'frontend-par-contradiction',
    'Snippet frontend: PAR · Contradicción tolerada',
    'El gato está vivo y el gato no está vivo. El gato está en la caja.',
    'paraconsistent.belnap',
    {
      minFormulas: 2,
      expectedFormulaSnippets: ['&']
    }
  ),
  frontendCase(
    'frontend-ari-divisibility',
    'Snippet frontend: ARI · Divisibilidad',
    'Si un número es par, entonces es divisible entre dos. Cuatro es par. Por lo tanto, cuatro es divisible entre dos.',
    'arithmetic',
    {
      minAtoms: 2,
      minFormulas: 3,
      expectedPatterns: ['modus_ponens']
    }
  ),
  frontendCase(
    'frontend-prob-inference',
    'Snippet frontend: PRO · Inferencia probable',
    'Probablemente llueve. Si llueve, entonces posiblemente la calle se moje.',
    'probabilistic.basic',
    {
      minFormulas: 2,
      expectedFormulaSnippets: ['Pr', '<>']
    }
  ),
  frontendCase(
    'frontend-prop-poetica',
    'Snippet frontend: PROP · Aristóteles — Poética',
    'Puesto que realizan la representación actuando, primero sería necesariamente una parte de la tragedia la decoración del espectáculo, la melopeya y la elocución.',
    'classical.propositional',
    {
      minAtoms: 2,
      minFormulas: 2
    }
  )
];
