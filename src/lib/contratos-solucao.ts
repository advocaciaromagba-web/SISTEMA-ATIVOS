/**
 * Contrato de cada solução, com versões e aceite registrado.
 *
 * Três regras sustentam isto, e todas existem por causa do que acontece
 * quando um cliente contesta o que contratou:
 *
 * 1. **O contrato é da solução.** Não existe contrato "da plataforma" que
 *    valha para todas. Quem assina o Agrojud não pode estar aceitando
 *    cláusulas sobre precatórios.
 * 2. **Versão publicada não se edita.** Alterar o texto que alguém já aceitou
 *    destrói a prova do que foi aceito. Para mudar, cria-se outra versão.
 * 3. **O aceite guarda o hash do texto.** Assim o registro prova o conteúdo
 *    por si, sem depender de a linha do contrato continuar intacta.
 */
import crypto from "crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export function hashDoConteudo(conteudo: string): string {
  return crypto.createHash("sha256").update(conteudo.trim(), "utf8").digest("hex");
}

export type ContratoPublicado = {
  id: string;
  solucao: string;
  versao: number;
  titulo: string;
  conteudo: string;
  hashConteudo: string;
  publicadoEm: Date | null;
};

/** O contrato em vigor de uma solução, ou `null` se ainda não houver. */
export async function contratoVigente(solucao: string): Promise<ContratoPublicado | null> {
  const linha = await prisma.contratoSolucao.findFirst({
    where: { solucao, publicado: true },
    orderBy: { versao: "desc" },
  });

  if (!linha || !linha.hashConteudo) return null;

  return {
    id: linha.id,
    solucao: linha.solucao,
    versao: linha.versao,
    titulo: linha.titulo,
    conteudo: linha.conteudo,
    hashConteudo: linha.hashConteudo,
    publicadoEm: linha.publicadoEm,
  };
}

/** Se a conta já aceitou a versão em vigor daquela solução. */
export async function jaAceitouOVigente(solucao: string, contaId: string): Promise<boolean> {
  const vigente = await contratoVigente(solucao);
  if (!vigente) return true; // Sem contrato publicado, não há o que aceitar.

  const aceite = await prisma.aceiteContrato.findFirst({
    where: { solucao, contaId, versao: vigente.versao },
  });
  return Boolean(aceite);
}

function origem(): { ip: string | null; agente: string | null } {
  try {
    const h = headers();
    const encaminhado = h.get("x-forwarded-for");
    return {
      ip: encaminhado ? encaminhado.split(",")[0].trim() : h.get("x-real-ip"),
      agente: h.get("user-agent"),
    };
  } catch {
    return { ip: null, agente: null };
  }
}

/**
 * Registra o aceite. Silenciosamente não faz nada se a solução ainda não tem
 * contrato publicado — não dá para aceitar o que não existe, e travar o
 * cadastro por isso puniria o cliente por uma pendência que é nossa.
 */
export async function registrarAceite(params: {
  solucao: string;
  contaId: string;
  usuarioId?: string | null;
  nome: string;
  email: string;
  documento?: string | null;
}): Promise<{ registrado: boolean; versao: number | null }> {
  const vigente = await contratoVigente(params.solucao);
  if (!vigente) return { registrado: false, versao: null };

  const { ip, agente } = origem();

  await prisma.aceiteContrato.create({
    data: {
      contratoId: vigente.id,
      solucao: params.solucao,
      versao: vigente.versao,
      contaId: params.contaId,
      usuarioId: params.usuarioId ?? null,
      nome: params.nome,
      email: params.email,
      documento: params.documento ?? null,
      hashConteudo: vigente.hashConteudo,
      ip,
      agente,
    },
  });

  return { registrado: true, versao: vigente.versao };
}

/**
 * Divide o texto em blocos para exibição: títulos (linhas com "## ") e
 * parágrafos. Formatação mínima de propósito — contrato é para ser lido, não
 * decorado, e um editor rico aqui só criaria maneiras novas de quebrar o
 * texto.
 */
export type BlocoContrato = { tipo: "titulo" | "paragrafo"; texto: string };

export function blocosDoContrato(conteudo: string): BlocoContrato[] {
  const blocos: BlocoContrato[] = [];

  for (const bruto of conteudo.split(/\n\s*\n/)) {
    const bloco = bruto.trim();
    if (!bloco) continue;

    // Um título pode vir colado ao parágrafo que ele abre — que é como as
    // pessoas escrevem. Exigir linha em branco depois do "## " faria o texto
    // inteiro virar título, e ninguém adivinharia o motivo.
    if (bloco.startsWith("## ")) {
      const quebra = bloco.indexOf("\n");
      if (quebra === -1) {
        blocos.push({ tipo: "titulo", texto: bloco.slice(3).trim() });
        continue;
      }
      blocos.push({ tipo: "titulo", texto: bloco.slice(3, quebra).trim() });
      const resto = bloco.slice(quebra + 1).trim();
      if (resto) blocos.push({ tipo: "paragrafo", texto: resto.replace(/\s*\n\s*/g, " ") });
      continue;
    }

    blocos.push({ tipo: "paragrafo", texto: bloco.replace(/\s*\n\s*/g, " ") });
  }

  return blocos;
}
