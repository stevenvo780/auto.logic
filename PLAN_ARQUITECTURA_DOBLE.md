# Plan Arquitectónico: Autologic de Doble Capa (Local y en Navegador)

Este documento detalla la implementación de una arquitectura en dos fases diseñada para procesar texto legal ofuscado y traducirlo a Lógica Proposicional Situada sin depender de APIs de pago ni servidores externos.

## Visión General
El sistema constará de dos capas principales que operan de manera 100% isomórfica (Node.js y Browser):
1. **Capa 1: Autologic NL Linter (Reglas Sintácticas Rapidas).** Actúa como un "ESLint" para lógica natural. Asegura que el texto es un candidato viable para ser formalizado.
2. **Capa 2: Motor SLM Local (Transformers.js / WebLLM).** Traduce el texto validado a nuestro formato AST usando un Modelo de Lenguaje Pequeño (SLM) cuantizado que corre en la RAM/GPU del usuario.

---

## Capa 1: Linter de Lenguaje Lógico (Natural Language Linter)

**Objetivo:** Interceptar el texto mal estructurado antes de desperdiciar ciclos de cómputo (o frustrar al modelo neuronal) proporcionando feedback en tiempo real al usuario.

### Motor de Reglas Heurísticas
El evaluador correrá de manera síncrona (inmediata al teclear) y escaneará el texto buscando:

1. **Regla de Ambigüedad Anafórica:**
   - Detectar exceso de pronombres relativos ("este", "aquel", "el cual") sin identificadores claros o a gran distancia del sujeto.
2. **Regla de Densidad Cognitiva (Legibilidad Jurídica):**
   - Marcar oraciones con más de 40 palabras sin signos de puntuación como "Fatigadas". Un modelo local pequeño falla con contextos kilométricos sin descansos.
3. **Regla de Conectores Lógicos Faltantes:**
   - Exigir la presencia empírica de indicadores de conclusión (ej. *por lo tanto, en consecuencia, ergo*) o indicadores relacionales (ej. *si... entonces*, *si y solo si*). Si es pura prosa descriptiva, se emite un Warning: "No parece una estructura argumentativa".
4. **Regla de Cuantificación Difusa:**
   - Advertir sobre términos no formalizables en lógica clásica clásica: "frecuentemente", "la mayoría de veces", "casi nunca", recomendando reemplazarlos por universales o existenciales definidos.

**Salida:** Un array de objetos `Diagnostic { start: number, end: number, message: string, severity: 'warning' | 'error' }` listo para integrarse a editores como Monaco (VS Code en web).

---

## Capa 2: Motor de Inferencia SLM (Transformers.js)

**Objetivo:** Usar Inteligencia Artificial local para agrupar proposiciones situadas en un AST válido, reemplazando a OpenAI/Anthropic.

### Stack Tecnológico
- **Librería:** `@xenova/transformers` (exportado isomorficamente).
- **Formato:** Modelos ONNX cuantizados (peso < 500MB, idealmente ~150-300MB para carga web).
- **Modelo Caché:** Los navegadores usan Cache API (IndexedDB) para descargar el modelo una sola vez, luego carga instantáneamente.

### Estrategia de Inferencia
1. **El Modelo:** Un SLM optimizado para seguimiento de instrucciones (ej. un derivado de *Phi-3-mini* muy cuantizado, o *SmolLM-135M*).
2. **Prompt Restringido:** Exactamente igual al que diseñamos (`buildSystemPrompt`), exigiendo que la salida sea un string JSON adherido a `LLMParsedResult`.
3. **Fase Fallback:** Si el Linter reporta errores críticos pero el usuario fuerza la "Formalización", el SLM intentará inferir la solución reparando implícitamente los vacíos contextuales (usando su capacidad atencional).

---

## Flujo de Trabajo (Pipeline Completo)

1. **Entrada de Texto:** El usuario pega un párrafo jurídico denso.
2. **Fase Linter (T = 5ms):** La función `nlLinter(text)` ejecuta las Reglas Heurísticas.
3. **Feedback Visual:** Si hay errores (ej. "Oración de 80 palabras"), la UI muestra alertas. El usuario puede corregir.
4. **Compilación Desencadenada:** El usuario presiona [Generar Formalización].
5. **Carga Estática:** Transfomers.js verifica si el modelo está en caché. Si no, lo descarga y lo monta (solo ocurre la primera vez).
6. **Inferencia (T = 500ms - 2000ms):** El SLM local recibe el texto y el prompt. Pasa los tensores produciendo la abstracción JSON.
7. **Parsado a ST:** El JSON se convierte al formato nativo AST de Autologic y luego al código `.st` mediante la función existente `llmResultToST()`.

---

## Hoja de Ruta de Implementación (Next Steps)

- [ ] **Paso 1:** Crear `src/nl-linter/index.ts` con el motor de reglas (con regex compuestas pero eficientes).
- [ ] **Paso 2:** Crear la interfaz `LinterRule` e implementar las 4 reglas base.
- [ ] **Paso 3:** Modificar `src/formalize.ts` para que pase opcionalmente por el linter antes o en paralelo a `parseTextWithLLM`.
- [ ] **Paso 4:** Incluir dinámicamente `@xenova/transformers` o construir un `local-inference.ts` que actúe bajo la misma interfaz `parseTextWithLLM(text, profile, { provider: 'local' })`.
