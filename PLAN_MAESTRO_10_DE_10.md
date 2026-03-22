# Plan Maestro 10/10: Hacia una Semántica Formal Estricta (Dialéctica Empírica)

Implementar lógicas no-clásicas robustas sobre un árbol léxico de lenguaje natural superficial ha probado ser fundamentalmente insuficiente. Los tests arquitecturales extremos (Vitest `architectural-limits.test.ts`) han hecho estallar y avergonzado al motor actual:

| Lógica | Premisa Extrema (Input) | Salida Errónea del Sistema Actual (Output Real) | Evidencia del Fracaso |
|---|---|---|---|
| **Aritmética** | *"Para todo x y z, si x = y + 2, entonces y = x - 2."* | `forall x (x(x) -> z(x))` | El tokenizer NLP destruyó las matemáticas. Convirtió la variable $x$ en un predicado monádico `x(x)` y aniquiló la ecuación (+, -, y). |
| **Fol Combinatorio** | *"Cada protocolo tiene exactamente tres supervisores."* | `forall x (Protocolo(x) -> TieneExactamenteTresSupervisores(x))` | Cobardía combinatoria. Ocultó la restricción numérica detrás de una proposición estática gigante incapaz de soportar cálculo SAT. |
| **Epistémica / DRT** | *"Ana aprueba el balance. Diego sabe esto. Carlos duda."* | `axiom a2 = DIEGO_SABE` | Ceguera anafórica total. Acuñó átomos carentes de objeto (`DIEGO_SABE` / *¿Sabe qué?*). Perdió el puntero anidado hacia Ana. |
| **Deóntica** | *"Los técnicos están obligados a reiniciar el cluster..."* | `OBLIGADOS_REINICIAR_TECNICOS_CLUSTER` | Incapacidad de aislamiento del operador Normativo. Colapsó la obligación en texto plano, neutralizando a todo el *solucionador* ST subyacente. |

A raíz de esta evidencia destructiva, planteamos esta transición absoluta de Ingeniería de Compiladores a ejecutarse incondicionalmente cueste lo que cueste:

---

## 1. El Mini-Parser CFG (Aislamiento Algebraico)
**Diagnóstico:** NLP destruye variables formales y operadores (`+`, `=`). No se puede correr Regex sobre lenguaje Lisp inverso.
**Arquitectura Exigida:**
- **Inyección de `src/atoms/math-parser.ts`**: Implementación de un analizador *Recursive Descent* liviano que actúe **ANTES** del `nlp-tokenizer`.
- Al encontrar ventanas de alta densidad de símbolos `[x, y, =, +, -, ^, *]`, el sistema capturará la ecuación entera, formará un AST Algebraico en memoria `$M_1 = Equality(y, Subtraction(x, 2))` y dejará una llave blindada en el texto (`__MATH_1__`). Luego en el ST-Emitter restituirá su forma funcional en lugar de destrozarlo como lenguaje natural.

## 2. Abandono de Concatenadores de Cadenas por AST (Abstract Syntax Tree)
**Diagnóstico:** Emitir strings directos (`"forall x (" + atom + ")"`) asume que el universo lógico no tiene ramas que pueden colapsar o ramificarse.
**Arquitectura Exigida:**
- **Creación de `src/formula/ast.ts`**: La piedra angular. Interfaces de árbol `LogicNode`: `QuantifierNode`, `ModalNode`, `PredicateNode`, `RefNode`.
- **Rutinas de Emisión Dinámicas**: Cuando haya exigencias de `"exactamente N"`, un generador construirá el AST combinatorio insertando `N` variables en un array, y un Sub-Árbol de restricciones de NO-IDENTIDAD (`x1 != x2 & x1 != x3`), logrando verdadero rigor Formal sin plantillas "tramposas".

## 3. Estado de Discurso y Manejo de Punteros Anafóricos (DRT)
**Diagnóstico:** Pronombres como *esto, lo anterior, aquel que* no tienen memoria inter-oracional. Rompen las lógicas S5 (Epistémicas/Deónticas) de conocimiento compartido.
**Arquitectura Exigida:**
- **Creación de `src/context/discourse-state.ts` (DRT)**: Una clase `StateStack` que mantenga los IDs de los Nodos Lógicos generados por frases previas.
- Cuando el lexer detecta "esto" (en *"Diego sabe esto"*), no inserta la palabra "esto" como texto. Interroga al Stack, obtiene el nodo raíz de la oración 1: `APRUEBA(Ana, balance)`, y lo anida lógicamente en su árbol: `ModalNode(type: "K", agent: "Diego", child: RefNode(ID_1))`. Produciendo por fin: `K_Diego(APRUEBA_BALANCE_ANA)`.

## 4. POS-Tagging en Análisis de Propósito (El Fín de las Proposiciones Gigantes)
**Diagnóstico:** *"Obligado a"* termina colapsando la variable en texto. No logramos aislar el verbo imperativo.
**Arquitectura Exigida:**
- Re-factorización intensiva de `src/atoms/keyword-extractor.ts`.
- Mapear explícitamente clases de intencionalidad léxica a Nodos AST:
  `{ stems: ["oblig", "deb"], node: ModalNode(type: 'O') }`
  `{ stems: ["permit", "licit"], node: ModalNode(type: 'P') }`
- Reducir el core del verbo y desvestir por completo el modificador para garantizar que el `ClauseSplitter` emita `O(Reiniciar(cluster))` y jamás el insulso `EstanObligadosAReiniciar(cluster)`.

---

### Dialéctica de Ejecución (Siguientes Pasos del Sistema)

Si vamos a pagar el precio de programar esto en la vida real, lo haremos en estricto orden de dependencias:
1. **Fase 1: Infraestructura Base.** Escribir `ast.ts` y reescribir `generator.ts` para que sepa imprimir desde un AST puro en lugar de matrices de strings.
2. **Fase 2: El Escudo Algebraico.** Implementar el parser matemático (`math-parser.ts`) y garantizar que superamos el Test #2.
3. **Fase 3: Combinatoria en FOL.** Reescribir `first-order.ts` retornando nodos puros dinámicos. Esto vencerá al Test #1 (exactamente tres).
4. **Fase 4: Anáfora y Discurso.** Inyectar la clase de contexto, logrando las variables de referencia en Modales, venciendo al Test #3 y #4.
