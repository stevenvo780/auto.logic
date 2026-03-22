import { segment } from './src/segmenter';
import { analyzeDiscourse } from './src/discourse';

const text = 'Existe un procedimiento efectivo que, dado un número natural junto con una descomposición concreta de ese número como suma de dos naturales positivos, produce un certificado verificable de dicha descomposición; además, se exhiben explícitamente el número 10, el número 3 y el número 7, y se muestra efectivamente que 10 es la suma de 3 y 7; todo número para el que se exhiba una descomposición certificada tiene una representación auditable; y de toda representación auditable puede construirse un registro finito de verificación. Por lo tanto, Existe constructivamente un número con representación auditable y registro finito de verificación; concretamente, ese número es 10.';
const segmented = segment(text);
const analyzed = analyzeDiscourse(segmented);

for(const s of analyzed.sentences) {
  console.log(`TYPE: ${s.type}`);
  for(const c of s.clauses) {
      console.log(` - ${c.text}`);
  }
}
