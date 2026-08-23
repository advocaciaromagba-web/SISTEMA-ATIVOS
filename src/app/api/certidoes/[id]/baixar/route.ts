import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessaoAtual } from "@/lib/sessao";
import { registrar } from "@/lib/registro";

/**
 * Entrega o arquivo da certidão guardada.
 *
 * Confere a sessão por conta própria (o middleware deixa /api de fora) e
 * confere que a certidão pertence à organização de quem pede — certidão
 * criminal de terceiro não pode vazar por adivinhação de identificador.
 */
export async function GET(_pedido: Request, { params }: { params: { id: string } }) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const certidao = await prisma.certidao.findFirst({
    where: { id: params.id, organizacaoId: sessao.organizacao.id },
    include: { pessoa: { select: { nome: true } } },
  });

  if (!certidao || !certidao.arquivo) {
    return NextResponse.json({ erro: "Certidão não encontrada." }, { status: 404 });
  }

  await registrar({
    acao: "BAIXAR_DOCUMENTO",
    organizacaoId: sessao.organizacao.id,
    usuarioId: sessao.usuario.id,
    entidade: "Certidao",
    entidadeId: certidao.id,
    detalhe: { parte: certidao.pessoa.nome, tipo: certidao.tipo },
  });

  const conteudo = Buffer.from(certidao.arquivo);

  return new NextResponse(conteudo as unknown as BodyInit, {
    headers: {
      "Content-Type": certidao.arquivoTipo ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${certidao.arquivoNome ?? "certidao"}"`,
      "Content-Length": String(conteudo.length),
      "Cache-Control": "private, no-store",
    },
  });
}
