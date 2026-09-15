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
import { avaliarComplianceEmpresa } from "@/lib/auditoria/motor-empresa";
import type { ResultadoAuditoria } from "@/lib/auditoria/tipos";
import { emitirCertidao, temEmissaoAutomatica } from "@/lib/auditoria/fontes/infosimples";
import { classificarParticipante, type CertidaoDoParticipante } from "./classificacao";
import type { LeituraEdital } from "./leitura-edital";

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

  await classificar({ participante, resultado, emitirCertidoes: true });

  return { auditoriaId: auditoria.id, resultado };
}

/**
 * Reclassifica sem repetir a consulta às fontes externas.
 *
 * Serve para quando muda o que a comissão tem em mãos — documento anexado,
 * autenticidade conferida, edital lido — e não o que as fontes dizem sobre a
 * empresa. Reaproveita a última auditoria gravada; não gasta consulta nova.
 */
export async function reclassificarParticipante(participanteCertameId: string): Promise<boolean> {
  const participante = await prisma.participanteCertame.findUnique({ where: { id: participanteCertameId } });
  if (!participante) return false;

  const ultima = await prisma.participanteAuditoria.findFirst({
    where: { participanteCertameId, situacao: "CONCLUIDA" },
    orderBy: { criadoEm: "desc" },
  });
  if (!ultima) return false;

  await classificar({
    participante,
    resultado: {
      apontamentos: (ultima.apontamentos as never) ?? [],
      dadosCadastrais: (ultima.dadosCadastrais as never) ?? null,
      fontesIndisponiveis: (ultima.fontesIndisponiveis as never) ?? [],
    },
    emitirCertidoes: false,
  });

  return true;
}

/**
 * Certidões que a plataforma emite sozinha para um participante, direto na
 * fonte, sem depender de credencial do titular.
 *
 * Hoje só a CNDT: ela é exigência de habilitação em todo edital (regularidade
 * trabalhista), sai pelo CNPJ e não pede login no gov.br. As federais e as
 * estaduais exigiriam o certificado do PRÓPRIO participante, que a prefeitura
 * não tem — e não teria como ter.
 */
const CERTIDOES_AUTOMATICAS = ["CNDT"];

async function emitirCertidoesDoParticipante(
  participante: ParticipanteCertame,
  licitacaoContaId: string | null
): Promise<CertidaoDoParticipante[]> {
  if (!participante.documento) return [];

  const emitidas: CertidaoDoParticipante[] = [];

  for (const chave of CERTIDOES_AUTOMATICAS) {
    if (!temEmissaoAutomatica(chave)) continue;

    const r = await emitirCertidao({
      chaveCertidao: chave,
      parte: { documento: participante.documento, nome: participante.nome, uf: null },
      contexto: {
        solucao: "LICITACOES",
        contaId: licitacaoContaId,
        referencia: `Habilitação — ${participante.nome}`,
      },
    }).catch((erro) => ({ ok: false as const, erro: (erro as Error).message }));

    if (r.ok) {
      emitidas.push({ tipo: chave, resultado: r.certidao.resultado, apontamento: r.certidao.apontamento });
    }
    // Falha de emissão não vira certidão limpa: a ausência aparece depois
    // como requisito não atendido, que é o tratamento correto.
  }

  return emitidas;
}

/**
 * Cruza due diligence, edital e documentação, e grava a recomendação.
 *
 * Nunca escreve em `situacao` nem em `parecer`: aqueles são a decisão da
 * comissão. Aqui é insumo.
 */
export async function classificar(params: {
  participante: ParticipanteCertame;
  resultado: Pick<ResultadoAuditoria, "apontamentos" | "dadosCadastrais" | "fontesIndisponiveis">;
  /**
   * Emitir certidão custa dinheiro por consulta. Só a auditoria completa
   * emite; reclassificar depois de anexar um documento reaproveita o que já
   * foi emitido, em vez de gastar de novo a cada clique.
   */
  emitirCertidoes: boolean;
}): Promise<void> {
  const { participante, resultado } = params;

  const [certame, documentos] = await Promise.all([
    prisma.certame.findUnique({
      where: { id: participante.certameId },
      select: { requisitosExtraidos: true, licitacaoContaId: true },
    }),
    prisma.documentoParticipante.findMany({
      where: { participanteCertameId: participante.id },
      select: { tipo: true, autenticidadeConferida: true, autenticidadeResultado: true },
    }),
  ]);

  const certidoes = params.emitirCertidoes
    ? await emitirCertidoesDoParticipante(participante, certame?.licitacaoContaId ?? null)
    : ((participante.certidoesEmitidas as unknown as CertidaoDoParticipante[] | null) ?? []);

  const classificacao = classificarParticipante({
    apontamentos: resultado.apontamentos,
    dadosCadastrais: resultado.dadosCadastrais,
    fontesIndisponiveis: resultado.fontesIndisponiveis,
    leituraEdital: (certame?.requisitosExtraidos as unknown as LeituraEdital | null) ?? null,
    documentos,
    certidoes,
  });

  await prisma.participanteCertame.update({
    where: { id: participante.id },
    data: {
      recomendacao: classificacao.recomendacao,
      classificacao: classificacao as never,
      classificadoEm: new Date(),
      certidoesEmitidas: certidoes as never,
    },
  });
}
