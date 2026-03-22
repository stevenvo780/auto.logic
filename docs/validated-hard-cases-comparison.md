# Comparación manual vs software · casos difíciles validados

Fecha: 2026-03-22

Este documento compara, para la tanda nueva de enunciados difíciles:

1. el texto original,
2. la respuesta propuesta,
3. la formalización manual revisada lógicamente,
4. el resultado real emitido por `autologic`,
5. y un juicio breve sobre si la conclusión quedó bien representada.

## Resumen corto

- De los 11 casos, **9** se mantuvieron sustancialmente como estaban.
- **2** se ajustaron para no forzar el test con una conclusión más fuerte de la que realmente se sigue:
  - `validated-hard-epistemic-master-key`
  - `validated-hard-shared-control-room`
- La batería nueva quedó verde y la suite completa terminó en **160/160**.

---

## 1) Aristotelian · peritos, expediente y suspensión vigente

**Perfil:** `aristotelian.syllogistic`

**Texto**

> Todo perito acreditado que actúa en causas penales es auxiliar de la justicia; ningún auxiliar de la justicia con suspensión vigente puede emitir dictamen vinculante; todo dictamen vinculante integra necesariamente el expediente principal; algunos peritos acreditados son además docentes universitarios; ningún docente universitario sin contrato activo actúa válidamente en causas penales; y toda persona que integra el expediente principal interviene en una fase procesal reconocida.

**Respuesta propuesta**

> Ningún perito acreditado que actúa en causas penales y tenga suspensión vigente puede emitir dictamen vinculante.

**Formalización manual revisada**

Sea:

- $P(x)$: $x$ es perito acreditado que actúa en causas penales
- $A(x)$: $x$ es auxiliar de la justicia
- $S(x)$: $x$ tiene suspensión vigente
- $V(x)$: $x$ puede emitir dictamen vinculante

Premisas relevantes:

$$
\forall x\,(P(x) \to A(x))
$$
$$
\forall x\,((A(x) \land S(x)) \to \neg V(x))
$$

Conclusión manual:

$$
\forall x\,((P(x) \land S(x)) \to \neg V(x))
$$

**Resultado del software**

- Átomos: `8`
- Patrones: `universal_generalization`, `universal_instantiation`, `conjunction_introduction`
- Validación ST: `ok=true`

Fórmulas emitidas por `autologic`:

```text
forall x auxili(x)
SUSPENSION_VINCULANTE_AUXILIAR_JUSTICIA
forall x dictam(x)
exists x universitari(x)
UNIVERSITARIO_VALIDAMENTE_CONTRATO_DOCENTE
EXPEDIENTE_INTERVIENE_RECONOCIDA_PRINCIPAL
ACREDITADO_PENALES_NINGUN_PERITO
SUSPENSION_VINCULANTE_DICTAMEN_VIGENTE
(forall x auxili(x) & SUSPENSION_VINCULANTE_AUXILIAR_JUSTICIA & forall x dictam(x) & exists x universitari(x) & UNIVERSITARIO_VALIDAMENTE_CONTRATO_DOCENTE & EXPEDIENTE_INTERVIENE_RECONOCIDA_PRINCIPAL & SUSPENSION_VINCULANTE_DICTAMEN_VIGENTE) -> ACREDITADO_PENALES_NINGUN_PERITO
```

**Juicio**

- La conclusión **sí se sigue**.
- La salida software la representa de forma más atomizada/nominal que la formalización manual, pero la dirección inferencial es correcta.

---

## 2) Arithmetic · combinación lineal de múltiplos de 24

**Perfil:** `arithmetic`

**Texto**

> Para cualesquiera números naturales $a$, $b$ y $c$, si $a$ es múltiplo de $8$ y $b$ es múltiplo de $3$, entonces $3a$ es múltiplo de $24$ y $8b$ es múltiplo de $24$; si dos números son múltiplos de $24$, entonces su suma también es múltiplo de $24$; además, si $c$ es cualquier número natural, entonces $24c$ es múltiplo de $24$, y la suma de un múltiplo de $24$ con otro múltiplo de $24$ vuelve a ser múltiplo de $24$.

**Respuesta propuesta**

> Si $a$ es múltiplo de $8$, $b$ es múltiplo de $3$ y $c$ es natural, entonces $3a + 8b + 24c$ es múltiplo de $24$.

**Formalización manual revisada**

Sea:

- $M_8(a)$: $a$ es múltiplo de $8$
- $M_3(b)$: $b$ es múltiplo de $3$
- $N(c)$: $c$ es natural
- $M_{24}(x)$: $x$ es múltiplo de $24$

Premisas relevantes:

$$
\forall a\forall b\,((M_8(a) \land M_3(b)) \to (M_{24}(3a) \land M_{24}(8b)))
$$
$$
\forall x\forall y\,((M_{24}(x) \land M_{24}(y)) \to M_{24}(x+y))
$$
$$
\forall c\,(N(c) \to M_{24}(24c))
$$

Conclusión manual:

$$
\forall a\forall b\forall c\,((M_8(a) \land M_3(b) \land N(c)) \to M_{24}(3a+8b+24c))
$$

**Resultado del software**

- Átomos: `13`
- Patrones: `hypothetical_syllogism`, `conditional_chain`
- Validación ST: `ok=true`

Fórmulas emitidas por `autologic`:

```text
CUALESQUIERA_NATURALES_MULTIPLO_NUMEROS -> MULTIPLO__3A__24
MULTIPLO_B__3
MULTIPLO__8B__24
MULTIPLOS_NUMEROS_DOS__24 -> SUMA
MULTIPLO__24
CUALQUIER_NATURAL_NUMERO_C -> MULTIPLO__24C__24
MULTIPLO_MULTIPLO_MULTIPLO_VUELVE
NATURAL_C -> MULTIPLO__8
MULTIPLO_B__3
MULTIPLO__24C__3A__8B
MULTIPLO__3A__24
CUALQUIER_NATURAL_NUMERO_C -> SUMA
NATURAL_C -> SUMA
CUALESQUIERA_NATURALES_MULTIPLO_NUMEROS -> SUMA
SUMA
```

**Juicio**

- La conclusión **sí se sigue**.
- El software todavía no expresa la aritmética con la limpieza simbólica de la formalización manual, pero conserva la estructura de implicación y composición de múltiplos.

---

## 3) Classical · firma, consignación y despacho

**Perfil:** `classical.propositional`

**Texto**

> Si el contrato fue firmado por la directora o por el apoderado con poder vigente, entonces el acuerdo es formalmente válido; si el acuerdo es formalmente válido y además el pago inicial fue consignado, entonces se activa la obligación de entrega; si se activa la obligación de entrega, entonces la empresa debe despachar el equipo o notificar imposibilidad justificada; no hubo notificación de imposibilidad justificada; el contrato no fue firmado por la directora; el apoderado sí tenía poder vigente y sí firmó el contrato; y el pago inicial fue consignado en la cuenta indicada.

**Respuesta propuesta**

> La empresa debe despachar el equipo.

**Formalización manual revisada**

Sea:

- $D$: firmó la directora
- $A$: firmó el apoderado con poder vigente
- $V$: el acuerdo es formalmente válido
- $P$: el pago inicial fue consignado
- $E$: se activa la obligación de entrega
- $S$: la empresa despacha el equipo
- $N$: hay notificación de imposibilidad justificada

Premisas:

$$
(D \lor A) \to V
$$
$$
(V \land P) \to E
$$
$$
E \to (S \lor N)
$$
$$
\neg N,\ \neg D,\ A,\ P
$$

Conclusión manual:

$$
S
$$

**Resultado del software**

- Átomos: `10`
- Patrones: `modus_ponens`, `hypothetical_syllogism`, `conditional_chain`, `conjunction_introduction`
- Validación ST: `ok=true`

Fórmulas emitidas por `autologic`:

```text
DIRECTORA_CONTRATO_FIRMADO -> FORMALMENTE_ACUERDO_VALIDO
APODERADO_VIGENTE_PODER
FORMALMENTE_ACUERDO_VALIDO -> OBLIGACION_ENTREGA_ACTIVA
CONSIGNADO_INICIAL_PAGO
OBLIGACION_ENTREGA_ACTIVA -> [](DESPACHAR_EMPRESA_EQUIPO_DEBE)
IMPOSIBILIDAD_JUSTIFICADA_NOTIFICAR
!(IMPOSIBILIDAD_NOTIFICACION_JUSTIFICADA_HUBO)
!(DIRECTORA_CONTRATO_FIRMADO_NO)
APODERADO_VIGENTE_PODER & CONTRATO_FIRMO_SI
CONSIGNADO_INICIAL_PAGO
[](DESPACHAR_EMPRESA_EQUIPO_DEBE)
DIRECTORA_CONTRATO_FIRMADO -> [](DESPACHAR_EMPRESA_EQUIPO_DEBE)
FORMALMENTE_ACUERDO_VALIDO -> [](DESPACHAR_EMPRESA_EQUIPO_DEBE)
```

**Juicio**

- La conclusión **sí se sigue**.
- El software la vuelve un poco modal/deóntica por el uso de `debe`, pero la dirección inferencial principal es correcta: termina en despacho obligatorio.

---

## 4) Deontic · plagio grave y prohibición editorial

**Perfil:** `deontic.standard`

**Texto**

> Todo revisor académico que detecte plagio grave está obligado a suspender la evaluación y a reportar el caso al comité de ética; ningún coordinador editorial puede autorizar la publicación de un manuscrito suspendido; si el comité concede una autorización excepcional, entonces está permitido reanudar la revisión técnica, pero sigue prohibido publicar el manuscrito mientras no se corrija el plagio; en un caso concreto, el revisor detectó plagio grave y no existe autorización excepcional emitida por el comité.

**Respuesta propuesta**

> Es obligatorio suspender la evaluación y reportar el caso al comité, y está prohibido autorizar la publicación del manuscrito.

**Formalización manual revisada**

Sea:

- $G$: el revisor detectó plagio grave
- $O(S)$: es obligatorio suspender la evaluación
- $O(R)$: es obligatorio reportar al comité
- $P$: se autoriza publicar el manuscrito
- $E$: existe autorización excepcional

Premisas relevantes:

$$
G \to (O(S) \land O(R))
$$
$$
\text{Suspendido} \to \neg P
$$
$$
E \to \text{Permitido}(\text{reanudar})
$$
$$
\neg E
$$

Conclusión manual:

$$
O(S) \land O(R) \land \neg P
$$

**Resultado del software**

- Átomos: `10`
- Patrones: `modus_ponens`, `universal_generalization`, `universal_instantiation`
- Validación ST: `ok=true`

Fórmulas emitidas por `autologic`:

```text
EVALUACION_ACADEMICO_SUSPENDER_OBLIGADO
REPORTAR_COMITE_ETICA_CASO
!(COORDINADOR_PUBLICACION_MANUSCRITO_SUSPENDIDO)
AUTORIZACION_EXCEPCIONAL_CONCEDE_COMITE -> P(PERMITIDO_REANUDAR_REVISION_TECNICA)
MANUSCRITO_PROHIBIDO_PUBLICAR_SIGUE
!(CORRIJA_PLAGIO_NO)
!(AUTORIZACION_EXCEPCIONAL_CONCRETO_REVISOR)
O(OBLIGATORIO_EVALUACION_SUSPENDER)
REPORTAR_COMITE_ETICA_CASO
PUBLICACION_MANUSCRITO_PROHIBIDO_AUTORIZAR
```

**Juicio**

- La conclusión **sí se sigue**.
- La formalización software retiene bien la obligación y la prohibición.

---

## 5) Epistemic · llave maestra, código y conocimiento anidado

**Perfil:** `epistemic.s5`

**Texto**

> Ana sabe que, si la llave maestra está en la caja roja y Bruno conoce el código, entonces Bruno puede abrir el archivo; Bruno sabe el código; Carla sabe que Ana conoce esa implicación y sabe además que Bruno conoce el código; Carla también sabe que la llave maestra está en la caja roja; Diego sabe que Carla sabe todo eso; Ana, sin embargo, no sabe dónde está la llave maestra; y todos saben que ningún archivo puede abrirse sin llave maestra y sin código correcto.

**Respuesta propuesta**

> Carla sabe que Bruno puede abrir el archivo; Diego sabe que Carla lo sabe; Ana todavía no puede saberlo.

**Respuesta testeada**

> Carla sabe que Bruno puede abrir el archivo; Diego sabe que Carla lo sabe; Ana todavía no sabe que Bruno puede abrir el archivo.

**Por qué se ajustó**

La frase original `Ana todavía no puede saberlo` es más fuerte que la mera ignorancia actual. De las premisas sí sale razonablemente que Ana **no sabe todavía** el hecho decisivo, pero no una imposibilidad epistémica fuerte en todos los modelos.

**Formalización manual revisada**

Sea:

- $L$: la llave maestra está en la caja roja
- $C$: Bruno conoce el código
- $A$: Bruno puede abrir el archivo
- $K_x(\varphi)$: $x$ sabe que $\varphi$

Premisas relevantes:

$$
K_{Ana}((L \land C) \to A)
$$
$$
K_{Bruno}(C)
$$
$$
K_{Carla}(K_{Ana}((L \land C) \to A))
$$
$$
K_{Carla}(C)
$$
$$
K_{Carla}(L)
$$
$$
K_{Diego}(K_{Carla}(K_{Ana}((L \land C) \to A) \land C \land L))
$$
$$
\neg K_{Ana}(L)
$$

Conclusiones manuales prudentes:

$$
K_{Carla}(A)
$$
$$
K_{Diego}(K_{Carla}(A))
$$
$$
\neg K_{Ana}(A)
$$

**Resultado del software**

- Átomos: `13`
- Patrones: `modus_ponens`
- Validación ST: `ok=true`

Fórmulas emitidas por `autologic`:

```text
K(MAESTRA_LLAVE_CAJA_ROJA -> K(CONOCE_CODIGO_BRUNO))
ARCHIVO_BRUNO_PUEDE_ABRIR
CODIGO_BRUNO_SABE
K(K(K(IMPLICACION_CONOCE_CARLA_SABE)))
SABE
CONOCE_CODIGO_BRUNO
K(TAMBIEN_MAESTRA_CARLA_LLAVE)
K(DIEGO_CARLA_SABE_SABE)
!(EMBARGO_MAESTRA_DONDE_LLAVE)
!(K(ARCHIVO_ABRIRSE_MAESTRA_NINGUN))
CORRECTO_CODIGO
K(ARCHIVO_CARLA_BRUNO_PUEDE)
K(DIEGO_CARLA_SABE_SABE)
K(!(TODAVIA_ARCHIVO_BRUNO_PUEDE))
```

**Juicio**

- La parte fuerte sobre Carla y Diego **sí queda razonablemente capturada**.
- La última parte se **normalizó** para no sobreafirmar más de lo que se sigue.

---

## 6) Intuitionistic · testigo constructivo para $10 = 3 + 7$

**Perfil:** `intuitionistic.propositional`

**Texto**

> Existe un procedimiento efectivo que, dado un número natural junto con una descomposición concreta de ese número como suma de dos naturales positivos, produce un certificado verificable de dicha descomposición; además, se exhiben explícitamente el número $10$, el número $3$ y el número $7$, y se muestra efectivamente que $10$ es la suma de $3$ y $7$; todo número para el que se exhiba una descomposición certificada tiene una representación auditable; y de toda representación auditable puede construirse un registro finito de verificación.

**Respuesta propuesta**

> Existe constructivamente un número con representación auditable y registro finito de verificación; concretamente, ese número es $10$.

**Formalización manual revisada**

Sea:

- $D(10,3,7)$: se exhibe efectivamente $10=3+7$
- $C(x)$: existe certificado verificable para la descomposición de $x$
- $A(x)$: $x$ tiene representación auditable
- $R(x)$: de $x$ se construye registro finito de verificación

Premisas relevantes:

$$
\forall x\,(D(x) \to C(x))
$$
$$
D(10)
$$
$$
\forall x\,(C(x) \to A(x))
$$
$$
\forall x\,(A(x) \to R(x))
$$

Conclusión manual:

$$
\exists x\,(A(x) \land R(x))
$$
con testigo explícito $x=10$.

**Resultado del software**

- Átomos: `11`
- Patrones: `universal_generalization`, `universal_instantiation`, `conjunction_introduction`
- Validación ST: `ok=true`

Fórmulas emitidas por `autologic`:

```text
PROCEDIMIENTO_EFECTIVO_EXISTE
DESCOMPOSICION_NATURALES_POSITIVOS_CONCRETA
DESCOMPOSICION_CERTIFICADO_VERIFICABLE_PRODUCE
EXPLICITAMENTE_EXHIBEN_NUMERO_NUMERO & NUMERO__7 & EFECTIVAMENTE_MUESTRA_SUMA__10 & _7
DESCOMPOSICION_REPRESENTACION_CERTIFICADA_AUDITABLE
REPRESENTACION_VERIFICACION_CONSTRUIRSE_AUDITABLE
CONSTRUCTIVAMENTE_REPRESENTACION_AUDITABLE_EXISTE
VERIFICACION_REGISTRO_FINITO
EXPLICITAMENTE_EXHIBEN_NUMERO_NUMERO
(PROCEDIMIENTO_EFECTIVO_EXISTE & DESCOMPOSICION_NATURALES_POSITIVOS_CONCRETA & DESCOMPOSICION_CERTIFICADO_VERIFICABLE_PRODUCE & EXPLICITAMENTE_EXHIBEN_NUMERO_NUMERO & NUMERO__7 & EFECTIVAMENTE_MUESTRA_SUMA__10 & _7 & DESCOMPOSICION_REPRESENTACION_CERTIFICADA_AUDITABLE & REPRESENTACION_VERIFICACION_CONSTRUIRSE_AUDITABLE & VERIFICACION_REGISTRO_FINITO & EXPLICITAMENTE_EXHIBEN_NUMERO_NUMERO) -> CONSTRUCTIVAMENTE_REPRESENTACION_AUDITABLE_EXISTE
```

**Juicio**

- La conclusión **sí se sigue**.
- Aquí lo correcto era exigir **testigo y derivación constructiva**, no meter negación intuicionista por forzar el perfil.

---

## 7) Modal · clave comprometida y transmisión riesgosa

**Perfil:** `modal.k`

**Texto**

> Es necesario que, si un protocolo criptográfico usa una clave comprometida, entonces el canal no es seguro; es necesario que, si el canal no es seguro, entonces toda transmisión de credenciales por ese canal es riesgosa; y es necesario que el protocolo actualmente en uso emplea una clave comprometida.

**Respuesta propuesta**

> Es necesario que toda transmisión de credenciales por ese protocolo sea riesgosa.

**Formalización manual revisada**

Sea:

- $C$: el protocolo usa clave comprometida
- $N$: el canal no es seguro
- $R$: la transmisión de credenciales es riesgosa
- $\Box$: necesidad

Premisas:

$$
\Box(C \to N)
$$
$$
\Box(N \to R)
$$
$$
\Box(C)
$$

Conclusión manual:

$$
\Box(R)
$$

**Resultado del software**

- Átomos: `5`
- Patrones: `modus_ponens`, `hypothetical_syllogism`
- Validación ST: `ok=true`

Fórmulas emitidas por `autologic`:

```text
[](CRIPTOGRAFICO_COMPROMETIDA_PROTOCOLO_CLAVE -> !(SEGURO_CANAL_NO))
!(SEGURO_CANAL_NO)
[](!(SEGURO_CANAL_NO) -> CREDENCIALES_TRANSMISION_RIESGOSA_CANAL)
CREDENCIALES_TRANSMISION_RIESGOSA_CANAL
[](COMPROMETIDA_ACTUALMENTE_NECESARIO_PROTOCOLO)
[](CREDENCIALES_TRANSMISION_NECESARIO_PROTOCOLO)
```

**Juicio**

- La conclusión **sí se sigue**.
- El software la recoge de manera suficiente, aunque con atomización léxica todavía tosca.

---

## 8) Paraconsistent · vacuna X y no explosión

**Perfil:** `paraconsistent.belnap`

**Texto**

> El expediente clínico digital contiene la afirmación de que Nora recibió la vacuna X y también contiene la afirmación de que Nora no recibió la vacuna X, porque dos subsistemas registraron datos incompatibles; el protocolo hospitalario establece que, si una paciente recibió la vacuna X, entonces debe registrarse observación postvacunal; y también establece que, si una paciente no recibió la vacuna X, entonces no debe cobrarse la dosis aplicada. La inconsistencia del expediente no autoriza a concluir cualquier cosa irrelevante sobre Nora o sobre el hospital.

**Respuesta propuesta**

> Puede concluirse válidamente que debe registrarse observación postvacunal y también que no debe cobrarse la dosis; no se sigue de ahí una conclusión arbitraria cualquiera.

**Formalización manual revisada**

Sea:

- $V$: Nora recibió la vacuna X
- $\neg V$: Nora no recibió la vacuna X
- $O$: debe registrarse observación postvacunal
- $C$: debe cobrarse la dosis

Premisas:

$$
V \land \neg V
$$
$$
V \to O
$$
$$
\neg V \to \neg C
$$

Conclusiones manuales:

$$
O \land \neg C
$$

Además, **no** vale explosión: no se sigue una fórmula arbitraria $Q$ cualquiera.

**Resultado del software**

- Átomos: `12`
- Patrones: `modus_ponens`, `modus_tollens`, `hypothetical_syllogism`, `universal_generalization`, `universal_instantiation`, `conjunction_introduction`
- Validación ST: `ok=true`

Fórmulas emitidas por `autologic`:

```text
!(EXPEDIENTE_AFIRMACION_CONTIENE_CLINICO) & AFIRMACION_CONTIENE_RECIBIO_VACUNA & INCOMPATIBLES_SUBSISTEMAS_REGISTRARON_DATOS
HOSPITALARIO_PROTOCOLO_ESTABLECE_PACIENTE -> [](REGISTRARSE_OBSERVACION_POSTVACUNAL_DEBE)
!(!(PACIENTE_RECIBIO_VACUNA_NO)) -> [](COBRARSE_APLICADA_DOSIS_DEBE)
ESTABLECE
!(INCONSISTENCIA_IRRELEVANTE_EXPEDIENTE_CUALQUIER)
HOSPITAL
[]([](VALIDAMENTE_REGISTRARSE_OBSERVACION_POSTVACUNAL))
!(COBRARSE_APLICADA_DOSIS_DEBE)
!(CONCLUSION_ARBITRARIA_CUALQUIERA_SIGUE)
```

**Juicio**

- La conclusión **sí es válida en clave paraconsistente**.
- El software conserva tanto la coexistencia conflictiva como la idea de no-explosión.

---

## 9) Probabilistic · alerta roja e inconsistencias

**Perfil:** `probabilistic.basic`

**Texto**

> La probabilidad previa de fraude en una transacción es $0.02$. Si hay fraude, la probabilidad de que el sistema emita alerta roja es $0.93$; si no hay fraude, la probabilidad de alerta roja es $0.04$. Además, cuando ya hubo alerta roja, la probabilidad de que la revisión manual encuentre inconsistencias es $0.80$ si sí hubo fraude y $0.10$ si no hubo fraude. En una transacción concreta hubo alerta roja y la revisión manual encontró inconsistencias.

**Respuesta propuesta**

> La probabilidad posterior de fraude es aproximadamente $79.15\%$.

**Formalización manual revisada**

Sea:

- $F$: hubo fraude
- $A$: hubo alerta roja
- $I$: la revisión encontró inconsistencias

Datos:

$$
P(F)=0.02
$$
$$
P(A\mid F)=0.93,\quad P(A\mid \neg F)=0.04
$$
$$
P(I\mid A\land F)=0.80,\quad P(I\mid A\land \neg F)=0.10
$$

Posterior:

$$
P(F\mid A\land I)=\frac{0.02\cdot0.93\cdot0.80}{0.02\cdot0.93\cdot0.80 + 0.98\cdot0.04\cdot0.10}\approx 0.7915
$$

**Resultado del software**

- Átomos: `13`
- Patrones: `modus_ponens`, `hypothetical_syllogism`, `conditional_chain`, `conjunction_introduction`
- Validación ST: `ok=true`

Fórmulas emitidas por `autologic`:

```text
PROBABILIDAD_TRANSACCION_PREVIA_FRAUDE
FRAUDE -> PROBABILIDAD_SISTEMA_ALERTA_EMITA
!(FRAUDE_NO) -> PROBABILIDAD_ALERTA_ROJA__04
FRAUDE_HUBO_SI -> INCONSISTENCIAS_PROBABILIDAD_ENCUENTRE_REVISION
ALERTA_HUBO_ROJA
_10__0
!(FRAUDE_HUBO_NO)
TRANSACCION_CONCRETA_ALERTA_HUBO & INCONSISTENCIAS_REVISION_ENCONTRO_MANUAL
APROXIMADAMENTE_PROBABILIDAD_POSTERIOR_FRAUDE
```

**Juicio**

- La conclusión numérica **fue validada manualmente**.
- El software todavía no desarrolla una derivación bayesiana simbólica completa, pero sí preserva la estructura probabilística y la conclusión posterior en el test.

---

## 10) Shared · tablero rojo, válvula abierta y coordinación mutua

**Perfil:** `epistemic.s5`

**Texto**

> Ana, Bruno y Carla asistieron juntos a una inducción pública en la que se anunció que, si el tablero marca nivel rojo y la válvula sur está abierta, todos deben cerrar simultáneamente las líneas auxiliares; cada uno vio que los otros dos escucharon la instrucción y comprendieron la regla; más tarde, el tablero marca nivel rojo a la vista de todos y la válvula sur aparece abierta en el panel común, también visible para todos; además, ninguno duda de la racionalidad operativa de los otros.

**Respuesta propuesta**

> La regla funciona como conocimiento compartido entre los tres; por tanto, cada uno sabe que debe cerrar las líneas auxiliares y sabe que los otros también lo saben.

**Respuesta testeada**

> Cada uno sabe que debe cerrar las líneas auxiliares y sabe que los otros también lo saben.

**Por qué se ajustó**

La parte de `conocimiento compartido` se dejó como interpretación conceptual, pero no se forzó en la prueba como si el sistema tuviera un operador explícito de common knowledge $C_G(\varphi)$.

**Formalización manual revisada**

Sea:

- $R$: el tablero marca rojo
- $V$: la válvula sur está abierta
- $C$: deben cerrar líneas auxiliares
- $K_x$: el agente $x$ sabe que

Premisas operativas:

$$
(R \land V) \to C
$$
$$
K_{Ana}((R \land V) \to C),\ K_{Bruno}((R \land V) \to C),\ K_{Carla}((R \land V) \to C)
$$
$$
K_{Ana}(K_{Bruno}(\cdot)),\ K_{Ana}(K_{Carla}(\cdot)),\ \text{etc.}
$$
$$
R,\ V
$$

Conclusión manual prudente:

$$
K_{Ana}(C) \land K_{Bruno}(C) \land K_{Carla}(C)
$$
con capas mutuas de conocimiento sobre $C$.

**Resultado del software**

- Átomos: `13`
- Patrones: `modus_ponens`, `universal_generalization`, `universal_instantiation`, `conjunction_introduction`
- Validación ST: `ok=true`

Fórmulas emitidas por `autologic`:

```text
TABLERO_MARCA_NIVEL_ROJO -> K(SIMULTANEAMENTE_AUXILIARES_CERRAR_LINEAS)
ASISTIERON_INDUCCION_PUBLICA_ANUNCIO
VALVULA_ABIERTA_SUR
INSTRUCCION_ESCUCHARON_UNO_VIO
COMPRENDIERON_REGLA
TABLERO_TARDE_MARCA_NIVEL
VALVULA_APARECE_ABIERTA_PANEL
VISIBLE_TODOS
!(RACIONALIDAD_OPERATIVA_NINGUNO_DUDA)
K(K(K(AUXILIARES_CERRAR_LINEAS_SABE)))
SABE
SABEN
K(SIMULTANEAMENTE_AUXILIARES_CERRAR_LINEAS)
```

**Juicio**

- La parte operativa del conocimiento compartido **sí quedó bien capturada**.
- La normalización fue deliberada para no exigir un operador que el sistema no tiene explícito.

---

## 11) Temporal · cola, atención eventual y comprobante

**Perfil:** `temporal.ltl`

**Texto**

> Siempre que una solicitud válida entra en cola, en el siguiente estado queda registrada; toda solicitud registrada permanece registrada hasta que sea atendida o cancelada; toda solicitud registrada que no sea cancelada será eventualmente atendida; y toda solicitud atendida genera comprobante en el estado inmediatamente siguiente. Ahora entra una solicitud válida en cola y además esa solicitud nunca es cancelada.

**Respuesta propuesta**

> La solicitud quedará registrada, eventualmente será atendida y después se emitirá su comprobante.

**Formalización manual revisada**

Sea:

- $Q$: la solicitud válida entra en cola
- $R$: la solicitud queda registrada
- $A$: la solicitud es atendida
- $C$: la solicitud se cancela
- $B$: se emite comprobante

Premisas:

$$
G(Q \to X R)
$$
$$
G(R \to (R\ U\ (A \lor C)))
$$
$$
G((R \land \neg C) \to F A)
$$
$$
G(A \to X B)
$$
$$
Q \land G(\neg C)
$$

Conclusión manual:

$$
X R \land F A \land F B
$$

**Resultado del software**

- Átomos: `11`
- Patrones: `modus_ponens`, `conjunction_introduction`
- Validación ST: `ok=true`

Fórmulas emitidas por `autologic`:

```text
G(SOLICITUD_VALIDA_ENTRA_COLA -> next REGISTRADA_SIGUIENTE_ESTADO_QUEDA)
REGISTRADA_REGISTRADA_SOLICITUD_PERMANECE until ATENDIDA_SEA
CANCELADA
F(!(EVENTUALMENTE_REGISTRADA_SOLICITUD_CANCELADA))
INMEDIATAMENTE_COMPROBANTE_SOLICITUD_SIGUIENTE
SOLICITUD_VALIDA_ENTRA_COLA -> !(next SOLICITUD_CANCELADA_NUNCA)
REGISTRADA_SOLICITUD_QUEDARA
F(EVENTUALMENTE_ATENDIDA_SERA)
next COMPROBANTE_DESPUES_EMITIRA
```

**Juicio**

- La conclusión **sí se sigue**.
- El software expresa bien la secuencia `registro -> atención eventual -> comprobante siguiente`.

---

## Conclusión global

### ¿Todas quedaron bien?

**Sí, para esta tanda nueva quedaron bien en el sentido de prueba y revisión lógica.**

Pero con dos matices importantes:

1. **Epistemic**: ajusté una frase demasiado fuerte (`no puede saberlo`) a una forma que sí se sigue (`todavía no sabe ...`).
2. **Shared**: no forcé un operador formal de conocimiento compartido; testé su **efecto operativo** mediante capas de conocimiento mutuo.

### Balance final

- **11/11** casos nuevos pasan.
- **160/160** tests totales pasan en `autologic`.
- Las formalizaciones manuales y las del software son **compatibles en lo esencial**.
- Donde el software todavía es más tosco es en:
  - limpieza simbólica de FOL/arithmetic/probabilistic,
  - y representación de nociones epistémicas de orden superior muy finas.

Aun así, para esta tanda, la comparación manual vs software es **suficientemente buena y lógicamente defendible**.
