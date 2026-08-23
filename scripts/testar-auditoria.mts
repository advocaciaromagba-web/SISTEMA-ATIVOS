import { consultarReceita } from "../src/lib/auditoria/fontes/receita.ts";
import { consultarSancoes } from "../src/lib/auditoria/fontes/sancoes.ts";
import { consultarPunicoes } from "../src/lib/auditoria/fontes/transparencia.ts";
import { consultarBureau } from "../src/lib/auditoria/fontes/bureau.ts";
import { consolidar } from "../src/lib/auditoria/analise.ts";
import type { ResultadoFonte } from "../src/lib/auditoria/tipos.ts";

const CASOS: Array<{ nome: string; cnpj: string; valor: number | null; rep?: string }> = [
  { nome: "Petroleo Brasileiro S A Petrobras", cnpj: "33000167000101", valor: 900000, rep: "ANGELICA GARCIA COBAS LAUREANO" },
  { nome: "Banco do Brasil SA", cnpj: "00000000000191", valor: 5000000 },
  { nome: "Empresa Inexistente Ltda", cnpj: "11222333000181", valor: 900000 },
];

for (const caso of CASOS) {
  console.log("\n" + "=".repeat(78));
  console.log(caso.nome, "|", caso.cnpj, "| operacao:", caso.valor);
  console.log("=".repeat(78));

  const receita = await consultarReceita(caso.cnpj);
  const [punicoes, sancoes, bureau] = await Promise.all([
    consultarPunicoes(caso.cnpj),
    consultarSancoes(caso.nome),
    consultarBureau(caso.cnpj),
  ]);

  const fontes: ResultadoFonte[] = [receita, ...punicoes, sancoes, bureau];

  const r = consolidar({
    nome: caso.nome,
    tipo: "PJ",
    dadosCadastrais: receita.dados,
    representante: caso.rep ? { nome: caso.rep, cpf: null } : null,
    pep: false,
    valorReferencia: caso.valor,
    fontes,
  });

  console.log("IDONEIDADE :", r.idoneidade);
  console.log("CAPACIDADE :", r.capacidade);
  console.log("PONTUACAO  :", r.pontuacao);
  console.log("\nPARECER:\n" + r.parecer);
  console.log("\nAPONTAMENTOS:");
  for (const a of r.apontamentos) {
    console.log(`  [${a.gravidade}/${a.eixo}] ${a.titulo}`);
  }
  console.log("\nFONTES:");
  for (const f of fontes) console.log(`  ${f.fonte.padEnd(14)} ${f.status.padEnd(13)} ${f.resumo}`);
}
