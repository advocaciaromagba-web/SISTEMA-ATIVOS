import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { acessoAdminEmCurso, limparCookiesDeAcesso } from "@/lib/admin/acesso";
import { sessaoAdminAtual } from "@/lib/admin/sessao";
import { registrarAcaoAdmin } from "@/lib/admin/auditoria";

/**
 * Encerra o acesso administrativo à conta do cliente.
 *
 * É Route Handler, e não página, por uma razão do Next: cookie só pode ser
 * alterado em Server Action ou Route Handler — numa página o `delete` estoura.
 * E precisa ser um GET simples porque o link da tarja tem que funcionar de
 * dentro de qualquer tela de qualquer solução, inclusive telas sem formulário.
 *
 * GET que muda estado normalmente seria um risco de CSRF. Aqui não é: a única
 * coisa que este endereço faz é TIRAR privilégio de quem o chama. Ser acionado
 * indevidamente encerra um acesso — nunca abre um.
 */
export async function GET(pedido: Request) {
  const base = new URL(pedido.url);
  const acesso = await acessoAdminEmCurso();

  if (!acesso) {
    return NextResponse.redirect(new URL("/admin/painel", base));
  }

  await prisma.adminAcesso.update({
    where: { id: acesso.id },
    data: { encerradoEm: new Date() },
  });

  const admin = await sessaoAdminAtual();
  if (admin) {
    await registrarAcaoAdmin({
      admin,
      acao: "ENCERRAR_ACESSO",
      solucao: acesso.solucao,
      alvoTipo: "ACESSO",
      alvoId: acesso.id,
      resumo: `Encerrou o acesso à conta “${acesso.contaNome}”.`,
      detalhe: { acessoId: acesso.id, iniciadoEm: acesso.iniciadoEm },
    });
  }

  limparCookiesDeAcesso(acesso.solucao);

  return NextResponse.redirect(new URL("/admin/painel/contas", base));
}
