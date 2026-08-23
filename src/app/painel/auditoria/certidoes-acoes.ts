"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirEdicao } from "@/lib/sessao";
import { registrar } from "@/lib/registro";
import { executarAuditoria } from "@/lib/auditoria/executar";
import { CERTIDAO_POR_CHAVE } from "@/lib/auditoria/certidoes";
import type { ResultadoAcao } from "../pessoas/acoes";

const LIMITE_ARQUIVO = 10 * 1024 * 1024; // 10 MB
const TIPOS_ACEITOS = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

const texto = (dados: FormData, chave: string) => (dados.get(chave)?.toString() ?? "").trim() || null;

function data(dados: FormData, chave: string): Date | null {
  const bruto = texto(dados, chave);
  if (!bruto) return null;
  const d = new Date(`${bruto}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Registra uma certidão apresentada pela parte.
 *
 * Guardar o arquivo é o ponto: numa discussão futura sobre diligência, o que
 * sustenta a operação é a certidão com o código de autenticidade do órgão, não
 * a anotação de que alguém "conferiu".
 */
export async function registrarCertidao(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { usuario, organizacao } = await exigirEdicao();

  const pessoaId = texto(dados, "pessoaId");
  const tipo = texto(dados, "tipo");
  const resultado = texto(dados, "resultado") ?? "PENDENTE";
  const natureza = texto(dados, "natureza") ?? "NENHUMA";

  if (!pessoaId || !tipo) return { erro: "Escolha a parte e o tipo de certidão." };

  const definicao = CERTIDAO_POR_CHAVE[tipo];
  if (!definicao) return { erro: "Tipo de certidão desconhecido." };

  const pessoa = await prisma.pessoa.findFirst({ where: { id: pessoaId, organizacaoId: organizacao.id } });
  if (!pessoa) return { erro: "Parte não encontrada." };

  // Se consta apontamento, o operador precisa dizer o quê — senão o dossiê
  // registra um alerta que ninguém consegue avaliar depois.
  const apontamento = texto(dados, "apontamento");
  if (resultado === "CONSTA" && !apontamento) {
    return { erro: "A certidão tem apontamento: descreva o que consta nela." };
  }
  if (resultado === "CONSTA" && natureza === "NENHUMA") {
    return { erro: "Classifique o apontamento — processo em curso e condenação definitiva pesam de forma diferente." };
  }

  const emitidaEm = data(dados, "emitidaEm");
  let validaAte = data(dados, "validaAte");

  // Sem data de validade impressa, vale o prazo do catálogo contado da emissão.
  if (!validaAte && emitidaEm) {
    validaAte = new Date(emitidaEm.getTime() + definicao.validadeDias * 86400000);
  }

  // ----- arquivo -----
  const enviado = dados.get("arquivo");
  let arquivo: Buffer | null = null;
  let arquivoNome: string | null = null;
  let arquivoTipo: string | null = null;
  let hash: string | null = null;

  if (enviado instanceof File && enviado.size > 0) {
    if (enviado.size > LIMITE_ARQUIVO) {
      return { erro: "O arquivo passa de 10 MB. Envie o PDF original da certidão, não a digitalização em alta." };
    }
    if (!TIPOS_ACEITOS.includes(enviado.type)) {
      return { erro: "Envie a certidão em PDF ou imagem (JPG, PNG)." };
    }
    arquivo = Buffer.from(await enviado.arrayBuffer());
    arquivoNome = enviado.name;
    arquivoTipo = enviado.type;
    hash = crypto.createHash("sha256").update(arquivo).digest("hex");
  }

  const criada = await prisma.certidao.create({
    data: {
      organizacaoId: organizacao.id,
      pessoaId,
      operacaoId: texto(dados, "operacaoId"),
      tipo,
      orgaoEmissor: texto(dados, "orgaoEmissor") ?? definicao.orgao,
      numero: texto(dados, "numero"),
      emitidaEm,
      validaAte,
      resultado,
      apontamento,
      natureza: resultado === "CONSTA" ? natureza : "NENHUMA",
      arquivo,
      arquivoNome,
      arquivoTipo,
      hashSha256: hash,
      registradaPorId: usuario.id,
    },
  });

  await registrar({
    acao: "CRIAR",
    organizacaoId: organizacao.id,
    usuarioId: usuario.id,
    entidade: "Certidao",
    entidadeId: criada.id,
    detalhe: {
      parte: pessoa.nome,
      certidao: definicao.nome,
      resultado,
      natureza: resultado === "CONSTA" ? natureza : null,
      comArquivo: arquivo != null,
    },
  });

  // A certidão muda o resultado da auditoria — refaz para que o bloqueio
  // acompanhe. Sem isto, a parte continuaria bloqueada depois de entregar o
  // que faltava.
  try {
    const operacao = criada.operacaoId
      ? await prisma.operacao.findFirst({ where: { id: criada.operacaoId, organizacaoId: organizacao.id } })
      : null;
    await executarAuditoria({ pessoa, operacao, usuario, organizacaoId: organizacao.id });
  } catch (erro) {
    console.error("Reauditoria após certidão falhou:", erro);
  }

  revalidatePath(`/painel/pessoas/${pessoaId}`);
  revalidatePath("/painel/auditoria");
  return { ok: true };
}

export async function excluirCertidao(id: string): Promise<ResultadoAcao> {
  const { usuario, organizacao } = await exigirEdicao();

  const certidao = await prisma.certidao.findFirst({
    where: { id, organizacaoId: organizacao.id },
    include: { pessoa: true },
  });
  if (!certidao) return { erro: "Certidão não encontrada." };

  await prisma.certidao.delete({ where: { id } });

  await registrar({
    acao: "EXCLUIR",
    organizacaoId: organizacao.id,
    usuarioId: usuario.id,
    entidade: "Certidao",
    entidadeId: id,
    detalhe: { parte: certidao.pessoa.nome, certidao: certidao.tipo },
  });

  try {
    await executarAuditoria({
      pessoa: certidao.pessoa,
      operacao: null,
      usuario,
      organizacaoId: organizacao.id,
    });
  } catch (erro) {
    console.error("Reauditoria após exclusão de certidão falhou:", erro);
  }

  revalidatePath(`/painel/pessoas/${certidao.pessoaId}`);
  return { ok: true };
}
