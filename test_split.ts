import { splitClauses } from './src/segmenter/clause-splitter';

const text1 = 'Si todo estudiante inscrito que paga su matrícula recibe una credencial activa, y toda persona que recibe una credencial activa puede ingresar a la biblioteca central, y toda persona que ingresa a la biblioteca central puede consultar el repositorio digital, entonces cualquier estudiante inscrito que paga su matrícula puede consultar el repositorio digital';
const clauses1 = splitClauses(text1, 'es');
console.log("SENTENCE 1:", clauses1.map(c => c.text));

const text2 = 'además, Laura es estudiante inscrita, Laura pagó su matrícula, y si una persona puede consultar el repositorio digital o tiene autorización especial del decano, entonces puede descargar artículos científicos';
const clauses2 = splitClauses(text2, 'es');
console.log("\nSENTENCE 2:", clauses2.map(c => c.text));
