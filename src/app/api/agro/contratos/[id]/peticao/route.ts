import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessaoAgroAtual } from "@/lib/agro/sessao";
import { gerarPeticaoInicial, montarDadosPeticao } from "@/lib/agro/documentos";

/**
 * Gera na hora a minuta de petição inicial — sempre com o dado mais recente
 * do contrato, nunca guardada em disco.
 */
export async function GET(_pedido: Request, { params }: { params: { id: string } }) {
  const sessao = await sessaoAgroAtual();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const contrato = await prisma.agroContrato.findFirst({ where: { id: params.id, agroContaId: sessao.conta.id } });
  if (!contrato || !contrato.resultadoAlongamento) {
    return NextResponse.json({ erro: "Contrato não encontrado ou ainda não analisado." }, { status: 404 });
  }

  const dados = montarDadosPeticao(contrato);
  if (!dados) return NextResponse.json({ erro: "Contrato ainda não tem análise de alongamento." }, { status: 400 });

  const { buffer, nomeArquivo } = await gerarPeticaoInicial(dados);

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-store",
    },
  });
}
