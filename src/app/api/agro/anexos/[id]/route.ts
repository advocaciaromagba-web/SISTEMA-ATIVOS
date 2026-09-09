import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessaoAgroAtual } from "@/lib/agro/sessao";

/**
 * Entrega o arquivo de um anexo (OAB, laudo técnico...). A rota confere a
 * sessão e o dono do contrato por conta própria — o middleware deixa /api
 * de fora, e sem esta segunda conferência bastaria adivinhar um id.
 */
export async function GET(_pedido: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const sessao = await sessaoAgroAtual();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const anexo = await prisma.agroAnexo.findFirst({
    where: { id: params.id, agroContrato: { agroContaId: sessao.conta.id } },
  });

  if (!anexo) {
    return NextResponse.json({ erro: "Anexo não encontrado." }, { status: 404 });
  }

  const conteudo = Buffer.from(anexo.arquivo);

  return new NextResponse(conteudo as unknown as BodyInit, {
    headers: {
      "Content-Type": anexo.arquivoTipo || "application/octet-stream",
      "Content-Disposition": `inline; filename="${anexo.nomeArquivo}"`,
      "Content-Length": String(conteudo.length),
      "Cache-Control": "private, no-store",
    },
  });
}
