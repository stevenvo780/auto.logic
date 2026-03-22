# Plan Maestro 10/10: Semántica Formal Estricta (Auditoría Total ST)

Implementar lógicas no-clásicas robustas sobre un árbol léxico de lenguaje natural superficial ha probado ser fundamentalmente insuficiente. Los tests arquitecturales extremos (Vitest `architectural-limits-comprehensive.test.ts`) que mapean explícitamente los **10 dominios soportados por ST** han hecho estallar y avergonzado al motor actual, revelando que el enfoque heurístico (regex/NLP superficial) es inviable.

## 1. Auditoría Extrema de Fallos por Dominio Lógico

| Lógica | Premisa Extrema (Input) | Falla Arquitectural Evidenciada |
|---|---|---|
| **1. Aristotélica** | *"Ningún mamífero pone huevos, excepto el ornitorrinco que sí lo hace."* | **Ceguera Categórica:** El parser mezcla todo en lógica de primer orden o axiomas planos. Ignora la silogística estricta exigida `S es P`. |
| **2. Clásica (FOL Combinatoria)** | *"Solo fundadores borran exactamente dos tablas."* | **Cobardía Combinatoria:** No desenrolla `$exists x, y (x != y)$` aislados. Emite variables atascadas (`ExactamenteDosTablas(x)`). |
| **3. Aritmética** | *"Si al cuadrado de X le sumas Y..."* | **Destrucción Matemática:** Aniquila las partes algebraicas como texto (`SiAlCuadradoDeX(...)`) imposibilitando su pase al perfil `arithmetic` de ST. |
| **4. Deóntica (CTD Paradojas)** | *"Debes compilar... pero si no, estás obligado a reportar."* | **Colapso Normativo:** Los Modales `O()` se pierden por pasividad lingüística. Resulta en `ESTAS_OBLIGADO_A(...)` anulando la evaluación de obligaciones. |
| **5. Epistémica S5 (Multi-agente)** | *"Diego sabe esto. Carlos cree que Diego lo ignora."* | **Amnesia Anafórica:** Inexistencia de DRT. `ESTO` y `LO` terminan como átomos huérfanos sin heredar el árbol lógico apuntado. |
| **6. Temporal (LTL)** | *"La alarma sonará eventualmente, y siempre se mantendrá..."* | **Ignorancia Modal LTL:** Confunde `Eventually/Always` con predicados monádicos en lugar de los operadores formales de transición de estado temporal. |
| **7. Alethica (Modal)** | *"Es necesario que... pero contingente que..."* | **Colapso Nominal:** Pierde el rastro fundamental entre la Necesidad Categórica ($\Box$) y la Posibilidad ($\Diamond$), insertándolos como texto. |
| **8. Paraconsistente** | *"El paquete fue recibido y no fue recibido."* | **Limpieza Autodestructiva:** Los parsers eliminan la contradicción forzada y fallan al componer $P \land \neg P$ puros. |
| **9. Probabilística** | *"Hay un 75.5% de probabilidad de..."* | **Incapacidad de Grados:** Fracaso en asignar pesajes fraccionarios exactos (`Pr(X)=0.755`) en el AST a las premisas del compilador. |
| **10. Intuicionista** | *"No es cierto que no tengamos soluciones."* | **Reducción Inapropiada:** Simplifica $\neg\neg P \implies P$, un pecado letal en Heyting/Constructivismo donde eso es inválido. |

A raíz de esta evidencia destructiva (10/10 tests reprobados en 10 dominios lógicos distintos del compilador ST), exigimos incondicionalmente la siguiente transición hacia **Ingeniería de Compiladores Formal**:

---

## 2. Paradigma de Solución Absoluta (La Refactorización)

### Fase 1: Abandono de Strings por Interfaz Abstract Syntax Tree (AST) Pura
**Diagnóstico:** Emitir strings directos oculta la topología. Un nodo Alethico no puede concatenarse regex-wise a un Paraconsistente.
**Ejecución:**
- Creación de `src/formula/ast.ts`. Se prohíbe emitir texto a ST. Todo tokenizador retornará árboles tipados: `QuantifierNode`, `ModalNode(Temporal)`.
- El AST permitirá componer la combinatoria (`exactamente N`) delegando un generador interno que instancie dinámicamente $n$ variables no idénticas (`x != y`).

### Fase 2: Miniparsers Contextuales (CFG Algebraico y Modal)
**Diagnóstico:** "Exactamente un 75.5%" o "Cuadrado de X + Y" rompen el tokenizer sintáctico puro del NLP.
**Ejecución:**
- Inyectar sub-evaluadores *Recursive Descent* de alta prioridad (`src/atoms/math-parser.ts`, `src/atoms/probability-parser.ts`). 
- Escudo Algebraico: Si ve matemáticas/porcentajes, forma un AST aislado (`__MATH_1__`) y resguarda la integridad simbólica.

### Fase 3: Punteros de Memoria Inter-Oracional (Discourse Representation Theory - DRT)
**Diagnóstico:** Lógicas Epistémicas y Deónticas entrelazadas fallan sin referencias (Anafóricas: "esto", "aquel").
**Ejecución:**
- Creación de `src/context/discourse-state.ts`.
- Una pila (`StateStack`) conservará los IDs de clústeres. Al ver "sabe esto", no genera el string "esto", extrae el AST previo del Stack y lo envuelve en un `ModalNode(Agent, K)`.

### Fase 4: Taxonomía Intencional de Verbos (POS-Tagging modal)
**Diagnóstico:** Expresiones pasivas modales ("está obligado a", "es necesario que") colapsan.
**Ejecución:**
- Reescribir `keyword-extractor.ts` a un nivel semántico duro.
- Mapeos por perfil: `{ stems: ["oblig", "deb"], node: ModalNode(type: 'O') }` sin arrastrar predicados verbales.

---
### Cronograma de Ejecución
1. Escribir y asentar el runtime para emitir desde AST en lugar de texto.
2. Construir generadores LTL y Alethicos aislados. 
3. Enganchar la Pila de DRT para anáforas epistémicas.
4. Escudar matemáticas en una burbuja CFG para alimentar libremente el perfil `logic arithmetic` de ST.
