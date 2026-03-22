import type { LogicProfile } from '../../src/types';
import type { QualityCase } from '../helpers/quality';

function longCase(
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
    minAtoms: 4,
    minFormulas: 4,
    minInterprets: 4,
    minAxioms: 2,
    ...extra,
  };
}

export const LONG_FORMALIZATION_CASES: QualityCase[] = [
  longCase(
    'long-aristotelian-court',
    'Aristotelian — cadena institucional y elegibilidad',
    'Todo juez del tribunal supremo es funcionario público; todo funcionario público con competencia sancionatoria es servidor sometido a control disciplinario; ningún servidor sometido a inhabilidad vigente es elegible para presidir una sala de decisión; algunos jueces del tribunal supremo son profesores universitarios; todo profesor universitario con cátedra activa es académico en ejercicio; ningún académico en ejercicio sin nombramiento judicial vigente es juez del tribunal supremo en funciones; algunos funcionarios públicos no son jueces; algunos académicos en ejercicio no son funcionarios públicos; y ningún ciudadano condenado por fraude electoral es elegible para presidir una sala de decisión.',
    'aristotelian.syllogistic',
    {
      minAtoms: 8,
      minFormulas: 7,
      expectedFormulaSnippets: ['forall']
    }
  ),
  longCase(
    'long-arithmetic-natural-numbers',
    'Arithmetic — propiedades de naturales, divisibilidad y existencia',
    'Para todos los números naturales m, n y p, si m es par y n es impar, entonces la suma de m y n es impar y el producto de m y n es par; además, si p es divisible por 6, entonces p es divisible por 2 y por 3; si m < n y n < p, entonces m < p; para todo número natural k, si k > 0, entonces existe un número natural r tal que r = k + k; y para todo número natural q, si q es impar, entonces existe un número natural s tal que q = 2s + 1.',
    'arithmetic',
    {
      minAtoms: 9,
      minFormulas: 6,
      expectedFormulaSnippets: ['->']
    }
  ),
  longCase(
    'long-classical-university-access',
    'Classical — cadena de acceso, repositorio y laboratorio',
    'Si todo estudiante inscrito que paga su matrícula recibe una credencial activa, y toda persona que recibe una credencial activa puede ingresar a la biblioteca central, y toda persona que ingresa a la biblioteca central puede consultar el repositorio digital, entonces cualquier estudiante inscrito que paga su matrícula puede consultar el repositorio digital; además, Laura es estudiante inscrita, Laura pagó su matrícula, y si una persona puede consultar el repositorio digital o tiene autorización especial del decano, entonces puede descargar artículos científicos; sin embargo, nadie puede entrar al laboratorio químico sin autorización especial, y si Laura no tiene esa autorización, entonces Laura no entra al laboratorio químico aunque sí pueda descargar artículos científicos desde el repositorio digital.',
    'classical.propositional',
    {
      minAtoms: 9,
      minFormulas: 7,
      expectedPatterns: ['modus_ponens'],
      expectedFormulaSnippets: ['->']
    }
  ),
  longCase(
    'long-deontic-research-ethics',
    'Deontic — obligaciones, permisos y prohibiciones éticas',
    'Todo investigador que tenga acceso a datos personales sensibles debe cifrar los archivos antes de compartirlos, y todo coordinador de proyecto debe verificar que los consentimientos informados estén archivados antes de autorizar cualquier transferencia externa; ningún asistente de investigación puede publicar resultados preliminares sin la aprobación expresa del comité ético; si un investigador detecta una filtración de datos, está obligado a reportarla dentro de las veinticuatro horas siguientes; si el comité ético concede permiso excepcional para compartir un conjunto anonimizado, entonces está permitido enviarlo a una institución asociada; pero aun en ese caso sigue prohibido divulgar nombres, números de identificación o direcciones exactas de los participantes.',
    'deontic.standard',
    {
      minAtoms: 8,
      minFormulas: 6,
      expectedFormulaSnippets: ['O', 'P']
    }
  ),
  longCase(
    'long-epistemic-servers',
    'Epistemic — conocimiento anidado sobre respaldo y sesión',
    'Ana sabe que, si el servidor principal deja de responder y el servidor de respaldo no se activa, entonces la sesión de los usuarios se perderá; Bruno sabe que el servidor de respaldo sí está activo; Carla sabe que Bruno sabe eso; Ana no sabe que el servidor de respaldo está activo, pero sí sabe que, si estuviera activo, la pérdida de sesión no sería necesaria; además, Carla sabe que Ana ignora el estado real del respaldo, y Bruno sabe que Carla conoce tanto el estado del respaldo como la ignorancia de Ana; sin embargo, ninguno de los tres sabe todavía si el proveedor externo mantendrá estable la conexión durante toda la madrugada.',
    'epistemic.s5',
    {
      minAtoms: 8,
      minFormulas: 6,
      expectedFormulaSnippets: ['K']
    }
  ),
  longCase(
    'long-intuitionistic-certificates',
    'Intuitionistic — construcciones efectivas y existencia justificable',
    'Si para cada documento firmado digitalmente se puede construir efectivamente un certificado verificable de autenticidad, y si de todo certificado verificable se puede construir un registro auditable, entonces de cada documento firmado digitalmente se puede construir un registro auditable; además, si se exhibe un documento concreto junto con su certificado verificable, entonces puede afirmarse legítimamente que existe al menos un documento autenticable y auditable; y si de cada registro auditable puede construirse un comprobante final de integridad, entonces de la exhibición efectiva del certificado del documento concreto puede construirse también su comprobante final de integridad; pero no se afirma, sin construcción correspondiente, que todo documento sea verificable o que no lo sea.',
    'intuitionistic.propositional',
    {
      minAtoms: 8,
      minFormulas: 6,
      expectedFormulaSnippets: ['!']
    }
  ),
  longCase(
    'long-modal-regulations',
    'Modal — necesidad, posibilidad y mundos accesibles',
    'Es necesario que, si una figura es un triángulo euclidiano, entonces tiene exactamente tres lados; es necesario también que, si un número es múltiplo de cuatro, entonces es par; es posible que mañana el comité apruebe la reforma del reglamento y es posible que no la apruebe; si es necesario que toda norma válida sea aplicable a todos los casos de su mismo tipo, entonces cualquier excepción legítima debe estar prevista por otra norma igualmente válida; además, es posible que exista un mundo accesible en el que el archivo esté cerrado hoy y abierto mañana, pero no es posible, bajo las mismas condiciones y en el mismo momento, que esté jurídicamente abierto y jurídicamente no abierto a la vez.',
    'modal.k',
    {
      minAtoms: 8,
      minFormulas: 6,
      expectedFormulaSnippets: ['[]', '<>']
    }
  ),
  longCase(
    'long-paraconsistent-clinic',
    'Paraconsistent — expediente inconsistente sin explosión',
    'En la base de datos clínica del hospital aparece registrado que el paciente Ramírez es alérgico a la penicilina, y también aparece registrado que el paciente Ramírez no es alérgico a la penicilina, porque dos formularios incompatibles fueron incorporados al mismo expediente por fuentes distintas; además, el expediente afirma que el paciente recibió tratamiento antibiótico y también contiene una nota según la cual todavía no había recibido ningún antibiótico al momento de la observación inicial; sin embargo, del hecho de que el sistema contenga esas contradicciones no se sigue que cualquier otra afirmación sea verdadera, ni que el hospital esté cerrado, ni que el paciente sea menor de edad, ni que toda medicación sea segura; únicamente se sigue que el expediente es inconsistente en ciertos puntos específicos.',
    'paraconsistent.belnap',
    {
      minAtoms: 9,
      minFormulas: 7,
      expectedFormulaSnippets: ['&', '!']
    }
  ),
  longCase(
    'long-probabilistic-alerts',
    'Probabilistic — credencias sobre fallo, respaldo y alerta',
    'La probabilidad de que el servidor principal falle durante la noche es 0.08; la probabilidad de que, dado ese fallo, el servidor de respaldo se active correctamente es 0.90; la probabilidad de pérdida de sesión dado que el servidor principal falla y el respaldo no se activa es 0.95; la probabilidad de pérdida de sesión dado que el servidor principal falla y el respaldo sí se activa es 0.10; y la probabilidad de pérdida de sesión dado que el servidor principal no falla es 0.02; además, la probabilidad de que se emita una alerta automática cuando hay pérdida de sesión es 0.99, mientras que la probabilidad de que se emita una alerta automática sin pérdida de sesión es 0.03; por tanto, la emisión de una alerta aumenta racionalmente la credencia en la hipótesis de pérdida de sesión.',
    'probabilistic.basic',
    {
      minAtoms: 8,
      minFormulas: 6,
      expectedFormulaSnippets: ['Pr']
    }
  ),
  longCase(
    'long-shared-evacuation',
    'Epistemic compartido — conocimiento mutuo sobre evacuación',
    'Ana, Bruno y Carla han leído el protocolo de evacuación, y cada uno sabe que, si suena la alarma principal y la puerta norte está desbloqueada, entonces el grupo debe dirigirse al punto de encuentro exterior; además, Ana sabe que Bruno conoce esa regla, Bruno sabe que Carla la conoce, Carla sabe que Ana la conoce, y cada uno sabe que los otros dos también saben que la regla fue comunicada en la sesión obligatoria de seguridad; por eso, cuando todos oyen la alarma y observan que la puerta norte está desbloqueada, no solo cada uno sabe qué debe hacerse, sino que la regla operativa queda establecida como conocimiento compartido dentro del grupo.',
    'epistemic.s5',
    {
      minAtoms: 9,
      minFormulas: 7,
      expectedFormulaSnippets: ['K']
    }
  ),
  longCase(
    'long-temporal-lifecycle',
    'Temporal — espera, intrusión, backup e integridad',
    'Siempre que el proceso entra en estado de espera, eventualmente vuelve a estado de ejecución o pasa a estado de cancelación; si el sistema detecta una intrusión en un instante dado, entonces en el siguiente instante registra el evento en la bitácora y, mientras la amenaza no sea neutralizada, el protocolo de contención permanece activo; además, una vez que la copia de seguridad comienza, continúa ejecutándose hasta que termina correctamente o hasta que ocurre una interrupción crítica; y si en algún momento se completa la verificación de integridad, entonces desde ese momento en adelante el sistema conserva la marca de archivo validado hasta que una modificación posterior invalide esa condición.',
    'temporal.ltl',
    {
      minAtoms: 9,
      minFormulas: 7,
      expectedFormulaSnippets: ['G', 'F', 'next']
    }
  ),
];
