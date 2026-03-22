import { LLMParsedResult, LLMConfig } from './llm-parser';
import { LogicProfile } from './types';

let pipeline: any = null;

/**
 * Carga estática asíncrona de Transformers.js solo si es solicitado por el usuario,
 * garantizando que Node.js no reviente y los navegadores usen WebAssembly.
 */
export async function runLocalInference(text: string, profile: LogicProfile, systemPrompt: string): Promise<LLMParsedResult> {
  if (!pipeline) {
    try {
      // Import dinámico para que no sea un hard dependency 
      const { pipeline: trPipeline, env } = await Function('return import("@xenova/transformers")')();
      
      // Optimizaciones de entorno (Cache en Browser, local dir en Node)
      env.allowLocalModels = true;
      
      // Cargamos un SLM especializado
      const modelName = 'Xenova/Qwen1.5-0.5B-Chat'; 
      pipeline = await trPipeline('text-generation', modelName, { 
        quantized: true, // Crucial para la memoria del navegador (pesará < 300MB)
      });
    } catch (e: any) {
      throw new Error(`Error cargando Transformers.js: ${e.message}. Asegúrate de instalar @xenova/transformers para usar la capa local.`);
    }
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Formalize this text:\n\n${text}` }
  ];

  // Transformers.js template apply
  const chatOutput = await pipeline(messages, {
    max_new_tokens: 512,
    temperature: 0.1,
    do_sample: false
  });

  const rawContent = chatOutput[0].generated_text;
  
  try {
    // Si el SLM escupe Markdown (ej. ```json ... ```), extraemos solo el bloque JSON
    const jsonMatch = rawContent.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    const parseable = jsonMatch ? jsonMatch[1] : rawContent;
    return JSON.parse(parseable) as LLMParsedResult;
  } catch (e) {
    throw new Error(`Fallo extrayendo JSON desde ML Local. Respuesta cruda: ${rawContent}`);
  }
}
