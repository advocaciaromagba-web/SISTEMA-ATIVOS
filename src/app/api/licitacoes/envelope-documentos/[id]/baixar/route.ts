import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessaoAtualLicitacoes } from "@/lib/licitacoes/sessao";

/**
 * Entrega o PDF de uma declaração do envelope — assinada, quando a conta tem
 * certificado. Confere a sessão por conta própria (o middleware deixa /api de
 * fora) e que o documento pertence à conta de quem pede.
 */
export async function GET(_pedido: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const sessao = await sessaoAtualLicitacoes();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const documento = await prisma.envelopeDocumento.findFirst({
    where: { id: params.id, envelope: { licitacaoContaId: sessao.conta.id } },
  });

  if (!documento) return NextResponse.json({ erro: "Documento não encontrado." }, { status: 404 });

  const conteudo = Buffer.from(documento.arquivo);

  return new NextResponse(conteudo as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${documento.nomeArquivo}"`,
      "Content-Length": String(conteudo.length),
      "Cache-Control": "private, no-store",
    },
  });
}
