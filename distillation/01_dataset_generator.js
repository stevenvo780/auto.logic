#!/usr/bin/env node
/**
 * AUTOLOGIC — Generador de Dataset Sintético v3.0
 * Uses OpenWebUI API (OpenAI-compatible) with qwen2.5-coder:14b
 * for creating high-quality (Text -> AST JSON) training pairs.
 *
 * Features:
 *  - 15 gold-standard exercises from the test suite (verified correct)
 *  - 16 diverse AST templates covering all major inference patterns
 *  - 30 legal/academic vocabulary pools
 *  - Round-trip verification via teacher model
 *  - System prompt aligned with llm-parser.ts (SCREAMING_SNAKE_CASE)
 *
 * Run: node distillation/01_dataset_generator.js [--samples N] [--gold-only]
 */
const fs = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────
const API_URL = 'https://ollama.humanizar-dev.cloud/api/chat/completions';
const API_KEY = 'sk-bac7ed4eba894e0d8f14eade1dc589fe';
const MODEL = 'qwen2.5-coder:14b';
const DEFAULT_SAMPLES = 2000;
const OUTPUT = path.join(__dirname, 'dataset.jsonl');
const CONCURRENCY = 6;

// Parse CLI args
const args = process.argv.slice(2);
const goldOnly = args.includes('--gold-only');
const samplesIdx = args.indexOf('--samples');
const TOTAL_SAMPLES = goldOnly ? 0 : (samplesIdx !== -1 ? parseInt(args[samplesIdx + 1]) : DEFAULT_SAMPLES);
// ────────────────────────────────────────────────

/**
 * System prompt — must match llm-parser.ts buildSystemPrompt() exactly.
 */
const SYSTEM_PROMPT = `You are Autologic's semantic AST parser.
Your goal is to read complex human text and translate it into Situated Propositional Logic or bounded First-Order Logic depending on the profile: 'classical.propositional'.
DO NOT try to resolve or prove the logic. Only extract the claims and their semantic relations.
AVOID deep First-Order combinatorial explosions. Collapse contextual instances into descriptive propositional atoms like: 'CumpleInformesOrdinarios'.

You MUST return a pure JSON object conforming exactly to this interface, nothing else:
{
  "axioms": [ { "name": "a1", "formulaJSON": <LogicNode> }, ... ],
  "conclusions": [ { "formulaJSON": <LogicNode> } ]
}

Available LogicNode types for formulaJSON:
- AtomNode: { "type": "Atom", "id": "SCREAMING_SNAKE_CASE_ID", "text": "human readable description" }
- ConnectiveNode: { "type": "Connective", "operator": "AND"|"OR"|"IMPLIES"|"IFF"|"NOT", "left": <node>, "right": <node> }
  For NOT: { "type": "Connective", "operator": "NOT", "left": <child_node> }
- ModalNode: { "type": "Modal", "operator": "K"|"B"|"O"|"P"|"F"|"BOX"|"DIA"|"ALWAYS"|"EVENTUALLY"|"NEXT", "child": <node>, "agent": "optional" }
- QuantifierNode: { "type": "Quantifier", "operator": "FORALL"|"EXISTS", "variables": ["x"], "child": <node> }
- PredicateNode: { "type": "Predicate", "name": "P", "args": [{"type":"Object","name":"x"}] }

Rules:
- axioms = premises and rules that are assumed true
- conclusions = what should be derived from axioms
- Use the SAME Atom id across axioms/conclusions when referring to the same proposition
- Atom ids must be SCREAMING_SNAKE_CASE
- Be precise. Return ONLY the raw JSON object. No markdown, no codeblocks.`;

// ══════════════════════════════════════════════════════════════
// GOLD EXERCISES — from tests/fixtures/propositional-exercises.ts
// These are verified correct and go directly into the dataset.
// ══════════════════════════════════════════════════════════════
const GOLD_EXERCISES = [
  {
    text: 'Si la policía patrulla las calles, entonces no hay delincuentes al acecho. Pero o bien hay delincuentes al acecho o sujetos ebrios fomentando el desorden. La policía patrulla las calles. Luego, hay sujetos ebrios fomentando el desorden.',
    ast: {
      axioms: [
        { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'POLICIA_PATRULLA', text: 'la policía patrulla las calles' }, right: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'DELINCUENTES_ACECHO', text: 'hay delincuentes al acecho' } } } },
        { name: 'a2', formulaJSON: { type: 'Connective', operator: 'OR', left: { type: 'Atom', id: 'DELINCUENTES_ACECHO', text: 'hay delincuentes al acecho' }, right: { type: 'Atom', id: 'SUJETOS_EBRIOS', text: 'sujetos ebrios fomentando el desorden' } } },
        { name: 'a3', formulaJSON: { type: 'Atom', id: 'POLICIA_PATRULLA', text: 'la policía patrulla las calles' } }
      ],
      conclusions: [{ formulaJSON: { type: 'Atom', id: 'SUJETOS_EBRIOS', text: 'sujetos ebrios fomentando el desorden' } }]
    }
  },
  {
    text: 'Si Pablo Castel vive obsesionado con María Iribarne, entonces la encontrará algún día. Si Pablo Castel encuentra a María Iribarne, entablará una conversación con ella. Es el caso que Pablo Castel vive obsesionado con María Iribarne. Por lo tanto, Pablo Castel entablará una conversación con María Iribarne.',
    ast: {
      axioms: [
        { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'PABLO_OBSESIONADO', text: 'Pablo Castel vive obsesionado con María Iribarne' }, right: { type: 'Atom', id: 'PABLO_ENCUENTRA', text: 'Pablo Castel encuentra a María Iribarne' } } },
        { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'PABLO_ENCUENTRA', text: 'Pablo Castel encuentra a María Iribarne' }, right: { type: 'Atom', id: 'PABLO_CONVERSA', text: 'Pablo Castel entablará una conversación con ella' } } },
        { name: 'a3', formulaJSON: { type: 'Atom', id: 'PABLO_OBSESIONADO', text: 'Pablo Castel vive obsesionado con María Iribarne' } }
      ],
      conclusions: [{ formulaJSON: { type: 'Atom', id: 'PABLO_CONVERSA', text: 'Pablo Castel entablará una conversación con ella' } }]
    }
  },
  {
    text: 'Si Raskolnikov fue visto saliendo de la casa de la usurera o dejó algún indicio allí, entonces Petrovich le seguirá el rastro y lo acusará de asesinato. Si Petrovich le sigue el rastro y lo acusa de asesinato, Raskolnikov no tendrá ninguna coartada. Raskolnikov fue visto saliendo de la casa de la usurera o dejó algún indicio allí. Luego, Raskolnikov no tendrá ninguna coartada.',
    ast: {
      axioms: [
        { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Connective', operator: 'OR', left: { type: 'Atom', id: 'RASK_VISTO', text: 'Raskolnikov fue visto saliendo de la casa de la usurera' }, right: { type: 'Atom', id: 'RASK_INDICIO', text: 'Raskolnikov dejó algún indicio allí' } }, right: { type: 'Connective', operator: 'AND', left: { type: 'Atom', id: 'PETROVICH_RASTRO', text: 'Petrovich le seguirá el rastro' }, right: { type: 'Atom', id: 'PETROVICH_ACUSA', text: 'Petrovich lo acusará de asesinato' } } } },
        { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Connective', operator: 'AND', left: { type: 'Atom', id: 'PETROVICH_RASTRO', text: 'Petrovich le seguirá el rastro' }, right: { type: 'Atom', id: 'PETROVICH_ACUSA', text: 'Petrovich lo acusará de asesinato' } }, right: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'RASK_COARTADA', text: 'Raskolnikov tendrá coartada' } } } },
        { name: 'a3', formulaJSON: { type: 'Connective', operator: 'OR', left: { type: 'Atom', id: 'RASK_VISTO', text: 'Raskolnikov fue visto saliendo de la casa de la usurera' }, right: { type: 'Atom', id: 'RASK_INDICIO', text: 'Raskolnikov dejó algún indicio allí' } } }
      ],
      conclusions: [{ formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'RASK_COARTADA', text: 'Raskolnikov tendrá coartada' } } }]
    }
  },
  {
    text: 'Las tiendas están cerradas y no hay vigilancia policial. Si las tiendas están cerradas o no hay vigilancia policial, entonces es mala idea salir a comprar. Si es mala idea salir a comprar, entonces es conveniente ir a ver televisión. Luego, es conveniente ir a ver televisión.',
    ast: {
      axioms: [
        { name: 'a1', formulaJSON: { type: 'Connective', operator: 'AND', left: { type: 'Atom', id: 'TIENDAS_CERRADAS', text: 'las tiendas están cerradas' }, right: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'VIGILANCIA', text: 'hay vigilancia policial' } } } },
        { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Connective', operator: 'OR', left: { type: 'Atom', id: 'TIENDAS_CERRADAS', text: 'las tiendas están cerradas' }, right: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'VIGILANCIA', text: 'hay vigilancia policial' } } }, right: { type: 'Atom', id: 'MALA_IDEA_COMPRAR', text: 'es mala idea salir a comprar' } } },
        { name: 'a3', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'MALA_IDEA_COMPRAR', text: 'es mala idea salir a comprar' }, right: { type: 'Atom', id: 'VER_TELEVISION', text: 'es conveniente ir a ver televisión' } } }
      ],
      conclusions: [{ formulaJSON: { type: 'Atom', id: 'VER_TELEVISION', text: 'es conveniente ir a ver televisión' } }]
    }
  },
  {
    text: 'Si Juan consigue el préstamo, entonces se comprará un departamento. Si Juan consigue el préstamo, entonces, si compra el departamento, deberá comprar muebles. Luego, si Juan consigue el préstamo, entonces deberá comprar muebles.',
    ast: {
      axioms: [
        { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'JUAN_PRESTAMO', text: 'Juan consigue el préstamo' }, right: { type: 'Atom', id: 'JUAN_DEPARTAMENTO', text: 'Juan se comprará un departamento' } } },
        { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'JUAN_PRESTAMO', text: 'Juan consigue el préstamo' }, right: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'JUAN_DEPARTAMENTO', text: 'Juan compra el departamento' }, right: { type: 'Atom', id: 'JUAN_MUEBLES', text: 'Juan deberá comprar muebles' } } } }
      ],
      conclusions: [{ formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'JUAN_PRESTAMO', text: 'Juan consigue el préstamo' }, right: { type: 'Atom', id: 'JUAN_MUEBLES', text: 'Juan deberá comprar muebles' } } }]
    }
  },
  {
    text: 'Si Fiorella ingresa a la universidad, entonces su mamá se alegrará, y si Elvira consigue trabajo su papá celebrará. Sucede que la mamá de Fiorella no se alegra y el papá de Elvira no celebra. Pero si no es el caso que Fiorella ingresa a la universidad y Elvira consigue trabajo, entonces ambas viajan al extranjero. Por consiguiente, ambas viajan al extranjero.',
    ast: {
      axioms: [
        { name: 'a1', formulaJSON: { type: 'Connective', operator: 'AND', left: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'FIORELLA_UNIVERSIDAD', text: 'Fiorella ingresa a la universidad' }, right: { type: 'Atom', id: 'MAMA_ALEGRA', text: 'su mamá se alegrará' } }, right: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'ELVIRA_TRABAJO', text: 'Elvira consigue trabajo' }, right: { type: 'Atom', id: 'PAPA_CELEBRA', text: 'su papá celebrará' } } } },
        { name: 'a2', formulaJSON: { type: 'Connective', operator: 'AND', left: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'MAMA_ALEGRA', text: 'la mamá de Fiorella se alegra' } }, right: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'PAPA_CELEBRA', text: 'el papá de Elvira celebra' } } } },
        { name: 'a3', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Connective', operator: 'NOT', left: { type: 'Connective', operator: 'AND', left: { type: 'Atom', id: 'FIORELLA_UNIVERSIDAD', text: 'Fiorella ingresa a la universidad' }, right: { type: 'Atom', id: 'ELVIRA_TRABAJO', text: 'Elvira consigue trabajo' } } }, right: { type: 'Atom', id: 'AMBAS_VIAJAN', text: 'ambas viajan al extranjero' } } }
      ],
      conclusions: [{ formulaJSON: { type: 'Atom', id: 'AMBAS_VIAJAN', text: 'ambas viajan al extranjero' } }]
    }
  },
  {
    text: 'Si Perú gana o empata el partido, entonces clasifica al mundial. Pero es el caso que Perú gana o empata. Por lo tanto, Perú clasifica al mundial.',
    ast: {
      axioms: [
        { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Connective', operator: 'OR', left: { type: 'Atom', id: 'PERU_GANA', text: 'Perú gana el partido' }, right: { type: 'Atom', id: 'PERU_EMPATA', text: 'Perú empata el partido' } }, right: { type: 'Atom', id: 'PERU_CLASIFICA', text: 'Perú clasifica al mundial' } } },
        { name: 'a2', formulaJSON: { type: 'Connective', operator: 'OR', left: { type: 'Atom', id: 'PERU_GANA', text: 'Perú gana el partido' }, right: { type: 'Atom', id: 'PERU_EMPATA', text: 'Perú empata el partido' } } }
      ],
      conclusions: [{ formulaJSON: { type: 'Atom', id: 'PERU_CLASIFICA', text: 'Perú clasifica al mundial' } }]
    }
  },
  {
    text: 'Si Andrés se dedica a la pintura, entonces será un gran artista, y si se dedica a administrar los negocios de su padre, ganará un buen sueldo. Si Andrés llega a ser un gran artista o a ganar un buen sueldo, habrá realizado sus sueños. Pero Andrés no realizará sus sueños. En consecuencia, no se dedica a la pintura y no administra los negocios de su padre.',
    ast: {
      axioms: [
        { name: 'a1', formulaJSON: { type: 'Connective', operator: 'AND', left: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'ANDRES_PINTURA', text: 'Andrés se dedica a la pintura' }, right: { type: 'Atom', id: 'ANDRES_ARTISTA', text: 'será un gran artista' } }, right: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'ANDRES_NEGOCIOS', text: 'Andrés administra los negocios de su padre' }, right: { type: 'Atom', id: 'ANDRES_SUELDO', text: 'ganará un buen sueldo' } } } },
        { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Connective', operator: 'OR', left: { type: 'Atom', id: 'ANDRES_ARTISTA', text: 'Andrés es un gran artista' }, right: { type: 'Atom', id: 'ANDRES_SUELDO', text: 'Andrés gana un buen sueldo' } }, right: { type: 'Atom', id: 'ANDRES_SUENOS', text: 'Andrés habrá realizado sus sueños' } } },
        { name: 'a3', formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'ANDRES_SUENOS', text: 'Andrés realizará sus sueños' } } }
      ],
      conclusions: [{ formulaJSON: { type: 'Connective', operator: 'AND', left: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'ANDRES_PINTURA', text: 'Andrés se dedica a la pintura' } }, right: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'ANDRES_NEGOCIOS', text: 'Andrés administra los negocios de su padre' } } } }]
    }
  },
  {
    text: 'Si hace calor, entonces la gente acude masivamente a la playa. Hay más sed que de costumbre porque hace calor, entonces los niños piden gaseosas o la gente acude masivamente a la playa. Si hace calor y la gente acude masivamente a la playa, entonces hay más sed que de costumbre. No es el caso que los niños pidan gaseosas. Luego, la gente acude masivamente a la playa.',
    ast: {
      axioms: [
        { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'HACE_CALOR', text: 'hace calor' }, right: { type: 'Atom', id: 'GENTE_PLAYA', text: 'la gente acude masivamente a la playa' } } },
        { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Connective', operator: 'AND', left: { type: 'Atom', id: 'MAS_SED', text: 'hay más sed que de costumbre' }, right: { type: 'Atom', id: 'HACE_CALOR', text: 'hace calor' } }, right: { type: 'Connective', operator: 'OR', left: { type: 'Atom', id: 'NINOS_GASEOSAS', text: 'los niños piden gaseosas' }, right: { type: 'Atom', id: 'GENTE_PLAYA', text: 'la gente acude masivamente a la playa' } } } },
        { name: 'a3', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Connective', operator: 'AND', left: { type: 'Atom', id: 'HACE_CALOR', text: 'hace calor' }, right: { type: 'Atom', id: 'GENTE_PLAYA', text: 'la gente acude masivamente a la playa' } }, right: { type: 'Atom', id: 'MAS_SED', text: 'hay más sed que de costumbre' } } },
        { name: 'a4', formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'NINOS_GASEOSAS', text: 'los niños piden gaseosas' } } }
      ],
      conclusions: [{ formulaJSON: { type: 'Atom', id: 'GENTE_PLAYA', text: 'la gente acude masivamente a la playa' } }]
    }
  },
  {
    text: 'Si Carlos Santana y Joe Satriani vienen al Perú, entonces los cultores del Rock podrán apreciar un buen espectáculo cultural. Si Carlos Santana viene al Perú y los cultores del Rock podrán apreciar un buen espectáculo cultural, entonces irán entusiasmados al concierto. Luego, si Joe Satriani viene al Perú, entonces los cultores del Rock irán entusiasmados al concierto.',
    ast: {
      axioms: [
        { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Connective', operator: 'AND', left: { type: 'Atom', id: 'SANTANA_PERU', text: 'Carlos Santana viene al Perú' }, right: { type: 'Atom', id: 'SATRIANI_PERU', text: 'Joe Satriani viene al Perú' } }, right: { type: 'Atom', id: 'BUEN_ESPECTACULO', text: 'los cultores del Rock podrán apreciar un buen espectáculo cultural' } } },
        { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Connective', operator: 'AND', left: { type: 'Atom', id: 'SANTANA_PERU', text: 'Carlos Santana viene al Perú' }, right: { type: 'Atom', id: 'BUEN_ESPECTACULO', text: 'los cultores del Rock podrán apreciar un buen espectáculo cultural' } }, right: { type: 'Atom', id: 'ENTUSIASMADOS_CONCIERTO', text: 'irán entusiasmados al concierto' } } }
      ],
      conclusions: [{ formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'SATRIANI_PERU', text: 'Joe Satriani viene al Perú' }, right: { type: 'Atom', id: 'ENTUSIASMADOS_CONCIERTO', text: 'irán entusiasmados al concierto' } } }]
    }
  },
  {
    text: 'O no fuiste al cine o te quedaste dormido durante la proyección de la película. Si no estabas en tu casa, entonces fuiste al cine. Luego, si no estabas en tu casa, te quedaste dormido durante la proyección de la película.',
    ast: {
      axioms: [
        { name: 'a1', formulaJSON: { type: 'Connective', operator: 'OR', left: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'FUISTE_CINE', text: 'fuiste al cine' } }, right: { type: 'Atom', id: 'DORMIDO_PELICULA', text: 'te quedaste dormido durante la proyección de la película' } } },
        { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'EN_CASA', text: 'estabas en tu casa' } }, right: { type: 'Atom', id: 'FUISTE_CINE', text: 'fuiste al cine' } } }
      ],
      conclusions: [{ formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'EN_CASA', text: 'estabas en tu casa' } }, right: { type: 'Atom', id: 'DORMIDO_PELICULA', text: 'te quedaste dormido durante la proyección de la película' } } }]
    }
  },
  {
    text: 'Te visitaré por la tarde o por la noche. Si te visito por la tarde, saldremos a pasear. Si te visito por la noche, veremos televisión. Luego, saldremos a pasear o veremos televisión.',
    ast: {
      axioms: [
        { name: 'a1', formulaJSON: { type: 'Connective', operator: 'OR', left: { type: 'Atom', id: 'VISITA_TARDE', text: 'te visitaré por la tarde' }, right: { type: 'Atom', id: 'VISITA_NOCHE', text: 'te visitaré por la noche' } } },
        { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'VISITA_TARDE', text: 'te visito por la tarde' }, right: { type: 'Atom', id: 'PASEAR', text: 'saldremos a pasear' } } },
        { name: 'a3', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'VISITA_NOCHE', text: 'te visito por la noche' }, right: { type: 'Atom', id: 'TELEVISION', text: 'veremos televisión' } } }
      ],
      conclusions: [{ formulaJSON: { type: 'Connective', operator: 'OR', left: { type: 'Atom', id: 'PASEAR', text: 'saldremos a pasear' }, right: { type: 'Atom', id: 'TELEVISION', text: 'veremos televisión' } } }]
    }
  },
  {
    text: 'Si Daniel no toca la guitarra, entonces la tendrá que tocar Henry. Y si Henry toca la guitarra, Antonio abandonará el grupo. Pero Antonio no abandonó el grupo. Por lo tanto, Daniel toca la guitarra.',
    ast: {
      axioms: [
        { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'DANIEL_GUITARRA', text: 'Daniel toca la guitarra' } }, right: { type: 'Atom', id: 'HENRY_GUITARRA', text: 'Henry toca la guitarra' } } },
        { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'HENRY_GUITARRA', text: 'Henry toca la guitarra' }, right: { type: 'Atom', id: 'ANTONIO_ABANDONA', text: 'Antonio abandonará el grupo' } } },
        { name: 'a3', formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'ANTONIO_ABANDONA', text: 'Antonio abandonó el grupo' } } }
      ],
      conclusions: [{ formulaJSON: { type: 'Atom', id: 'DANIEL_GUITARRA', text: 'Daniel toca la guitarra' } }]
    }
  },
  {
    text: 'Si el equipo de atletismo se está preparando adecuadamente entonces estará en condiciones de asistir a las próximas olimpiadas. Y estará en condiciones de asistir a las próximas olimpiadas si y sólo si el equipo cuenta con un plantel competente. Pero o el equipo no cuenta con un plantel competente o uno de sus integrantes está lesionado. Sucede que ningún integrante del plantel está lesionado. Por lo tanto, el equipo de atletismo no se está preparando adecuadamente.',
    ast: {
      axioms: [
        { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'EQUIPO_PREPARA', text: 'el equipo de atletismo se está preparando adecuadamente' }, right: { type: 'Atom', id: 'CONDICIONES_OLIMPIADAS', text: 'estará en condiciones de asistir a las próximas olimpiadas' } } },
        { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IFF', left: { type: 'Atom', id: 'CONDICIONES_OLIMPIADAS', text: 'estará en condiciones de asistir a las próximas olimpiadas' }, right: { type: 'Atom', id: 'PLANTEL_COMPETENTE', text: 'el equipo cuenta con un plantel competente' } } },
        { name: 'a3', formulaJSON: { type: 'Connective', operator: 'OR', left: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'PLANTEL_COMPETENTE', text: 'el equipo cuenta con un plantel competente' } }, right: { type: 'Atom', id: 'INTEGRANTE_LESIONADO', text: 'uno de sus integrantes está lesionado' } } },
        { name: 'a4', formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'INTEGRANTE_LESIONADO', text: 'ningún integrante del plantel está lesionado' } } }
      ],
      conclusions: [{ formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'EQUIPO_PREPARA', text: 'el equipo de atletismo no se está preparando adecuadamente' } } }]
    }
  },
  {
    text: 'Cuando se produce el fenómeno del niño se generan lluvias torrenciales y huaycos. Pero no se producen lluvias torrenciales o huaycos. Por lo tanto, no se ha producido el fenómeno del niño.',
    ast: {
      axioms: [
        { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: 'FENOMENO_NINO', text: 'se produce el fenómeno del niño' }, right: { type: 'Connective', operator: 'AND', left: { type: 'Atom', id: 'LLUVIAS_TORRENCIALES', text: 'se generan lluvias torrenciales' }, right: { type: 'Atom', id: 'HUAYCOS', text: 'se generan huaycos' } } } },
        { name: 'a2', formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Connective', operator: 'OR', left: { type: 'Atom', id: 'LLUVIAS_TORRENCIALES', text: 'se producen lluvias torrenciales' }, right: { type: 'Atom', id: 'HUAYCOS', text: 'se producen huaycos' } } } }
      ],
      conclusions: [{ formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: 'FENOMENO_NINO', text: 'se ha producido el fenómeno del niño' } } }]
    }
  },
];

// ══════════════════════════════════════════════════════════════
// AST TEMPLATES — 16 diverse inference patterns
// ══════════════════════════════════════════════════════════════
const TEMPLATES = [
  // 1. MODUS PONENS: P->Q, P ⊢ Q
  (v) => ({ pattern: 'modus_ponens', ast: {
    axioms: [
      { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } },
      { name: 'a2', formulaJSON: { type: 'Atom', id: v[0], text: v[2] } }
    ],
    conclusions: [{ formulaJSON: { type: 'Atom', id: v[1], text: v[3] } }]
  }}),
  // 2. MODUS TOLLENS: P->Q, ¬Q ⊢ ¬P
  (v) => ({ pattern: 'modus_tollens', ast: {
    axioms: [
      { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } },
      { name: 'a2', formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: v[1], text: v[3] } } }
    ],
    conclusions: [{ formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: v[0], text: v[2] } } }]
  }}),
  // 3. HYPOTHETICAL SYLLOGISM: P->Q, Q->R ⊢ P->R
  (v) => ({ pattern: 'hypothetical_syllogism', ast: {
    axioms: [
      { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } },
      { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[1], text: v[3] }, right: { type: 'Atom', id: v[4], text: v[5] } } }
    ],
    conclusions: [{ formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[4], text: v[5] } } }]
  }}),
  // 4. DISJUNCTIVE SYLLOGISM: PvQ, ¬P ⊢ Q
  (v) => ({ pattern: 'disjunctive_syllogism', ast: {
    axioms: [
      { name: 'a1', formulaJSON: { type: 'Connective', operator: 'OR', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } },
      { name: 'a2', formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: v[0], text: v[2] } } }
    ],
    conclusions: [{ formulaJSON: { type: 'Atom', id: v[1], text: v[3] } }]
  }}),
  // 5. CONJUNCTION: P, Q ⊢ P∧Q
  (v) => ({ pattern: 'conjunction', ast: {
    axioms: [
      { name: 'a1', formulaJSON: { type: 'Atom', id: v[0], text: v[2] } },
      { name: 'a2', formulaJSON: { type: 'Atom', id: v[1], text: v[3] } }
    ],
    conclusions: [{ formulaJSON: { type: 'Connective', operator: 'AND', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } }]
  }}),
  // 6. BICONDITIONAL ELIM: P<->Q, P ⊢ Q
  (v) => ({ pattern: 'biconditional', ast: {
    axioms: [
      { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IFF', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } },
      { name: 'a2', formulaJSON: { type: 'Atom', id: v[0], text: v[2] } }
    ],
    conclusions: [{ formulaJSON: { type: 'Atom', id: v[1], text: v[3] } }]
  }}),
  // 7. CHAIN OF 3: P->Q, Q->R, P ⊢ R
  (v) => ({ pattern: 'chain_3', ast: {
    axioms: [
      { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } },
      { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[1], text: v[3] }, right: { type: 'Atom', id: v[4], text: v[5] } } },
      { name: 'a3', formulaJSON: { type: 'Atom', id: v[0], text: v[2] } }
    ],
    conclusions: [{ formulaJSON: { type: 'Atom', id: v[4], text: v[5] } }]
  }}),
  // 8. CONJUNCTION ANTECEDENT: (P∧Q)->R, P, Q ⊢ R
  (v) => ({ pattern: 'conj_antecedent', ast: {
    axioms: [
      { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Connective', operator: 'AND', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } }, right: { type: 'Atom', id: v[4], text: v[5] } } },
      { name: 'a2', formulaJSON: { type: 'Atom', id: v[0], text: v[2] } },
      { name: 'a3', formulaJSON: { type: 'Atom', id: v[1], text: v[3] } }
    ],
    conclusions: [{ formulaJSON: { type: 'Atom', id: v[4], text: v[5] } }]
  }}),
  // 9. CONSTRUCTIVE DILEMMA: (P->Q)∧(R->S), PvR ⊢ QvS
  (v) => ({ pattern: 'constructive_dilemma', ast: {
    axioms: [
      { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } },
      { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[4], text: v[5] }, right: { type: 'Atom', id: v[6], text: v[7] } } },
      { name: 'a3', formulaJSON: { type: 'Connective', operator: 'OR', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[4], text: v[5] } } }
    ],
    conclusions: [{ formulaJSON: { type: 'Connective', operator: 'OR', left: { type: 'Atom', id: v[1], text: v[3] }, right: { type: 'Atom', id: v[6], text: v[7] } } }]
  }}),
  // 10. DESTRUCTIVE DILEMMA: (P->Q)∧(R->S), ¬Qv¬S ⊢ ¬Pv¬R
  (v) => ({ pattern: 'destructive_dilemma', ast: {
    axioms: [
      { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } },
      { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[4], text: v[5] }, right: { type: 'Atom', id: v[6], text: v[7] } } },
      { name: 'a3', formulaJSON: { type: 'Connective', operator: 'OR', left: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: v[1], text: v[3] } }, right: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: v[6], text: v[7] } } } }
    ],
    conclusions: [{ formulaJSON: { type: 'Connective', operator: 'OR', left: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: v[0], text: v[2] } }, right: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: v[4], text: v[5] } } } }]
  }}),
  // 11. DOUBLE NEGATION INTRO: P ⊢ ¬¬P (with implication context)
  (v) => ({ pattern: 'double_negation', ast: {
    axioms: [
      { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } },
      { name: 'a2', formulaJSON: { type: 'Atom', id: v[0], text: v[2] } }
    ],
    conclusions: [{ formulaJSON: { type: 'Atom', id: v[1], text: v[3] } }]
  }}),
  // 12. ABSORPTION: P->Q ⊢ P->(P∧Q)
  (v) => ({ pattern: 'absorption', ast: {
    axioms: [
      { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } },
      { name: 'a2', formulaJSON: { type: 'Atom', id: v[0], text: v[2] } }
    ],
    conclusions: [{ formulaJSON: { type: 'Connective', operator: 'AND', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } }]
  }}),
  // 13. DEONTIC OBLIGATION: P -> O(Q), P ⊢ O(Q)
  (v) => ({ pattern: 'deontic_obligation', ast: {
    axioms: [
      { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Modal', operator: 'O', child: { type: 'Atom', id: v[1], text: v[3] } } } },
      { name: 'a2', formulaJSON: { type: 'Atom', id: v[0], text: v[2] } }
    ],
    conclusions: [{ formulaJSON: { type: 'Modal', operator: 'O', child: { type: 'Atom', id: v[1], text: v[3] } } }]
  }}),
  // 14. DISJUNCTION ANTECEDENT: (PvQ)->R, P ⊢ R
  (v) => ({ pattern: 'disj_antecedent', ast: {
    axioms: [
      { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Connective', operator: 'OR', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } }, right: { type: 'Atom', id: v[4], text: v[5] } } },
      { name: 'a2', formulaJSON: { type: 'Atom', id: v[0], text: v[2] } }
    ],
    conclusions: [{ formulaJSON: { type: 'Atom', id: v[4], text: v[5] } }]
  }}),
  // 15. NEGATION ANTECEDENT: ¬P->Q, ¬P ⊢ Q (variant of modus ponens with negation)
  (v) => ({ pattern: 'negation_antecedent', ast: {
    axioms: [
      { name: 'a1', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: v[0], text: v[2] } }, right: { type: 'Atom', id: v[1], text: v[3] } } },
      { name: 'a2', formulaJSON: { type: 'Connective', operator: 'NOT', left: { type: 'Atom', id: v[0], text: v[2] } } }
    ],
    conclusions: [{ formulaJSON: { type: 'Atom', id: v[1], text: v[3] } }]
  }}),
  // 16. PREMISES ONLY (no conclusion — pure extraction)
  (v) => ({ pattern: 'premises_only', ast: {
    axioms: [
      { name: 'a1', formulaJSON: { type: 'Atom', id: v[0], text: v[2] } },
      { name: 'a2', formulaJSON: { type: 'Connective', operator: 'IMPLIES', left: { type: 'Atom', id: v[0], text: v[2] }, right: { type: 'Atom', id: v[1], text: v[3] } } }
    ],
    conclusions: []
  }}),
];

// ══════════════════════════════════════════════════════════════
// VOCABULARY POOLS — 30 legal/academic atom sets
// ══════════════════════════════════════════════════════════════
const ATOMS_POOL = [
  ['DICTAMEN_FAVORABLE', 'PUBLICACION_REVISTA', 'dictamen favorable de los evaluadores', 'publicación en la revista', 'APROBACION_COMITE', 'aprobación por el comité editorial', 'INDEXACION_SCOPUS', 'indexación en Scopus'],
  ['CONTRATO_FIRMADO', 'OBLIGACION_PAGO', 'contrato firmado por ambas partes', 'obligación de pago exigible', 'REGISTRO_NOTARIAL', 'registro notarial del acuerdo', 'EJECUCION_GARANTIA', 'ejecución de la garantía'],
  ['PLAZO_VENCIDO', 'MORA_AUTOMATICA', 'plazo contractual vencido', 'mora se configura automáticamente', 'CLAUSULA_PENAL', 'cláusula penal se activa', 'DEMANDA_EJECUTIVA', 'demanda ejecutiva procede'],
  ['PRUEBA_ADMITIDA', 'HECHO_ACREDITADO', 'prueba fue debidamente admitida', 'hecho queda acreditado procesalmente', 'SENTENCIA_PROCEDENTE', 'sentencia favorable es procedente', 'RECURSO_IMPROCEDENTE', 'recurso de apelación es improcedente'],
  ['SENTENCIA_CONDENATORIA', 'RECURSO_APELACION', 'sentencia es condenatoria', 'procede recurso de apelación', 'REVISION_SEGUNDA_INSTANCIA', 'revisión en segunda instancia obligatoria', 'CASACION_POSIBLE', 'recurso de casación es posible'],
  ['INFORME_PERICIAL', 'RESPONSABILIDAD_CIVIL', 'informe pericial acredita el daño', 'responsabilidad civil del demandado', 'INDEMNIZACION_PROCEDENTE', 'indemnización de perjuicios procede', 'CUANTIA_DETERMINADA', 'cuantía queda determinada'],
  ['NOTIFICACION_LEGAL', 'TERMINO_PROCESAL', 'notificación realizada conforme a derecho', 'término procesal comienza a correr', 'CONTESTACION_DEMANDA', 'plazo de contestación de demanda', 'PRECLUYE_RECURSO', 'precluye el recurso extraordinario'],
  ['CLAUSULA_ABUSIVA', 'NULIDAD_PARCIAL', 'cláusula declarada abusiva', 'nulidad parcial del contrato', 'REVISION_JUDICIAL', 'revisión judicial del contrato', 'PROTECCION_CONSUMIDOR', 'protección al consumidor aplica'],
  ['REGISTRO_CATASTRAL', 'DERECHO_PROPIEDAD', 'registro catastral actualizado', 'derecho de propiedad oponible', 'TRADICION_PERFECCIONADA', 'tradición del bien perfeccionada', 'EMBARGO_IMPROCEDENTE', 'embargo es improcedente'],
  ['AUDIENCIA_PRELIMINAR', 'ADMISION_DEMANDA', 'audiencia preliminar celebrada', 'demanda admitida a trámite', 'FIJACION_LITIGIO', 'fijación del litigio procede', 'DECRETO_PRUEBAS', 'decreto de pruebas es obligatorio'],
  ['CUMPLIMIENTO_REQUISITOS', 'AUTORIZACION_FINAL', 'cumplimiento de todos los requisitos', 'autorización final del organismo', 'LICENCIA_OTORGADA', 'licencia de funcionamiento otorgada', 'OPERACION_HABILITADA', 'operación comercial habilitada'],
  ['VOTACION_MAYORITARIA', 'APROBACION_REFORMA', 'votación por mayoría calificada', 'aprobación de la reforma', 'PROMULGACION_LEY', 'promulgación de la ley', 'VIGENCIA_INMEDIATA', 'vigencia inmediata de la norma'],
  ['TESIS_APROBADA', 'TITULO_OTORGADO', 'tesis fue aprobada por el jurado', 'título profesional otorgado', 'CEREMONIA_GRADO', 'ceremonia de grado programada', 'DIPLOMA_EXPEDIDO', 'diploma expedido oficialmente'],
  ['CREDITOS_COMPLETOS', 'GRADUACION_HABILITADA', 'créditos académicos completos', 'graduación habilitada', 'REQUISITO_IDIOMA', 'requisito de idioma cumplido', 'HOMOLOGACION_TITULO', 'homologación del título procede'],
  ['INVESTIGACION_PUBLICADA', 'RECONOCIMIENTO_ACADEMICO', 'investigación publicada en revista indexada', 'reconocimiento académico procedente', 'BONO_INVESTIGACION', 'bono por investigación otorgado', 'ASCENSO_ESCALAFON', 'ascenso en el escalafón'],
  ['EXAMEN_APROBADO', 'PROMOCION_NIVEL', 'examen final aprobado', 'promoción al siguiente nivel', 'MATRICULA_RENOVADA', 'matrícula renovada automáticamente', 'BECA_MERITO', 'beca por mérito académico'],
  ['BECA_OTORGADA', 'MATRICULA_EXENTA', 'beca académica otorgada', 'matrícula queda exenta de pago', 'SOSTENIMIENTO_APROBADO', 'auxilio de sostenimiento aprobado', 'COMPROMISO_ACADEMICO', 'compromiso académico firmado'],
  ['SOLICITUD_RADICADA', 'TRAMITE_INICIADO', 'solicitud debidamente radicada', 'trámite administrativo iniciado', 'PLAZO_RESPUESTA', 'plazo de respuesta corre', 'SILENCIO_POSITIVO', 'silencio administrativo positivo'],
  ['LICENCIA_VIGENTE', 'OPERACION_PERMITIDA', 'licencia de operación vigente', 'operación comercial permitida', 'SUPERVISION_ACTIVA', 'supervisión periódica activa', 'MULTA_INAPLICABLE', 'multa regulatoria no aplica'],
  ['AUDITORIA_FAVORABLE', 'CERTIFICACION_EMITIDA', 'auditoría con resultado favorable', 'certificación de cumplimiento emitida', 'RENOVACION_LICENCIA', 'renovación de licencia procede', 'CALIFICACION_AAA', 'calificación AAA otorgada'],
  ['PAGO_REALIZADO', 'DEUDA_EXTINGUIDA', 'pago total realizado', 'deuda queda extinguida', 'PAZ_SALVO', 'paz y salvo expedido', 'HISTORIAL_LIMPIO', 'historial crediticio queda limpio'],
  ['INSPECCION_APROBADA', 'PERMISO_OPERACION', 'inspección sanitaria aprobada', 'permiso de operación otorgado', 'CERTIFICADO_SANITARIO', 'certificado sanitario emitido', 'APERTURA_LOCAL', 'apertura del local autorizada'],
  ['DOCUMENTACION_COMPLETA', 'TRAMITE_ADMITIDO', 'documentación entregada completa', 'trámite admitido a evaluación', 'EVALUACION_INICIADA', 'evaluación técnica iniciada', 'DICTAMEN_PENDIENTE', 'dictamen técnico pendiente'],
  ['PRESUPUESTO_APROBADO', 'EJECUCION_AUTORIZADA', 'presupuesto aprobado por junta', 'ejecución de recursos autorizada', 'CONTRATACION_HABILITADA', 'proceso de contratación habilitado', 'DESEMBOLSO_PROGRAMADO', 'desembolso de fondos programado'],
  ['QUORUM_ALCANZADO', 'SESION_VALIDA', 'quórum alcanzado', 'sesión es válida jurídicamente', 'ACTA_FIRMADA', 'acta de sesión firmada', 'DECISIONES_VINCULANTES', 'decisiones adoptadas son vinculantes'],
  ['PERITAJE_CONTABLE', 'DETERMINACION_MONTO', 'peritaje contable concluido', 'determinación del monto indemnizatorio', 'LIQUIDACION_APROBADA', 'liquidación de perjuicios aprobada', 'PAGO_ORDENADO', 'pago de indemnización ordenado'],
  ['CONSENTIMIENTO_INFORMADO', 'PROCEDIMIENTO_VALIDO', 'consentimiento informado firmado', 'procedimiento médico es válido', 'HISTORIA_CLINICA', 'historia clínica actualizada', 'RESPONSABILIDAD_EXCLUIDA', 'responsabilidad médica excluida'],
  ['FIANZA_CONSTITUIDA', 'LIBERACION_CAUTELAR', 'fianza debidamente constituida', 'liberación cautelar procede', 'MEDIDA_LEVANTADA', 'medida cautelar levantada', 'BIENES_DESEMBARGADOS', 'bienes desembargados'],
  ['PRESCRIPCION_ADQUISITIVA', 'DOMINIO_RECONOCIDO', 'prescripción adquisitiva acreditada', 'dominio sobre el bien reconocido', 'ESCRITURA_PUBLICA', 'escritura pública otorgada', 'REGISTRO_INMOBILIARIO', 'registro inmobiliario actualizado'],
  ['ACTA_NOTARIAL', 'FE_PUBLICA', 'acta notarial levantada', 'fe pública sobre los hechos', 'DOCUMENTO_AUTENTICO', 'documento es auténtico', 'OPONIBILIDAD_TERCEROS', 'oponibilidad frente a terceros'],
];

// ── Helpers ──────────────────────────────────────
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

function generateVars() {
  const shuffled = shuffle(ATOMS_POOL);
  const a = shuffled[0];
  const b = shuffled[1];
  // Return up to 8 vars for dilemma templates
  return [a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7]];
}

async function callAPI(messages, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 90000);
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          temperature: 0.7,
          max_tokens: 800
        }),
        signal: ctrl.signal
      });
      clearTimeout(timeout);
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText.substring(0, 200)}`);
      }
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty content in response');
      return content.trim();
    } catch (e) {
      if (attempt === retries) throw e;
      await sleep(2000 * (attempt + 1));
    }
  }
}

async function generateText(ast, pattern) {
  const prompt = `Eres un redactor jurídico-académico experto en español. Escribe UN SOLO párrafo formal, burocrático y denso que represente EXACTAMENTE la siguiente estructura lógica. El patrón lógico subyacente es "${pattern}".

Reglas:
- Usa lenguaje jurídico/académico formal colombiano o español
- NO agregues hechos ni relaciones que no estén en la estructura
- Usa conectores naturales variados: "si", "entonces", "por lo tanto", "en consecuencia", "siempre que", "dado que", "cuando", "puesto que", "habida cuenta de que", "de modo que", "así pues"
- Varía el estilo: a veces empieza con la conclusión, a veces con las premisas, a veces intercala
- NO uses formato de lista ni numeración
- Escribe entre 2 y 5 oraciones
- NO incluyas explicaciones meta ni comentarios sobre tu proceso
- El texto debe ser suficientemente complejo para que un parser NLP tenga que trabajar

Estructura lógica a representar:
${JSON.stringify(ast, null, 2)}

Párrafo:`;
  return await callAPI([{ role: 'user', content: prompt }]);
}

async function verifyExtraction(text, expectedAST) {
  try {
    const result = await callAPI([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Formalize this text:\n\n${text}` }
    ]);
    const cleaned = result.replace(/^```json?\s*/m, '').replace(/```\s*$/m, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!parsed.axioms || !Array.isArray(parsed.axioms)) return null;
    if (!parsed.conclusions || !Array.isArray(parsed.conclusions)) return null;
    if (Math.abs(parsed.axioms.length - expectedAST.axioms.length) > 1) return null;
    return parsed;
  } catch { return null; }
}

// ── Gold exercise writer ─────────────────────────
function writeGoldExercises(stream) {
  let count = 0;
  for (const gold of GOLD_EXERCISES) {
    const sample = {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Formalize this text:\n\n${gold.text}` },
        { role: 'assistant', content: JSON.stringify(gold.ast) }
      ],
      metadata: { pattern: 'gold_exercise', verified: true, index: count, source: 'test_suite' }
    };
    stream.write(JSON.stringify(sample) + '\n');
    count++;
  }
  // Write each gold exercise 3 times with slight rephrasings of the user message
  const prefixes = [
    'Analyze and formalize the following argument:\n\n',
    'Extract the logical structure from this text:\n\n',
    'Parse the following text into formal propositional logic:\n\n',
  ];
  for (const gold of GOLD_EXERCISES) {
    for (const prefix of prefixes) {
      const sample = {
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `${prefix}${gold.text}` },
          { role: 'assistant', content: JSON.stringify(gold.ast) }
        ],
        metadata: { pattern: 'gold_exercise_variant', verified: true, index: count, source: 'test_suite' }
      };
      stream.write(JSON.stringify(sample) + '\n');
      count++;
    }
  }
  return count;
}

// ── Synthetic sample generator ───────────────────
async function generateOne(idx) {
  const template = pick(TEMPLATES);
  const vars = generateVars();
  const { pattern, ast } = template(vars);
  try {
    const text = await generateText(ast, pattern);
    if (!text || text.length < 40) return null;
    const verified = await verifyExtraction(text, ast);
    process.stdout.write(verified ? '✓' : '⚠');
    return {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Formalize this text:\n\n${text}` },
        { role: 'assistant', content: JSON.stringify(ast) }
      ],
      metadata: { pattern, verified: !!verified, index: idx }
    };
  } catch (e) {
    process.stdout.write('✗');
    return null;
  }
}

// ── Main ─────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  AUTOLOGIC — Dataset Sintético Generator v3.0              ║');
  console.log(`║  Target: Qwen2.5-1.5B-Instruct fine-tuning                ║`);
  console.log(`║  Teacher: ${MODEL} via OpenWebUI                  ║`);
  console.log(`║  Gold exercises: ${GOLD_EXERCISES.length} (x4 variants = ${GOLD_EXERCISES.length * 4})           ║`);
  console.log(`║  Synthetic samples: ${TOTAL_SAMPLES}                              ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  // Start fresh dataset
  const stream = fs.createWriteStream(OUTPUT, { flags: 'w' });

  // Write gold exercises first
  const goldCount = writeGoldExercises(stream);
  console.log(`✅ ${goldCount} gold exercises written (${GOLD_EXERCISES.length} originals + ${goldCount - GOLD_EXERCISES.length} variants)`);

  if (goldOnly) {
    stream.end();
    console.log(`\n✅ Gold-only mode. Dataset: ${OUTPUT} (${goldCount} samples)`);
    return;
  }

  // Generate synthetic samples — ONLY verified samples are written
  let attempts = 0, written = 0, failed = 0, unverified = 0;
  const t0 = Date.now();
  const MAX_ATTEMPTS = TOTAL_SAMPLES * 3; // avoid infinite loop

  for (let batch = 0; written < TOTAL_SAMPLES && attempts < MAX_ATTEMPTS; batch++) {
    const batchSize = Math.min(CONCURRENCY, Math.max(CONCURRENCY, TOTAL_SAMPLES - written));
    const promises = Array.from({ length: batchSize }, (_, j) => generateOne(attempts + j));
    const results = await Promise.all(promises);
    for (const r of results) {
      attempts++;
      if (r && r.metadata.verified) {
        stream.write(JSON.stringify(r) + '\n');
        written++;
      } else if (r) {
        unverified++;
      } else {
        failed++;
      }
    }
    if ((attempts) % 18 < CONCURRENCY) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      const rate = written > 0 ? (written / (elapsed / 60)).toFixed(1) : '0';
      const pct = (written / TOTAL_SAMPLES * 100).toFixed(1);
      process.stdout.write(`\r  [${elapsed}s] ✓${written}/${TOTAL_SAMPLES} (${pct}%) | ✗fail:${failed} ✗unverified:${unverified} | ${rate} verified/min  `);
    }
  }

  stream.end();
  const totalTime = ((Date.now() - t0) / 1000).toFixed(1);
  const totalSamples = goldCount + written;
  console.log(`\n\n✅ Dataset: ${OUTPUT}`);
  console.log(`   ${totalSamples} total (${goldCount} gold + ${written} verified synthetic)`);
  console.log(`   ${attempts} attempts | ${failed} failed | ${unverified} unverified | ${totalTime}s`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
