import { generateAtom } from './src/formula/atoms';

const str1 = 'toda persona que recibe una credencial activa puede ingresar a la biblioteca central';
const str2 = 'toda persona que ingresa a la biblioteca central puede consultar el repositorio digital';

console.log('str1 =>', generateAtom(str1));
console.log('str2 =>', generateAtom(str2));

const str3 = 'además, Laura es estudiante inscrita, Laura pagó su matrícula';
const str4 = 'todo estudiante inscrito que paga su matrícula recibe una credencial activa';
console.log('str3 =>', generateAtom(str3));
console.log('str4 =>', generateAtom(str4));
