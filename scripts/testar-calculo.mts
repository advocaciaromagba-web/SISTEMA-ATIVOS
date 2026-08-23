import { atualizarPrecatorio, calcularDeducoes, calcularCessao } from "../src/lib/calculo/precatorio.ts";
import { moeda } from "../src/lib/formato.ts";
import { dataDeTexto } from "../src/lib/calculo/indices.ts";

const brl = (v: number) => moeda(v);

// Caso 1: precatorio de 2018, natureza alimentar, atravessa a EC 113
const r = await atualizarPrecatorio({
  valorOriginal: 500000,
  dataBase: dataDeTexto("2018-06-01"),
  dataFinal: dataDeTexto("2026-08-01"),
  natureza: "NAO_TRIBUTARIA",
  jurosMensalAntigo: 0.5,
  dataApresentacao: dataDeTexto("2019-03-15"),
  anoOrcamentario: 2020,
  aplicarSumula17: true,
});

console.log("=".repeat(76));
console.log("ATUALIZACAO — R$ 500.000,00 de junho/2018 ate agosto/2026");
console.log("=".repeat(76));
console.log("Valor original  :", brl(r.valorOriginal));
console.log("Valor atualizado:", brl(r.valorAtualizado));
console.log("Correcao        :", brl(r.correcaoTotal));
console.log("Juros           :", brl(r.jurosTotal));
console.log("Variacao        :", r.variacaoPercentual.toFixed(2) + "%");
console.log("Meses no calculo:", r.linhas.length);
console.log("\nREGIME:");
r.regimeAplicado.forEach((x) => console.log("  -", x));
if (r.prazoConstitucional) console.log("\nPRAZO:", r.prazoConstitucional);
console.log("\nAVISOS:");
r.avisos.forEach((x) => console.log("  -", x));

const graca = r.linhas.filter((l) => l.periodoDeGraca);
console.log("\nMeses com juros afastados (SV 17):", graca.length,
  graca.length ? `(${graca[0].mes}/${graca[0].ano} a ${graca[graca.length-1].mes}/${graca[graca.length-1].ano})` : "");

console.log("\nPrimeiras 3 linhas:");
r.linhas.slice(0, 3).forEach((l) =>
  console.log(`  ${String(l.mes).padStart(2,"0")}/${l.ano} ${l.regime.padEnd(20)} indice=${l.indicePercentual ?? "-"} juros=${l.jurosPercentual}% saldo=${brl(l.saldo)}`));
console.log("Ultimas 3 linhas:");
r.linhas.slice(-3).forEach((l) =>
  console.log(`  ${String(l.mes).padStart(2,"0")}/${l.ano} ${l.regime.padEnd(20)} indice=${l.indicePercentual ?? "-"} juros=${l.jurosPercentual}% saldo=${brl(l.saldo)}`));

// Caso 2: deducoes
const d = calcularDeducoes({
  valorBruto: r.valorAtualizado,
  parcelaJuros: r.jurosTotal,
  natureza: "ALIMENTAR",
  mesesAcumulados: 98,
  jurosIsentosDeIr: true,
  honorariosContratuaisPercentual: 20,
});

console.log("\n" + "=".repeat(76));
console.log("DEDUCOES");
console.log("=".repeat(76));
console.log("Bruto              :", brl(d.valorBruto));
console.log("Honorarios (20%)   :", brl(d.honorariosContratuais));
console.log("Base do IR         :", brl(d.baseIr));
console.log("IRRF               :", brl(d.irrf), `(${d.aliquotaEfetiva.toFixed(2)}% efetivo)`);
console.log("Total de deducoes  :", brl(d.totalDeducoes));
console.log("LIQUIDO            :", brl(d.valorLiquido));
console.log("\nEXPLICACOES:");
d.explicacoes.forEach((x) => console.log("  -", x));

// Caso 3: cessao
const c = calcularCessao({ valorLiquido: d.valorLiquido, desagioPercentual: 35, comissoesPercentual: 3 });
console.log("\n" + "=".repeat(76));
console.log("CESSAO — desagio 35%, comissao 3%");
console.log("=".repeat(76));
console.log("Liquido a receber  :", brl(c.valorLiquido));
console.log("Valor da cessao    :", brl(c.valorCessao));
console.log("Desagio            :", brl(c.desagioValor));
console.log("Comissoes          :", brl(c.comissoes));
console.log("Cedente recebe     :", brl(c.liquidoParaCedente));
console.log("Ganho do comprador :", brl(c.ganhoBrutoComprador), `(retorno ${c.retornoPercentual.toFixed(2)}%)`);
