import type { LogicProfile } from '../../src/types';
import type { QualityCase } from '../helpers/quality';

export interface ValidatedHardCase extends QualityCase {
  premises: string;
  providedAnswer: string;
  testedAnswer: string;
  validityNote?: string;
}

function validatedHardCase(
  id: string,
  description: string,
  premises: string,
  profile: LogicProfile,
  providedAnswer: string,
  testedAnswer: string,
  extra: Partial<Omit<ValidatedHardCase, 'id' | 'description' | 'premises' | 'profile' | 'providedAnswer' | 'testedAnswer' | 'text'>> = {}
): ValidatedHardCase {
  return {
    id,
    description,
    premises,
    profile,
    providedAnswer,
    testedAnswer,
    text: `${premises} Por lo tanto, ${testedAnswer}`,
    minAtoms: 5,
    minFormulas: 4,
    minInterprets: 4,
    minAxioms: 2,
    ...extra,
  };
}

export const VALIDATED_HARD_CASES: ValidatedHardCase[] = [
  validatedHardCase(
    'validated-hard-aristotelian-experts',
    'Aristotelian — peritos, expediente y suspensión vigente',
    'Todo perito acreditado que actúa en causas penales es auxiliar de la justicia; ningún auxiliar de la justicia con suspensión vigente puede emitir dictamen vinculante; todo dictamen vinculante integra necesariamente el expediente principal; algunos peritos acreditados son además docentes universitarios; ningún docente universitario sin contrato activo actúa válidamente en causas penales; y toda persona que integra el expediente principal interviene en una fase procesal reconocida.',
    'aristotelian.syllogistic',
    'Ningún perito acreditado que actúa en causas penales y tenga suspensión vigente puede emitir dictamen vinculante.',
    'Ningún perito acreditado que actúa en causas penales y tenga suspensión vigente puede emitir dictamen vinculante.',
    {
      minAtoms: 7,
      minFormulas: 6,
      expectedFormulaSnippets: ['forall']
    }
  ),
  validatedHardCase(
    'validated-hard-arithmetic-multiples',
    'Arithmetic — combinación lineal de múltiplos de 24',
    'Para cualesquiera números naturales a, b y c, si a es múltiplo de 8 y b es múltiplo de 3, entonces 3a es múltiplo de 24 y 8b es múltiplo de 24; si dos números son múltiplos de 24, entonces su suma también es múltiplo de 24; además, si c es cualquier número natural, entonces 24c es múltiplo de 24, y la suma de un múltiplo de 24 con otro múltiplo de 24 vuelve a ser múltiplo de 24.',
    'arithmetic',
    'Si a es múltiplo de 8, b es múltiplo de 3 y c es natural, entonces 3a + 8b + 24c es múltiplo de 24.',
    'Si a es múltiplo de 8, b es múltiplo de 3 y c es natural, entonces 3a + 8b + 24c es múltiplo de 24.',
    {
      minAtoms: 8,
      minFormulas: 5,
      expectedFormulaSnippets: ['->']
    }
  ),
  validatedHardCase(
    'validated-hard-classical-dispatch',
    'Classical — firma, consignación y despacho obligatorio',
    'Si el contrato fue firmado por la directora o por el apoderado con poder vigente, entonces el acuerdo es formalmente válido; si el acuerdo es formalmente válido y además el pago inicial fue consignado, entonces se activa la obligación de entrega; si se activa la obligación de entrega, entonces la empresa debe despachar el equipo o notificar imposibilidad justificada; no hubo notificación de imposibilidad justificada; el contrato no fue firmado por la directora; el apoderado sí tenía poder vigente y sí firmó el contrato; y el pago inicial fue consignado en la cuenta indicada.',
    'classical.propositional',
    'La empresa debe despachar el equipo.',
    'La empresa debe despachar el equipo.',
    {
      minAtoms: 8,
      minFormulas: 6,
      expectedPatterns: ['modus_ponens'],
      expectedFormulaSnippets: ['->']
    }
  ),
  validatedHardCase(
    'validated-hard-deontic-plagiarism',
    'Deontic — plagio grave, suspensión y prohibición editorial',
    'Todo revisor académico que detecte plagio grave está obligado a suspender la evaluación y a reportar el caso al comité de ética; ningún coordinador editorial puede autorizar la publicación de un manuscrito suspendido; si el comité concede una autorización excepcional, entonces está permitido reanudar la revisión técnica, pero sigue prohibido publicar el manuscrito mientras no se corrija el plagio; en un caso concreto, el revisor detectó plagio grave y no existe autorización excepcional emitida por el comité.',
    'deontic.standard',
    'Es obligatorio suspender la evaluación y reportar el caso al comité, y está prohibido autorizar la publicación del manuscrito.',
    'Es obligatorio suspender la evaluación y reportar el caso al comité, y está prohibido autorizar la publicación del manuscrito.',
    {
      minAtoms: 7,
      minFormulas: 5,
      expectedFormulaSnippets: ['O', '!']
    }
  ),
  validatedHardCase(
    'validated-hard-epistemic-master-key',
    'Epistemic — llave maestra, código y conocimiento anidado',
    'Ana sabe que, si la llave maestra está en la caja roja y Bruno conoce el código, entonces Bruno puede abrir el archivo; Bruno sabe el código; Carla sabe que Ana conoce esa implicación y sabe además que Bruno conoce el código; Carla también sabe que la llave maestra está en la caja roja; Diego sabe que Carla sabe todo eso; Ana, sin embargo, no sabe dónde está la llave maestra; y todos saben que ningún archivo puede abrirse sin llave maestra y sin código correcto.',
    'epistemic.s5',
    'Carla sabe que Bruno puede abrir el archivo; Diego sabe que Carla lo sabe; Ana todavía no puede saberlo.',
    'Carla sabe que Bruno puede abrir el archivo; Diego sabe que Carla lo sabe; Ana todavía no sabe que Bruno puede abrir el archivo.',
    {
      minAtoms: 8,
      minFormulas: 6,
      expectedFormulaSnippets: ['K'],
      validityNote: 'La versión testeada debilita la última frase: la ignorancia actual de Ana sí se sigue; la imposibilidad fuerte de saberlo no necesariamente.'
    }
  ),
  validatedHardCase(
    'validated-hard-intuitionistic-witness',
    'Intuitionistic — testigo constructivo explícito para 10 = 3 + 7',
    'Existe un procedimiento efectivo que, dado un número natural junto con una descomposición concreta de ese número como suma de dos naturales positivos, produce un certificado verificable de dicha descomposición; además, se exhiben explícitamente el número 10, el número 3 y el número 7, y se muestra efectivamente que 10 es la suma de 3 y 7; todo número para el que se exhiba una descomposición certificada tiene una representación auditable; y de toda representación auditable puede construirse un registro finito de verificación.',
    'intuitionistic.propositional',
    'Existe constructivamente un número con representación auditable y registro finito de verificación; concretamente, ese número es 10.',
    'Existe constructivamente un número con representación auditable y registro finito de verificación; concretamente, ese número es 10.',
    {
      minAtoms: 7,
      minFormulas: 5,
      expectedFormulaSnippets: ['derive'],
      validityNote: 'Aquí lo correcto es exigir testigo y derivación constructiva explícita, no negación intuicionista.'
    }
  ),
  validatedHardCase(
    'validated-hard-modal-credentials',
    'Modal — clave comprometida y transmisiones riesgosas',
    'Es necesario que, si un protocolo criptográfico usa una clave comprometida, entonces el canal no es seguro; es necesario que, si el canal no es seguro, entonces toda transmisión de credenciales por ese canal es riesgosa; y es necesario que el protocolo actualmente en uso emplea una clave comprometida.',
    'modal.k',
    'Es necesario que toda transmisión de credenciales por ese protocolo sea riesgosa.',
    'Es necesario que toda transmisión de credenciales por ese protocolo sea riesgosa.',
    {
      minAtoms: 5,
      minFormulas: 4,
      expectedFormulaSnippets: ['[]']
    }
  ),
  validatedHardCase(
    'validated-hard-paraconsistent-vaccine',
    'Paraconsistent — vacuna X, obligación clínica y no explosión',
    'El expediente clínico digital contiene la afirmación de que Nora recibió la vacuna X y también contiene la afirmación de que Nora no recibió la vacuna X, porque dos subsistemas registraron datos incompatibles; el protocolo hospitalario establece que, si una paciente recibió la vacuna X, entonces debe registrarse observación postvacunal; y también establece que, si una paciente no recibió la vacuna X, entonces no debe cobrarse la dosis aplicada. La inconsistencia del expediente no autoriza a concluir cualquier cosa irrelevante sobre Nora o sobre el hospital.',
    'paraconsistent.belnap',
    'Puede concluirse válidamente que debe registrarse observación postvacunal y también que no debe cobrarse la dosis; no se sigue de ahí una conclusión arbitraria cualquiera.',
    'Puede concluirse válidamente que debe registrarse observación postvacunal y también que no debe cobrarse la dosis; no se sigue de ahí una conclusión arbitraria cualquiera.',
    {
      minAtoms: 8,
      minFormulas: 6,
      expectedFormulaSnippets: ['&', '!']
    }
  ),
  validatedHardCase(
    'validated-hard-probabilistic-fraud',
    'Probabilistic — alerta roja, inconsistencias y posterior de fraude',
    'La probabilidad previa de fraude en una transacción es 0.02. Si hay fraude, la probabilidad de que el sistema emita alerta roja es 0.93; si no hay fraude, la probabilidad de alerta roja es 0.04. Además, cuando ya hubo alerta roja, la probabilidad de que la revisión manual encuentre inconsistencias es 0.80 si sí hubo fraude y 0.10 si no hubo fraude. En una transacción concreta hubo alerta roja y la revisión manual encontró inconsistencias.',
    'probabilistic.basic',
    'La probabilidad posterior de fraude es aproximadamente 79.15%.',
    'La probabilidad posterior de fraude es aproximadamente 79.15%.',
    {
      minAtoms: 7,
      minFormulas: 5,
      expectedFormulaSnippets: ['Pr'],
      validityNote: 'La cifra bayesiana fue validada externamente; aquí se prueba que el perfil preserva la estructura probabilística y la conclusión posterior.'
    }
  ),
  validatedHardCase(
    'validated-hard-shared-control-room',
    'Epistemic compartido — tablero rojo, válvula abierta y coordinación mutua',
    'Ana, Bruno y Carla asistieron juntos a una inducción pública en la que se anunció que, si el tablero marca nivel rojo y la válvula sur está abierta, todos deben cerrar simultáneamente las líneas auxiliares; cada uno vio que los otros dos escucharon la instrucción y comprendieron la regla; más tarde, el tablero marca nivel rojo a la vista de todos y la válvula sur aparece abierta en el panel común, también visible para todos; además, ninguno duda de la racionalidad operativa de los otros.',
    'epistemic.s5',
    'La regla funciona como conocimiento compartido entre los tres; por tanto, cada uno sabe que debe cerrar las líneas auxiliares y sabe que los otros también lo saben.',
    'Cada uno sabe que debe cerrar las líneas auxiliares y sabe que los otros también lo saben.',
    {
      minAtoms: 8,
      minFormulas: 6,
      expectedFormulaSnippets: ['K'],
      validityNote: 'Se testea el efecto operativo del conocimiento compartido mediante capas mutuas de conocimiento, no un operador nativo de common knowledge.'
    }
  ),
  validatedHardCase(
    'validated-hard-temporal-queue',
    'Temporal — solicitud en cola, atención eventual y comprobante siguiente',
    'Siempre que una solicitud válida entra en cola, en el siguiente estado queda registrada; toda solicitud registrada permanece registrada hasta que sea atendida o cancelada; toda solicitud registrada que no sea cancelada será eventualmente atendida; y toda solicitud atendida genera comprobante en el estado inmediatamente siguiente. Ahora entra una solicitud válida en cola y además esa solicitud nunca es cancelada.',
    'temporal.ltl',
    'La solicitud quedará registrada, eventualmente será atendida y después se emitirá su comprobante.',
    'La solicitud quedará registrada, eventualmente será atendida y después se emitirá su comprobante.',
    {
      minAtoms: 8,
      minFormulas: 6,
      expectedFormulaSnippets: ['G', 'F', 'next']
    }
  ),
];