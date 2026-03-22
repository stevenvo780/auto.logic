# Autologic — Diseño Estructurado

> **Formalizador automático de texto natural a lógica formal ST, sin IA.**

---

## 1. Visión General

**Autologic** es una librería NPM que toma texto en lenguaje natural + un perfil lógico y produce código ST válido y ejecutable. Usa técnicas de NLP basadas en reglas (marcadores discursivos, puntuación, POS tagging) — **sin modelos de IA, sin APIs externas, sin redes neuronales**.

```
┌─────────────────┐     ┌───────────────┐     ┌──────────────────┐
│  Texto Natural   │ ──▶ │   Autologic   │ ──▶ │  Código ST (.st)  │
│  + Perfil Lógico │     │  (NLP rules)  │     │  validado         │
└─────────────────┘     └───────────────┘     └──────────────────┘
                              │
                              ▼
                     @stevenvo780/st-lang
                       (motor / parser)
```

### ¿Por qué?

| Problema actual (`buildSTFromSemantic.ts`) | Solución con Autologic |
|---|---|
| Divide por puntuación bruta (`. ; ,`) | Análisis de marcadores discursivos (200+) |
| No distingue premisas de conclusiones | Clasifica roles: premisa, conclusión, condición |
| No detecta negaciones ni cuantificadores | Detecta "no", "nunca", "todo", "algún", etc. |
| Genera solo `interpret + define` genéricos | Genera `axiom`, `derive`, `check`, `prove` según estructura |
| Sin coreferencia: "llueve" ≠ "está lloviendo" | Resolución básica de coreferencia por similitud léxica |
| Sin detección de patrones argumentales | Detecta Modus Ponens, silogismos, cadenas condicionales |
| Monoperfil (solo propositional) | Multi-perfil: cuantificadores, modales, temporales, deónticos |

---

## 2. API Pública

### 2.1 Función principal

```typescript
import { formalize } from '@stevenvo780/autologic';

const result = formalize(
  "Si llueve, entonces la calle se moja. Dado que está lloviendo, la calle está mojada.",
  { profile: 'classical.propositional', language: 'es' }
);

console.log(result.stCode);
// logic classical.propositional
// interpret "llueve" as LLUEVE
// interpret "la calle se moja" as CALLE_MOJADA
// axiom regla : LLUEVE -> CALLE_MOJADA
// axiom hecho : LLUEVE
// derive CALLE_MOJADA from {regla, hecho}

console.log(result.analysis.detectedPatterns);
// ["modus_ponens"]
```

### 2.2 Clase con estado (para sesiones)

```typescript
import { Autologic } from '@stevenvo780/autologic';

const al = new Autologic({ language: 'es', defaultProfile: 'classical.propositional' });

// Formalizar un texto
const r1 = al.formalize("Todo humano es mortal. Sócrates es humano.");

// Solo analizar sin generar ST
const analysis = al.analyze("Si P entonces Q, pero no Q, luego no P.");

// Validar código ST existente
const validation = al.validate("logic classical.propositional\ncheck valid (P -> P)");

// Agregar reglas personalizadas de marcadores
al.addMarker({ text: 'se sigue que', role: 'conclusion', language: 'es' });
```

### 2.3 Tipos principales

```typescript
interface FormalizeOptions {
  profile?: LogicProfile;              // default: 'classical.propositional'
  language?: 'es' | 'en';             // default: 'es'
  atomStyle?: 'keywords' | 'letters' | 'numbered';  // cómo nombrar átomos
  includeComments?: boolean;           // default: true
  validateOutput?: boolean;            // valida con ST parser, default: true
  maxClauseDepth?: number;            // profundidad máxima de subdivisión
}

interface FormalizationResult {
  ok: boolean;                         // true si se formalizó sin errores
  stCode: string;                      // Código ST completo y válido
  analysis: DiscourseAnalysis;         // Análisis intermedio completo
  atoms: Map<string, string>;          // atomId → texto original
  formulas: FormulaEntry[];            // Fórmulas individuales generadas
  diagnostics: Diagnostic[];           // Warnings/errores/sugerencias
  stValidation?: { ok: boolean; errors: string[] };
}

interface DiscourseAnalysis {
  sentences: AnalyzedSentence[];       // Oraciones analizadas
  argumentStructure: ArgumentStructure; // Estructura argumental global
  detectedPatterns: string[];          // Patrones detectados
}

type LogicProfile =
  | 'classical.propositional'
  | 'classical.first_order'
  | 'modal.k'
  | 'deontic.standard'
  | 'epistemic.s5'
  | 'intuitionistic.propositional'
  | 'temporal.ltl'
  | 'paraconsistent.belnap'
  | 'aristotelian.syllogistic'
  | 'probabilistic.basic'
  | 'arithmetic';
```

---

## 3. Pipeline de Procesamiento

```
Texto Natural
     │
     ▼
┌─────────────────────┐
│  1. SEGMENTER       │  Divide en oraciones y cláusulas
│     - Puntuación     │  usando puntuación + marcadores
│     - Marcadores     │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  2. DISCOURSE       │  Clasifica roles lógicos
│     ANALYZER        │  (premisa, conclusión, condición)
│     - Marcadores    │  Detecta negaciones, cuantificadores
│     - Roles         │  Identifica conectores lógicos
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  3. ATOM EXTRACTOR  │  Extrae proposiciones atómicas
│     - Keywords      │  Asigna nombres simbólicos
│     - Coreferencia  │  Resuelve "lo mismo dicho distinto"
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  4. FORMULA BUILDER │  Construye fórmulas según perfil
│     - Propositional │  Conecta átomos con operadores
│     - First-order   │  Agrega cuantificadores/predicados
│     - Modal/Temporal│  Agrega operadores modales/temporales
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  5. ST GENERATOR    │  Emite código ST válido
│     - interpret     │  Incluye comentarios y trazabilidad
│     - define/axiom  │  Genera esqueletos de verificación
│     - derive/check  │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  6. VALIDATOR       │  Valida con st-lang parse()
│     (opcional)      │  Reporta errores sintácticos
└─────────────────────┘
```

---

## 4. Módulos Detallados

### 4.1 Segmenter — Segmentación de texto

**Entrada**: String de texto natural
**Salida**: `Sentence[]` con `Clause[]` anidadas

```
"Si llueve, entonces la calle se moja. Dado que llueve, la calle está mojada."
         ↓
[
  Sentence {
    original: "Si llueve, entonces la calle se moja",
    clauses: [
      { text: "llueve", markers: [{ text: "si", role: "condition" }] },
      { text: "la calle se moja", markers: [{ text: "entonces", role: "consequent" }] }
    ]
  },
  Sentence {
    original: "Dado que llueve, la calle está mojada",
    clauses: [
      { text: "llueve", markers: [{ text: "dado que", role: "premise" }] },
      { text: "la calle está mojada", markers: [] }
    ]
  }
]
```

**Estrategia de splitting**:
1. Split por `.` `;` `?` `!` → oraciones
2. Detectar marcadores discursivos dentro de cada oración
3. Split por marcadores y comas que separan cláusulas sustantivas
4. Preservar texto entre comillas como unidad atómica

### 4.2 Discourse Analyzer — Análisis discursivo

**Diccionario de marcadores** (~200 entradas bilingües):

| Categoría | Español | English | Rol Lógico |
|---|---|---|---|
| Condicional | si, siempre que, en caso de | if, whenever, provided that | `condition` |
| Consecuente | entonces, por lo tanto, luego | then, therefore, hence, thus | `consequent` / `conclusion` |
| Premisa | dado que, puesto que, ya que, porque | since, because, given that | `premise` |
| Conjunción | y, además, también, asimismo | and, moreover, furthermore | `and` |
| Disyunción | o, o bien, ya sea | or, either...or | `or` |
| Adversativa | pero, sin embargo, no obstante, aunque | but, however, although, yet | `adversative` |
| Negación | no, nunca, ningún, jamás | not, never, no, neither | `negation` |
| Universal | todo, todos, cada, cualquier, siempre | all, every, each, any, always | `universal` |
| Existencial | algún, algunos, existe, hay | some, there exists, there is | `existential` |
| Modal-necesidad | necesariamente, debe, obligatoriamente | necessarily, must, obligatorily | `necessity` |
| Modal-posibilidad | posiblemente, puede, quizás | possibly, may, perhaps | `possibility` |
| Bicondicional | si y solo si, equivale a | if and only if, iff | `biconditional` |
| Temporal | después, antes, hasta que, mientras | after, before, until, while | `temporal` |

**Salida**: Cada cláusula anotada con rol, conectores y modificadores.

### 4.3 Atom Extractor — Extracción de átomos

Convierte cada cláusula en una **proposición atómica** con un identificador simbólico.

```
"la calle se moja"  →  CALLE_MOJA
"llueve"             →  LLUEVE
"está lloviendo"     →  LLUEVE  (coreferencia detectada)
```

**Estrategia**:
1. Filtrar stopwords (artículos, preposiciones, verbos copulativos)
2. Extraer 2-4 palabras clave por lema
3. Generar ID: `KEYWORDS.join('_').toUpperCase()`
4. **Coreferencia básica**: similitud Dice/Jaccard entre bags-of-words. Si dos cláusulas comparten >70% de stems → mismo átomo
5. Para `first_order`: extraer sujeto como variable, predicado como función → `Humano(x)`

**Para cada perfil**:
- `classical.propositional`: Átomos son letras proposicionales → `P`, `Q` o keywords
- `classical.first_order`: Extrae predicados + variables → `Mortal(x)`, `Humano(socrates)`
- `modal.*`: Átomos + wrapper `[]`/`<>` según modality detectada
- `temporal.*`: Átomos + `next`/`until` según marcadores temporales
- `aristotelian.*`: Extrae términos silogísticos Mayor/Menor/Medio

### 4.4 Formula Builder — Construcción de fórmulas

Toma átomos anotados y construye fórmulas ST según el perfil:

```typescript
// Input: atoms con roles
[
  { id: "LLUEVE", role: "condition" },
  { id: "CALLE_MOJADA", role: "consequent" }
]

// Profile: classical.propositional
// Output formula: "LLUEVE -> CALLE_MOJADA"
```

**Reglas de construcción**:

| Estructura detectada | Fórmula ST |
|---|---|
| Condicional (si A entonces B) | `A -> B` |
| Bicondicional (A si y solo si B) | `A <-> B` |
| Conjunción (A y B) | `A & B` |
| Disyunción (A o B) | `A \| B` |
| Negación (no A) | `!A` |
| Universal (todo x, A) | `forall x A(x)` |
| Existencial (existe x, A) | `exists x A(x)` |
| Necesidad (necesariamente A) | `[]A` |
| Posibilidad (posiblemente A) | `<>A` |
| Temporal-next (después A) | `next A` |
| Temporal-until (A hasta B) | `A until B` |
| Modus Ponens detectado | `axiom + derive` |
| Silogismo detectado | `axiom + axiom + derive` |

### 4.5 ST Generator — Generación de código

Produce código ST válido y legible con trazabilidad:

```st
// ═══════════════════════════════════════
// Formalización automática — autologic v1.0
// Perfil: classical.propositional
// Idioma: es
// ═══════════════════════════════════════

logic classical.propositional

// ── Proposiciones atómicas ────────────
interpret "llueve" as LLUEVE
interpret "la calle se moja" as CALLE_MOJADA

// ── Estructura argumental ─────────────
// Patrón detectado: Modus Ponens

// Premisa 1 (condicional): "Si llueve, entonces la calle se moja"
axiom regla_1 : LLUEVE -> CALLE_MOJADA

// Premisa 2 (hecho): "Dado que está lloviendo"
axiom hecho_1 : LLUEVE

// Conclusión: "la calle está mojada"
derive CALLE_MOJADA from {regla_1, hecho_1}

// ── Verificación ──────────────────────
check valid (LLUEVE -> CALLE_MOJADA)
```

### 4.6 Pattern Detector — Detección de patrones argumentales

Analiza la estructura global para detectar patrones lógicos conocidos:

| Patrón | Condición de detección |
|---|---|
| **Modus Ponens** | premisa condicional (A→B) + premisa hecho (A) + conclusión (B) |
| **Modus Tollens** | premisa condicional (A→B) + premisa negación (!B) + conclusión (!A) |
| **Silogismo Hipotético** | A→B + B→C → A→C |
| **Silogismo Disyuntivo** | A∨B + !A → B |
| **Dilema constructivo** | (A→B) & (C→D) + (A∨C) → (B∨D) |
| **Reductio ad absurdum** | Asunción + derivación de contradicción |
| **Cadena condicional** | Múltiples condicionales encadenadas |
| **Generalización universal** | Múltiples instancias del mismo patrón |

---

## 5. Estructura del Proyecto

```
autologic/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── README.md
├── LICENSE
├── src/
│   ├── index.ts                    # Exports públicos
│   ├── autologic.ts                # Clase facade principal
│   ├── formalize.ts                # Función stateless formalize()
│   ├── types.ts                    # Todos los tipos
│   │
│   ├── segmenter/
│   │   ├── index.ts                # Orquestador de segmentación
│   │   ├── sentence-splitter.ts    # Divide por puntuación
│   │   └── clause-splitter.ts      # Divide cláusulas internas
│   │
│   ├── discourse/
│   │   ├── index.ts                # Analizador discursivo
│   │   ├── markers-es.ts           # Diccionario español (~100 marcadores)
│   │   ├── markers-en.ts           # Diccionario inglés (~100 marcadores)
│   │   ├── role-classifier.ts      # Asigna roles a cláusulas
│   │   └── pattern-detector.ts     # Detecta patrones argumentales
│   │
│   ├── atoms/
│   │   ├── index.ts                # Extractor de átomos
│   │   ├── keyword-extractor.ts    # Extrae palabras clave (stopwords)
│   │   ├── identifier-gen.ts       # Genera IDs ST válidos
│   │   └── coreference.ts          # Resolución básica coreferencia
│   │
│   ├── formula/
│   │   ├── index.ts                # Orquestador de fórmulas
│   │   ├── propositional.ts        # Builder propositional
│   │   ├── first-order.ts          # Builder first-order (predicados)
│   │   ├── modal.ts                # Builder modal
│   │   ├── temporal.ts             # Builder temporal
│   │   └── connectors.ts           # Mapa marcador → operador ST
│   │
│   ├── generator/
│   │   ├── index.ts                # Generador ST
│   │   ├── st-emitter.ts           # Emite código fuente ST
│   │   └── validator.ts            # Valida con st-lang parse()
│   │
│   └── nlp/
│       ├── index.ts                # Utilidades NLP
│       ├── tokenizer.ts            # Tokenización básica
│       ├── stemmer-es.ts           # Stemmer español (Snowball)
│       ├── stemmer-en.ts           # Stemmer inglés
│       └── stopwords.ts            # Listas de stopwords ES/EN
│
└── tests/
    ├── segmenter.test.ts
    ├── discourse.test.ts
    ├── atoms.test.ts
    ├── formula.test.ts
    ├── generator.test.ts
    ├── patterns.test.ts
    ├── integration.test.ts         # End-to-end
    ├── profiles.test.ts            # Cada perfil lógico
    └── fixtures/
        ├── texts-es.ts             # Textos de prueba español
        ├── texts-en.ts             # Textos de prueba inglés
        └── expected-outputs.ts     # Salidas ST esperadas
```

---

## 6. Dependencias

```json
{
  "peerDependencies": {
    "@stevenvo780/st-lang": ">=3.0.0"
  },
  "dependencies": {
  },
  "devDependencies": {
    "typescript": "^5.5",
    "vitest": "^2.0",
    "@stevenvo780/st-lang": "^3.0.0"
  }
}
```

**Nota**: Sin `compromise.js`. El NLP se implementa internamente con:
- **Stemmer Snowball** para español/inglés (algoritmo publicado, ~200 líneas)
- **Stopwords** curadas (~150 palabras por idioma)
- **Diccionario de marcadores discursivos** (~200 entradas)
- **Tokenizador** basado en regex

Esto mantiene **0 dependencias runtime** (solo peerDep de st-lang), haciendo la librería ultraligera (~30KB minified).

---

## 7. Ejemplos de Uso por Perfil

### 7.1 `classical.propositional`

**Entrada**:
```
"Si los precios suben, la demanda baja. Los precios están subiendo.
Por lo tanto, la demanda bajará."
```

**Salida ST**:
```st
logic classical.propositional

interpret "los precios suben" as PRECIOS_SUBEN
interpret "la demanda baja" as DEMANDA_BAJA

// Patrón: Modus Ponens
axiom regla : PRECIOS_SUBEN -> DEMANDA_BAJA
axiom hecho : PRECIOS_SUBEN
derive DEMANDA_BAJA from {regla, hecho}
```

### 7.2 `classical.first_order`

**Entrada**:
```
"Todo humano es mortal. Sócrates es humano. Por tanto, Sócrates es mortal."
```

**Salida ST**:
```st
logic classical.first_order

interpret "todo humano es mortal" as forall x (Humano(x) -> Mortal(x))
interpret "Sócrates es humano" as Humano(socrates)

axiom a1 : forall x (Humano(x) -> Mortal(x))
axiom a2 : Humano(socrates)
derive Mortal(socrates) from {a1, a2}
```

### 7.3 `modal.k`

**Entrada**:
```
"Es necesario que las leyes se cumplan. Si las leyes se cumplen,
posiblemente la sociedad prospera."
```

**Salida ST**:
```st
logic modal.k

interpret "las leyes se cumplen" as LEYES_CUMPLEN
interpret "la sociedad prospera" as SOCIEDAD_PROSPERA

axiom a1 : [](LEYES_CUMPLEN)
axiom a2 : LEYES_CUMPLEN -> <>(SOCIEDAD_PROSPERA)
```

### 7.4 `deontic.standard`

**Entrada**:
```
"Es obligatorio pagar impuestos. Si pagas impuestos, está permitido votar."
```

**Salida ST**:
```st
logic deontic.standard

interpret "pagar impuestos" as PAGAR_IMPUESTOS
interpret "votar" as VOTAR

axiom obligacion : [](PAGAR_IMPUESTOS)
axiom permiso : PAGAR_IMPUESTOS -> <>(VOTAR)
```

### 7.5 `temporal.ltl`

**Entrada**:
```
"Después de estudiar, habrá un examen. El estudio continúa hasta que
se apruebe."
```

**Salida ST**:
```st
logic temporal.ltl

interpret "estudiar" as ESTUDIAR
interpret "examen" as EXAMEN
interpret "aprobar" as APROBAR

axiom a1 : ESTUDIAR -> next EXAMEN
axiom a2 : ESTUDIAR until APROBAR
```

---

## 8. Integración con EducacionCooperativa

### Antes (actual): `buildSTFromSemantic.ts`
- ~300 líneas de lógica ad-hoc
- Split por puntuación bruta
- Solo genera `interpret` + `define`
- Sin detección de estructura argumental

### Después: Importar autologic
```typescript
import { Autologic } from '@stevenvo780/autologic';
import { evaluate } from '@stevenvo780/st-lang/api';

const al = new Autologic({ language: 'es' });

function buildSTFromSemantic(state, docName) {
  const parts = state.concepts.map(concept => {
    const text = getFullText(concept, state.fragments);
    const result = al.formalize(text, {
      profile: concept.logicProfile || 'classical.propositional',
      atomStyle: 'keywords',
    });
    return result.stCode;
  });

  return parts.join('\n\n');
}

// También se puede usar para definiciones individuales:
function formalizeDefinition(text, profile) {
  const result = al.formalize(text, { profile });
  
  // Validar que el ST generado es ejecutable
  const stResult = evaluate(result.stCode);
  
  return {
    stCode: result.stCode,
    analysis: result.analysis,
    isValid: stResult.ok,
  };
}
```

---

## 9. Roadmap de Implementación

### Fase 1 — Core MVP (semana 1-2)
- [ ] Scaffold del proyecto (package.json, tsconfig, vitest)
- [ ] `types.ts` — Todos los tipos
- [ ] `segmenter/` — Sentence + clause splitting
- [ ] `discourse/markers-es.ts` — Diccionario español (60+ marcadores)
- [ ] `discourse/role-classifier.ts` — Clasificación básica
- [ ] `atoms/keyword-extractor.ts` + `identifier-gen.ts`
- [ ] `formula/propositional.ts` — Builder propositional
- [ ] `generator/st-emitter.ts` — Generador ST básico
- [ ] Tests de integración con textos simples
- [ ] Publicar v0.1.0

### Fase 2 — Multi-perfil (semana 3-4)
- [ ] `formula/first-order.ts` — Cuantificadores y predicados
- [ ] `formula/modal.ts` — Operadores modales
- [ ] `formula/temporal.ts` — Operadores temporales
- [ ] `discourse/markers-en.ts` — Soporte inglés
- [ ] `discourse/pattern-detector.ts` — Detección de MP, MT, silogismos
- [ ] `atoms/coreference.ts` — Resolución de coreferencia
- [ ] `nlp/stemmer-es.ts` — Stemmer Snowball español
- [ ] Tests exhaustivos por perfil
- [ ] Publicar v0.2.0

### Fase 3 — Integración + polish (semana 5-6)
- [ ] Refactorizar `buildSTFromSemantic.ts` para usar autologic
- [ ] `generator/validator.ts` — Validación con st-lang
- [ ] Clase `Autologic` con sesión persistente
- [ ] Documentación README completa con ejemplos
- [ ] API `analyze()` standalone
- [ ] Publicar v1.0.0

---

## 10. Decisiones de Diseño Clave

| Decisión | Razón |
|---|---|
| **Sin IA/ML** | Determinismo, reproducibilidad, zero latencia, zero costo |
| **0 deps runtime** | Librería ultraligera (~30KB), sin supply-chain risk |
| **Stemmer interno** | Snowball es un algoritmo público, ~200 LOC |
| **Bilingüe ES/EN** | La plataforma es educativa hispana pero con textos mixtos |
| **st-lang como peerDep** | El consumidor ya la tiene; evita duplicación |
| **Stateless + Stateful** | `formalize()` para uso simple, `Autologic` para sesiones |
| **Pipeline modular** | Cada paso es testeable independientemente |
| **Marcadores como datos** | Fácil de extender sin tocar lógica |

---

## 11. Métricas de Éxito

1. **Formalización correcta** de argumentos simples (condicional, conjunción, disyunción) > 90%
2. **Detección de patrones** (Modus Ponens, silogismos) > 80% en textos estructurados
3. **Código ST válido** (pasa `st-lang parse()`) en 100% de outputs
4. **Bundle size** < 50KB minified
5. **Zero dependencias runtime** (solo peerDep de st-lang)
6. **Cobertura de tests** > 85%
