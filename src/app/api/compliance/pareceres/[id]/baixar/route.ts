import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessaoAtualCompliance } from "@/lib/compliance/sessao";

/**
 * Entrega o .docx do parecer finalizado. Confere a sessão por conta própria
 * (o middleware deixa /api de fora) e que o parecer pertence à conta de
 * quem pede — mesmo padrão de /api/certidoes/[id]/baixar, só que para
 * ComplianceParecer/ComplianceConta.
 */
export async function GET(_pedido: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const sessao = await sessaoAtualCompliance();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const parecer = await prisma.complianceParecer.findFirst({
    where: { id: params.id, complianceContaId: sessao.conta.id },
  });

  if (!parecer || !parecer.documentoArquivo) {
    return NextResponse.json({ erro: "Documento não encontrado." }, { status: 404 });
  }

  const conteudo = Buffer.from(parecer.documentoArquivo);

  return new NextResponse(conteudo as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${parecer.documentoNome ?? "parecer.docx"}"`,
      "Content-Length": String(conteudo.length),
      "Cache-Control": "private, no-store",
    },
  });
}
