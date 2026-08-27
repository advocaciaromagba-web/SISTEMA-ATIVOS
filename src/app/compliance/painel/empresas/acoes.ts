"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirEdicaoCompliance } from "@/lib/compliance/sessao";
import { somenteAlfanumerico, somenteNumeros, validarDocumento, validarEmail } from "@/lib/validacao";
import { auditarEmpresaCompliance } from "@/lib/compliance/auditoria";
import { gerarDocumento } from "@/lib/documentos";
import type { ContextoDocumento } from "@/lib/documentos/contexto";
import { contaComplianceComoOrganizacao, usuarioComplianceComoUsuario } from "@/lib/compliance/contexto";
import type { DadosDiligencia } from "@/lib/documentos/geradores/diligencia";
import type { Apontamento } from "@/lib/auditoria/tipos";

export type ResultadoAcao = { erro?: string; ok?: boolean };

const texto = (dados: FormData, chave: string) => (dados.get(chave)?.toString() ?? "").trim() || null;

/**
 * Cria a empresa e roda a auditoria automática, na hora — o cadastro passa
 * por compliance sempre, não num botão à parte.
 */
export async function salvarEmpresa(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { usuario, conta } = await exigirEdicaoCompliance();

  const nome = texto(dados, "nome");
  const documento = somenteAlfanumerico(texto(dados, "documento") ?? "");
  const email = texto(dados, "emailContato");

  if (!nome) return { erro: "Informe a razão social." };
  if (documento && !validarDocumento(documento, "PJ")) return { erro: "CNPJ inválido — confira os números." };
  if (email && !validarEmail(email)) return { erro: "E-mail inválido." };

  if (documento) {
    const jaExiste = await prisma.complianceEmpresa.findFirst({
      where: { complianceContaId: conta.id, documento },
      select: { id: true, nome: true },
    });
    if (jaExiste) return { erro: `Já existe uma empresa cadastrada com este CNPJ: ${jaExiste.nome}.` };
  }

  const empresa = await prisma.complianceEmpresa.create({
    data: {
      complianceContaId: conta.id,
      nome,
      documento: documento || "",
      inscricaoEstadual: texto(dados, "inscricaoEstadual"),
      emailContato: email,
      telefone: somenteNumeros(texto(dados, "telefone")) || null,
      enderecoRua: texto(dados, "enderecoRua"),
      enderecoNumero: texto(dados, "enderecoNumero"),
      enderecoComplemento: texto(dados, "enderecoComplemento"),
      enderecoBairro: texto(dados, "enderecoBairro"),
      enderecoCidade: texto(dados, "enderecoCidade"),
      enderecoUf: texto(dados, "enderecoUf")?.toUpperCase() ?? null,
      enderecoCep: somenteNumeros(texto(dados, "enderecoCep")) || null,
    },
  });

  if (empresa.documento) {
    try {
      await auditarEmpresaCompliance({ empresa, usuario, complianceContaId: conta.id });
    } catch (erro) {
      console.error("Auditoria automática da empresa falhou:", erro);
    }
  }

  revalidatePath("/compliance/painel/empresas");
  redirect(`/compliance/painel/empresas/${empresa.id}`);
}

/**
 * Libera manualmente uma empresa bloqueada por restrição — exige o papel de
 * DONO e uma justificativa mínima, mesmo padrão da Gestão de Ativos e de
 * Licitações, cada qual na sua própria tabela.
 */
export async function liberarEmpresaCompliance(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { usuario, conta } = await exigirEdicaoCompliance();

  if (usuario.papel !== "DONO") {
    return { erro: "Somente o responsável pela conta pode liberar uma empresa bloqueada." };
  }

  const complianceEmpresaId = texto(dados, "complianceEmpresaId");
  const justificativa = texto(dados, "justificativa") ?? "";
  if (!complianceEmpresaId) return { erro: "Empresa não informada." };
  if (justificativa.length < 20) {
    return { erro: "Escreva a justificativa da liberação — no mínimo uma frase explicando a decisão." };
  }

  const empresa = await prisma.complianceEmpresa.findFirst({
    where: { id: complianceEmpresaId, complianceContaId: conta.id },
  });
  if (!empresa) return { erro: "Empresa não encontrada." };

  await prisma.complianceEmpresa.update({
    where: { id: complianceEmpresaId },
    data: {
      bloqueada: false,
      liberadaPorNome: usuario.nome,
      liberadaEm: new Date(),
      justificativaLiberacao: justificativa,
    },
  });

  revalidatePath(`/compliance/painel/empresas/${complianceEmpresaId}`);
  return { ok: true };
}

export async function rebloquearEmpresaCompliance(complianceEmpresaId: string): Promise<ResultadoAcao> {
  const { usuario, conta } = await exigirEdicaoCompliance();
  if (usuario.papel !== "DONO") {
    return { erro: "Somente o responsável pela conta pode bloquear novamente uma empresa." };
  }

  const empresa = await prisma.complianceEmpresa.findFirst({
    where: { id: complianceEmpresaId, complianceContaId: conta.id },
  });
  if (!empresa) return { erro: "Empresa não encontrada." };

  await prisma.complianceEmpresa.update({
    where: { id: complianceEmpresaId },
    data: { bloqueada: true, liberadaPorNome: null, liberadaEm: null, justificativaLiberacao: null },
  });

  revalidatePath(`/compliance/painel/empresas/${complianceEmpresaId}`);
  return { ok: true };
}

export async function reauditarEmpresa(id: string): Promise<ResultadoAcao> {
  const { usuario, conta } = await exigirEdicaoCompliance();

  const empresa = await prisma.complianceEmpresa.findFirst({ where: { id, complianceContaId: conta.id } });
  if (!empresa) return { erro: "Empresa não encontrada." };

  await auditarEmpresaCompliance({ empresa, usuario, complianceContaId: conta.id });

  revalidatePath(`/compliance/painel/empresas/${id}`);
  return { ok: true };
}

// ---------------------------------------------------------------------
// Certidões
// ---------------------------------------------------------------------

const TIPOS_CERTIDAO = [
  "CERTIDAO_TRIBUTOS_FEDERAIS",
  "CERTIDAO_FGTS",
  "CNDT",
  "CERTIDAO_FALENCIA_CONCORDATA",
  "OUTRO",
];

export async function anexarCertidao(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { conta } = await exigirEdicaoCompliance();

  const complianceEmpresaId = texto(dados, "complianceEmpresaId");
  const tipo = texto(dados, "tipo") ?? "OUTRO";
  const validaAte = texto(dados, "validaAte");
  const arquivo = dados.get("arquivo");

  if (!complianceEmpresaId) return { erro: "Empresa não informada." };
  if (!TIPOS_CERTIDAO.includes(tipo)) return { erro: "Tipo de certidão desconhecido." };
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Selecione um arquivo." };
  if (arquivo.size > 10 * 1024 * 1024) return { erro: "Arquivo maior que 10 MB." };

  const empresa = await prisma.complianceEmpresa.findFirst({
    where: { id: complianceEmpresaId, complianceContaId: conta.id },
  });
  if (!empresa) return { erro: "Empresa não encontrada." };

  const bytes = Buffer.from(await arquivo.arrayBuffer());

  await prisma.complianceCertidao.create({
    data: {
      complianceEmpresaId,
      tipo,
      origem: "APRESENTADA",
      nomeArquivo: arquivo.name,
      arquivo: bytes,
      arquivoTipo: arquivo.type || null,
      emitidaEm: new Date(),
      validaAte: validaAte ? new Date(validaAte) : null,
    },
  });

  revalidatePath(`/compliance/painel/empresas/${complianceEmpresaId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------
// Relatório assinado
// ---------------------------------------------------------------------

const ROTULO_FONTE: Record<string, string> = {
  RECEITA_CNPJ: "Receita Federal",
  DIVIDA_ATIVA_UNIAO: "PGFN — dívida ativa da União",
  SANCOES_OFAC: "OFAC",
  CEIS: "CEIS",
  CNEP: "CNEP",
  CEPIM: "CEPIM",
  BUREAU: "Bureau de crédito",
  CADASTRO: "Cadastro interno",
};

/**
 * Gera o relatório de compliance assinado, reaproveitando o mesmo documento
 * que a Gestão de Ativos usa para due diligence (`RELATORIO_DILIGENCIA`).
 *
 * O gerador já sabe funcionar sem operação vinculada — é lógica de
 * renderização genérica, montada a partir de dados soltos (`DadosDiligencia`),
 * não uma tabela de outra solução. O que muda aqui é de onde os dados vêm:
 * da auditoria própria desta solução, não de `Auditoria`/`Pessoa`.
 */
export async function gerarRelatorio(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { usuario, conta } = await exigirEdicaoCompliance();

  const complianceEmpresaId = texto(dados, "complianceEmpresaId");
  if (!complianceEmpresaId) return { erro: "Empresa não informada." };

  const empresa = await prisma.complianceEmpresa.findFirst({
    where: { id: complianceEmpresaId, complianceContaId: conta.id },
  });
  if (!empresa) return { erro: "Empresa não encontrada." };

  const auditoria = await prisma.complianceAuditoria.findFirst({
    where: { complianceEmpresaId, situacao: "CONCLUIDA" },
    orderBy: { criadoEm: "desc" },
    include: { consultas: true },
  });

  const certidoes = await prisma.complianceCertidao.findMany({ where: { complianceEmpresaId } });

  const diligencia: DadosDiligencia = {
    partes: [
      {
        nome: empresa.nome,
        papel: "Empresa verificada",
        documento: empresa.documento,
        qualificacao: empresa.nome,
        identificacao: `CNPJ ${empresa.documento}`,
        idoneidade: auditoria?.idoneidade ?? null,
        capacidade: auditoria?.capacidade ?? null,
        pontuacao: auditoria?.pontuacao ?? null,
        parecer: auditoria?.parecer ?? null,
        auditadaEm: auditoria?.criadoEm ?? null,
        apontamentos: ((auditoria?.apontamentos ?? []) as unknown as Apontamento[]) ?? [],
        fontes:
          auditoria?.consultas.map((c) => ({
            fonte: ROTULO_FONTE[c.fonte] ?? c.fonte,
            status: c.status,
            resumo: c.resumo,
            consultadaEm: c.concluidaEm ?? c.criadoEm,
          })) ?? [],
        certidoes: certidoes.map((c) => ({
          nome: c.tipo,
          orgao: c.origem === "EMITIDA" ? "Emitida na fonte" : "Apresentada pela empresa",
          resultado: "NADA_CONSTA",
          natureza: "NENHUMA",
          apontamento: null,
          emitidaEm: c.emitidaEm,
          validaAte: c.validaAte,
          obrigatoria: false,
          estado: c.validaAte && c.validaAte < new Date() ? "VENCIDA" : "OK",
        })),
      },
    ],
    responsavel: {
      nome: texto(dados, "responsavelNome") || usuario.nome,
      cargo: texto(dados, "responsavelCargo") || "Responsável pela análise de compliance",
      registro: texto(dados, "responsavelRegistro"),
    },
    solicitante: texto(dados, "solicitante"),
    validadeDias: Number(texto(dados, "validadeDias")) > 0 ? Number(texto(dados, "validadeDias")) : 30,
  };

  const contexto: ContextoDocumento = {
    organizacao: contaComplianceComoOrganizacao(conta),
    operacao: null,
    usuario: usuarioComplianceComoUsuario(usuario),
    campos: {},
    agora: new Date(),
    diligencia,
  };

  let gerado;
  try {
    gerado = await gerarDocumento("RELATORIO_DILIGENCIA", contexto);
  } catch (erro) {
    return { erro: `Não foi possível gerar o relatório: ${(erro as Error).message}` };
  }

  await prisma.complianceDocumento.create({
    data: {
      complianceEmpresaId,
      titulo: gerado.titulo,
      arquivoNome: gerado.nomeArquivo,
      arquivo: gerado.buffer,
      hashSha256: gerado.hashSha256,
    },
  });

  revalidatePath(`/compliance/painel/empresas/${complianceEmpresaId}`);
  return { ok: true };
}
