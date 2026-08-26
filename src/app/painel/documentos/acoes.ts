"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirEdicao } from "@/lib/sessao";
import { registrar } from "@/lib/registro";
import { gerarDocumento, tipoExiste, CATALOGO_POR_CHAVE } from "@/lib/documentos";
import { situacaoDaParte } from "@/lib/auditoria/executar";
import { conferirCertidoes, pendenciasObrigatorias } from "@/lib/auditoria/criminal";
import type { Pessoa } from "@prisma/client";
import type { Apontamento } from "@/lib/auditoria/tipos";
import type { DadosDiligencia } from "@/lib/documentos/geradores/diligencia";
import { identificacao, nomeCurto, qualificar } from "@/lib/documentos/qualificacao";
import { PAPEIS } from "@/lib/documentos/catalogo";
import { registrarConsumo } from "../avulsos/acoes";
import type { ContextoDocumento } from "@/lib/documentos/contexto";
import type { ResultadoAcao } from "../pessoas/acoes";

/**
 * Junta, para o relatório de due diligence, tudo o que já foi apurado sobre
 * cada parte: a última auditoria, as consultas que a embasaram e as certidões
 * apresentadas.
 *
 * É montado na hora de gerar, e não guardado pronto, porque o relatório precisa
 * refletir o estado atual — inclusive as certidões que venceram desde a última
 * auditoria.
 */
async function montarDiligencia(
  operacao: { id: string; tipoAtivo: string; partes: Array<{ papel: string; pessoa: Pessoa }> },
  organizacaoId: string,
  campos: Record<string, string>,
  nomePadraoResponsavel: string
): Promise<DadosDiligencia> {
  const partes: DadosDiligencia["partes"] = [];

  for (const vinculo of operacao.partes) {
    const pessoa = vinculo.pessoa;

    const [auditoria, certidoes] = await Promise.all([
      prisma.auditoria.findFirst({
        where: { pessoaId: pessoa.id, organizacaoId, situacao: "CONCLUIDA" },
        orderBy: { criadoEm: "desc" },
        include: { consultas: true },
      }),
      prisma.certidao.findMany({
        where: { pessoaId: pessoa.id, organizacaoId },
        orderBy: { criadoEm: "desc" },
      }),
    ]);

    const situacoes = conferirCertidoes({
      tipoPessoa: pessoa.tipo === "PJ" ? "PJ" : "PF",
      papel: vinculo.papel,
      tipoAtivo: operacao.tipoAtivo,
      certidoes,
    });

    partes.push({
      nome: nomeCurto(pessoa),
      papel: PAPEIS[vinculo.papel as keyof typeof PAPEIS]?.replace(/ \(.*\)$/, "") ?? vinculo.papel,
      documento: pessoa.documento,
      qualificacao: qualificar(pessoa),
      identificacao: identificacao(pessoa),
      idoneidade: auditoria?.idoneidade ?? null,
      capacidade: auditoria?.capacidade ?? null,
      pontuacao: auditoria?.pontuacao ?? null,
      parecer: auditoria?.parecer ?? null,
      auditadaEm: auditoria?.criadoEm ?? null,
      apontamentos: ((auditoria?.apontamentos ?? []) as unknown as Apontamento[]) ?? [],
      fontes:
        auditoria?.consultas.map((c) => ({
          fonte: c.fonte,
          status: c.status,
          resumo: c.resumo,
          consultadaEm: c.concluidaEm ?? c.criadoEm,
        })) ?? [],
      certidoes: situacoes.map((s) => ({
        nome: s.exigencia.tipo.nome,
        orgao: s.exigencia.tipo.orgao,
        resultado: s.certidao?.resultado ?? "PENDENTE",
        natureza: s.certidao?.natureza ?? "NENHUMA",
        apontamento: s.certidao?.apontamento ?? null,
        emitidaEm: s.certidao?.emitidaEm ?? null,
        validaAte: s.certidao?.validaAte ?? null,
        obrigatoria: s.exigencia.obrigatoria,
        estado: s.estado,
      })),
    });
  }

  return {
    partes,
    responsavel: {
      nome: campos.responsavelNome?.trim() || nomePadraoResponsavel,
      cargo: campos.responsavelCargo?.trim() || "Responsável pela análise de contraparte",
      registro: campos.responsavelRegistro?.trim() || null,
    },
    solicitante: campos.solicitante?.trim() || null,
    validadeDias: Number(campos.validadeDias) > 0 ? Number(campos.validadeDias) : 30,
  };
}

/**
 * Gera o documento e guarda o arquivo no banco.
 *
 * O arquivo fica guardado junto com um retrato dos dados usados. Meses depois,
 * quando alguém perguntar "de onde saiu este número no contrato", a resposta
 * está no próprio registro — e não no cadastro atual, que já mudou.
 */
export async function gerarEsalvar(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { usuario, organizacao } = await exigirEdicao();

  const tipo = (dados.get("tipo")?.toString() ?? "").trim();
  const operacaoId = (dados.get("operacaoId")?.toString() ?? "").trim() || null;
  const licitanteId = (dados.get("licitanteId")?.toString() ?? "").trim() || null;

  if (!tipoExiste(tipo)) return { erro: "Tipo de documento desconhecido." };

  const definicao = CATALOGO_POR_CHAVE[tipo];

  // Só os campos declarados no catálogo entram — o resto do formulário é ruído.
  const campos: Record<string, string> = {};
  for (const c of definicao.campos ?? []) {
    campos[c.chave] = (dados.get(`campo_${c.chave}`)?.toString() ?? "").trim();
  }

  const operacao = operacaoId
    ? await prisma.operacao.findFirst({
        where: { id: operacaoId, organizacaoId: organizacao.id },
        include: { partes: { include: { pessoa: true } } },
      })
    : null;

  if (operacaoId && !operacao) return { erro: "Operação não encontrada." };

  // Declarações de licitação pedem a empresa do cadastro próprio da
  // solução (LicitanteEmpresa), não a operação nem a Pessoa da gestão de ativos.
  const licitante = definicao.exigeLicitante && licitanteId
    ? await prisma.licitanteEmpresa.findFirst({ where: { id: licitanteId, organizacaoId: organizacao.id } })
    : null;

  if (definicao.exigeLicitante && licitanteId && !licitante) {
    return { erro: "Empresa licitante não encontrada." };
  }

  // O relatório de due diligence é o único documento que atravessa as travas.
  // Ele não cria obrigação para ninguém: ele DESCREVE a situação, inclusive a
  // ruim. Bloqueá-lo por falta de certidão seria impedir de escrever no laudo
  // justamente que a certidão falta.
  const ehRelatorio = tipo === "RELATORIO_DILIGENCIA";

  // Trava de auditoria na saída: nenhum documento é gerado com parte bloqueada
  // ou sem auditoria. É o último ponto antes de o papel existir no mundo — e o
  // documento é justamente o que dá aparência de legitimidade à operação.
  if (operacao && !ehRelatorio) {
    const impedidas = operacao.partes
      .map((p) => ({ nome: p.pessoa.nome, situacao: situacaoDaParte(p.pessoa) }))
      .filter((p) => !p.situacao.liberada);

    if (impedidas.length > 0) {
      const lista = impedidas.map((p) => `${p.nome} (${p.situacao.motivo})`).join("; ");
      return {
        erro:
          `A auditoria impede a geração deste documento. ${lista} ` +
          "Abra o cadastro de cada parte para auditar ou tratar o apontamento.",
      };
    }

    // Segunda trava: certidões obrigatórias do papel de cada parte. Num
    // precatório, a lista criminal do cedente é obrigatória — é o ativo mais
    // usado para tirar patrimônio do alcance da Justiça.
    const certidoesPorPessoa = await prisma.certidao.findMany({
      where: {
        organizacaoId: organizacao.id,
        pessoaId: { in: operacao.partes.map((p) => p.pessoaId) },
      },
    });

    const semCertidao: string[] = [];

    for (const parte of operacao.partes) {
      const pendentes = pendenciasObrigatorias(
        conferirCertidoes({
          tipoPessoa: parte.pessoa.tipo === "PJ" ? "PJ" : "PF",
          papel: parte.papel,
          tipoAtivo: operacao.tipoAtivo,
          certidoes: certidoesPorPessoa.filter((c) => c.pessoaId === parte.pessoaId),
        })
      );

      if (pendentes.length > 0) {
        semCertidao.push(`${parte.pessoa.nome}: ${pendentes.join(", ")}`);
      }
    }

    if (semCertidao.length > 0) {
      return {
        erro:
          "Faltam certidões obrigatórias antes de gerar este documento. " +
          `${semCertidao.join(" | ")}. ` +
          "A lista com o endereço de cada órgão está na tela da parte, em Certidões.",
      };
    }
  }

  const contexto: ContextoDocumento = {
    organizacao,
    operacao,
    usuario,
    campos,
    agora: new Date(),
    licitante,
    // O relatório de due diligence é o único documento que precisa varrer o
    // histórico inteiro de auditoria e certidões de cada parte.
    diligencia:
      tipo === "RELATORIO_DILIGENCIA" && operacao
        ? await montarDiligencia(operacao, organizacao.id, campos, usuario.nome)
        : undefined,
  };

  let gerado;
  try {
    gerado = await gerarDocumento(tipo, contexto);
  } catch (erro) {
    return { erro: `Não foi possível gerar o documento: ${(erro as Error).message}` };
  }

  // Versão: quantos documentos deste tipo já existem nesta operação.
  const anteriores = await prisma.documento.count({
    where: { organizacaoId: organizacao.id, tipo, operacaoId },
  });

  const documento = await prisma.documento.create({
    data: {
      organizacaoId: organizacao.id,
      operacaoId,
      tipo,
      titulo: gerado.titulo,
      versao: anteriores + 1,
      dados: {
        campos,
        pendencias: gerado.pendencias,
        // Retrato de quem eram as partes no momento da geração.
        partes:
          operacao?.partes.map((p) => ({
            papel: p.papel,
            nome: p.pessoa.nome,
            documento: p.pessoa.documento,
            comissaoPercentual: p.comissaoPercentual != null ? Number(p.comissaoPercentual) : null,
          })) ?? [],
        // Retrato da empresa licitante, nas declarações de habilitação.
        licitante: licitante ? { nome: licitante.nome, documento: licitante.documento } : null,
      } as never,
      arquivoNome: gerado.nomeArquivo,
      arquivo: gerado.buffer,
      hashSha256: gerado.hashSha256,
      status: "GERADO",
      criadoPorId: usuario.id,
    },
  });

  await registrarConsumo(organizacao.id, "DOCUMENTO");

  await registrar({
    acao: "GERAR_DOCUMENTO",
    organizacaoId: organizacao.id,
    usuarioId: usuario.id,
    entidade: "Documento",
    entidadeId: documento.id,
    detalhe: {
      tipo,
      operacao: operacao?.codigo ?? null,
      licitante: licitante?.nome ?? null,
      hash: gerado.hashSha256,
      pendencias: gerado.pendencias.length,
    },
  });

  revalidatePath("/painel/documentos");
  if (operacaoId) revalidatePath(`/painel/operacoes/${operacaoId}`);

  redirect(`/painel/documentos/${documento.id}`);
}

export async function excluirDocumento(id: string): Promise<ResultadoAcao> {
  const { usuario, organizacao } = await exigirEdicao();

  const documento = await prisma.documento.findFirst({ where: { id, organizacaoId: organizacao.id } });
  if (!documento) return { erro: "Documento não encontrado." };

  // Documento já enviado para assinatura vira parte da história da operação.
  if (documento.status === "ASSINADO" || documento.status === "ENVIADO_ASSINATURA") {
    return { erro: "Documento já enviado para assinatura não pode ser excluído. Cancele-o." };
  }

  await prisma.documento.delete({ where: { id } });
  await registrar({
    acao: "EXCLUIR",
    organizacaoId: organizacao.id,
    usuarioId: usuario.id,
    entidade: "Documento",
    entidadeId: id,
    detalhe: { tipo: documento.tipo, titulo: documento.titulo },
  });

  revalidatePath("/painel/documentos");
  redirect("/painel/documentos");
}

export async function cancelarDocumento(id: string): Promise<ResultadoAcao> {
  const { usuario, organizacao } = await exigirEdicao();

  const documento = await prisma.documento.findFirst({ where: { id, organizacaoId: organizacao.id } });
  if (!documento) return { erro: "Documento não encontrado." };

  await prisma.documento.update({ where: { id }, data: { status: "CANCELADO" } });
  await registrar({
    acao: "EDITAR",
    organizacaoId: organizacao.id,
    usuarioId: usuario.id,
    entidade: "Documento",
    entidadeId: id,
    detalhe: { cancelado: true },
  });

  revalidatePath(`/painel/documentos/${id}`);
  return { ok: true };
}
