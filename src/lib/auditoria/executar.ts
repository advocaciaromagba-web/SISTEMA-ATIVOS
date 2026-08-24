/**
 * Executa a auditoria de uma parte e grava o dossiê.
 *
 * As fontes rodam em paralelo e nenhuma delas derruba a auditoria: cada uma
 * devolve o que conseguiu, e o que faltou aparece dito no parecer. Auditoria
 * que só funciona quando tudo está no ar não serve para nada.
 */
import type { Operacao, Pessoa, Usuario } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { registrar } from "@/lib/registro";
import { consultarReceita } from "./fontes/receita";
import { consultarPunicoes } from "./fontes/transparencia";
import { consultarSancoes } from "./fontes/sancoes";
import { consultarBureau } from "./fontes/bureau";
import { consultarProcesso } from "./fontes/datajud";
import { consultarDividaAtiva } from "./fontes/divida-ativa";
import { consultarImprobidade, consultarMandadosPrisao, infosimplesConfigurado } from "./fontes/infosimples";
import { consolidar } from "./analise";
import { conferirCertidoes, apontamentosDasCertidoes } from "./criminal";
import type { ResultadoAuditoria, ResultadoFonte } from "./tipos";

/** Valor contra o qual a capacidade de pagamento é medida. */
function valorDaOperacao(operacao: Operacao | null): number | null {
  if (!operacao) return null;
  if (operacao.valorNegociado != null) return Number(operacao.valorNegociado);
  if (operacao.valorFace != null) return Number(operacao.valorFace);
  return null;
}

export async function executarAuditoria(params: {
  pessoa: Pessoa;
  operacao?: Operacao | null;
  usuario: Usuario;
  organizacaoId: string;
}): Promise<{ auditoriaId: string; resultado: ResultadoAuditoria }> {
  const { pessoa, operacao = null, usuario, organizacaoId } = params;

  const valorReferencia = valorDaOperacao(operacao);

  // Abre o dossiê antes de consultar: se o processo cair no meio, fica o
  // registro de que a auditoria foi tentada e quando.
  const auditoria = await prisma.auditoria.create({
    data: {
      organizacaoId,
      pessoaId: pessoa.id,
      operacaoId: operacao?.id ?? null,
      situacao: "EM_ANDAMENTO",
      valorReferencia,
      solicitadoPorId: usuario.id,
    },
  });

  const documento = pessoa.documento ?? "";
  const ehPJ = pessoa.tipo === "PJ";

  // Papel da parte: o da operação auditada; sem operação, o mais exigente que
  // ela ocupa em qualquer operação. Cedente puxa a lista pesada de certidões.
  const vinculos = await prisma.parteOperacao.findMany({
    where: { pessoaId: pessoa.id, ...(operacao ? { operacaoId: operacao.id } : {}) },
    select: { papel: true },
  });
  const papeis = vinculos.map((v) => v.papel);
  const papel = papeis.includes("CEDENTE") ? "CEDENTE" : (papeis[0] ?? "CEDENTE");

  const certidoes = await prisma.certidao.findMany({
    where: { pessoaId: pessoa.id, organizacaoId },
    orderBy: { criadoEm: "desc" },
  });

  const situacoesCertidoes = conferirCertidoes({
    tipoPessoa: ehPJ ? "PJ" : "PF",
    papel,
    tipoAtivo: operacao?.tipoAtivo ?? null,
    certidoes,
  });

  // ----- consultas, todas ao mesmo tempo -----
  // Dados que as consultas de tribunal exigem, montados uma vez so.
  const dadosDaParte = {
    documento,
    nome: pessoa.nome,
    dataNascimento: pessoa.dataNascimento,
    uf: pessoa.enderecoUf,
  };

  const [receita, punicoes, sancoes, bureau, processo, dividaAtiva, mandados, improbidade] = await Promise.all([
    ehPJ && documento
      ? consultarReceita(documento)
      : Promise.resolve(null),
    documento ? consultarPunicoes(documento) : Promise.resolve([]),
    consultarSancoes(pessoa.nome),
    documento ? consultarBureau(documento, ehPJ ? "PJ" : "PF", valorReferencia) : Promise.resolve(null),
    operacao?.numeroProcesso ? consultarProcesso(operacao.numeroProcesso) : Promise.resolve(null),
    documento
      ? consultarDividaAtiva({
          documento,
          tipoPessoa: ehPJ ? "PJ" : "PF",
          nome: pessoa.nome,
          valorOperacao: valorReferencia,
        })
      : Promise.resolve(null),
    // O BNMP so existe para pessoa fisica; a improbidade vale para as duas.
    documento && !ehPJ && infosimplesConfigurado()
      ? consultarMandadosPrisao(dadosDaParte)
      : Promise.resolve(null),
    documento && infosimplesConfigurado() ? consultarImprobidade(dadosDaParte) : Promise.resolve(null),
  ]);

  const fontes: ResultadoFonte[] = [];
  if (receita) fontes.push(receita);
  fontes.push(...punicoes);
  fontes.push(sancoes);
  if (bureau) fontes.push(bureau);
  if (dividaAtiva) fontes.push(dividaAtiva);
  if (mandados) fontes.push(mandados);
  if (improbidade) fontes.push(improbidade);
  if (processo) fontes.push(processo);

  if (!documento) {
    fontes.push({
      fonte: "CADASTRO",
      status: "INDISPONIVEL",
      resumo: "Parte sem CPF/CNPJ cadastrado — quase nenhuma fonte pôde ser consultada.",
      apontamentos: [
        {
          gravidade: "GRAVE",
          eixo: "CADASTRO",
          titulo: "Parte sem documento",
          detalhe:
            "Sem CPF ou CNPJ não há como confirmar quem é a contraparte, nem consultar qualquer base. " +
            "Complete o cadastro e refaça a auditoria antes de usar esta parte em uma operação.",
          fonte: "Sistema",
        },
      ],
    });
  }

  const resultado = consolidar({
    nome: pessoa.nome,
    tipo: ehPJ ? "PJ" : "PF",
    dadosCadastrais: receita?.dados ?? null,
    representante: ehPJ ? { nome: pessoa.repNome, cpf: pessoa.repCpf } : null,
    pep: pessoa.pep,
    valorReferencia,
    fontes,
    apontamentosExtras: apontamentosDasCertidoes(situacoesCertidoes),
  });

  // ----- grava as consultas como prova do que foi visto -----
  await prisma.consulta.createMany({
    data: fontes.map((f) => ({
      organizacaoId,
      pessoaId: pessoa.id,
      operacaoId: operacao?.id ?? null,
      auditoriaId: auditoria.id,
      fonte: f.fonte,
      parametro: f.fonte === "DATAJUD" ? (operacao?.numeroProcesso ?? "") : documento || pessoa.nome,
      status: f.status === "CONCLUIDA" ? "CONCLUIDA" : "ERRO",
      resultado: (f.resultado ?? undefined) as never,
      resumo: f.resumo,
      erro: f.erro ?? null,
      solicitadoPorId: usuario.id,
      concluidaEm: new Date(),
    })),
  });

  await prisma.auditoria.update({
    where: { id: auditoria.id },
    data: {
      situacao: "CONCLUIDA",
      idoneidade: resultado.idoneidade,
      capacidade: resultado.capacidade,
      pontuacao: resultado.pontuacao,
      parecer: resultado.parecer,
      apontamentos: resultado.apontamentos as never,
      dadosCadastrais: (resultado.dadosCadastrais ?? undefined) as never,
      fontesIndisponiveis: resultado.fontesIndisponiveis as never,
      concluidaEm: new Date(),
    },
  });

  // ----- reflete o resultado na parte -----
  // O bloqueio é automático na restrição. Liberar exige justificativa de uma
  // pessoa, registrada — e é isso que separa uma trava de um aviso ignorável.
  const bloquear = resultado.idoneidade === "RESTRICAO";

  await prisma.pessoa.update({
    where: { id: pessoa.id },
    data: {
      situacaoCompliance: resultado.idoneidade,
      capacidadePagamento: resultado.capacidade,
      pontuacao: resultado.pontuacao,
      complianceEm: new Date(),
      ...(bloquear
        ? { bloqueada: true, liberadaPorId: null, liberadaEm: null, justificativaLiberacao: null }
        : { bloqueada: false }),
    },
  });

  await registrar({
    acao: "CONSULTAR",
    organizacaoId,
    usuarioId: usuario.id,
    entidade: "Auditoria",
    entidadeId: auditoria.id,
    detalhe: {
      parte: pessoa.nome,
      idoneidade: resultado.idoneidade,
      capacidade: resultado.capacidade,
      pontuacao: resultado.pontuacao,
      bloqueada: bloquear,
      fontes: fontes.map((f) => `${f.fonte}:${f.status}`).join(", "),
    },
  });

  return { auditoriaId: auditoria.id, resultado };
}

/**
 * A auditoria vence: empresa idônea hoje pode estar inapta em seis meses.
 * Passado esse prazo, a parte volta a exigir nova auditoria.
 */
export const VALIDADE_AUDITORIA_DIAS = 90;

export function auditoriaVencida(complianceEm: Date | null): boolean {
  if (!complianceEm) return true;
  const dias = (Date.now() - complianceEm.getTime()) / (1000 * 60 * 60 * 24);
  return dias > VALIDADE_AUDITORIA_DIAS;
}

/** Situação da parte para as travas do sistema. */
export type SituacaoParte = {
  liberada: boolean;
  motivo: string | null;
  precisaAuditar: boolean;
};

export function situacaoDaParte(pessoa: Pessoa): SituacaoParte {
  if (!pessoa.complianceEm) {
    return {
      liberada: false,
      motivo: "Esta parte ainda não passou por auditoria.",
      precisaAuditar: true,
    };
  }

  if (pessoa.bloqueada) {
    return {
      liberada: false,
      motivo: "A auditoria encontrou restrição nesta parte.",
      precisaAuditar: false,
    };
  }

  if (auditoriaVencida(pessoa.complianceEm)) {
    return {
      liberada: false,
      motivo: `A auditoria desta parte tem mais de ${VALIDADE_AUDITORIA_DIAS} dias e precisa ser refeita.`,
      precisaAuditar: true,
    };
  }

  return { liberada: true, motivo: null, precisaAuditar: false };
}
