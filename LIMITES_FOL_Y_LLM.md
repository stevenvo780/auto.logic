# El Teorema de la Inutilidad Pragmática de FOL para Lenguaje Jurídico

## El Hallazgo Crítico
Durante las pruebas de estrés ofuscadas de **Autologic**, intentamos formalizar un texto burocrático/jurídico complejo (con subordinadas condicionales anidadas) mapeándolo directamente a **Lógica de Primer Orden (FOL)** pura.

El instinto algorítmico tradicional sugiere que:
* "Todo manuscrito" -> $\forall x \ M(x)$
* "los dos únicos informes" -> $\exists i_1, i_2$
* "firmaron los informes" -> $I(i_1, x) \land I(i_2, x)$

Cuando se construye el árbol sintáctico perfecto y sin ambigüedades, y se inyecta en el **Tableau Prover universal de ST**, ocurre una catástrofe impredecible: **Explosión Combinatoria**.

Incluso siendo matemáticamente impecable, la cantidad de variables libres, ramas existenciales ($\exists$) y anidamientos universales ($\forall$) requeridos para "probar" un pasaje legal de 100 palabras hace que el motor deductivo se cuelgue buscando infinitamente un modelo o intentando cerrar todas las ramas del tableau simultáneamente.

## La Solución: Lógica Proposicional Situada (Despliegue Semántico)
Los seres humanos (jueces, desarrolladores, lectores) **no aplican Lógica de Primer Orden** cuando evalúan estos textos en su mente. Aplican lo que llamamos **Lógica Proposicional Situada**. 

Colapsan las dependencias cuantificadas asumiendo el contexto ($x$ ya representa al "manuscrito M"), transformando la maraña universal en proposiciones discretas:
* `CumpleInformesOrdinarios`
* `InformesDistintos`
* `DictamenFavorable`

Al inyectar esta representación proposicional al solver `ST`, **lo resuelve en milisegundos usando Silogismo Hipotético y Modus Ponens básico**.

## Implicación para Autologic v3 (El Puente LLM Isomórfico)
Para lidiar con texto real, el parsing por dependencias léxicas clásicas ha muerto. La Fase 4 del sistema requiere de un **Intérprete LLM Semántico**.
Este LLM no hace derivaciones lógicas (eso lo hace `ST`), el LLM actúa únicamente como un "Traductor a AST", abstrayendo toda la grasa retórica en átomos lógicos claros y limpios.

Dado que **Autologic** debe ser ejecutable tanto en Node como en el Navegador, este puente LLM debe usar `fetch` nativo (sin dependencias duras de Sistema Operativo) y devolver un JSON estructurado que nuestro `ast-compiler.ts` pueda entender y convertir en código ST seguro y blindado.
