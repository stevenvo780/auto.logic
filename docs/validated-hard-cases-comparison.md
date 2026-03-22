# Comparación de Formalización: Manual vs. Algorítmica (11 Casos Difíciles Validados)

Este documento compara detalladamente el ejercicio original, la respuesta manual esperada (teórica) y el código de ST generado por `autologic`.

## Aristotelian — peritos, expediente y suspensión vigente

- **ID**: `validated-hard-aristotelian-experts`
- **Perfil Lógico**: `aristotelian.syllogistic`

### 1. Ejercicio Original (Texto Natural)

> Todo perito acreditado que actúa en causas penales es auxiliar de la justicia; ningún auxiliar de la justicia con suspensión vigente puede emitir dictamen vinculante; todo dictamen vinculante integra necesariamente el expediente principal; algunos peritos acreditados son además docentes universitarios; ningún docente universitario sin contrato activo actúa válidamente en causas penales; y toda persona que integra el expediente principal interviene en una fase procesal reconocida. Por lo tanto, Ningún perito acreditado que actúa en causas penales y tenga suspensión vigente puede emitir dictamen vinculante.

### 2. Respuesta Operativa (Humana / Manual)

> Ningún perito acreditado que actúa en causas penales y tenga suspensión vigente puede emitir dictamen vinculante.

### 3. Formalización Algorítmica Generada (Autologic ST)

```st
// ═══════════════════════════════════════
// Formalización automática — autologic
// Perfil: aristotelian.syllogistic
// Idioma: es
// Patrones: universal_generalization, universal_instantiation, conjunction_introduction
// ═══════════════════════════════════════

logic aristotelian.syllogistic

// ── Proposiciones atómicas ────────────
interpret "Todo perito acreditado que actúa en causas penales es auxiliar de la justicia" as ACREDITADO_AUXILIAR_JUSTICIA_PENALES
interpret "ningún auxiliar de la justicia con suspensión vigente puede emitir dictamen vinculante" as SUSPENSION_VINCULANTE_AUXILIAR_JUSTICIA
interpret "todo dictamen vinculante integra necesariamente el expediente principal" as NECESARIAMENTE_VINCULANTE_EXPEDIENTE_PRINCIPAL
interpret "docentes universitarios" as UNIVERSITARIOS_DOCENTES
interpret "ningún docente universitario sin contrato activo actúa válidamente en causas penales" as UNIVERSITARIO_VALIDAMENTE_CONTRATO_DOCENTE
interpret "toda persona que integra el expediente principal interviene en una fase procesal reconocida." as EXPEDIENTE_INTERVIENE_RECONOCIDA_PRINCIPAL
interpret "Ningún perito acreditado que actúa en causas penales" as ACREDITADO_PENALES_NINGUN_PERITO
interpret "tenga suspensión vigente puede emitir dictamen vinculante." as SUSPENSION_VINCULANTE_DICTAMEN_VIGENTE

// ── Estructura argumental ─────────────
// Patrón detectado: universal_generalization, universal_instantiation, conjunction_introduction

// Universal: "Todo perito acreditado que actúa en causas penales es auxiliar de la justicia"
axiom a1 = forall x auxili(x)
// Instancia: "ningún auxiliar de la justicia con suspensión vigente puede emitir dictamen vinculante"
axiom a2 = SUSPENSION_VINCULANTE_AUXILIAR_JUSTICIA
// Universal: "todo dictamen vinculante integra necesariamente el expediente principal"
axiom a3 = forall x dictam(x)
// Existencial: "docentes universitarios"
axiom a4 = exists x universitari(x)
// Instancia: "ningún docente universitario sin contrato activo actúa válidamente en causas penales"
axiom a5 = UNIVERSITARIO_VALIDAMENTE_CONTRATO_DOCENTE
// Instancia: "toda persona que integra el expediente principal interviene en una fase procesal reconocida."
axiom a6 = EXPEDIENTE_INTERVIENE_RECONOCIDA_PRINCIPAL
// Instancia: "tenga suspensión vigente puede emitir dictamen vinculante."
axiom a8 = SUSPENSION_VINCULANTE_DICTAMEN_VIGENTE
// Regla de instanciación universal (proposicional): (forall x auxili(x) & SUSPENSION_VINCULANTE_AUXILIAR_JUSTICIA & forall x dictam(x) & exists x universitari(x) & UNIVERSITARIO_VALIDAMENTE_CONTRATO_DOCENTE & EXPEDIENTE_INTERVIENE_RECONOCIDA_PRINCIPAL & SUSPENSION_VINCULANTE_DICTAMEN_VIGENTE) → ACREDITADO_PENALES_NINGUN_PERITO
axiom ui_regla_9 = (forall x auxili(x) & SUSPENSION_VINCULANTE_AUXILIAR_JUSTICIA & forall x dictam(x) & exists x universitari(x) & UNIVERSITARIO_VALIDAMENTE_CONTRATO_DOCENTE & EXPEDIENTE_INTERVIENE_RECONOCIDA_PRINCIPAL & SUSPENSION_VINCULANTE_DICTAMEN_VIGENTE) -> ACREDITADO_PENALES_NINGUN_PERITO

// Conclusión: "Ningún perito acreditado que actúa en causas penales"
derive ACREDITADO_PENALES_NINGUN_PERITO from {a1, a2, a3, a4, a5, a6, a8, ui_regla_9}

// ── Verificación ──────────────────────
check valid ((forall x auxili(x) & SUSPENSION_VINCULANTE_AUXILIAR_JUSTICIA & forall x dictam(x) & exists x universitari(x) & UNIVERSITARIO_VALIDAMENTE_CONTRATO_DOCENTE & EXPEDIENTE_INTERVIENE_RECONOCIDA_PRINCIPAL & SUSPENSION_VINCULANTE_DICTAMEN_VIGENTE) -> ACREDITADO_PENALES_NINGUN_PERITO)

```

---

## Arithmetic — combinación lineal de múltiplos de 24

- **ID**: `validated-hard-arithmetic-multiples`
- **Perfil Lógico**: `arithmetic`

### 1. Ejercicio Original (Texto Natural)

> Para cualesquiera números naturales a, b y c, si a es múltiplo de 8 y b es múltiplo de 3, entonces 3a es múltiplo de 24 y 8b es múltiplo de 24; si dos números son múltiplos de 24, entonces su suma también es múltiplo de 24; además, si c es cualquier número natural, entonces 24c es múltiplo de 24, y la suma de un múltiplo de 24 con otro múltiplo de 24 vuelve a ser múltiplo de 24. Por lo tanto, Si a es múltiplo de 8, b es múltiplo de 3 y c es natural, entonces 3a + 8b + 24c es múltiplo de 24.

### 2. Respuesta Operativa (Humana / Manual)

> Si a es múltiplo de 8, b es múltiplo de 3 y c es natural, entonces 3a + 8b + 24c es múltiplo de 24.

### 3. Formalización Algorítmica Generada (Autologic ST)

```st
// ═══════════════════════════════════════
// Formalización automática — autologic
// Perfil: arithmetic
// Idioma: es
// Patrones: hypothetical_syllogism, conditional_chain
// ═══════════════════════════════════════

logic arithmetic

// ── Proposiciones atómicas ────────────
interpret "Para cualesquiera números naturales a, b y c a es múltiplo de 8" as CUALESQUIERA_NATURALES_MULTIPLO_NUMEROS
interpret "b es múltiplo de 3" as MULTIPLO_B__3
interpret "3a es múltiplo de 24" as MULTIPLO__3A__24
interpret "8b es múltiplo de 24" as MULTIPLO__8B__24
interpret "dos números son múltiplos de 24" as MULTIPLOS_NUMEROS_DOS__24
interpret "su suma" as SUMA
interpret "es múltiplo de 24" as MULTIPLO__24
interpret "c es cualquier número natural" as CUALQUIER_NATURAL_NUMERO_C
interpret "24c es múltiplo de 24" as MULTIPLO__24C__24
interpret "la suma de un múltiplo de 24 con otro múltiplo de 24 vuelve a ser múltiplo de 24." as MULTIPLO_MULTIPLO_MULTIPLO_VUELVE
interpret "a es múltiplo de 8" as MULTIPLO__8
interpret "c es natural" as NATURAL_C
interpret "3a + 8b + 24c es múltiplo de 24." as MULTIPLO__24C__3A__8B

// ── Estructura argumental ─────────────
// Patrón detectado: hypothetical_syllogism, conditional_chain

// Condicional: "Para cualesquiera números naturales a, b y c a es múltiplo de 8, b es múltiplo de 3, 3a es múltiplo de 24, 8b es múltiplo de 24"
axiom regla_1 = CUALESQUIERA_NATURALES_MULTIPLO_NUMEROS -> MULTIPLO__3A__24
// Subcláusula condicional: "b es múltiplo de 3"
axiom hecho_2 = MULTIPLO_B__3
// Subcláusula condicional: "8b es múltiplo de 24"
axiom hecho_3 = MULTIPLO__8B__24
// Condicional: "dos números son múltiplos de 24, su suma, es múltiplo de 24"
axiom regla_4 = MULTIPLOS_NUMEROS_DOS__24 -> SUMA
// Subcláusula condicional: "es múltiplo de 24"
axiom hecho_5 = MULTIPLO__24
// Condicional: "c es cualquier número natural, 24c es múltiplo de 24, la suma de un múltiplo de 24 con otro múltiplo de 24 vuelve a ser múltiplo de 24."
axiom regla_6 = CUALQUIER_NATURAL_NUMERO_C -> MULTIPLO__24C__24
// Subcláusula condicional: "la suma de un múltiplo de 24 con otro múltiplo de 24 vuelve a ser múltiplo de 24."
axiom hecho_7 = MULTIPLO_MULTIPLO_MULTIPLO_VUELVE
// Condicional: "a es múltiplo de 8, b es múltiplo de 3, c es natural, 3a + 8b + 24c es múltiplo de 24."
axiom regla_8 = NATURAL_C -> MULTIPLO__8
// Subcláusula condicional: "b es múltiplo de 3"
axiom hecho_9 = MULTIPLO_B__3
// Subcláusula condicional: "3a + 8b + 24c es múltiplo de 24."
axiom hecho_10 = MULTIPLO__24C__3A__8B

// Modus Ponens: CUALESQUIERA_NATURALES_MULTIPLO_NUMEROS → MULTIPLO__3A__24, CUALESQUIERA_NATURALES_MULTIPLO_NUMEROS ⊢ MULTIPLO__3A__24
derive MULTIPLO__3A__24 from {regla_1, hecho_2, hecho_3, regla_4, hecho_5, regla_6, hecho_7, regla_8, hecho_9, hecho_10}
// Silogismo Hipotético: CUALQUIER_NATURAL_NUMERO_C → ... → SUMA
derive CUALQUIER_NATURAL_NUMERO_C -> SUMA from {regla_1, hecho_2, hecho_3, regla_4, hecho_5, regla_6, hecho_7, regla_8, hecho_9, hecho_10}
// Silogismo Hipotético: NATURAL_C → ... → SUMA
derive NATURAL_C -> SUMA from {regla_1, hecho_2, hecho_3, regla_4, hecho_5, regla_6, hecho_7, regla_8, hecho_9, hecho_10}
// Silogismo Hipotético: CUALESQUIERA_NATURALES_MULTIPLO_NUMEROS → ... → SUMA
derive CUALESQUIERA_NATURALES_MULTIPLO_NUMEROS -> SUMA from {regla_1, hecho_2, hecho_3, regla_4, hecho_5, regla_6, hecho_7, regla_8, hecho_9, hecho_10}
// Cadena condicional + Modus Ponens: CUALESQUIERA_NATURALES_MULTIPLO_NUMEROS → ... → SUMA, CUALESQUIERA_NATURALES_MULTIPLO_NUMEROS ⊢ SUMA
derive SUMA from {regla_1, hecho_2, hecho_3, regla_4, hecho_5, regla_6, hecho_7, regla_8, hecho_9, hecho_10}

// ── Verificación ──────────────────────
check valid (CUALESQUIERA_NATURALES_MULTIPLO_NUMEROS -> MULTIPLO__3A__24)
check valid (MULTIPLOS_NUMEROS_DOS__24 -> SUMA)
check valid (CUALQUIER_NATURAL_NUMERO_C -> MULTIPLO__24C__24)
check valid (NATURAL_C -> MULTIPLO__8)

```

---

## Classical — firma, consignación y despacho obligatorio

- **ID**: `validated-hard-classical-dispatch`
- **Perfil Lógico**: `classical.propositional`

### 1. Ejercicio Original (Texto Natural)

> Si el contrato fue firmado por la directora o por el apoderado con poder vigente, entonces el acuerdo es formalmente válido; si el acuerdo es formalmente válido y además el pago inicial fue consignado, entonces se activa la obligación de entrega; si se activa la obligación de entrega, entonces la empresa debe despachar el equipo o notificar imposibilidad justificada; no hubo notificación de imposibilidad justificada; el contrato no fue firmado por la directora; el apoderado sí tenía poder vigente y sí firmó el contrato; y el pago inicial fue consignado en la cuenta indicada. Por lo tanto, La empresa debe despachar el equipo.

### 2. Respuesta Operativa (Humana / Manual)

> La empresa debe despachar el equipo.

### 3. Formalización Algorítmica Generada (Autologic ST)

```st
// ═══════════════════════════════════════
// Formalización automática — autologic
// Perfil: classical.propositional
// Idioma: es
// Patrones: modus_ponens, hypothetical_syllogism, conditional_chain, conjunction_introduction
// ═══════════════════════════════════════

logic classical.propositional

// ── Proposiciones atómicas ────────────
interpret "el contrato fue firmado por la directora" as DIRECTORA_CONTRATO_FIRMADO
interpret "por el apoderado con poder vigente" as APODERADO_VIGENTE_PODER
interpret "el acuerdo es formalmente válido" as FORMALMENTE_ACUERDO_VALIDO
interpret "el pago inicial fue consignado" as CONSIGNADO_INICIAL_PAGO
interpret "se activa la obligación de entrega" as OBLIGACION_ENTREGA_ACTIVA
interpret "La empresa debe despachar el equipo." as DESPACHAR_EMPRESA_EQUIPO_DEBE
interpret "notificar imposibilidad justificada" as IMPOSIBILIDAD_JUSTIFICADA_NOTIFICAR
interpret "no hubo notificación de imposibilidad justificada" as IMPOSIBILIDAD_NOTIFICACION_JUSTIFICADA_HUBO
interpret "el contrato no fue firmado por la directora" as DIRECTORA_CONTRATO_FIRMADO_NO
interpret "sí firmó el contrato" as CONTRATO_FIRMO_SI

// ── Estructura argumental ─────────────
// Patrón detectado: modus_ponens, hypothetical_syllogism, conditional_chain, conjunction_introduction

// Condicional: "el contrato fue firmado por la directora, por el apoderado con poder vigente, el acuerdo es formalmente válido"
axiom regla_1 = DIRECTORA_CONTRATO_FIRMADO -> FORMALMENTE_ACUERDO_VALIDO
// Subcláusula condicional: "por el apoderado con poder vigente"
axiom hecho_2 = APODERADO_VIGENTE_PODER
// Condicional: "el acuerdo es formalmente válido, el pago inicial fue consignado, se activa la obligación de entrega"
axiom regla_3 = FORMALMENTE_ACUERDO_VALIDO -> OBLIGACION_ENTREGA_ACTIVA
// Subcláusula condicional: "el pago inicial fue consignado"
axiom hecho_4 = CONSIGNADO_INICIAL_PAGO
// Condicional: "se activa la obligación de entrega, la empresa debe despachar el equipo, notificar imposibilidad justificada"
axiom regla_5 = OBLIGACION_ENTREGA_ACTIVA -> DESPACHAR_EMPRESA_EQUIPO_DEBE
// Subcláusula condicional: "notificar imposibilidad justificada"
axiom hecho_6 = IMPOSIBILIDAD_JUSTIFICADA_NOTIFICAR
// Negación: "no hubo notificación de imposibilidad justificada"
axiom neg_7 = !(IMPOSIBILIDAD_NOTIFICACION_JUSTIFICADA_HUBO)
// Negación: "el contrato no fue firmado por la directora"
axiom neg_8 = !(DIRECTORA_CONTRATO_FIRMADO_NO)
// Conjunción: "el apoderado sí tenía poder vigente, sí firmó el contrato"
axiom conj_9 = APODERADO_VIGENTE_PODER & CONTRATO_FIRMO_SI
// Hecho: "el pago inicial fue consignado en la cuenta indicada."
axiom hecho_10 = CONSIGNADO_INICIAL_PAGO

// Conclusión: "La empresa debe despachar el equipo."
derive DESPACHAR_EMPRESA_EQUIPO_DEBE from {regla_1, hecho_2, regla_3, hecho_4, regla_5, hecho_6, neg_7, neg_8, conj_9, hecho_10}
// Silogismo Hipotético: DIRECTORA_CONTRATO_FIRMADO → ... → DESPACHAR_EMPRESA_EQUIPO_DEBE
derive DIRECTORA_CONTRATO_FIRMADO -> DESPACHAR_EMPRESA_EQUIPO_DEBE from {regla_1, hecho_2, regla_3, hecho_4, regla_5, hecho_6, neg_7, neg_8, conj_9, hecho_10}
// Silogismo Hipotético: FORMALMENTE_ACUERDO_VALIDO → ... → DESPACHAR_EMPRESA_EQUIPO_DEBE
derive FORMALMENTE_ACUERDO_VALIDO -> DESPACHAR_EMPRESA_EQUIPO_DEBE from {regla_1, hecho_2, regla_3, hecho_4, regla_5, hecho_6, neg_7, neg_8, conj_9, hecho_10}

// ── Verificación ──────────────────────
check valid (DIRECTORA_CONTRATO_FIRMADO -> FORMALMENTE_ACUERDO_VALIDO)
check valid (FORMALMENTE_ACUERDO_VALIDO -> OBLIGACION_ENTREGA_ACTIVA)
check valid (OBLIGACION_ENTREGA_ACTIVA -> DESPACHAR_EMPRESA_EQUIPO_DEBE)

```

---

## Deontic — plagio grave, suspensión y prohibición editorial

- **ID**: `validated-hard-deontic-plagiarism`
- **Perfil Lógico**: `deontic.standard`

### 1. Ejercicio Original (Texto Natural)

> Todo revisor académico que detecte plagio grave está obligado a suspender la evaluación y a reportar el caso al comité de ética; ningún coordinador editorial puede autorizar la publicación de un manuscrito suspendido; si el comité concede una autorización excepcional, entonces está permitido reanudar la revisión técnica, pero sigue prohibido publicar el manuscrito mientras no se corrija el plagio; en un caso concreto, el revisor detectó plagio grave y no existe autorización excepcional emitida por el comité. Por lo tanto, Es obligatorio suspender la evaluación y reportar el caso al comité, y está prohibido autorizar la publicación del manuscrito.

### 2. Respuesta Operativa (Humana / Manual)

> Es obligatorio suspender la evaluación y reportar el caso al comité, y está prohibido autorizar la publicación del manuscrito.

### 3. Formalización Algorítmica Generada (Autologic ST)

```st
// ═══════════════════════════════════════
// Formalización automática — autologic
// Perfil: deontic.standard
// Idioma: es
// Patrones: modus_ponens, universal_generalization, universal_instantiation
// ═══════════════════════════════════════

logic deontic.standard

// ── Proposiciones atómicas ────────────
interpret "Todo revisor académico que detecte plagio grave está obligado a suspender la evaluación" as EVALUACION_ACADEMICO_SUSPENDER_OBLIGADO
interpret "a reportar el caso al comité de ética" as REPORTAR_COMITE_ETICA_CASO
interpret "ningún coordinador editorial puede autorizar la publicación de un manuscrito suspendido" as COORDINADOR_PUBLICACION_MANUSCRITO_SUSPENDIDO
interpret "el comité concede una autorización excepcional" as AUTORIZACION_EXCEPCIONAL_CONCEDE_COMITE
interpret "está permitido reanudar la revisión técnica" as PERMITIDO_REANUDAR_REVISION_TECNICA
interpret "sigue prohibido publicar el manuscrito" as MANUSCRITO_PROHIBIDO_PUBLICAR_SIGUE
interpret "no se corrija el plagio" as CORRIJA_PLAGIO_NO
interpret "en un caso concreto, el revisor detectó plagio grave y no existe autorización excepcional emitida por el comité." as AUTORIZACION_EXCEPCIONAL_CONCRETO_REVISOR
interpret "Es obligatorio suspender la evaluación" as OBLIGATORIO_EVALUACION_SUSPENDER
interpret "está prohibido autorizar la publicación del manuscrito." as PUBLICACION_MANUSCRITO_PROHIBIDO_AUTORIZAR

// ── Estructura argumental ─────────────
// Patrón detectado: modus_ponens, universal_generalization, universal_instantiation

axiom a1 = EVALUACION_ACADEMICO_SUSPENDER_OBLIGADO
axiom a2 = REPORTAR_COMITE_ETICA_CASO
axiom a3 = !(COORDINADOR_PUBLICACION_MANUSCRITO_SUSPENDIDO)
// Condicional modal: "el comité concede una autorización excepcional, está permitido reanudar la revisión técnica, sigue prohibido publicar el manuscrito, no se corrija el plagio"
axiom a4 = AUTORIZACION_EXCEPCIONAL_CONCEDE_COMITE -> P(PERMITIDO_REANUDAR_REVISION_TECNICA)
// Subcláusula modal: "sigue prohibido publicar el manuscrito"
axiom a5 = MANUSCRITO_PROHIBIDO_PUBLICAR_SIGUE
// Subcláusula modal: "no se corrija el plagio"
axiom a6 = !(CORRIJA_PLAGIO_NO)
axiom a7 = !(AUTORIZACION_EXCEPCIONAL_CONCRETO_REVISOR)
// Deóntico: "Es obligatorio suspender la evaluación"
axiom a8 = O(OBLIGATORIO_EVALUACION_SUSPENDER)
// Deóntico: "reportar el caso al comité"
axiom a9 = REPORTAR_COMITE_ETICA_CASO
// Deóntico: "está prohibido autorizar la publicación del manuscrito."
axiom a10 = PUBLICACION_MANUSCRITO_PROHIBIDO_AUTORIZAR

// ── Verificación ──────────────────────
check valid (AUTORIZACION_EXCEPCIONAL_CONCEDE_COMITE -> P(PERMITIDO_REANUDAR_REVISION_TECNICA))

```

---

## Epistemic — llave maestra, código y conocimiento anidado

- **ID**: `validated-hard-epistemic-master-key`
- **Perfil Lógico**: `epistemic.s5`

### 1. Ejercicio Original (Texto Natural)

> Ana sabe que, si la llave maestra está en la caja roja y Bruno conoce el código, entonces Bruno puede abrir el archivo; Bruno sabe el código; Carla sabe que Ana conoce esa implicación y sabe además que Bruno conoce el código; Carla también sabe que la llave maestra está en la caja roja; Diego sabe que Carla sabe todo eso; Ana, sin embargo, no sabe dónde está la llave maestra; y todos saben que ningún archivo puede abrirse sin llave maestra y sin código correcto. Por lo tanto, Carla sabe que Bruno puede abrir el archivo; Diego sabe que Carla lo sabe; Ana todavía no sabe que Bruno puede abrir el archivo.

### 2. Respuesta Operativa (Humana / Manual)

> Carla sabe que Bruno puede abrir el archivo; Diego sabe que Carla lo sabe; Ana todavía no puede saberlo.

### 3. Formalización Algorítmica Generada (Autologic ST)

```st
// ═══════════════════════════════════════
// Formalización automática — autologic
// Perfil: epistemic.s5
// Idioma: es
// Patrones: modus_ponens
// ═══════════════════════════════════════

logic epistemic.s5

// ── Proposiciones atómicas ────────────
interpret "la llave maestra está en la caja roja" as MAESTRA_LLAVE_CAJA_ROJA
interpret "que Bruno conoce el código" as CONOCE_CODIGO_BRUNO
interpret "Bruno puede abrir el archivo" as ARCHIVO_BRUNO_PUEDE_ABRIR
interpret "Bruno sabe el código" as CODIGO_BRUNO_SABE
interpret "Carla sabe que Ana conoce esa implicación" as IMPLICACION_CONOCE_CARLA_SABE
interpret "sabe" as SABE
interpret "Carla también sabe que la llave maestra está en la caja roja" as TAMBIEN_MAESTRA_CARLA_LLAVE
interpret "Diego sabe que Carla lo sabe" as DIEGO_CARLA_SABE_SABE
interpret "Ana sin embargo no sabe dónde está la llave maestra" as EMBARGO_MAESTRA_DONDE_LLAVE
interpret "todos saben que ningún archivo puede abrirse sin llave maestra" as ARCHIVO_ABRIRSE_MAESTRA_NINGUN
interpret "sin código correcto." as CORRECTO_CODIGO
interpret "Carla sabe que Bruno puede abrir el archivo" as ARCHIVO_CARLA_BRUNO_PUEDE
interpret "Ana todavía no sabe que Bruno puede abrir el archivo." as TODAVIA_ARCHIVO_BRUNO_PUEDE

// ── Estructura argumental ─────────────
// Patrón detectado: modus_ponens

// Condicional modal: "la llave maestra está en la caja roja, Bruno conoce el código, Bruno puede abrir el archivo"
axiom a1 = K(MAESTRA_LLAVE_CAJA_ROJA -> K(CONOCE_CODIGO_BRUNO))
// Subcláusula modal: "Bruno puede abrir el archivo"
axiom a2 = ARCHIVO_BRUNO_PUEDE_ABRIR
axiom a3 = CODIGO_BRUNO_SABE
// Epistémico S5: "Carla sabe que Ana conoce esa implicación"
axiom a4 = K(K(K(IMPLICACION_CONOCE_CARLA_SABE)))
// Epistémico S5: "sabe"
axiom a5 = SABE
// Epistémico S5: "que Bruno conoce el código"
axiom a6 = CONOCE_CODIGO_BRUNO
// Epistémico S5: "Carla también sabe que la llave maestra está en la caja roja"
axiom a7 = K(TAMBIEN_MAESTRA_CARLA_LLAVE)
// Epistémico S5: "Diego sabe que Carla sabe todo eso"
axiom a8 = K(DIEGO_CARLA_SABE_SABE)
axiom a9 = !(EMBARGO_MAESTRA_DONDE_LLAVE)
// Epistémico S5: "todos saben que ningún archivo puede abrirse sin llave maestra"
axiom a10 = !(K(ARCHIVO_ABRIRSE_MAESTRA_NINGUN))
// Epistémico S5: "sin código correcto."
axiom a11 = CORRECTO_CODIGO
// Epistémico S5: "Carla sabe que Bruno puede abrir el archivo"
axiom a12 = K(ARCHIVO_CARLA_BRUNO_PUEDE)
// Epistémico S5: "Diego sabe que Carla lo sabe"
axiom a13 = K(DIEGO_CARLA_SABE_SABE)
// Epistémico S5: "Ana todavía no sabe que Bruno puede abrir el archivo."
axiom a14 = K(!(TODAVIA_ARCHIVO_BRUNO_PUEDE))

// ── Verificación ──────────────────────
check valid (K(MAESTRA_LLAVE_CAJA_ROJA -> K(CONOCE_CODIGO_BRUNO)))

```

---

## Intuitionistic — testigo constructivo explícito para 10 = 3 + 7

- **ID**: `validated-hard-intuitionistic-witness`
- **Perfil Lógico**: `intuitionistic.propositional`

### 1. Ejercicio Original (Texto Natural)

> Existe un procedimiento efectivo que, dado un número natural junto con una descomposición concreta de ese número como suma de dos naturales positivos, produce un certificado verificable de dicha descomposición; además, se exhiben explícitamente el número 10, el número 3 y el número 7, y se muestra efectivamente que 10 es la suma de 3 y 7; todo número para el que se exhiba una descomposición certificada tiene una representación auditable; y de toda representación auditable puede construirse un registro finito de verificación. Por lo tanto, Existe constructivamente un número con representación auditable y registro finito de verificación; concretamente, ese número es 10.

### 2. Respuesta Operativa (Humana / Manual)

> Existe constructivamente un número con representación auditable y registro finito de verificación; concretamente, ese número es 10.

### 3. Formalización Algorítmica Generada (Autologic ST)

```st
// ═══════════════════════════════════════
// Formalización automática — autologic
// Perfil: intuitionistic.propositional
// Idioma: es
// Patrones: universal_generalization, universal_instantiation, conjunction_introduction
// ═══════════════════════════════════════

logic intuitionistic.propositional

// ── Proposiciones atómicas ────────────
interpret "Existe un procedimiento efectivo que" as PROCEDIMIENTO_EFECTIVO_EXISTE
interpret "dado un número natural junto con una descomposición concreta de ese número como suma de dos naturales positivos" as DESCOMPOSICION_NATURALES_POSITIVOS_CONCRETA
interpret "produce un certificado verificable de dicha descomposición" as DESCOMPOSICION_CERTIFICADO_VERIFICABLE_PRODUCE
interpret "se exhiben explícitamente el número 10, el número 3" as EXPLICITAMENTE_EXHIBEN_NUMERO_NUMERO
interpret "el número 7" as NUMERO__7
interpret "se muestra efectivamente que 10 es la suma de 3" as EFECTIVAMENTE_MUESTRA_SUMA__10
interpret "7" as _7
interpret "todo número para el que se exhiba una descomposición certificada tiene una representación auditable" as DESCOMPOSICION_REPRESENTACION_CERTIFICADA_AUDITABLE
interpret "de toda representación auditable puede construirse un registro finito de verificación." as REPRESENTACION_VERIFICACION_CONSTRUIRSE_AUDITABLE
interpret "Existe constructivamente un número con representación auditable" as CONSTRUCTIVAMENTE_REPRESENTACION_AUDITABLE_EXISTE
interpret "registro finito de verificación" as VERIFICACION_REGISTRO_FINITO

// ── Estructura argumental ─────────────
// Patrón detectado: universal_generalization, universal_instantiation, conjunction_introduction

// Hecho: "Existe un procedimiento efectivo que"
axiom hecho_1 = PROCEDIMIENTO_EFECTIVO_EXISTE
// Hecho: "dado un número natural junto con una descomposición concreta de ese número como suma de dos naturales positivos"
axiom hecho_2 = DESCOMPOSICION_NATURALES_POSITIVOS_CONCRETA
// Hecho: "produce un certificado verificable de dicha descomposición"
axiom hecho_3 = DESCOMPOSICION_CERTIFICADO_VERIFICABLE_PRODUCE
// Conjunción: "se exhiben explícitamente el número 10, el número 3, el número 7, se muestra efectivamente que 10 es la suma de 3, 7"
axiom conj_4 = EXPLICITAMENTE_EXHIBEN_NUMERO_NUMERO & NUMERO__7 & EFECTIVAMENTE_MUESTRA_SUMA__10 & _7
// Hecho: "todo número para el que se exhiba una descomposición certificada tiene una representación auditable"
axiom hecho_5 = DESCOMPOSICION_REPRESENTACION_CERTIFICADA_AUDITABLE
// Hecho: "de toda representación auditable puede construirse un registro finito de verificación."
axiom hecho_6 = REPRESENTACION_VERIFICACION_CONSTRUIRSE_AUDITABLE
// Hecho: "registro finito de verificación"
axiom hecho_8 = VERIFICACION_REGISTRO_FINITO
// Hecho: "concretamente, ese número es 10."
axiom hecho_9 = EXPLICITAMENTE_EXHIBEN_NUMERO_NUMERO
// Regla de instanciación universal (proposicional): (PROCEDIMIENTO_EFECTIVO_EXISTE & DESCOMPOSICION_NATURALES_POSITIVOS_CONCRETA & DESCOMPOSICION_CERTIFICADO_VERIFICABLE_PRODUCE & EXPLICITAMENTE_EXHIBEN_NUMERO_NUMERO & NUMERO__7 & EFECTIVAMENTE_MUESTRA_SUMA__10 & _7 & DESCOMPOSICION_REPRESENTACION_CERTIFICADA_AUDITABLE & REPRESENTACION_VERIFICACION_CONSTRUIRSE_AUDITABLE & VERIFICACION_REGISTRO_FINITO & EXPLICITAMENTE_EXHIBEN_NUMERO_NUMERO) → CONSTRUCTIVAMENTE_REPRESENTACION_AUDITABLE_EXISTE
axiom ui_regla_10 = (PROCEDIMIENTO_EFECTIVO_EXISTE & DESCOMPOSICION_NATURALES_POSITIVOS_CONCRETA & DESCOMPOSICION_CERTIFICADO_VERIFICABLE_PRODUCE & EXPLICITAMENTE_EXHIBEN_NUMERO_NUMERO & NUMERO__7 & EFECTIVAMENTE_MUESTRA_SUMA__10 & _7 & DESCOMPOSICION_REPRESENTACION_CERTIFICADA_AUDITABLE & REPRESENTACION_VERIFICACION_CONSTRUIRSE_AUDITABLE & VERIFICACION_REGISTRO_FINITO & EXPLICITAMENTE_EXHIBEN_NUMERO_NUMERO) -> CONSTRUCTIVAMENTE_REPRESENTACION_AUDITABLE_EXISTE

// Conclusión: "Existe constructivamente un número con representación auditable"
derive CONSTRUCTIVAMENTE_REPRESENTACION_AUDITABLE_EXISTE from {hecho_1, hecho_2, hecho_3, conj_4, hecho_5, hecho_6, hecho_8, hecho_9, ui_regla_10}

// ── Verificación ──────────────────────
check valid ((PROCEDIMIENTO_EFECTIVO_EXISTE & DESCOMPOSICION_NATURALES_POSITIVOS_CONCRETA & DESCOMPOSICION_CERTIFICADO_VERIFICABLE_PRODUCE & EXPLICITAMENTE_EXHIBEN_NUMERO_NUMERO & NUMERO__7 & EFECTIVAMENTE_MUESTRA_SUMA__10 & _7 & DESCOMPOSICION_REPRESENTACION_CERTIFICADA_AUDITABLE & REPRESENTACION_VERIFICACION_CONSTRUIRSE_AUDITABLE & VERIFICACION_REGISTRO_FINITO & EXPLICITAMENTE_EXHIBEN_NUMERO_NUMERO) -> CONSTRUCTIVAMENTE_REPRESENTACION_AUDITABLE_EXISTE)

```

---

## Modal — clave comprometida y transmisiones riesgosas

- **ID**: `validated-hard-modal-credentials`
- **Perfil Lógico**: `modal.k`

### 1. Ejercicio Original (Texto Natural)

> Es necesario que, si un protocolo criptográfico usa una clave comprometida, entonces el canal no es seguro; es necesario que, si el canal no es seguro, entonces toda transmisión de credenciales por ese canal es riesgosa; y es necesario que el protocolo actualmente en uso emplea una clave comprometida. Por lo tanto, Es necesario que toda transmisión de credenciales por ese protocolo sea riesgosa.

### 2. Respuesta Operativa (Humana / Manual)

> Es necesario que toda transmisión de credenciales por ese protocolo sea riesgosa.

### 3. Formalización Algorítmica Generada (Autologic ST)

```st
// ═══════════════════════════════════════
// Formalización automática — autologic
// Perfil: modal.k
// Idioma: es
// Patrones: modus_ponens, hypothetical_syllogism
// ═══════════════════════════════════════

logic modal.k

// ── Proposiciones atómicas ────────────
interpret "un protocolo criptográfico usa una clave comprometida" as CRIPTOGRAFICO_COMPROMETIDA_PROTOCOLO_CLAVE
interpret "el canal no es seguro" as SEGURO_CANAL_NO
interpret "toda transmisión de credenciales por ese canal es riesgosa" as CREDENCIALES_TRANSMISION_RIESGOSA_CANAL
interpret "es necesario que el protocolo actualmente en uso emplea una clave comprometida." as COMPROMETIDA_ACTUALMENTE_NECESARIO_PROTOCOLO
interpret "Es necesario que toda transmisión de credenciales por ese protocolo sea riesgosa." as CREDENCIALES_TRANSMISION_NECESARIO_PROTOCOLO

// ── Estructura argumental ─────────────
// Patrón detectado: modus_ponens, hypothetical_syllogism

// Condicional modal: "un protocolo criptográfico usa una clave comprometida, el canal no es seguro"
axiom a1 = [](CRIPTOGRAFICO_COMPROMETIDA_PROTOCOLO_CLAVE -> !(SEGURO_CANAL_NO))
// Consecuente modal contextual: "el canal no es seguro"
axiom a2 = !(SEGURO_CANAL_NO)
// Condicional modal: "el canal no es seguro, toda transmisión de credenciales por ese canal es riesgosa"
axiom a3 = [](!(SEGURO_CANAL_NO) -> CREDENCIALES_TRANSMISION_RIESGOSA_CANAL)
// Consecuente modal contextual: "toda transmisión de credenciales por ese canal es riesgosa"
axiom a4 = CREDENCIALES_TRANSMISION_RIESGOSA_CANAL
// Modal K: "es necesario que el protocolo actualmente en uso emplea una clave comprometida."
axiom a5 = [](COMPROMETIDA_ACTUALMENTE_NECESARIO_PROTOCOLO)
// Modal K: "Es necesario que toda transmisión de credenciales por ese protocolo sea riesgosa."
axiom a6 = [](CREDENCIALES_TRANSMISION_NECESARIO_PROTOCOLO)

// ── Verificación ──────────────────────
check valid ([](CRIPTOGRAFICO_COMPROMETIDA_PROTOCOLO_CLAVE -> !(SEGURO_CANAL_NO)))
check valid ([](!(SEGURO_CANAL_NO) -> CREDENCIALES_TRANSMISION_RIESGOSA_CANAL))

```

---

## Paraconsistent — vacuna X, obligación clínica y no explosión

- **ID**: `validated-hard-paraconsistent-vaccine`
- **Perfil Lógico**: `paraconsistent.belnap`

### 1. Ejercicio Original (Texto Natural)

> El expediente clínico digital contiene la afirmación de que Nora recibió la vacuna X y también contiene la afirmación de que Nora no recibió la vacuna X, porque dos subsistemas registraron datos incompatibles; el protocolo hospitalario establece que, si una paciente recibió la vacuna X, entonces debe registrarse observación postvacunal; y también establece que, si una paciente no recibió la vacuna X, entonces no debe cobrarse la dosis aplicada. La inconsistencia del expediente no autoriza a concluir cualquier cosa irrelevante sobre Nora o sobre el hospital. Por lo tanto, Puede concluirse válidamente que debe registrarse observación postvacunal y también que no debe cobrarse la dosis; no se sigue de ahí una conclusión arbitraria cualquiera.

### 2. Respuesta Operativa (Humana / Manual)

> Puede concluirse válidamente que debe registrarse observación postvacunal y también que no debe cobrarse la dosis; no se sigue de ahí una conclusión arbitraria cualquiera.

### 3. Formalización Algorítmica Generada (Autologic ST)

```st
// ═══════════════════════════════════════
// Formalización automática — autologic
// Perfil: paraconsistent.belnap
// Idioma: es
// Patrones: modus_ponens, modus_tollens, hypothetical_syllogism, universal_generalization, universal_instantiation, conjunction_introduction
// ═══════════════════════════════════════

logic paraconsistent.belnap

// ── Proposiciones atómicas ────────────
interpret "El expediente clínico digital contiene la afirmación de que Nora recibió la vacuna X" as EXPEDIENTE_AFIRMACION_CONTIENE_CLINICO
interpret "contiene la afirmación de que Nora no recibió la vacuna X" as AFIRMACION_CONTIENE_RECIBIO_VACUNA
interpret "dos subsistemas registraron datos incompatibles" as INCOMPATIBLES_SUBSISTEMAS_REGISTRARON_DATOS
interpret "el protocolo hospitalario establece que una paciente recibió la vacuna X" as HOSPITALARIO_PROTOCOLO_ESTABLECE_PACIENTE
interpret "debe registrarse observación postvacunal" as REGISTRARSE_OBSERVACION_POSTVACUNAL_DEBE
interpret "establece que" as ESTABLECE
interpret "una paciente no recibió la vacuna X" as PACIENTE_RECIBIO_VACUNA_NO
interpret "no debe cobrarse la dosis aplicada." as COBRARSE_APLICADA_DOSIS_DEBE
interpret "La inconsistencia del expediente no autoriza a concluir cualquier cosa irrelevante sobre Nora" as INCONSISTENCIA_IRRELEVANTE_EXPEDIENTE_CUALQUIER
interpret "sobre el hospital." as HOSPITAL
interpret "Puede concluirse válidamente que debe registrarse observación postvacunal" as VALIDAMENTE_REGISTRARSE_OBSERVACION_POSTVACUNAL
interpret "no se sigue de ahí una conclusión arbitraria cualquiera." as CONCLUSION_ARBITRARIA_CUALQUIERA_SIGUE

// ── Estructura argumental ─────────────
// Patrón detectado: modus_ponens, modus_tollens, hypothetical_syllogism, universal_generalization, universal_instantiation, conjunction_introduction

// Conjunción: "El expediente clínico digital contiene la afirmación de que Nora recibió la vacuna X, contiene la afirmación de que Nora no recibió la vacuna X, dos subsistemas registraron datos incompatibles"
axiom conj_1 = !(EXPEDIENTE_AFIRMACION_CONTIENE_CLINICO) & AFIRMACION_CONTIENE_RECIBIO_VACUNA & INCOMPATIBLES_SUBSISTEMAS_REGISTRARON_DATOS
// Condicional: "el protocolo hospitalario establece que una paciente recibió la vacuna X, debe registrarse observación postvacunal"
axiom regla_2 = HOSPITALARIO_PROTOCOLO_ESTABLECE_PACIENTE -> REGISTRARSE_OBSERVACION_POSTVACUNAL_DEBE
// Condicional: "establece que, una paciente no recibió la vacuna X, no debe cobrarse la dosis aplicada."
axiom regla_3 = !(!(PACIENTE_RECIBIO_VACUNA_NO)) -> COBRARSE_APLICADA_DOSIS_DEBE
// Subcláusula condicional: "establece que"
axiom hecho_4 = ESTABLECE
// Hecho: "La inconsistencia del expediente no autoriza a concluir cualquier cosa irrelevante sobre Nora"
axiom hecho_5 = !(INCONSISTENCIA_IRRELEVANTE_EXPEDIENTE_CUALQUIER)
// Hecho: "sobre el hospital."
axiom hecho_6 = HOSPITAL
// Hecho: "que no debe cobrarse la dosis"
axiom hecho_8 = !(COBRARSE_APLICADA_DOSIS_DEBE)
// Negación: "no se sigue de ahí una conclusión arbitraria cualquiera."
axiom neg_9 = !(CONCLUSION_ARBITRARIA_CUALQUIERA_SIGUE)

// Conclusión: "Puede concluirse válidamente que debe registrarse observación postvacunal"
derive VALIDAMENTE_REGISTRARSE_OBSERVACION_POSTVACUNAL from {conj_1, regla_2, regla_3, hecho_4, hecho_5, hecho_6, hecho_8, neg_9}

// ── Verificación ──────────────────────
check valid (HOSPITALARIO_PROTOCOLO_ESTABLECE_PACIENTE -> REGISTRARSE_OBSERVACION_POSTVACUNAL_DEBE)
check valid (!(!(PACIENTE_RECIBIO_VACUNA_NO)) -> COBRARSE_APLICADA_DOSIS_DEBE)

```

---

## Probabilistic — alerta roja, inconsistencias y posterior de fraude

- **ID**: `validated-hard-probabilistic-fraud`
- **Perfil Lógico**: `probabilistic.basic`

### 1. Ejercicio Original (Texto Natural)

> La probabilidad previa de fraude en una transacción es 0.02. Si hay fraude, la probabilidad de que el sistema emita alerta roja es 0.93; si no hay fraude, la probabilidad de alerta roja es 0.04. Además, cuando ya hubo alerta roja, la probabilidad de que la revisión manual encuentre inconsistencias es 0.80 si sí hubo fraude y 0.10 si no hubo fraude. En una transacción concreta hubo alerta roja y la revisión manual encontró inconsistencias. Por lo tanto, La probabilidad posterior de fraude es aproximadamente 79.15%.

### 2. Respuesta Operativa (Humana / Manual)

> La probabilidad posterior de fraude es aproximadamente 79.15%.

### 3. Formalización Algorítmica Generada (Autologic ST)

```st
// ═══════════════════════════════════════
// Formalización automática — autologic
// Perfil: probabilistic.basic
// Idioma: es
// Patrones: modus_ponens, hypothetical_syllogism, conditional_chain, conjunction_introduction
// ═══════════════════════════════════════

logic probabilistic.basic

// ── Proposiciones atómicas ────────────
interpret "La probabilidad previa de fraude en una transacción es 0.02." as PROBABILIDAD_TRANSACCION_PREVIA_FRAUDE
interpret "hay fraude" as FRAUDE
interpret "la probabilidad de que el sistema emita alerta roja es 0.93" as PROBABILIDAD_SISTEMA_ALERTA_EMITA
interpret "no hay fraude" as FRAUDE_NO
interpret "la probabilidad de alerta roja es 0.04." as PROBABILIDAD_ALERTA_ROJA__04
interpret "cuando ya hubo alerta roja" as ALERTA_HUBO_ROJA
interpret "la probabilidad de que la revisión manual encuentre inconsistencias es 0.80" as INCONSISTENCIAS_PROBABILIDAD_ENCUENTRE_REVISION
interpret "sí hubo fraude" as FRAUDE_HUBO_SI
interpret "0.10" as _10__0
interpret "no hubo fraude." as FRAUDE_HUBO_NO
interpret "En una transacción concreta hubo alerta roja" as TRANSACCION_CONCRETA_ALERTA_HUBO
interpret "la revisión manual encontró inconsistencias." as INCONSISTENCIAS_REVISION_ENCONTRO_MANUAL
interpret "La probabilidad posterior de fraude es aproximadamente 79.15%." as APROXIMADAMENTE_PROBABILIDAD_POSTERIOR_FRAUDE

// ── Estructura argumental ─────────────
// Patrón detectado: modus_ponens, hypothetical_syllogism, conditional_chain, conjunction_introduction

// Hecho: "La probabilidad previa de fraude en una transacción es 0.02."
axiom hecho_1 = PROBABILIDAD_TRANSACCION_PREVIA_FRAUDE
// Condicional: "hay fraude, la probabilidad de que el sistema emita alerta roja es 0.93"
axiom regla_2 = FRAUDE -> PROBABILIDAD_SISTEMA_ALERTA_EMITA
// Condicional: "no hay fraude, la probabilidad de alerta roja es 0.04."
axiom regla_3 = !(FRAUDE_NO) -> PROBABILIDAD_ALERTA_ROJA__04
// Condicional: "cuando ya hubo alerta roja, la probabilidad de que la revisión manual encuentre inconsistencias es 0.80, sí hubo fraude, 0.10, no hubo fraude."
axiom regla_4 = FRAUDE_HUBO_SI -> INCONSISTENCIAS_PROBABILIDAD_ENCUENTRE_REVISION
// Subcláusula condicional: "cuando ya hubo alerta roja"
axiom hecho_5 = ALERTA_HUBO_ROJA
// Subcláusula condicional: "0.10"
axiom hecho_6 = _10__0
// Subcláusula condicional: "no hubo fraude."
axiom hecho_7 = !(FRAUDE_HUBO_NO)
// Conjunción: "En una transacción concreta hubo alerta roja, la revisión manual encontró inconsistencias."
axiom conj_8 = TRANSACCION_CONCRETA_ALERTA_HUBO & INCONSISTENCIAS_REVISION_ENCONTRO_MANUAL

// Conclusión: "La probabilidad posterior de fraude es aproximadamente 79.15%."
derive APROXIMADAMENTE_PROBABILIDAD_POSTERIOR_FRAUDE from {hecho_1, regla_2, regla_3, regla_4, hecho_5, hecho_6, hecho_7, conj_8}

// ── Verificación ──────────────────────
check valid (FRAUDE -> PROBABILIDAD_SISTEMA_ALERTA_EMITA)
check valid (!(FRAUDE_NO) -> PROBABILIDAD_ALERTA_ROJA__04)
check valid (FRAUDE_HUBO_SI -> INCONSISTENCIAS_PROBABILIDAD_ENCUENTRE_REVISION)

```

---

## Epistemic compartido — tablero rojo, válvula abierta y coordinación mutua

- **ID**: `validated-hard-shared-control-room`
- **Perfil Lógico**: `epistemic.s5`

### 1. Ejercicio Original (Texto Natural)

> Ana, Bruno y Carla asistieron juntos a una inducción pública en la que se anunció que, si el tablero marca nivel rojo y la válvula sur está abierta, todos deben cerrar simultáneamente las líneas auxiliares; cada uno vio que los otros dos escucharon la instrucción y comprendieron la regla; más tarde, el tablero marca nivel rojo a la vista de todos y la válvula sur aparece abierta en el panel común, también visible para todos; además, ninguno duda de la racionalidad operativa de los otros. Por lo tanto, Cada uno sabe que debe cerrar las líneas auxiliares y sabe que los otros también lo saben.

### 2. Respuesta Operativa (Humana / Manual)

> La regla funciona como conocimiento compartido entre los tres; por tanto, cada uno sabe que debe cerrar las líneas auxiliares y sabe que los otros también lo saben.

### 3. Formalización Algorítmica Generada (Autologic ST)

```st
// ═══════════════════════════════════════
// Formalización automática — autologic
// Perfil: epistemic.s5
// Idioma: es
// Patrones: modus_ponens, universal_generalization, universal_instantiation, conjunction_introduction
// ═══════════════════════════════════════

logic epistemic.s5

// ── Proposiciones atómicas ────────────
interpret "Ana, Bruno y Carla asistieron juntos a una inducción pública en la que se anunció que" as ASISTIERON_INDUCCION_PUBLICA_ANUNCIO
interpret "el tablero marca nivel rojo" as TABLERO_MARCA_NIVEL_ROJO
interpret "la válvula sur está abierta" as VALVULA_ABIERTA_SUR
interpret "todos deben cerrar simultáneamente las líneas auxiliares" as SIMULTANEAMENTE_AUXILIARES_CERRAR_LINEAS
interpret "cada uno vio que los otros dos escucharon la instrucción" as INSTRUCCION_ESCUCHARON_UNO_VIO
interpret "comprendieron la regla" as COMPRENDIERON_REGLA
interpret "más tarde, el tablero marca nivel rojo a la vista de todos" as TABLERO_TARDE_MARCA_NIVEL
interpret "la válvula sur aparece abierta en el panel común" as VALVULA_APARECE_ABIERTA_PANEL
interpret "visible para todos" as VISIBLE_TODOS
interpret "ninguno duda de la racionalidad operativa de los otros." as RACIONALIDAD_OPERATIVA_NINGUNO_DUDA
interpret "Cada uno sabe que debe cerrar las líneas auxiliares" as AUXILIARES_CERRAR_LINEAS_SABE
interpret "sabe que los otros" as SABE
interpret "lo saben." as SABEN

// ── Estructura argumental ─────────────
// Patrón detectado: modus_ponens, universal_generalization, universal_instantiation, conjunction_introduction

// Condicional modal: "Ana, Bruno y Carla asistieron juntos a una inducción pública en la que se anunció que, el tablero marca nivel rojo, la válvula sur está abierta, todos deben cerrar simultáneamente las líneas auxiliares"
axiom a1 = TABLERO_MARCA_NIVEL_ROJO -> K(SIMULTANEAMENTE_AUXILIARES_CERRAR_LINEAS)
// Subcláusula modal: "Ana, Bruno y Carla asistieron juntos a una inducción pública en la que se anunció que"
axiom a2 = ASISTIERON_INDUCCION_PUBLICA_ANUNCIO
// Subcláusula modal: "la válvula sur está abierta"
axiom a3 = VALVULA_ABIERTA_SUR
axiom a4 = INSTRUCCION_ESCUCHARON_UNO_VIO
axiom a5 = COMPRENDIERON_REGLA
axiom a6 = TABLERO_TARDE_MARCA_NIVEL
axiom a7 = VALVULA_APARECE_ABIERTA_PANEL
axiom a8 = VISIBLE_TODOS
axiom a9 = !(RACIONALIDAD_OPERATIVA_NINGUNO_DUDA)
// Epistémico S5: "Cada uno sabe que debe cerrar las líneas auxiliares"
axiom a10 = K(K(K(AUXILIARES_CERRAR_LINEAS_SABE)))
// Epistémico S5: "sabe que los otros"
axiom a11 = SABE
// Epistémico S5: "lo saben."
axiom a12 = SABEN

// Modus Ponens: TABLERO_MARCA_NIVEL_ROJO → K(SIMULTANEAMENTE_AUXILIARES_CERRAR_LINEAS), TABLERO_MARCA_NIVEL_ROJO ⊢ K(SIMULTANEAMENTE_AUXILIARES_CERRAR_LINEAS)
derive K(SIMULTANEAMENTE_AUXILIARES_CERRAR_LINEAS) from {a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12}

// ── Verificación ──────────────────────
check valid (TABLERO_MARCA_NIVEL_ROJO -> K(SIMULTANEAMENTE_AUXILIARES_CERRAR_LINEAS))

```

---

## Temporal — solicitud en cola, atención eventual y comprobante siguiente

- **ID**: `validated-hard-temporal-queue`
- **Perfil Lógico**: `temporal.ltl`

### 1. Ejercicio Original (Texto Natural)

> Siempre que una solicitud válida entra en cola, en el siguiente estado queda registrada; toda solicitud registrada permanece registrada hasta que sea atendida o cancelada; toda solicitud registrada que no sea cancelada será eventualmente atendida; y toda solicitud atendida genera comprobante en el estado inmediatamente siguiente. Ahora entra una solicitud válida en cola y además esa solicitud nunca es cancelada. Por lo tanto, La solicitud quedará registrada, eventualmente será atendida y después se emitirá su comprobante.

### 2. Respuesta Operativa (Humana / Manual)

> La solicitud quedará registrada, eventualmente será atendida y después se emitirá su comprobante.

### 3. Formalización Algorítmica Generada (Autologic ST)

```st
// ═══════════════════════════════════════
// Formalización automática — autologic
// Perfil: temporal.ltl
// Idioma: es
// Patrones: modus_ponens, conjunction_introduction
// ═══════════════════════════════════════

logic temporal.ltl

// ── Proposiciones atómicas ────────────
interpret "una solicitud válida entra en cola" as SOLICITUD_VALIDA_ENTRA_COLA
interpret "en el siguiente estado queda registrada" as REGISTRADA_SIGUIENTE_ESTADO_QUEDA
interpret "toda solicitud registrada permanece registrada" as REGISTRADA_REGISTRADA_SOLICITUD_PERMANECE
interpret "sea atendida" as ATENDIDA_SEA
interpret "cancelada" as CANCELADA
interpret "toda solicitud registrada que no sea cancelada será eventualmente atendida" as EVENTUALMENTE_REGISTRADA_SOLICITUD_CANCELADA
interpret "toda solicitud atendida genera comprobante en el estado inmediatamente siguiente." as INMEDIATAMENTE_COMPROBANTE_SOLICITUD_SIGUIENTE
interpret "esa solicitud nunca es cancelada." as SOLICITUD_CANCELADA_NUNCA
interpret "La solicitud quedará registrada" as REGISTRADA_SOLICITUD_QUEDARA
interpret "eventualmente será atendida" as EVENTUALMENTE_ATENDIDA_SERA
interpret "después se emitirá su comprobante." as COMPROBANTE_DESPUES_EMITIRA

// ── Estructura argumental ─────────────
// Patrón detectado: modus_ponens, conjunction_introduction

// Temporal: "una solicitud válida entra en cola, en el siguiente estado queda registrada"
axiom a1 = G(SOLICITUD_VALIDA_ENTRA_COLA -> next REGISTRADA_SIGUIENTE_ESTADO_QUEDA)
// Temporal until: "toda solicitud registrada permanece registrada, sea atendida, cancelada"
axiom a2 = REGISTRADA_REGISTRADA_SOLICITUD_PERMANECE until ATENDIDA_SEA
// Subcláusula temporal: "cancelada"
axiom a3 = CANCELADA
// Temporal eventually: "toda solicitud registrada que no sea cancelada será eventualmente atendida"
axiom a4 = F(!(EVENTUALMENTE_REGISTRADA_SOLICITUD_CANCELADA))
axiom a5 = INMEDIATAMENTE_COMPROBANTE_SOLICITUD_SIGUIENTE
// Temporal: "Ahora entra una solicitud válida en cola, esa solicitud nunca es cancelada."
axiom a6 = SOLICITUD_VALIDA_ENTRA_COLA -> !(next SOLICITUD_CANCELADA_NUNCA)
// Temporal eventually: "La solicitud quedará registrada"
axiom a7 = REGISTRADA_SOLICITUD_QUEDARA
// Temporal eventually: "eventualmente será atendida"
axiom a8 = F(EVENTUALMENTE_ATENDIDA_SERA)
// Temporal eventually: "después se emitirá su comprobante."
axiom a9 = next COMPROBANTE_DESPUES_EMITIRA

// ── Verificación ──────────────────────
check valid (G(SOLICITUD_VALIDA_ENTRA_COLA -> next REGISTRADA_SIGUIENTE_ESTADO_QUEDA))
check valid (SOLICITUD_VALIDA_ENTRA_COLA -> !(next SOLICITUD_CANCELADA_NUNCA))

```

---

