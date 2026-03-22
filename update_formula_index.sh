sed -i 's/export { buildTemporal } from '\''\.\/temporal'\'';/export { buildTemporal } from '\''\.\/temporal'\'';\nexport { buildProbabilistic } from '\''\.\/probabilistic'\'';/' src/formula/index.ts
sed -i 's/import { buildTemporal } from '\''\.\/temporal'\'';/import { buildTemporal } from '\''\.\/temporal'\'';\nimport { buildProbabilistic } from '\''\.\/probabilistic'\'';/' src/formula/index.ts
sed -i 's/case '\''arithmetic'\'':/case '\''arithmetic'\'':\n      break;/' src/formula/index.ts
sed -i '/case '\''probabilistic.basic'\'':/d' src/formula/index.ts
sed -i '/case '\''arithmetic'\'':/i \    case '\''probabilistic.basic'\'':\n      perSentence = buildProbabilistic(sentences, atomEntries);\n      break;' src/formula/index.ts
