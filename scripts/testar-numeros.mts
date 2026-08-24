/** Confere a leitura de numero escrito por gente. */
import { numeroDeTexto } from "@/lib/documentos/contexto";

const CASOS: Array<[string, number]> = [
  ["2,5", 2.5],
  ["2.5", 2.5],
  ["0,5", 0.5],
  ["12,75", 12.75],
  ["12.75", 12.75],
  ["1.000", 1000],
  ["1.000,50", 1000.5],
  ["1.000.000", 1000000],
  ["1.000.000,99", 1000000.99],
  ["200000", 200000],
  ["30", 30],
  ["1.5", 1.5],
];

let falhas = 0;
for (const [entrada, esperado] of CASOS) {
  const obtido = Number(numeroDeTexto(entrada));
  const ok = obtido === esperado;
  if (!ok) falhas++;
  console.log(`  ${ok ? "ok  " : "FALHA"}  ${entrada.padEnd(14)} -> ${obtido}${ok ? "" : `   (esperado ${esperado})`}`);
}
console.log("");
console.log(falhas === 0 ? "todos passaram" : `${falhas} falha(s)`);
process.exit(falhas === 0 ? 0 : 1);
