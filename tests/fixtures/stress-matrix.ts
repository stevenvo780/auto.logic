import type { LogicProfile } from '../../src/types';
import type { QualityCase } from '../helpers/quality';

function stressCase(
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
    minAtoms: 2,
    minFormulas: 3,
    minInterprets: 2,
    minAxioms: 2,
    ...extra
  };
}

export const STRESS_MATRIX_CASES: QualityCase[] = [
  stressCase(
    'stress-classical-mammal-chain',
    'Cadena causal larga con identidad específica en lógica proposicional',
    'Si un animal es mamífero, entonces tiene sangre caliente. Si tiene sangre caliente, entonces puede regular su temperatura. Si puede regular su temperatura, entonces sobrevive al invierno. Los perros son mamíferos. Por lo tanto, los perros sobreviven al invierno.',
    'classical.propositional',
    {
      minAtoms: 4,
      minFormulas: 5,
      minInterprets: 4,
      minAxioms: 4,
      expectedPatterns: ['hypothetical_syllogism', 'modus_ponens'],
      expectedFormulaSnippets: ['derive']
    }
  ),
  stressCase(
    'stress-first-order-medical',
    'Cuantificación con instancias médicas y conclusión individual',
    'Todos los mamíferos necesitan oxígeno. Todos los delfines son mamíferos. Luna es un delfín. Por lo tanto, Luna necesita oxígeno.',
    'classical.first_order',
    {
      minAtoms: 3,
      minFormulas: 3,
      expectedFormulaSnippets: ['forall']
    }
  ),
  stressCase(
    'stress-modal-risk-chain',
    'Modalidad con necesidad, posibilidad y cadena condicional',
    'Es necesario que si una alarma se activa, el protocolo se inicie. Es necesario que si el protocolo se inicia, el personal evacúe. Posiblemente la alarma se activa. Por lo tanto, es posible que el personal evacúe.',
    'modal.k',
    {
      minAtoms: 3,
      minFormulas: 4,
      expectedFormulaSnippets: ['[]', '<>', '->']
    }
  ),
  stressCase(
    'stress-deontic-civic-policy',
    'Normativa extensa con obligación, permiso y prohibición implícita',
    'Es obligatorio que los funcionarios publiquen los contratos. Si los contratos se publican, la auditoría ciudadana mejora. Es permitido que los periodistas soliciten copias. Por lo tanto, la auditoría ciudadana mejora cuando los funcionarios cumplen la obligación.',
    'deontic.standard',
    {
      minAtoms: 3,
      minFormulas: 4,
      expectedFormulaSnippets: ['O', 'P', '->']
    }
  ),
  stressCase(
    'stress-epistemic-science-chain',
    'Conocimiento explícito con consecuencia encadenada',
    'Se sabe que la muestra contiene hierro. Si la muestra contiene hierro, entonces reacciona al imán. Si reacciona al imán, entonces el laboratorio confirma la hipótesis. Por lo tanto, se sabe que el laboratorio puede confirmar la hipótesis.',
    'epistemic.s5',
    {
      minAtoms: 3,
      minFormulas: 4,
      expectedFormulaSnippets: ['K', '->']
    }
  ),
  stressCase(
    'stress-intuitionistic-proof-chain',
    'Intuicionismo con negaciones y consecuencia constructiva',
    'No es cierto que no exista evidencia. Si existe evidencia, entonces puede construirse una demostración. Si puede construirse una demostración, entonces la conclusión es aceptable.',
    'intuitionistic.propositional',
    {
      minAtoms: 3,
      minFormulas: 3,
      expectedFormulaSnippets: ['!']
    }
  ),
  stressCase(
    'stress-temporal-operations',
    'Temporalidad de proceso con siempre, eventualmente y siguiente',
    'Siempre que el servidor reinicia, eventualmente el servicio responde. Si el servicio responde, en el siguiente ciclo se registran métricas. El servidor reinicia ahora. Por lo tanto, eventualmente se registran métricas.',
    'temporal.ltl',
    {
      minAtoms: 3,
      minFormulas: 4,
      expectedFormulaSnippets: ['next', '->']
    }
  ),
  stressCase(
    'stress-paraconsistent-medical-record',
    'Registro inconsistente con persistencia de hechos útiles',
    'El paciente tiene fiebre y el paciente no tiene fiebre. Si el paciente tiene fiebre, entonces se activa la alerta. El paciente está en observación. Por lo tanto, la alerta puede activarse sin colapsar el expediente.',
    'paraconsistent.belnap',
    {
      minAtoms: 3,
      minFormulas: 4,
      expectedFormulaSnippets: ['&', '!']
    }
  ),
  stressCase(
    'stress-aristotelian-biology',
    'Silogística larga con clases biológicas',
    'Todos los mamíferos son animales. Todos los perros son mamíferos. Todos los labradores son perros. Por lo tanto, todos los labradores son animales.',
    'aristotelian.syllogistic',
    {
      minAtoms: 2,
      minFormulas: 3,
      expectedFormulaSnippets: ['forall']
    }
  ),
  stressCase(
    'stress-probabilistic-weather',
    'Razonamiento probabilístico encadenado sobre clima',
    'Probablemente lloverá esta noche. Si llueve esta noche, entonces probablemente mañana habrá tráfico. Si probablemente mañana habrá tráfico, entonces posiblemente la reunión empiece tarde.',
    'probabilistic.basic',
    {
      minAtoms: 3,
      minFormulas: 3,
      expectedFormulaSnippets: ['Pr', '<>']
    }
  ),
  stressCase(
    'stress-arithmetic-divisibility',
    'Aritmética verbal con varias implicaciones de divisibilidad',
    'Si un número es múltiplo de cuatro, entonces es par. Si un número es par, entonces es divisible entre dos. Ocho es múltiplo de cuatro. Por lo tanto, ocho es divisible entre dos.',
    'arithmetic',
    {
      minAtoms: 3,
      minFormulas: 4,
      expectedPatterns: ['hypothetical_syllogism', 'modus_ponens']
    }
  )
];
