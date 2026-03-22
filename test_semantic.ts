import { extractSemanticHint } from './src/atoms/keyword-extractor';

const a = "toda persona que recibe una credencial activa puede ingresar a la biblioteca central";
const b = "toda persona que ingresa a la biblioteca central puede consultar el repositorio digital";

console.log('A:', extractSemanticHint(a, 'es'));
console.log('B:', extractSemanticHint(b, 'es'));
