import { formalize } from './src/index';

const text = 'Si todo estudiante inscrito que paga su matrícula recibe una credencial activa, y toda persona que recibe una credencial activa puede ingresar a la biblioteca central, y toda persona que ingresa a la biblioteca central puede consultar el repositorio digital, entonces cualquier estudiante inscrito que paga su matrícula puede consultar el repositorio digital; además, Laura es estudiante inscrita, Laura pagó su matrícula, y si una persona puede consultar el repositorio digital o tiene autorización especial del decano, entonces puede descargar artículos científicos; sin embargo, nadie puede entrar al laboratorio químico sin autorización especial, y si Laura no tiene esa autorización, entonces Laura no entra al laboratorio químico aunque sí pueda descargar artículos científicos desde el repositorio digital.';

async function main() {
  const result = await formalize(text, { profile: 'classical.propositional' });
  console.log(result.atoms);
}
main();
