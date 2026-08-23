"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirEdicao } from "@/lib/sessao";
import { registrar } from "@/lib/registro";
import { gerarDocumento, tipoExiste, CATALOGO_POR_CHAVE } from "@/lib/documentos";
import { situacaoDaParte } from "@/lib/auditoria/executar";
import type { ContextoDocumento } from "@/lib/documentos/contexto";
import type { ResultadoAcao } from "../pessoas/acoes";

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

  // Trava de auditoria na saída: nenhum documento é gerado com parte bloqueada
  // ou sem auditoria. É o último ponto antes de o papel existir no mundo — e o
  // documento é justamente o que dá aparência de legitimidade à operação.
  if (operacao) {
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
  }

  const contexto: ContextoDocumento = {
    organizacao,
    operacao,
    usuario,
    campos,
    agora: new Date(),
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
      } as never,
      arquivoNome: gerado.nomeArquivo,
      arquivo: gerado.buffer,
      hashSha256: gerado.hashSha256,
      status: "GERADO",
      criadoPorId: usuario.id,
    },
  });

  await registrar({
    acao: "GERAR_DOCUMENTO",
    organizacaoId: organizacao.id,
    usuarioId: usuario.id,
    entidade: "Documento",
    entidadeId: documento.id,
    detalhe: {
      tipo,
      operacao: operacao?.codigo ?? null,
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
