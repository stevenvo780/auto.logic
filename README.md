# @stevenvo780/autologic

**Formalizador automático de texto natural → lógica formal ST, sin IA.**

Autologic convierte texto en lenguaje natural (español/inglés) en código formal ejecutable en [ST lang](https://github.com/stevenvo780/st-lang), utilizando NLP basado en reglas — sin modelos de lenguaje, sin APIs externas, sin dependencias de runtime.

## Características

- 🧠 **11 perfiles lógicos**: proposicional, primer orden, modal K, deóntico, epistémico, intuicionista, temporal LTL, paraconsistente Belnap, silogístico aristotélico, probabilístico, aritmético
- 🌍 **Bilingüe**: español e inglés con ~200 marcadores discursivos
- 🔍 **Detección de patrones**: modus ponens, modus tollens, silogismo hipotético, cadenas condicionales, generalización/instanciación universal
- ⚡ **Zero dependencies**: todo el NLP es interno (stemmers Snowball, stopwords, coreferencia)
- 🎯 **Trazabilidad**: cada fórmula referencia el texto fuente original
- ✅ **Validación**: valida el ST generado contra `@stevenvo780/st-lang`

## Instalación

```bash
npm install @stevenvo780/autologic @stevenvo780/st-lang
```

## Uso rápido

### Función stateless

```typescript
import { formalize } from '@stevenvo780/autologic';

const result = formalize(
  'Si llueve, entonces la calle se moja. Está lloviendo. Por lo tanto, la calle está mojada.',
  { profile: 'classical.propositional', language: 'es' }
);

console.log(result.stCode);
// logic classical.propositional
// interpret "llueve" as LLUEVE
// interpret "la calle se moja." as CALLE_MOJA
// axiom regla_1 : LLUEVE -> CALLE_MOJA
// axiom hecho_2 : LLOVIENDO
// derive MOJADA_CALLE from {regla_1, hecho_2}
// check valid (LLUEVE -> CALLE_MOJA)
```

### Clase con estado

```typescript
import { Autologic } from '@stevenvo780/autologic';

const al = new Autologic({
  language: 'es',
  defaultProfile: 'classical.propositional',
  includeComments: true,
});

const r1 = al.formalize('Todo humano es mortal. Sócrates es humano.');
const r2 = al.formalize('Es necesario que las leyes se cumplan.');

console.log(al.getHistory()); // últimas 2 formalizaciones
```

## Perfiles lógicos

| Perfil | Descripción |
|--------|------------|
| `classical.propositional` | Lógica proposicional clásica (→, &, \|, !, ↔) |
| `classical.first_order` | Primer orden con cuantificadores (∀, ∃, predicados) |
| `modal.k` | Lógica modal K (□, ◇) |
| `deontic.standard` | Lógica deóntica (obligación, permisión) |
| `epistemic.s5` | Lógica epistémica S5 (conocimiento, creencia) |
| `intuitionistic.propositional` | Lógica intuicionista |
| `temporal.ltl` | Lógica temporal lineal (next, until, always, eventually) |
| `paraconsistent.belnap` | Lógica paraconsistente Belnap 4-valores |
| `aristotelian.syllogistic` | Silogística aristotélica |
| `probabilistic.basic` | Lógica probabilística básica |
| `arithmetic` | Aritmética formal |

## API

### `formalize(text, options?)`

Función principal stateless. Retorna `FormalizationResult`:

```typescript
interface FormalizationResult {
  ok: boolean;
  stCode: string;
  analysis: DiscourseAnalysis;
  atoms: Map<string, string>;
  formulas: FormulaEntry[];
  diagnostics: Diagnostic[];
}
```

### Opciones

```typescript
interface FormalizeOptions {
  profile?: LogicProfile;      // default: 'classical.propositional'
  language?: 'es' | 'en';     // default: 'es'
  atomStyle?: 'keywords' | 'letters' | 'numbered'; // default: 'keywords'
  includeComments?: boolean;   // default: true
  validate?: boolean;          // default: false
}
```

### Utilidades exportadas

```typescript
import {
  segment,            // Segmentar texto en oraciones/cláusulas
  analyzeDiscourse,   // Analizar marcadores y patrones
  extractAtoms,       // Extraer proposiciones atómicas
  buildFormulas,      // Construir fórmulas ST
  emitST,            // Generar código ST
  validateST,        // Validar ST con st-lang
} from '@stevenvo780/autologic';
```

## Pipeline

```
Texto Natural
     │
     ▼
┌──────────┐   Divide por . ; ? !
│ Segmenter │   Divide cláusulas por marcadores
└────┬─────┘
     ▼
┌──────────────┐   Detecta marcadores discursivos
│  Discourse   │   Clasifica roles (premisa, condición, conclusión...)
│  Analyzer    │   Detecta patrones (modus ponens, silogismos...)
└────┬─────────┘
     ▼
┌──────────┐   Extrae keywords / predicados
│  Atoms   │   Genera IDs únicos (LLUEVE, CALLE_MOJA)
│ Extractor│   Resuelve coreferencia (Dice/Jaccard)
└────┬─────┘
     ▼
┌──────────┐   Mapea roles → operadores ST
│ Formula  │   Construye fórmulas por perfil lógico
│ Builder  │   (proposicional, 1er orden, modal, temporal)
└────┬─────┘
     ▼
┌──────────┐   Emite código ST formateado
│    ST    │   Agrega comments/traceability
│ Generator│   Valida con st-lang (opcional)
└──────────┘
     │
     ▼
  Código .st
```

## Desarrollo

```bash
git clone https://github.com/stevenvo780/autologic
cd autologic
npm install
npm run build     # Compilar TypeScript
npm test          # 74 tests
npm run test:long # Batería larga multi-lógica
npm run report:long # Reporte resumido de textos largos
npm run test:coverage  # Coverage (~80%)
```

## Licencia

MIT
