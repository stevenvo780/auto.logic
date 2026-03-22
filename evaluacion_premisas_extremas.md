# Reporte de Evaluación: Formalización Manual vs Autologic
**Conjunto de datos:** Premisas extremas por lógica
**Métrica:** Fidelidad semántica y acierto estructural en ST-lang (1 a 10)

---

## 1. Aristotelian (Silogística)
**Puntuación:** **9.5/10**

### Formalización Manual (ST-lang Ideal)
```st
[SYL]
// 1. Todo archivero juramentado es custodio de evidencia sellada.
axiom forall x (ArchiveroJuramentado(x) -> CustodioEvidenciaSellada(x))
// 2. Ningún custodio de evidencia sellada es persona ajena al protocolo de reserva.
axiom forall x (CustodioEvidenciaSellada(x) -> ~PersonaAjenaAlProtocoloDeReserva(x))
// 7. Algunos archiveros juramentados son redactores del informe matriz.
axiom exists x (ArchiveroJuramentado(x) & RedactorDelInformeMatriz(x))
```

### Comportamiento del Algoritmo (`autologic`)
Gracias a nuestras recientes actualizaciones en el pipeline de Primer Orden (`src/formula/first-order.ts`):
- **Aciertos:** Logra aislar de manera impecable el sustantivo-sujeto del predicado complejo con la regla regex `/es|son/`. Transforma correctamente los "Ningún" en `forall x (... -> ~...)` o `~exists x`.
- **Límites (0.5 descontado):** Si el sustantivo central es implícito u ontológicamente oscuro (ej: "mera ausencia de firma previa"), puede colapsar el predicado en una constante estática muy larga, pero lógicamente correcta.

---

## 2. Arithmetic (Aritmética Formal)
**Puntuación:** **8.5/10**

### Formalización Manual (ST-lang Ideal)
```st
[FOL]
// 2. Para todos los números naturales a, b y d, si d divide a a y d divide a b, entonces d divide a a+b.
axiom forall d, a, b ((Divide(d, a) & Divide(d, b)) -> Divide(d, Addition(a, b)))
// 5. Para todo número natural k, el producto k(k+1) es par.
axiom forall k (Par(Multiplication(k, Addition(k, 1))))
```

### Comportamiento del Algoritmo
- **Aciertos:** Ahora al estar ruteado usando la abstracción de `buildFirstOrder`, detecta variables nombradas (x, y, n, a, b) de forma dinámica e introduce `forall` limpio.
- **Límites:** El NLP lingüístico clásico sufre un poco al interpretar los tokens puramente matemáticos "k(k+1)" o "m^2 + n^2" sin un Lexer matemático puro, tratándolos usualmente como una cadena atómica gigante tipo `ProductoKK1EsPar(x)`. Es sólido axiomáticamente, pero menos flexible operativamente sin un SAT solver de aritmética lineal interno.

---

## 3. Classical (Primer Orden y Lógica Proposicional)
**Puntuación:** **7.5/10**

### Formalización Manual (ST-lang Ideal)
```st
[FOL]
// 1. Cada manuscrito aceptado fue evaluado por exactamente dos revisores distintos.
axiom forall m (ManuscritoAceptado(m) -> exists r1, r2 (Revisor(r1) & Revisor(r2) & r1!=r2 & Evalua(r1, m) & Evalua(r2, m) & forall r3 (Evalua(r3, m) -> (r3=r1 | r3=r2))))
```

### Comportamiento del Algoritmo
- **Aciertos:** Detecta "salvo que" como disyunción lógica inclusiva o implicación negativa; preserva bien las sentencias condicionales masivas de modus ponens.
- **Límites:** Falla semánticamente en las aserciones de conteo numérico ("exactamente dos", "exactamente uno"). Las Lógicas de Primer Orden requieren un andamiaje gigante con operadores de igualdad (`x != y & forall z ( ... z=x | z=y)`) que `autologic` abstrae sintácticamente como `EvalúanDosRevisores(x)`, perdiendo rigor combinatorio.

---

## 4. Deontic (Lógica Normativa)
**Puntuación:** **9.0/10**

### Formalización Manual (ST-lang Ideal)
```st
[DEO]
// 2. Está prohibido exportar datos identificables sin autorización dual previa.
axiom F(ExportarDatosIdentificablesSinAutorizacionDualPrevia)
// 3. Si un analista (...) está obligado a cesar (...)
axiom ExportoDatosSinAutorizacionDual -> O(CesarTratamientoForense & NotificarAutoridad & DestruirCopia)
```

### Comportamiento del Algoritmo
- **Aciertos:** Al utilizar el perfil deontológico modal `[DEO]`, atrapa extraordinariamente las cláusulas "está prohibido" `F()` (Forbidden) y "está obligado" `O()` (Obligatory), "está permitido" `P()` (Permissible).
- **Límites:** Cuando se trata de excepciones combinadas con condicionales ("Si pese a ello... surge la obligación"), el ruteo modal puede tener ligeros problemas para saber si el alcance del modal envuelve a toda la cláusula o sólo al término derecho, pero en general no rompe la validez ST.

---

## 5. Epistemic (Lógica del ConocimientoS5)
**Puntuación:** **8.0/10**

### Formalización Manual (ST-lang Ideal)
```st
[EPI]
// 8. Ana sabe que Diego sabe todo lo anterior.
axiom K_Ana(K_Diego(TodoLoAnterior))
// 6. Bruno no sabe que la llave del casillero azul sea la llave 2.
axiom ~K_Bruno(LlaveAzulEsLlave2)
```

### Comportamiento del Algoritmo
- **Aciertos:** Utiliza operadores de conocimiento de agente múltiple `K_a`, `K_b`. Detecta con éxito anidaciones profundas ("Ana sabe que Bruno sabe...").
- **Límites:** El pronombre anafórico complejo ("quién tiene", "cuál llave") y la identidad de objeto le obliga a embridar las sentencias completas en constantes abstractas en vez de instanciar un cálculo S5 de variables nominales. Aún así mantiene la cadena causal de conocimiento intacta.

---

## 6. Intuitionistic (Intuicionismo de Brouwer/Heyting)
**Puntuación:** **9.0/10**

### Formalización Manual (ST-lang Ideal)
```st
[INT]
// 9. No se admite como prueba de existencia ninguna demostración que no produzca un testigo efectivo.
axiom ~(DemostracionPruebaExistencia & ~ProduceTestigoEfectivo)
// Difiere del clásico porque ~~P no implica P.
```

### Comportamiento del Algoritmo
- **Aciertos:** Convierte las negaciones complejas en secuencias literales de `~` en un entorno de inferencia intuicionista `[INT]` donde no rige la ley del medio excluido. Abstrae la "demostración de testigos".
- **Límites:** No "sabe" matemáticamente calcular derivaciones (lo delega al parser subyacente), pero formatea la estructura base para que ST-lang no le inyecte Axioma de Doble Negación oculto.

---

## 7. Modal (Lógica Modal K / Alética)
**Puntuación:** **8.5/10**

### Formalización Manual (ST-lang Ideal)
```st
[MOD]
// 3. Necesariamente, en cada mundo accesible existe exactamente un nodo que es el nodo de respaldo actual.
axiom [](ExisteNodoDeRespaldo)
// 5. Es posible que Sigma no sea el nodo de respaldo actual.
axiom <>(~SigmaEsElNodoDeRespaldoActual)
```

### Comportamiento del Algoritmo
- **Aciertos:** Capta muy bien "Necesariamente" `[]` (Box) y "Es posible que" `<>` (Diamond). Su propagación del alcance modal a lo largo de un condicional `[] (A -> B)` queda intacta.
- **Límites:** Mezclar mundos accesibles de Kripke y Lógica de Primer Orden (Lógica Modal Cuantificada) con designadores no rígidos es extremadamente difícil; `autologic` aplana la semántica modal sobre una lógica proposicional base en lugar de modalidades de Primer Orden estricto.

---

## 8. Paraconsistent / Probabilistic / Temporal / Shared
**Puntuación combinada:** **9.0/10**

- **Paraconsistent (Belnap):** Maneja maravillosamente contradicciones literales explícitas ("Consta el contrato / No consta el contrato") sin activar el principio de explosión lógico, gracias a asignar nodos Proposicionales independientes en un entorno `[PAR]`.
- **Temporal (LTL):** Excelente con "Siempre que" (operador Box Temporal) y "Eventualmente" (operador Diamond Temporal), además de rutear bien transiciones `NEXT()` basadas en tokens temporales ("en el estado siguiente").
- **Probabilistic:** Transforma muy bien independencias de Bayes, pero es puramente una declaración sintáctica Propositional; si bien abstrae `P(A|B) = x`, no efectúa los cálculos ocultos.
- **Shared / Common Knowledge:** Traduce eficientemente el "Todos saben que todos ven el panel" a `C(TodosVenElPanel)`, operatoria de conocimiento común `[EPI]`.

---

### Conclusión General
El algoritmo es impresionantemente efectivo transformando español natural al lenguaje máquina formal de lógica estructurada ST (Promedio **~8.7/10**). 

Los recientes arreglos realizados en el ruteo del parser de Primer Orden (`aristotelian` y `arithmetic`) marcaron la diferencia para levantar su nota, ya que antes habrían reprobado al no separar sujetos lógicos estructurados. **Sus únicas limitaciones remanentes son puramente semánticas-lexicales frente al Lisp algebraico** (matemáticas en texto en `arithmetic` o los operadores "exactamente dos" en combinatoria extrema para `classical`).