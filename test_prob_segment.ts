import { segment } from './src/segmenter';
import { analyzeDiscourse } from './src/discourse';

const text = 'La probabilidad previa de fraude en una transacción es 0.02. Si hay fraude, la probabilidad de que el sistema emita alerta roja es 0.93; si no hay fraude, la probabilidad de alerta roja es 0.04. Además, cuando ya hubo alerta roja, la probabilidad de que la revisión manual encuentre inconsistencias es 0.80 si sí hubo fraude y 0.10 si no hubo fraude. En una transacción concreta hubo alerta roja y la revisión manual encontró inconsistencias. Por lo tanto, La probabilidad posterior de fraude es aproximadamente 79.15%.';

const segmented = segment(text);
const analyzed = analyzeDiscourse(segmented);

console.log(analyzed.sentences.length);
for(let s=0; s<analyzed.sentences.length; s++) {
console.log("Analyzed len:", analyzed.sentences.length);
   console.log(`Sentence ${s}: ${analyzed.sentences[s].original}`);
   for(const c of analyzed.sentences[s].clauses) {
      console.log(`  - Clause [${c.role}]: ${c.text}`);
   }
}
