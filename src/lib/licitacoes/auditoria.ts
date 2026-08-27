/**
 * Compliance da solução de licitações — motor próprio, tabelas próprias.
 *
 * A verificação em si (Receita, dívida ativa, sanções, punições, bureau) já
 * era genérica antes deste arquivo existir: as funções em
 * `src/lib/auditoria/fontes/*` recebem CNPJ e nome como texto simples, não um
 * `Pessoa` do Prisma, e `consolidar()`, o motor de regras, também só recebe
 * dados soltos. Reaproveitar essas funções não fere o isolamento entre
 * soluções — são chamadas a fontes externas, não tabelas de outra solução.
 *
 * O que este arquivo faz de próprio é o que não podia ser reaproveitado: a
 * ORQUESTRAÇÃO e a GRAVAÇÃO. `executarAuditoria` (gestão de ativos) grava em
 * `Auditoria`/`Consulta`, ligadas a `pessoaId`; aqui a mesma ideia grava em
 * `LicitanteAuditoria`/`LicitanteConsulta` ou `ParticipanteAuditoria`/
 * `ParticipanteConsulta`, ligadas às tabelas desta solução.
 *
 * Uma diferença deliberada: aqui a auditoria nunca bloqueia sozinha. Na
 * gestão de ativos, restrição bloqueia a parte de entrar em operação nova —
 * faz sentido, porque há dinheiro de terceiro em jogo numa cessão. Do lado
 * do licitante, bloquear impediria a própria empresa de ver o próprio
 * resultado. Do lado do participante de um certame, quem decide habilitar ou
 * inabilitar é sempre a comissão de licitação — o resultado automático é
 * insumo, registrado à parte do parecer, nunca a decisão em si.
 */
import type { LicitanteEmpresa, LicitacaoUsuario, ParticipanteCertame } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { consultarReceita } from "@/lib/auditoria/fontes/receita";
import { consultarPunicoes } from "@/lib/auditoria/fontes/transparencia";
import { consultarSancoes } from "@/lib/auditoria/fontes/sancoes";
import { consultarDividaAtiva } from "@/lib/auditoria/fontes/divida-ativa";
import { consultarBureau } from "@/lib/auditoria/fontes/bureau";
import { consolidar } from "@/lib/auditoria/analise";
import { somenteNumeros } from "@/lib/validacao";
import type { ResultadoAuditoria, ResultadoFonte } from "@/lib/auditoria/tipos";

/**
 * O núcleo puro: recebe CNPJ e nome, devolve o veredito. Sem gravar nada —
 * quem chama decide onde persistir.
 */
async function avaliarComplianceEmpresa(params: {
  documento: string;
  nome: string;
  valorReferencia?: number | null;
}): Promise<{ resultado: ResultadoAuditoria; fontes: ResultadoFonte[] }> {
  const documento = somenteNumeros(params.documento);
  const valorReferencia = params.valorReferencia ?? null;

  const [receita, punicoes, sancoes, dividaAtiva, bureau] = await Promise.all([
    documento.length === 14 ? consultarReceita(documento) : Promise.resolve(null),
    documento ? consultarPunicoes(documento) : Promise.resolve([]),
    consultarSancoes(params.nome),
    documento
      ? consultarDividaAtiva({ documento, tipoPessoa: "PJ", nome: params.nome, valorOperacao: valorReferencia })
      : Promise.resolve(null),
    documento ? consultarBureau(documento, "PJ", valorReferencia) : Promise.resolve(null),
  ]);

  const fontes: ResultadoFonte[] = [];
  if (receita) fontes.push(receita);
  fontes.push(...punicoes);
  fontes.push(sancoes);
  if (dividaAtiva) fontes.push(dividaAtiva);
  if (bureau) fontes.push(bureau);

  if (!documento) {
    fontes.push({
      fonte: "CADASTRO",
      status: "INDISPONIVEL",
      resumo: "Empresa sem CNPJ cadastrado — quase nenhuma fonte pôde ser consultada.",
      apontamentos: [
        {
          gravidade: "GRAVE",
          eixo: "CADASTRO",
          titulo: "Empresa sem CNPJ",
          detalhe: "Sem CNPJ não há como confirmar a empresa nem consultar qualquer base. Complete o cadastro.",
          fonte: "Sistema",
        },
      ],
    });
  }

  const resultado = consolidar({
    nome: params.nome,
    tipo: "PJ",
    dadosCadastrais: receita?.dados ?? null,
    representante: null,
    pep: false,
    valorReferencia,
    fontes,
  });

  return { resultado, fontes };
}

// ---------------------------------------------------------------------
// Frente do licitante
// ---------------------------------------------------------------------

export async function auditarLicitante(params: {
  licitante: LicitanteEmpresa;
  usuario: LicitacaoUsuario;
  licitacaoContaId: string;
}): Promise<{ auditoriaId: string; resultado: ResultadoAuditoria }> {
  const { licitante, usuario, licitacaoContaId } = params;

  const auditoria = await prisma.licitanteAuditoria.create({
    data: {
      licitacaoContaId,
      licitanteEmpresaId: licitante.id,
      situacao: "EM_ANDAMENTO",
      solicitadoPorId: usuario.id,
    },
  });

  const { resultado, fontes } = await avaliarComplianceEmpresa({
    documento: licitante.documento,
    nome: licitante.nome,
  });

  await prisma.licitanteConsulta.createMany({
    data: fontes.map((f) => ({
      licitacaoContaId,
      licitanteEmpresaId: licitante.id,
      licitanteAuditoriaId: auditoria.id,
      fonte: f.fonte,
      parametro: licitante.documento || licitante.nome,
      status: f.status === "CONCLUIDA" ? "CONCLUIDA" : "ERRO",
      resultado: (f.resultado ?? undefined) as never,
      resumo: f.resumo,
      erro: f.erro ?? null,
      concluidaEm: new Date(),
    })),
  });

  await prisma.licitanteAuditoria.update({
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

  await prisma.licitanteEmpresa.update({
    where: { id: licitante.id },
    data: {
      situacaoCompliance: resultado.idoneidade,
      capacidadePagamento: resultado.capacidade,
      pontuacao: resultado.pontuacao,
      complianceEm: new Date(),
      // Sinaliza para revisão manual; não trava a geração do envelope — ver
      // nota no topo do arquivo sobre por que este lado não bloqueia sozinho.
      bloqueada: resultado.idoneidade === "RESTRICAO",
    },
  });

  return { auditoriaId: auditoria.id, resultado };
}

// ---------------------------------------------------------------------
// Frente do ente público
// ---------------------------------------------------------------------

export async function auditarParticipante(params: {
  participante: ParticipanteCertame;
}): Promise<{ auditoriaId: string; resultado: ResultadoAuditoria }> {
  const { participante } = params;

  const auditoria = await prisma.participanteAuditoria.create({
    data: { participanteCertameId: participante.id, situacao: "EM_ANDAMENTO" },
  });

  const { resultado, fontes } = await avaliarComplianceEmpresa({
    documento: participante.documento,
    nome: participante.nome,
  });

  await prisma.participanteConsulta.createMany({
    data: fontes.map((f) => ({
      participanteCertameId: participante.id,
      participanteAuditoriaId: auditoria.id,
      fonte: f.fonte,
      parametro: participante.documento || participante.nome,
      status: f.status === "CONCLUIDA" ? "CONCLUIDA" : "ERRO",
      resultado: (f.resultado ?? undefined) as never,
      resumo: f.resumo,
      erro: f.erro ?? null,
      concluidaEm: new Date(),
    })),
  });

  await prisma.participanteAuditoria.update({
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

  // Só o resultado automático — a qualificação em si (`situacao`, `parecer`)
  // continua sendo escrita exclusivamente por `salvarParecer`, pela comissão.
  await prisma.participanteCertame.update({
    where: { id: participante.id },
    data: {
      complianceIdoneidade: resultado.idoneidade,
      compliancePontuacao: resultado.pontuacao,
      complianceEm: new Date(),
    },
  });

  return { auditoriaId: auditoria.id, resultado };
}
