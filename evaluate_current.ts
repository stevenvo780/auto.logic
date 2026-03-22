import { Autologic } from './src/autologic';
const al = new Autologic();

const tests = [
  { text: "Cada manuscrito aceptado fue evaluado por exactamente dos revisores distintos.", profile: "classical.first_order" },
  { text: "Para todos los números naturales a, b y d, si d divide a a y d divide a b, entonces d divide a a+b.", profile: "arithmetic" },
  { text: "Ana encuentra el documento. Diego sabe esto.", profile: "epistemic.s5" },
  { text: "Si un analista retiene la clave maestra, entonces está obligado a cesar el tratamiento forense.", profile: "deontic.standard" },
  { text: "Es necesario que si la red colapsa, los servidores se apaguen. Si es necesario que los conectores fallen, entonces el cluster cae.", profile: "modal.k" }
];

tests.forEach(t => {
  console.log(`\n\n===================== ${t.profile} =====================`);
  console.log(`TEXT: ${t.text}`);
  const r = al.formalize(t.text, { profile: t.profile as any });
  console.log(r.stCode || r.st);
});
