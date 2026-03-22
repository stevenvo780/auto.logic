import type { FormalizeOptions, LogicProfile, Language } from '../../src/types';

export interface CorpusCase {
  id: string;
  description: string;
  text: string;
  options: FormalizeOptions;
  minAtoms?: number;
  minFormulas?: number;
  minInterprets?: number;
  minAxioms?: number;
  expectedPatterns?: string[];
  expectedFormulaSnippets?: string[];
}

const baseCase = (
  id: string,
  description: string,
  text: string,
  profile: LogicProfile,
  language: Language,
  extra: Omit<CorpusCase, 'id' | 'description' | 'text' | 'options'> = {}
): CorpusCase => ({
  id,
  description,
  text,
  options: {
    profile,
    language,
    atomStyle: 'keywords',
    includeComments: true,
    validateOutput: true
  },
  minAtoms: 1,
  minFormulas: 1,
  minInterprets: 1,
  minAxioms: 1,
  ...extra
});

export const CORPUS_CASES: CorpusCase[] = [
  baseCase(
    'es-short-modus-ponens',
    'Modus ponens corto en español',
    'Si llueve, la calle se moja. Llueve. Por lo tanto, la calle se moja.',
    'classical.propositional',
    'es',
    {
      minAtoms: 2,
      minFormulas: 3,
      minInterprets: 2,
      minAxioms: 2,
      expectedPatterns: ['modus_ponens'],
      expectedFormulaSnippets: ['->']
    }
  ),
  baseCase(
    'es-short-negation',
    'Negación corta en español',
    'No es cierto que la tierra sea plana.',
    'classical.propositional',
    'es',
    {
      expectedFormulaSnippets: ['!']
    }
  ),
  baseCase(
    'es-short-disjunction',
    'Disyunción corta en español',
    'O bien llueve o bien hace sol.',
    'classical.propositional',
    'es',
    {
      expectedFormulaSnippets: ['|']
    }
  ),
  baseCase(
    'es-medium-hypothetical-syllogism',
    'Cadena de condicionales en español',
    'Si estudio, apruebo el examen. Si apruebo el examen, obtengo el título. Si obtengo el título, consigo trabajo.',
    'classical.propositional',
    'es',
    {
      minAtoms: 3,
      minFormulas: 3,
      minInterprets: 3,
      minAxioms: 2,
      expectedPatterns: ['hypothetical_syllogism'],
      expectedFormulaSnippets: ['derive']
    }
  ),
  baseCase(
    'es-medium-first-order',
    'Silogismo universal en español',
    'Todos los filósofos buscan la verdad. Sócrates es filósofo. Por lo tanto, Sócrates busca la verdad.',
    'classical.first_order',
    'es',
    {
      minAtoms: 2,
      minFormulas: 2,
      expectedFormulaSnippets: ['forall']
    }
  ),
  baseCase(
    'es-medium-modal',
    'Necesidad y posibilidad modal en español',
    'Es necesario que si llueve, la calle se moje. Posiblemente llueve.',
    'modal.k',
    'es',
    {
      expectedFormulaSnippets: ['<>', '->']
    }
  ),
  baseCase(
    'es-medium-epistemic',
    'Conocimiento y consecuencia en español',
    'Se sabe que la tierra es redonda. Si la tierra es redonda, entonces tiene gravedad.',
    'epistemic.s5',
    'es',
    {
      expectedFormulaSnippets: ['K', '->']
    }
  ),
  baseCase(
    'es-medium-deontic',
    'Obligación y permiso en español',
    'Es obligatorio que todos respeten las leyes. Es permitido que se proteste pacíficamente.',
    'deontic.standard',
    'es',
    {
      expectedFormulaSnippets: ['O', 'P']
    }
  ),
  baseCase(
    'es-medium-temporal',
    'Temporalidad básica en español',
    'Siempre que llueve, eventualmente sale el sol. Actualmente llueve.',
    'temporal.ltl',
    'es',
    {
      expectedFormulaSnippets: ['G', 'F', '->']
    }
  ),
  baseCase(
    'es-medium-intuitionistic',
    'Doble negación intuicionista en español',
    'No es cierto que no llueve. Si llueve entonces la calle se moja.',
    'intuitionistic.propositional',
    'es',
    {
      expectedFormulaSnippets: ['!']
    }
  ),
  baseCase(
    'es-medium-paraconsistent',
    'Contradicción tolerada en español',
    'El gato está vivo y el gato no está vivo. El gato está en la caja.',
    'paraconsistent.belnap',
    'es',
    {
      expectedFormulaSnippets: ['&', '!']
    }
  ),
  baseCase(
    'es-medium-arithmetic',
    'Regla aritmética condicional en español',
    'Si un número es par, entonces es divisible entre dos. Cuatro es par. Por lo tanto, cuatro es divisible entre dos.',
    'arithmetic',
    'es',
    {
      minAtoms: 2,
      minFormulas: 3,
      expectedPatterns: ['modus_ponens']
    }
  ),
  baseCase(
    'es-medium-probabilistic',
    'Inferencia probabilística en español',
    'Probablemente llueve. Si llueve, entonces posiblemente la calle se moje.',
    'probabilistic.basic',
    'es',
    {
      expectedFormulaSnippets: ['Pr', '<>']
    }
  ),
  baseCase(
    'es-long-economic-chain',
    'Argumento largo de cadena causal en español',
    'Si la economía crece, el empleo aumenta. Si el empleo aumenta, el consumo sube. Si el consumo sube, las empresas prosperan. Si las empresas prosperan, aumenta la inversión. Si aumenta la inversión, mejora la innovación. La economía está creciendo. Por lo tanto, mejora la innovación.',
    'classical.propositional',
    'es',
    {
      minAtoms: 5,
      minFormulas: 6,
      minInterprets: 5,
      minAxioms: 5,
      expectedPatterns: ['hypothetical_syllogism', 'modus_ponens']
    }
  ),
  baseCase(
    'es-long-academic-policy',
    'Texto largo con política pública en español',
    'Si la universidad mejora su biblioteca digital, los estudiantes acceden mejor a las fuentes. Si los estudiantes acceden mejor a las fuentes, producen investigaciones más sólidas. Si producen investigaciones más sólidas, las publicaciones indexadas aumentan. Dado que la universidad mejoró su biblioteca digital este semestre, las publicaciones indexadas aumentarán.',
    'classical.propositional',
    'es',
    {
      minAtoms: 4,
      minFormulas: 4,
      expectedPatterns: ['hypothetical_syllogism', 'modus_ponens']
    }
  ),
  baseCase(
    'es-long-syllogistic',
    'Silogística aristotélica extendida en español',
    'Todos los mamíferos son animales. Todos los perros son mamíferos. Todos los perros son animales.',
    'aristotelian.syllogistic',
    'es',
    {
      minAtoms: 1,
      minFormulas: 2,
      expectedFormulaSnippets: ['forall']
    }
  ),
  baseCase(
    'en-short-modus-ponens',
    'Modus ponens corto en inglés',
    'If it rains, the street gets wet. It is raining. Therefore, the street gets wet.',
    'classical.propositional',
    'en',
    {
      minAtoms: 2,
      minFormulas: 3,
      expectedPatterns: ['modus_ponens'],
      expectedFormulaSnippets: ['->']
    }
  ),
  baseCase(
    'en-medium-hypothetical-syllogism',
    'Cadena condicional en inglés',
    'If I study, I pass the exam. If I pass the exam, I get the degree. If I get the degree, I find a job.',
    'classical.propositional',
    'en',
    {
      minAtoms: 3,
      minFormulas: 3,
      expectedPatterns: ['hypothetical_syllogism']
    }
  ),
  baseCase(
    'en-medium-first-order',
    'Cuantificación universal en inglés',
    'Every human is mortal. Socrates is human. Therefore, Socrates is mortal.',
    'classical.first_order',
    'en',
    {
      expectedFormulaSnippets: ['forall']
    }
  ),
  baseCase(
    'en-medium-modal',
    'Necesidad modal en inglés',
    'It is necessary that laws are obeyed. If laws are obeyed, possibly society prospers.',
    'modal.k',
    'en',
    {
      expectedFormulaSnippets: ['[]', '<>']
    }
  ),
  baseCase(
    'en-medium-temporal',
    'Temporalidad en inglés',
    'After studying, there will be an exam. Study continues until passing.',
    'temporal.ltl',
    'en',
    {
      expectedFormulaSnippets: ['X', 'U']
    }
  ),
  baseCase(
    'en-long-economic-chain',
    'Argumento largo económico en inglés',
    'If the economy grows, employment increases. If employment increases, consumption rises. If consumption rises, businesses prosper. If businesses prosper, investment grows. If investment grows, innovation improves. The economy is growing. Therefore, innovation improves.',
    'classical.propositional',
    'en',
    {
      minAtoms: 5,
      minFormulas: 6,
      expectedPatterns: ['hypothetical_syllogism', 'modus_ponens']
    }
  ),
  baseCase(
    'en-long-ethics-policy',
    'Texto largo normativo en inglés',
    'It is obligatory that hospitals protect patient data. If hospitals protect patient data, trust increases. If trust increases, preventive care improves. Since hospitals are protecting patient data more effectively this year, preventive care improves.',
    'deontic.standard',
    'en',
    {
      minAtoms: 3,
      minFormulas: 4,
      expectedFormulaSnippets: ['O']
    }
  )
];
