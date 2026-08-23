import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessaoAtual } from "@/lib/sessao";
import { registrar } from "@/lib/registro";

/**
 * Entrega o arquivo .docx guardado.
 *
 * A rota confere a sessão por conta própria porque o middleware deixa /api de
 * fora — e confere também que o documento pertence à organização de quem pede.
 * Sem essa segunda conferência, bastaria adivinhar um id para ler o contrato
 * de outro assinante.
 */
export async function GET(_pedido: Request, { params }: { params: { id: string } }) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const documento = await prisma.documento.findFirst({
    where: { id: params.id, organizacaoId: sessao.organizacao.id },
  });

  if (!documento || !documento.arquivo) {
    return NextResponse.json({ erro: "Documento não encontrado." }, { status: 404 });
  }

  await registrar({
    acao: "BAIXAR_DOCUMENTO",
    organizacaoId: sessao.organizacao.id,
    usuarioId: sessao.usuario.id,
    entidade: "Documento",
    entidadeId: documento.id,
    detalhe: { arquivo: documento.arquivoNome },
  });

  const conteudo = Buffer.from(documento.arquivo);

  return new NextResponse(conteudo as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${documento.arquivoNome}"`,
      "Content-Length": String(conteudo.length),
      "Cache-Control": "private, no-store",
    },
  });
}
