import { splitClauses } from './src/segmenter/clause-splitter';
console.log(JSON.stringify(splitClauses("Si llueve, entonces la calle se moja."), null, 2));
