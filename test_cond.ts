import { segment } from './src/segmenter';
import { classifyClauses } from './src/discourse';

const sentences = segment('Si llueve, entonces la calle se moja.', 'es');
const analyzed = classifyClauses(sentences[0].clauses, 'es');
console.log(JSON.stringify(analyzed, null, 2));
