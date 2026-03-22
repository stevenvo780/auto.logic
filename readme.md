# autologic

> Formalizador automático de texto natural a lógica formal ST, sin IA obligatoria.

`@stevenvo780/autologic` toma texto en lenguaje natural y produce código ST válido y ejecutable. Soporta **dos modos**:

- **Modo reglas** (sin IA): NLP basado en marcadores discursivos, stemming y coreferencia.
- **Modo LLM/SLM**: extracción semántica vía OpenAI, Ollama o modelo local ONNX.

En ambos casos el pipeline incluye pre-validación con el **NL Linter** y genera código ST compatible con `@stevenvo780/st-lang`.

```
Texto Natural
     │
     ▼
 NL Linter ──(errores)──▶ Abortar con diagnóstico
     │
     ▼ (texto válido)
 ┌─────────────────────────────────────────┐
 │  Modo reglas         │  Modo LLM/SLM    │
 │  (NLP determinista)  │  (OpenAI/Ollama/ │
 │                      │   SLM local)     │
 └──────────┬───────────┴──────┬───────────┘
            │                  │
            ▼                  ▼
         Pipeline NLP       AST JSON → compileAST()
            │                  │
            └──────────┬───────┘
                       ▼
              ST Generator (emitST)
                       │
                       ▼
              Validación + Ejecución (st-lang)
                       │
                       ▼
              FormalizationResult
```

---

## Instalación

```bash
npm install @stevenvo780/autologic
# peerDep requerida:
npm install @stevenvo780/st-lang
```

---

## Uso rápido — Modo reglas

```typescript
import { formalize } from '@stevenvo780/autologic';

const result = formalize(
  "Si llueve, entonces la calle se moja. Dado que está lloviendo, la calle está mojada.",
  { profile: 'classical.propositional', language: 'es' }
);

console.log(result.ok);           // true
console.log(result.stCode);       // código ST completo
console.log(result.analysis.detectedPatterns); // ["modus_ponens"]
console.log(result.stExecution?.ok);           // true (ejecutado con st-lang)
```

## Uso con LLM — Modo inferencia

```typescript
import { formalizeWithLLM } from '@stevenvo780/autologic';

const result = await formalizeWithLLM(
  "Es obligatorio pagar impuestos. Si pagas impuestos está permitido votar.",
  {
    profile: 'deontic.standard',
    language: 'es',
    llmConfig: { provider: 'openai', apiKey: process.env.OPENAI_KEY! }
  }
);

// result.linterDiagnostics  — pre-validación NL Linter
// result.llmRawAst          — AST JSON crudo devuelto por el LLM
// result.stCode             — código ST generado
```

## Uso con modelo local ONNX (sin API externa)

```typescript
const result = await formalizeWithLLM(text, {
  profile: 'classical.propositional',
  llmConfig: {
    provider: 'web-distilled',
    apiKey: '',
    // Si se omite endpoint, descarga stevenvo780/autologic-slm-onnx de HuggingFace (~2.4 GB)
    endpoint: '/models/autologic-slm'  // ruta local opcional
  }
});
```

El modelo local usa `@huggingface/transformers` con ONNX runtime en el browser o Node. El modelo `stevenvo780/autologic-slm-onnx` es un Qwen2.5-0.5B fine-tuneado para traducir texto a AST JSON.

## Clase con estado

```typescript
import { Autologic } from '@stevenvo780/autologic';

const al = new Autologic({ language: 'es', defaultProfile: 'classical.propositional' });

const r1 = al.formalize("Todo humano es mortal. Sócrates es humano.");
const analysis = al.analyze("Si P entonces Q, pero no Q, luego no P.");
const validation = al.validate("logic classical.propositional\ncheck valid (P -> P)");
al.addMarker({ text: 'se sigue que', role: 'conclusion', language: 'es' });
```

---

## API pública

### `formalize(text, options?): FormalizationResult`

Función stateless — modo reglas NLP.

| Opción | Tipo | Default | Descripción |
|---|---|---|---|
| `profile` | `LogicProfile` | `'classical.propositional'` | Perfil lógico ST |
| `language` | `'es' \| 'en'` | `'es'` | Idioma del texto |
| `atomStyle` | `'keywords' \| 'letters' \| 'numbered'` | `'keywords'` | Nombres para átomos |
| `includeComments` | `boolean` | `true` | Comentarios de trazabilidad |
| `validateOutput` | `boolean` | `true` | Valida y ejecuta con st-lang |
| `maxClauseDepth` | `number` | `3` | Profundidad máxima de cláusulas |

### `formalizeWithLLM(text, options): Promise<FormalizationLLMResult>`

Modo doble capa: NL Linter → LLM/SLM → AST → ST.

```typescript
interface FormalizeWithLLMOptions extends FormalizeOptions {
  llmConfig: LLMConfig;
  abortOnLinterErrors?: boolean;  // default: true
}

interface FormalizationLLMResult extends FormalizationResult {
  linterDiagnostics: NLLinterDiagnostic[];
  llmRawAst?: LLMParsedResult;
}
```

### `lintNaturalLanguage(text, rules?): NLLinterDiagnostic[]`

Valida texto natural antes de formalizar. Detecta problemas que reducen la calidad de la formalización.

```typescript
import { lintNaturalLanguage } from '@stevenvo780/autologic';

const diags = lintNaturalLanguage("Frecuentemente, este caso produce errores.");
// [
//   { id: 'nl-fuzzy-quantifier', severity: 'error', message: "Término difuso 'Frecuentemente'...", start: 0, end: 13 },
//   { id: 'nl-anaphoric-ambiguity', severity: 'warning', message: "El pronombre 'este'...", start: 15, end: 19 }
// ]
```

### `parseTextWithLLM(text, profile, config): Promise<LLMParsedResult>`

Llama directamente a la API del LLM y retorna el AST JSON crudo.

### `llmResultToST(result): { formula, type }[]`

Convierte el AST JSON del LLM a líneas de código ST.

### Resultado completo

```typescript
interface FormalizationResult {
  ok: boolean;
  stCode: string;
  analysis: DiscourseAnalysis;
  atoms: Map<string, string>;       // atomId → texto original
  formulas: FormulaEntry[];
  diagnostics: Diagnostic[];
  stValidation?: { ok: boolean; errors: string[] };
  stExecution?: STExecutionResult;  // resultado real de ejecutar con st-lang
}

interface STExecutionResult {
  ok: boolean;
  exitCode: number;
  timedOut: boolean;
  durationMs: number;
  errors: string[];
  resultStatuses: string[];         // ["valid", "derivable", ...]
}
```

---

## NL Linter

El NL Linter es una capa de pre-validación que analiza el texto natural antes de enviarlo a formalización. Se ejecuta automáticamente en `formalizeWithLLM()` y puede usarse de forma independiente.

Cuatro reglas integradas (`DEFAULT_RULES`):

| ID | Severidad | Qué detecta |
|---|---|---|
| `nl-anaphoric-ambiguity` | warning | Pronombres anafóricos: "este", "ese", "lo anterior", "su" — ambigüedad referencial |
| `nl-cognitive-density` | warning | Oraciones de más de 40 palabras — el contexto semántico pierde precisión |
| `nl-fuzzy-quantifier` | **error** | Cuantificadores difusos: "frecuentemente", "la mayoría", "a veces", "probablemente" |
| `nl-missing-relations` | warning | Textos > 60 chars sin conectores de inferencia ("si... entonces", "por lo tanto") |

Los errores de severidad `error` abortan `formalizeWithLLM` por defecto (configurable con `abortOnLinterErrors: false`).

```typescript
import { lintNaturalLanguage, DEFAULT_RULES, anaphoricRule } from '@stevenvo780/autologic';

// Usar solo reglas específicas:
const diags = lintNaturalLanguage(text, [anaphoricRule]);
```

Cada `NLLinterDiagnostic` incluye `{ id, severity, message, start, end }` con la posición exacta en el texto.

---

## Configuración del LLM

```typescript
interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'gemini' | 'custom' | 'ollama' | 'web-distilled';
  apiKey: string;
  endpoint?: string;   // URL personalizada
  model?: string;      // modelo específico
}
```

| Provider | Descripción | Default model |
|---|---|---|
| `openai` | API OpenAI (fetch isomórfico) | `gpt-4o` |
| `ollama` | Servidor Ollama local con GPU | `qwen2.5:7b` |
| `web-distilled` | Modelo ONNX local vía @huggingface/transformers | `stevenvo780/autologic-slm-onnx` |

El LLM recibe un **system prompt** que le instruye a actuar como parser AST situado. No debe resolver la lógica, solo extraer claims y relaciones. Devuelve un JSON con la interfaz `LLMParsedResult`:

```typescript
interface LLMParsedResult {
  axioms: Array<{ name: string; formulaJSON: LogicNode }>;
  conclusions: Array<{ formulaJSON: LogicNode }>;
}
```

---

## Sistema AST

autologic incluye un sistema de tipos AST completo para representar fórmulas lógicas de forma programática, independiente del texto.

### Nodos disponibles

```typescript
// Átomos proposicionales
AST.atom('LLUEVE', 'llueve')

// Conectivos
AST.and(left, right)
AST.or(left, right)
AST.implies(left, right)
AST.not(child)

// Cuantificadores
AST.forall(['x'], child)
AST.exists(['x'], child)
AST.exactlyN(['x', 'y'], 2, child)   // Exactamente N instancias

// Modales (con soporte multi-agente)
AST.modal('K', child, 'Diego')       // K_Diego(child)
AST.modal('B', child)                // Belief
AST.modal('O', child)                // Obligation
AST.modal('P', child)                // Permission
AST.modal('F', child)                // Forbidden
AST.modal('BOX', child)              // Necesidad
AST.modal('DIA', child)              // Posibilidad
AST.modal('EVENTUALLY', child)       // Temporal F
AST.modal('NEXT', child)             // Temporal X

// Temporal binario
AST.temporalUntil(left, right)       // left U right

// Primer orden
AST.predicate('Humano', [AST.obj('x')])
AST.forall(['x'], AST.implies(AST.predicate('Humano', [AST.obj('x')]), ...))

// Matemáticas
AST.math('ADD', AST.obj('x'), AST.obj('y'))
AST.math('LT', left, AST.obj('100'))

// Probabilidad
AST.probability(0.755, child)        // Pr(child) = 0.755

// DRT - referencias
AST.ref('s1')                        // Referencia a enunciado anterior (DRT)
```

### Compilar AST a ST

```typescript
import { compileAST, AST } from '@stevenvo780/autologic/formula/ast-compiler';

const ast = AST.implies(
  AST.predicate('Humano', [AST.obj('x')]),
  AST.predicate('Mortal', [AST.obj('x')])
);

compileAST(ast); // "Humano(x) -> Mortal(x)"
```

---

## DRT — Discourse Reference Theory

`DiscourseState` mantiene un registro de enunciados en orden para resolver referencias anafóricas complejas (pronombres como "esto", "lo anterior").

```typescript
import { globalDrt } from '@stevenvo780/autologic/context/discourse-state';

// El estado global registra cada enunciado formalizado
const id = globalDrt.registerStatement(astNode);  // "s1", "s2", ...
globalDrt.resolvePronoun('esto');      // → "s1" (último enunciado)
globalDrt.resolvePronoun('lo anterior'); // → "s1"
```

Se usa internamente en `compiler-frontend.ts` para casos como:
- "Ana aprueba el balance. Diego **sabe esto**." → K_Diego(ANA_APRUEBA_BALANCE)
- "El servidor colapsó. El administrador sabe esto. El CEO cree que **lo ignora**."

---

## Compiler Frontend

`compileComplexLogic()` es un compilador especializado para textos con estructura lógica compleja que el pipeline NLP genérico no puede manejar. Cubre casos extremos por perfil:

| Caso | Perfil | Ejemplo |
|---|---|---|
| "Ningún X es Y, excepto Z" | `aristotelian` | `forall x (M(x) -> !H(x)) & H(Ornitorrinco)` |
| "Exactamente N..." | `classical.first_order` | Cuantificación exacta con desigualdades |
| Expresiones matemáticas | `arithmetic` | Delega a `extractMath()` |
| Obligación con excepción | `deontic.standard` | `SystemaFalla -> (O(Reiniciar) & (Prohibe -> F(Reiniciar)))` |
| Conocimiento multi-agente | `epistemic.s5` | `K_Diego(P) & B_Carlos(!K_Diego(P))` |
| Contradicción explícita | `paraconsistent` | `Recibido() & !Recibido()` |
| Probabilidad numérica | `probabilistic` | `Pr(FallaMecanica) = 0.755` |
| Doble negación | `intuitionistic` | `!!TenemosSoluciones` |
| Eventualmente / Until | `temporal` | `F_temp(Alarma) & (Alarma U Pin)` |

Devuelve `null` si el texto no corresponde a ningún caso extremo conocido, dejando que el pipeline normal continúe.

---

## Math Parser

`extractMath()` detecta y extrae expresiones matemáticas del texto, protegiéndolas para que el pipeline NLP no las interprete como proposiciones.

```typescript
import { extractMath } from '@stevenvo780/autologic/atoms/math-parser';

const { nodes, shieldedText } = extractMath(
  "Si al cuadrado de X le sumas la variable Y, el resultado será siempre menor a 100."
);
// nodes: Map { "__MATH_1__" → AST.math('LT', ADD(MUL(X,X), Y), 100) }
// shieldedText: "Si __MATH_1__, ..."
```

Soporta:
- Expresiones algebraicas verbales ("al cuadrado de X le sumas Y")
- Ecuaciones simples (`x = y + 2`, `x = y - 3`)

---

## Perfiles lógicos

| Perfil | Caso de uso |
|---|---|
| `classical.propositional` | Conectores básicos (→, ∧, ∨, ¬). Default. |
| `classical.first_order` | Cuantificadores ∀x, ∃x, predicados |
| `modal.k` | Necesidad (`[]`), posibilidad (`<>`) |
| `deontic.standard` | Obligación (O), permiso (P), prohibición (F) |
| `epistemic.s5` | Conocimiento (K), creencia (B), multi-agente |
| `intuitionistic.propositional` | Sin tercero excluido |
| `temporal.ltl` | `next`, `until`, `G`, `F` |
| `paraconsistent.belnap` | Tolerante a contradicciones |
| `aristotelian.syllogistic` | Silogística clásica |
| `probabilistic.basic` | `Pr(X) = 0.75` |
| `arithmetic` | Operaciones aritméticas explicadas |

---

## Ejemplos por perfil

### `classical.propositional` — Modus Ponens

```
"Si los precios suben, la demanda baja. Los precios están subiendo. Por lo tanto, la demanda bajará."
```
```st
logic classical.propositional
interpret "los precios suben" as PRECIOS_SUBEN
interpret "la demanda baja" as DEMANDA_BAJA
axiom regla : PRECIOS_SUBEN -> DEMANDA_BAJA
axiom hecho : PRECIOS_SUBEN
derive DEMANDA_BAJA from {regla, hecho}
```

### `classical.first_order` — Silogismo

```
"Todo humano es mortal. Sócrates es humano. Por tanto, Sócrates es mortal."
```
```st
logic classical.first_order
axiom a1 : forall x (Humano(x) -> Mortal(x))
axiom a2 : Humano(socrates)
derive Mortal(socrates) from {a1, a2}
```

### `deontic.standard` — Normas

```
"Es obligatorio pagar impuestos. Si pagas impuestos, está permitido votar."
```
```st
logic deontic.standard
axiom obligacion : [](PAGAR_IMPUESTOS)
axiom permiso : PAGAR_IMPUESTOS -> <>(VOTAR)
```

### `epistemic.s5` — Conocimiento multi-agente (LLM)

```
"Ana aprueba el balance. Diego sabe esto. Carlos duda de lo anterior."
```
```st
logic epistemic.s5
axiom a1 : ANA_APRUEBA_BALANCE & K_Diego(ANA_APRUEBA_BALANCE) & B_Carlos(!K_Diego(ANA_APRUEBA_BALANCE))
```

### `probabilistic.basic`

```
"Existe exactamente un 75.5% de probabilidad de que el disco sufra una falla mecánica."
```
```st
logic probabilistic.basic
axiom a1 : Pr(FallaMecanica) = 0.755
```

---

## Pipeline interno (modo reglas)

```
1. Segmenter         Divide texto en oraciones y cláusulas
                     (puntuación + marcadores discursivos)
2. Discourse         Clasifica roles: premisa, conclusión,
   Analyzer          condición, consecuente
                     Detecta negaciones y cuantificadores
3. Atom Extractor    Extrae proposiciones atómicas → IDs
                     Correferencia léxica básica (Dice/Jaccard)
4. Formula Builder   Construye fórmulas por perfil
                     (A->B, forall x, []A, next A...)
5. ST Generator      Emite código ST con trazabilidad
6. Validator         valida parse + ejecuta con st-lang
```

### Marcadores discursivos (~200 bilingüe)

| Categoría | Español | English | Rol lógico |
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
| Modal-posibilidad | posiblemente, puede | possibly, may | `possibility` |
| Bicondicional | si y solo si | if and only if | `biconditional` |
| Temporal | después, antes, hasta que | after, before, until | `temporal` |

### Patrones argumentales detectados

| Patrón | Condición |
|---|---|
| `modus_ponens` | (A→B) + A → B |
| `modus_tollens` | (A→B) + ¬B → ¬A |
| `hypothetical_syllogism` | A→B + B→C → A→C |
| `disjunctive_syllogism` | A∨B + ¬A → B |
| `constructive_dilemma` | (A→B) & (C→D) + (A∨C) → (B∨D) |
| `conditional_chain` | Serie de condicionales encadenados |
| `universal_generalization` | Múltiples instancias del mismo patrón |
| `conjunction_introduction` | Varias premisas aisladas |
| `biconditional_introduction` | A si y solo si B |

---

## Estructura del proyecto

```
autologic/
├── src/
│   ├── index.ts                  # Exports públicos (API completa)
│   ├── autologic.ts              # Clase Autologic con estado
│   ├── formalize.ts              # formalize() y formalizeWithLLM()
│   ├── types.ts                  # Todos los tipos
│   ├── compiler-frontend.ts      # Casos extremos por perfil (AST directo)
│   ├── llm-parser.ts             # Parser LLM (OpenAI/Ollama/web-distilled)
│   ├── local-slm-web.ts          # Inferencia ONNX local (@huggingface/transformers)
│   │
│   ├── nl-linter/
│   │   ├── index.ts              # lintNaturalLanguage() + DEFAULT_RULES
│   │   ├── rules.ts              # 4 reglas: anaphoric, density, fuzzy, completeness
│   │   └── types.ts              # NLLinterDiagnostic, NLRule
│   │
│   ├── context/
│   │   └── discourse-state.ts    # DRT: DiscourseState + globalDrt
│   │
│   ├── formula/
│   │   ├── ast.ts                # Tipos AST + factory AST.*
│   │   ├── ast-compiler.ts       # compileAST() → código ST
│   │   ├── argument-builder.ts   # Constructor de argumentos
│   │   ├── connectors.ts         # Mapa marcador → operador ST
│   │   ├── first-order.ts        # Builder FOL
│   │   ├── modal.ts              # Builder modal
│   │   ├── propositional.ts      # Builder proposicional
│   │   ├── temporal.ts           # Builder temporal
│   │   ├── probabilistic.ts      # Builder probabilístico
│   │   ├── helpers.ts            # Utilidades
│   │   └── index.ts              # buildFormulas()
│   │
│   ├── atoms/
│   │   ├── index.ts              # extractAtoms()
│   │   ├── coreference.ts        # Resolución de correferencia
│   │   ├── identifier-gen.ts     # Generador de IDs ST válidos
│   │   ├── keyword-extractor.ts  # Extracción de palabras clave
│   │   └── math-parser.ts        # extractMath() — escudo matemático
│   │
│   ├── segmenter/
│   │   ├── index.ts              # segment()
│   │   ├── sentence-splitter.ts  # Split por puntuación
│   │   └── clause-splitter.ts    # Split de cláusulas internas
│   │
│   ├── discourse/
│   │   ├── index.ts              # analyzeDiscourse()
│   │   ├── markers-es.ts         # ~100 marcadores español
│   │   ├── markers-en.ts         # ~100 marcadores inglés
│   │   ├── role-classifier.ts    # Asigna roles a cláusulas
│   │   └── pattern-detector.ts   # Detecta patrones argumentales
│   │
│   ├── generator/
│   │   ├── index.ts
│   │   ├── st-emitter.ts         # emitST() — código ST con comentarios
│   │   └── validator.ts          # validateST(), executeST()
│   │
│   └── nlp/
│       ├── index.ts
│       ├── tokenizer.ts
│       ├── stemmer-es.ts         # Snowball español
│       ├── stemmer-en.ts         # Snowball inglés
│       └── stopwords.ts
│
└── tests/
    ├── segmenter.test.ts
    ├── discourse.test.ts
    ├── atoms.test.ts
    ├── formula.test.ts
    ├── patterns.test.ts
    └── profiles.test.ts
```

---

## Exports públicos (`index.ts`)

```typescript
// Funciones principales
export { formalize } from './formalize';
export { formalizeWithLLM } from './formalize';
export type { FormalizeWithLLMOptions, FormalizationLLMResult } from './formalize';

// NL Linter
export { lintNaturalLanguage, DEFAULT_RULES } from './nl-linter';
export type { NLLinterDiagnostic, NLRule } from './nl-linter';

// Clase con estado
export { Autologic } from './autologic';

// LLM
export { parseTextWithLLM, llmResultToST } from './llm-parser';
export type { LLMConfig, LLMParsedResult } from './llm-parser';

// Pipeline interno (uso avanzado)
export { segment } from './segmenter';
export { analyzeDiscourse } from './discourse';
export { extractAtoms } from './atoms';
export { buildFormulas } from './formula';
export { emitST } from './generator/st-emitter';
export { validateST } from './generator/validator';
```

---

## Dependencias

**Runtime**: ninguna (0 dependencias).

**peerDependencies**: `@stevenvo780/st-lang >= 3.0.0`

**devDependencies**: `typescript`, `vitest`, `@stevenvo780/st-lang`

**Opcional (LLM web)**: `@huggingface/transformers` — se importa dinámicamente solo si se usa el provider `web-distilled`.

NLP propio (sin compromise.js ni spaCy):
- Stemmer Snowball ES/EN (~200 líneas)
- Stopwords curadas (~150 palabras/idioma)
- Marcadores discursivos (~200 entradas)
- Tokenizador regex

Tamaño: ~30 KB minificado (sin el modelo ONNX).

---

## Tests

```bash
npm test              # vitest
npm run test:coverage # con reporte en coverage/
```

---

## Decisiones de diseño

| Decisión | Razón |
|---|---|
| Modo reglas SIN IA por defecto | Determinismo, reproducibilidad, latencia cero, costo cero |
| Modo LLM opcional | Para textos legales/técnicos complejos que el pipeline NLP no maneja |
| NL Linter como puerta de entrada | Previene formalización de textos ambiguos que producirían ASTs incorrectos |
| AST tipado en TypeScript | El LLM devuelve JSON; compileAST() lo transforma a ST sin riesgo de inyección |
| DRT para correferencia | Resolución de pronombres anafóricos en lógicas epistémicas y modales multi-agente |
| compiler-frontend para casos extremos | Algunos patrones (cuantificación exacta, probabilidades) requieren construcción AST directa |
| 0 deps runtime | Librería ultraligera, sin supply-chain risk |
| st-lang como peerDep | El consumidor ya la tiene; evita duplicación |

---

## Integración con EducacionCooperativa

La plataforma usa autologic en dos puntos:

1. **`src/lib/buildSTFromSemantic.ts`** — genera automáticamente el archivo `.st` companion para cada documento de la Mesa Semántica.
2. **`src/components/FormalizerPlayground.tsx`** — interfaz interactiva para formalizar texto con selección de perfil, historial y ejecución en tiempo real.

Ver `docs/formalizacion-automatica.md` en EducacionCooperativa para el flujo completo.

---

## Licencia

Ver [LICENSE](LICENSE).
