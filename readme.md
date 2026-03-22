# autologic

> Formalizador automático de texto natural a lógica formal ST, sin IA.

`@stevenvo780/autologic` es una librería NPM que toma texto en lenguaje natural y un perfil lógico y produce código ST válido y ejecutable. Usa NLP basado en reglas (marcadores discursivos, puntuación, stemming) — **sin modelos de IA, sin APIs externas, sin redes neuronales**.

```
Texto Natural + Perfil  ──▶  autologic  ──▶  Código ST (.st) válido
                                 │
                                 ▼
                        @stevenvo780/st-lang
```

---

## Instalación

```bash
npm install @stevenvo780/autologic
# peerDep requerida:
npm install @stevenvo780/st-lang
```

---

## Uso rápido

```typescript
import { formalize } from '@stevenvo780/autologic';

const result = formalize(
  "Si llueve, entonces la calle se moja. Dado que está lloviendo, la calle está mojada.",
  { profile: 'classical.propositional', language: 'es' }
);

console.log(result.ok);          // true
console.log(result.stCode);
// logic classical.propositional
// interpret "llueve" as LLUEVE
// interpret "la calle se moja" as CALLE_MOJADA
// axiom regla_1 : LLUEVE -> CALLE_MOJADA
// axiom hecho_1 : LLUEVE
// derive CALLE_MOJADA from {regla_1, hecho_1}

console.log(result.analysis.detectedPatterns);
// ["modus_ponens"]
```

### Con estado (sesiones)

```typescript
import { Autologic } from '@stevenvo780/autologic';

const al = new Autologic({ language: 'es', defaultProfile: 'classical.propositional' });

// Formalizar
const r1 = al.formalize("Todo humano es mortal. Sócrates es humano.");

// Solo analizar sin generar ST
const analysis = al.analyze("Si P entonces Q, pero no Q, luego no P.");

// Validar ST existente
const validation = al.validate("logic classical.propositional\ncheck valid (P -> P)");

// Marcadores personalizados
al.addMarker({ text: 'se sigue que', role: 'conclusion', language: 'es' });
```

---

## API

### `formalize(text, options?): FormalizationResult`

Función stateless principal.

| Opción | Tipo | Default | Descripción |
|---|---|---|---|
| `profile` | `LogicProfile` | `'classical.propositional'` | Perfil lógico ST |
| `language` | `'es' \| 'en'` | `'es'` | Idioma del texto |
| `atomStyle` | `'keywords' \| 'letters' \| 'numbered'` | `'keywords'` | Cómo nombrar proposiciones |
| `includeComments` | `boolean` | `true` | Comentarios de trazabilidad en ST |
| `validateOutput` | `boolean` | `true` | Valida y ejecuta con st-lang |
| `maxClauseDepth` | `number` | `3` | Profundidad máxima de subdivisión |

**Resultado**:

```typescript
interface FormalizationResult {
  ok: boolean;                    // true si no hubo errores
  stCode: string;                 // Código ST completo y válido
  analysis: DiscourseAnalysis;    // Análisis intermedio
  atoms: Map<string, string>;     // atomId → texto original
  formulas: FormulaEntry[];       // Fórmulas generadas
  diagnostics: Diagnostic[];      // Warnings/errores
  stValidation?: { ok: boolean; errors: string[] };
}
```

### `class Autologic`

Wrapper con estado para sesiones persistentes.

| Método | Descripción |
|---|---|
| `formalize(text, options?)` | Formaliza y guarda en historial |
| `analyze(text, language?)` | Solo análisis discursivo, sin ST |
| `validate(stCode)` | Valida código ST existente |
| `addMarker(marker)` | Agrega marcador discursivo personalizado |
| `getHistory()` | Historial de formalizaciones |
| `setConfig(config)` | Actualiza configuración |

---

## Perfiles lógicos

| Perfil | Caso de uso |
|---|---|
| `classical.propositional` | Argumentos con conectores básicos (→, ∧, ∨, ¬) |
| `classical.first_order` | Predicados y cuantificadores (∀x, ∃x) |
| `modal.k` | Necesidad (`[]`) y posibilidad (`<>`) |
| `deontic.standard` | Obligaciones, permisos, prohibiciones |
| `epistemic.s5` | Conocimiento y creencia |
| `intuitionistic.propositional` | Sin ley del tercero excluido |
| `temporal.ltl` | `next`, `until` — razonamiento sobre secuencias |
| `paraconsistent.belnap` | Tolerante a inconsistencias |
| `aristotelian.syllogistic` | Silogística clásica (Todo A es B) |
| `probabilistic.basic` | Razonamiento con grados de certeza |
| `arithmetic` | Expresiones aritméticas explicadas |

---

## Ejemplos por perfil

### `classical.propositional` — Modus Ponens

```typescript
formalize(
  "Si los precios suben, la demanda baja. Los precios están subiendo. Por lo tanto, la demanda bajará.",
  { profile: 'classical.propositional' }
)
```

```st
logic classical.propositional

interpret "los precios suben" as PRECIOS_SUBEN
interpret "la demanda baja" as DEMANDA_BAJA

// Patrón: Modus Ponens
axiom regla : PRECIOS_SUBEN -> DEMANDA_BAJA
axiom hecho : PRECIOS_SUBEN
derive DEMANDA_BAJA from {regla, hecho}
```

### `classical.first_order` — Silogismo

```typescript
formalize(
  "Todo humano es mortal. Sócrates es humano. Por tanto, Sócrates es mortal.",
  { profile: 'classical.first_order' }
)
```

```st
logic classical.first_order

interpret "todo humano es mortal" as forall x (Humano(x) -> Mortal(x))
interpret "Sócrates es humano" as Humano(socrates)

axiom a1 : forall x (Humano(x) -> Mortal(x))
axiom a2 : Humano(socrates)
derive Mortal(socrates) from {a1, a2}
```

### `modal.k` — Necesidad y posibilidad

```typescript
formalize(
  "Es necesario que las leyes se cumplan. Si las leyes se cumplen, posiblemente la sociedad prospera.",
  { profile: 'modal.k' }
)
```

```st
logic modal.k

interpret "las leyes se cumplen" as LEYES_CUMPLEN
interpret "la sociedad prospera" as SOCIEDAD_PROSPERA

axiom a1 : [](LEYES_CUMPLEN)
axiom a2 : LEYES_CUMPLEN -> <>(SOCIEDAD_PROSPERA)
```

### `temporal.ltl` — Secuencias temporales

```typescript
formalize(
  "Después de estudiar, habrá un examen. El estudio continúa hasta que se apruebe.",
  { profile: 'temporal.ltl' }
)
```

```st
logic temporal.ltl

interpret "estudiar" as ESTUDIAR
interpret "examen" as EXAMEN
interpret "aprobar" as APROBAR

axiom a1 : ESTUDIAR -> next EXAMEN
axiom a2 : ESTUDIAR until APROBAR
```

---

## Pipeline interno

```
Texto natural
     │
     ▼
1. SEGMENTER        Divide en oraciones y cláusulas
     │              (puntuación + marcadores discursivos)
     ▼
2. DISCOURSE        Clasifica roles: premisa, conclusión,
   ANALYZER         condición, consecuente
     │              Detecta negaciones y cuantificadores
     ▼
3. ATOM EXTRACTOR   Extrae proposiciones atómicas
     │              Genera IDs simbólicos (LLUEVE, CALLE_MOJADA)
     │              Resolución básica de correferencia
     ▼
4. FORMULA BUILDER  Construye fórmulas según perfil lógico
     │              A->B, A&B, forall x P(x), []A, next A...
     ▼
5. ST GENERATOR     Emite código ST con comentarios y trazabilidad
     │
     ▼
6. VALIDATOR        Valida con st-lang parse() + ejecución
   (opcional)
```

### Marcadores discursivos (~200 bilingüe)

| Categoría | Español | English | Rol |
|---|---|---|---|
| Condicional | si, siempre que, en caso de | if, whenever, provided that | `condition` |
| Consecuente | entonces, por lo tanto, luego | then, therefore, hence | `consequent` |
| Premisa | dado que, puesto que, ya que | since, because, given that | `premise` |
| Conjunción | y, además, también | and, moreover, furthermore | `and` |
| Disyunción | o, o bien | or, either...or | `or` |
| Adversativa | pero, sin embargo, aunque | but, however, although | `adversative` |
| Negación | no, nunca, ningún | not, never, neither | `negation` |
| Universal | todo, cada, cualquier | all, every, each | `universal` |
| Existencial | algún, existe, hay | some, there exists | `existential` |
| Modal-necesidad | necesariamente, debe | necessarily, must | `necessity` |
| Modal-posibilidad | posiblemente, puede, quizás | possibly, may, perhaps | `possibility` |
| Bicondicional | si y solo si | if and only if, iff | `biconditional` |
| Temporal | después, antes, hasta que | after, before, until | `temporal` |

### Patrones argumentales detectados

| Patrón | Condición |
|---|---|
| Modus Ponens | (A→B) + A → B |
| Modus Tollens | (A→B) + ¬B → ¬A |
| Silogismo Hipotético | A→B + B→C → A→C |
| Silogismo Disyuntivo | A∨B + ¬A → B |
| Cadena condicional | Múltiples condicionales encadenadas |
| Generalización universal | Múltiples instancias del mismo patrón |

---

## Estructura del proyecto

```
autologic/
├── src/
│   ├── index.ts              # Exports públicos
│   ├── autologic.ts          # Clase Autologic (facade)
│   ├── formalize.ts          # Función formalize() stateless
│   ├── types.ts              # Tipos completos
│   ├── segmenter/            # Segmentación de oraciones y cláusulas
│   ├── discourse/            # Análisis discursivo + marcadores ES/EN
│   ├── atoms/                # Extracción de átomos + correferencia
│   ├── formula/              # Builders por perfil lógico
│   ├── generator/            # Emisor ST + validador
│   └── nlp/                  # Tokenizador, stemmers ES/EN, stopwords
└── tests/
    ├── segmenter.test.ts
    ├── discourse.test.ts
    ├── atoms.test.ts
    ├── formula.test.ts
    ├── patterns.test.ts
    ├── profiles.test.ts
    └── fixtures/
```

---

## Dependencias

**Runtime**: ninguna (0 dependencias).

**peerDependencies**:
- `@stevenvo780/st-lang >= 3.0.0` (validación y ejecución de ST)

**NLP propio** (no usa compromise.js ni spaCy):
- Stemmer Snowball ES/EN (~200 líneas)
- Stopwords curadas (~150 palabras/idioma)
- Diccionario de marcadores discursivos (~200 entradas)
- Tokenizador basado en regex

Tamaño: ~30 KB minificado.

---

## Tests

```bash
npm test              # vitest
npm run test:coverage # con reporte de cobertura
```

Cobertura objetivo: >85% (reporte en `coverage/`).

---

## Decisiones de diseño

| Decisión | Razón |
|---|---|
| Sin IA/ML | Determinismo, reproducibilidad, latencia cero, costo cero |
| 0 deps runtime | Librería ultraligera, sin supply-chain risk |
| Bilingüe ES/EN | Plataforma educativa hispana con textos mixtos |
| st-lang como peerDep | El consumidor ya la tiene; evita duplicación |
| Stateless + Stateful | `formalize()` para uso simple, `Autologic` para sesiones |
| Pipeline modular | Cada etapa es testeable y sustituible independientemente |
| Marcadores como datos | Extensible sin tocar lógica del pipeline |

---

## Integración con EducacionCooperativa

La plataforma EducacionCooperativa usa autologic en `src/lib/buildSTFromSemantic.ts` para convertir automáticamente el contenido de la Mesa Semántica a código ST ejecutable.

```typescript
import { formalize } from '@stevenvo780/autologic';

// Para cada concepto del workspace semántico:
const result = formalize(conceptText, {
  profile: concept.logicProfile || 'classical.propositional',
  language: 'es',
  atomStyle: 'keywords',
});

if (result.ok) {
  // Usa result.stCode directamente
}
```

Ver `docs/formalizacion-automatica.md` en EducacionCooperativa para la documentación del flujo completo.

---

## Licencia

Ver [LICENSE](LICENSE).
