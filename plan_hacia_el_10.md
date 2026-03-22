# Plan de Acción: Ruta hacia el 10/10 en Formalización Lógica (Autologic)

Este documento detalla una estrategia priorizada para llevar el motor `autologic` a una puntuación perfecta (10/10) en todos los perfiles lógicos. La estructura está diseñada basándose en **Coste de Implementación vs. Impacto en Precisión**, comenzando con las "frutas maduras" y terminando con las mejoras arquitectónicas profundas.

---

## FASE 1: Bajo Costo / Alto Impacto (Quick Wins)
*Estas mejoras son modificaciones en el pre-procesamiento de strings, expresiones regulares y generadores ST, no requieren reescribir la arquitectura.*

### 1. Macros Combinatorios (Lógica Clásica)
- **Problema actual:** Expresiones como "exactamente uno", "al menos dos", o "exactamente dos" se abstraen como predicados planos (`ExactamenteDosRevisores(x)`).
- **Solución:** Crear un interceptor en `src/formula/first-order.ts` que escuche frases de conteo y las expanda a plantillas FOL de identidad predefinidas.
  - *Ejemplo de Macro:* `exactamente uno(P)` -> `exists x (P(x) & forall y (P(y) -> x=y))`
  - *Ejemplo de Macro:* `exactamente dos(P)` -> `exists x, y (P(x) & P(y) & x!=y & forall z (P(z) -> (z=x | z=y)))`
- **Impacto:** Sube substancialmente el puntaje clásico (de 7.5 a 9.0).

### 2. Lexer Matemático Ligero (Lógica Aritmética)
- **Problema actual:** Tokens combinados como `k(k+1)` o `m^2 + n^2` colapsan en strings masivos (`ProductoKK1EsPar`).
- **Solución:** Antes de la extracción de átomos, pasar un filtro Regex que identifique notación algebraica (operadores `+`, `-`, `*`, `^`, `=`, `<`) y la separe en funciones ST preconstruidas. 
  - *Regex target:* `([a-zA-Z0-9]+)\s*([\+\-\=\<\>])\s*([a-zA-Z0-9]+)`
  - *Transformación:* `a = b + c` -> `Equals(a, Add(b, c))`
- **Impacto:** Eleva el soporte formal aritmético (de 8.5 a 9.5).

### 3. Filtro de Stop-words y Lematización en Atómos (Aristotélica)
- **Problema actual:** Conceptos oscuros generan predicados inmensos (e.g., "mera ausencia de firma previa").
- **Solución:** Agregar una mini-lista de stop-words adjetivales/adverbiales (mera, ya, también) y un lematizador estático de sufijos antes de capitalizar la constante. 
- **Impacto:** Evita ASTs ST-lang visualmente ruidosos y mejora la reusabilidad axiomática.

---

## FASE 2: Medio Costo / Alto-Medio Impacto (Mejoras Estructurales)
*Requieren añadir nuevos módulos o enriquecer la abstracción en `src/formula/` y `src/discourse/`.*

### 1. Resolución Anafórica Básica (Lógica Epistémica y Modal)
- **Problema actual:** Pronombres u objetos anafóricos ("ese manuscrito", "todo lo anterior", "éste", "aquella llave") no ligan lógicamente con las entidades introducidas antes.
- **Solución:** Implementar un mapa de estado o "Lexicon de Contexto" (`ContextState`) en la clase `Autologic` o en el parser que recuerde el último "Sujeto dominante" procesado. Cuando aparezca "este" / "ese", el parser lo reemplazará por el ID del sustantivo previo en la misma cláusula o la anterior.
- **Impacto:** Crucial para conocimiento S5 (Ana sabe X que refiera a Y) y silogística multi-premisa extendida (Sube Epistémico a 9.5).

### 2. Árbol de Alcance Modal Preciso (Lógica Modal / Deóntica)
- **Problema actual:** Las excepciones (modalidades mixtas) dentro de condicionales ("Si [A], entonces [Modalidad B]") a veces envuelven la implicación entera `O(A -> B)` cuando deberían ser `A -> O(B)`.
- **Solución:** Refinar `src/formula/modal.ts` y `deontic.ts` para que utilicen la estructura de árbol generada por el `segmenter`. Si la palabra de modalidad (Necesariamente, Prohibido, Obligación) está estrictamente *después* del nodo "entonces", aplicar el operador de caja `[]` o `O()` sólo a la rama derecha de la ramificación.
- **Impacto:** Formalización intachable en contratos legales y mundos posibles (Deóntico/Modal al 10/10).

---

## FASE 3: Alto Costo / Medio-Bajo Impacto (Arquitecturas Profundas)
*Desarrollo completo de nuevas representaciones intermedias. Ideal para la v3.0.*

### 1. Parser de Árboles de Dependencia NLP Interno
- **Problema actual:** Expresiones regulares basadas en `/es|son/`, etc., son frágiles ante sintaxis inusual del español/inglés ("Al hombre asaltaron", voz pasiva pura).
- **Solución:** En lugar de reglas regex puras en `src/segmenter/clause.ts`, incorporar (o parsear desde) una librería de "Dependency Parsing" ligera en JS que reconozca `nsubj` (sujeto nominal) y `dobj` (objeto directo) para todo el pipeline.
- **Impacto:** Solución definitiva para 100% de los idiomas, eliminando la técnica de conjeturas (heurísticas). Alto costo de implementación e infla el bundle size.

### 2. Tipado Semántico Múltiple (Logicas Ordenadas Especiales)
- **Problema actual:** El validador actual inyecta variables `x, y, z` pero sin dominio tipado (ej: no avisa a priori si `x` es humano o máquina en un modelo modal, todo depende del predicado).
- **Solución:** Construir un submotor lógico con **Tipos Formales** (`x: Person`, `y: State`). ST-lang tendría que soportar "Multi-sorted First Order Logic". El NLP inferiría el tipo dinámicamente de un glosario y generaría: `forall x:Person, y:Key (...)`.
- **Impacto:** Hace al lenguaje autologic increíblemente poderoso para Verificación Formal estricta en software crítico.

---

## Cronograma Sugerido:
1. **Semana 1:** Implementar **Fase 1.1** (Macros combinatorios `exactamente`) y **Fase 1.2** (Regex algebraico básico).
2. **Semana 2:** Refactorizar el control de ámbito Modal/Deóntico condicional (**Fase 2.2**).
3. **Semanas 3 a 5:** Investigar y desplegar un pre-resolvedor de Anáforas y pronombres (`ContextState`) para **Fase 2.1**.
4. **Reserva (Futuro):** Las tareas de **Fase 3** pueden formar parte de un Roadmap para una siguiente iteración mayor.