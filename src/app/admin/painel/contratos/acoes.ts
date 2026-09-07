"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirSessaoAdmin } from "@/lib/admin/sessao";
import { registrarAcaoAdmin } from "@/lib/admin/auditoria";
import { descritor } from "@/lib/admin/solucoes";
import { hashDoConteudo } from "@/lib/contratos-solucao";

export type ResultadoContrato = { erro?: string; ok?: string };

/**
 * Cria uma versão nova, ou salva o rascunho da versão que ainda não foi
 * publicada. Versão publicada nunca é alterada aqui — a ação de salvar
 * recusa, e a de publicar é separada.
 */
export async function salvarRascunho(_anterior: ResultadoContrato, dados: FormData): Promise<ResultadoContrato> {
  const admin = await exigirSessaoAdmin();

  const solucao = (dados.get("solucao") ?? "").toString();
  if (!descritor(solucao)) return { erro: "Solução desconhecida." };

  const titulo = (dados.get("titulo") ?? "").toString().trim();
  const conteudo = (dados.get("conteudo") ?? "").toString().trim();

  if (!titulo) return { erro: "Dê um título ao contrato." };
  if (conteudo.length < 200) {
    return { erro: "O texto está muito curto para ser um contrato (mínimo de 200 caracteres)." };
  }

  const rascunho = await prisma.contratoSolucao.findFirst({
    where: { solucao, publicado: false },
    orderBy: { versao: "desc" },
  });

  if (rascunho) {
    await prisma.contratoSolucao.update({ where: { id: rascunho.id }, data: { titulo, conteudo } });
    await registrarAcaoAdmin({
      admin,
      acao: "EDITAR",
      solucao,
      alvoTipo: "CONTRATO",
      alvoId: String(rascunho.versao),
      resumo: `Editou o rascunho da versão ${rascunho.versao} do contrato de ${descritor(solucao)?.rotulo}.`,
    });
    revalidatePath("/admin/painel/contratos");
    return { ok: `Rascunho da versão ${rascunho.versao} salvo. Ele só passa a valer quando você publicar.` };
  }

  const ultima = await prisma.contratoSolucao.findFirst({
    where: { solucao },
    orderBy: { versao: "desc" },
  });
  const versao = (ultima?.versao ?? 0) + 1;

  await prisma.contratoSolucao.create({
    data: { solucao, versao, titulo, conteudo, criadoPor: admin.email },
  });

  await registrarAcaoAdmin({
    admin,
    acao: "CRIAR",
    solucao,
    alvoTipo: "CONTRATO",
    alvoId: String(versao),
    resumo: `Criou o rascunho da versão ${versao} do contrato de ${descritor(solucao)?.rotulo}.`,
  });

  revalidatePath("/admin/painel/contratos");
  return { ok: `Versão ${versao} criada como rascunho. Publique quando o texto estiver revisado.` };
}

/**
 * Publica o rascunho. A partir daqui o texto congela: é ele que os clientes
 * aceitam, e é o hash dele que fica guardado em cada aceite.
 */
export async function publicarContrato(_anterior: ResultadoContrato, dados: FormData): Promise<ResultadoContrato> {
  const admin = await exigirSessaoAdmin();

  const solucao = (dados.get("solucao") ?? "").toString();
  const confirmacao = (dados.get("confirmacao") ?? "").toString().trim().toUpperCase();

  if (!descritor(solucao)) return { erro: "Solução desconhecida." };
  if (confirmacao !== "PUBLICAR") {
    return { erro: 'Para publicar, digite PUBLICAR no campo de confirmação.' };
  }

  const rascunho = await prisma.contratoSolucao.findFirst({
    where: { solucao, publicado: false },
    orderBy: { versao: "desc" },
  });

  if (!rascunho) return { erro: "Não há rascunho para publicar nesta solução." };

  const hash = hashDoConteudo(rascunho.conteudo);

  await prisma.contratoSolucao.update({
    where: { id: rascunho.id },
    data: { publicado: true, publicadoEm: new Date(), publicadoPor: admin.email, hashConteudo: hash },
  });

  await registrarAcaoAdmin({
    admin,
    acao: "CONFIGURAR",
    solucao,
    alvoTipo: "CONTRATO",
    alvoId: String(rascunho.versao),
    resumo: `Publicou a versão ${rascunho.versao} do contrato de ${descritor(solucao)?.rotulo}.`,
    detalhe: { versao: rascunho.versao, hashConteudo: hash, titulo: rascunho.titulo },
  });

  revalidatePath("/admin/painel/contratos");
  return {
    ok:
      `Versão ${rascunho.versao} publicada e em vigor. Ela não pode mais ser editada — para mudar o texto, ` +
      `crie uma versão nova. Quem já aceitou continua vinculado à versão que aceitou.`,
  };
}
