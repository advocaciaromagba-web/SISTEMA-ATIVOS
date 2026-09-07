/**
 * Leva para o banco os planos que hoje estão escritos no código.
 *
 * Nenhum valor é inventado aqui: são exatamente os que já estão no ar. A
 * partir do momento em que rodar, quem manda é o banco, e o administrador
 * passa a alterar preço pela tela, sem deploy.
 *
 * Roda uma vez. Se rodar de novo, não sobrescreve o que o administrador já
 * alterou — só cria o que estiver faltando.
 *
 * Uso:
 *   npm run planos:semear            (cria o que falta)
 *   npm run planos:semear -- --forcar  (repõe os valores do código)
 */
import { PrismaClient } from "@prisma/client";

import { PLANOS } from "../src/lib/planos.ts";
import { PLANOS_AGRO } from "../src/lib/agro/planos.ts";
import { PLANOS_COMPLIANCE } from "../src/lib/compliance/planos.ts";
import { PLANOS_LICITACOES } from "../src/lib/licitacoes/planos.ts";
import { PLANOS_DILIGENCIA } from "../src/lib/diligencia/planos.ts";
import { PLANOS_VERIFICACAO } from "../src/lib/verificacao/planos.ts";

const prisma = new PrismaClient();
const forcar = process.argv.includes("--forcar");

/** Consulta cadastral não tem mensalidade: é saldo pré-pago. Fica sem planos. */
const ORIGEM = [
  { solucao: "GESTAO_ATIVOS", planos: PLANOS },
  { solucao: "AGROJUD", planos: PLANOS_AGRO },
  { solucao: "COMPLIANCE_EMPRESA", planos: PLANOS_COMPLIANCE },
  { solucao: "LICITACOES", planos: PLANOS_LICITACOES },
  { solucao: "DILIGENCIA_PESSOA", planos: PLANOS_DILIGENCIA },
  { solucao: "VERIFICACAO_DOCUMENTOS", planos: PLANOS_VERIFICACAO },
];

/** Só os planos de assinatura; a tabela global tem também itens avulsos. */
const CHAVES_DE_ASSINATURA = ["ESSENCIAL", "PROFISSIONAL", "MESA"];

const TODAS_AS_SOLUCOES = [
  ...ORIGEM.map((o) => o.solucao),
  "CONSULTA_CADASTRAL_SERASA",
];

async function principal() {
  console.log("\n=== Levando os planos do código para o banco ===\n");

  let criados = 0;
  let atualizados = 0;
  let mantidos = 0;

  for (const { solucao, planos } of ORIGEM) {
    const daAssinatura = planos.filter((p) => CHAVES_DE_ASSINATURA.includes(p.chave));

    for (const [indice, p] of daAssinatura.entries()) {
      const dados = {
        nome: p.nome,
        paraQuem: p.paraQuem ?? null,
        precoMensal: p.precoMensal,
        precoAnual: p.precoAnual,
        inclui: p.inclui ?? [],
        naoInclui: p.naoInclui ?? null,
        destaque: Boolean(p.destaque),
        ordem: indice,
      };

      const existente = await prisma.planoSolucao.findUnique({
        where: { solucao_chave: { solucao, chave: p.chave } },
      });

      if (!existente) {
        await prisma.planoSolucao.create({ data: { solucao, chave: p.chave, ...dados } });
        criados++;
        continue;
      }

      if (forcar) {
        await prisma.planoSolucao.update({ where: { id: existente.id }, data: dados });
        atualizados++;
      } else {
        mantidos++;
      }
    }
  }

  // Regras de teste: hoje sao 3 dias e 3 consultas para todas.
  for (const solucao of TODAS_AS_SOLUCOES) {
    const existente = await prisma.configuracaoSolucao.findUnique({ where: { solucao } });
    if (!existente) {
      await prisma.configuracaoSolucao.create({
        data: { solucao, diasDeTeste: 3, consultasGratisTeste: 3, atualizadoPor: "semear-planos" },
      });
    }
  }

  console.log(`planos criados: ${criados}`);
  console.log(`planos atualizados: ${atualizados}`);
  console.log(`planos mantidos como estavam: ${mantidos}${mantidos > 0 && !forcar ? " (use --forcar para repor os do código)" : ""}`);

  console.log("\n--- como ficou ---");
  for (const solucao of TODAS_AS_SOLUCOES) {
    const linhas = await prisma.planoSolucao.findMany({ where: { solucao }, orderBy: { ordem: "asc" } });
    const cfg = await prisma.configuracaoSolucao.findUnique({ where: { solucao } });
    const resumo = linhas.length
      ? linhas.map((l) => `${l.nome} R$ ${Number(l.precoMensal).toFixed(0)}`).join(" | ")
      : "sem planos (pré-pago)";
    console.log(`  ${solucao.padEnd(26)} ${resumo}  ·  teste ${cfg?.diasDeTeste ?? "?"} dias`);
  }
  console.log();
}

principal()
  .catch((erro) => {
    console.error("\nFalhou:", erro.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
