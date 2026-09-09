import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessaoAgroAtual } from "@/lib/agro/sessao";

/**
 * Entrega o arquivo de uma peça gerada (requerimento ou petição, por IA ou
 * modelo fixo) que já ficou arquivada como `AgroDocumentoGerado`. Mesma
 * conferência de sessão e dono do contrato de `/api/agro/anexos/[id]`.
 */
export async function GET(_pedido: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const sessao = await sessaoAgroAtual();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const documento = await prisma.agroDocumentoGerado.findFirst({
    where: { id: params.id, agroContrato: { agroContaId: sessao.conta.id } },
  });

  if (!documento) {
    return NextResponse.json({ erro: "Documento não encontrado." }, { status: 404 });
  }

  const conteudo = Buffer.from(documento.arquivo);

  return new NextResponse(conteudo as unknown as BodyInit, {
    headers: {
      "Content-Type": documento.arquivoTipo,
      "Content-Disposition": `attachment; filename="${documento.nomeArquivo}"`,
      "Content-Length": String(conteudo.length),
      "Cache-Control": "private, no-store",
    },
  });
}
