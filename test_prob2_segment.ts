import { segment } from './src/segmenter';
import { analyzeDiscourse } from './src/discourse';

const text = 'Además, cuando ya hubo alerta roja, la probabilidad de que la revisión manual encuentre inconsistencias es 0.80 si sí hubo fraude y 0.10 si no hubo fraude.';
const segmented = segment(text);
const analyzed = analyzeDiscourse(segmented);

console.log('Type:', analyzed.sentences[0].type);
for(const c of analyzed.sentences[0].clauses) {
  console.log(`  - [${c.role}]: ${c.text}`);
}
