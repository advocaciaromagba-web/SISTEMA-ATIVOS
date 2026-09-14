import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirSessaoCompliance } from "@/lib/compliance/sessao";
import { dataCurta } from "@/lib/formato";
import { formatarNumeroProcessoCnj } from "@/lib/validacao";
import { ROTULO_TIPO_PARECER } from "@/lib/compliance/parecer";
import { BotaoGerarMinuta } from "./gerar-minuta-botao";
import { FinalizarParecer } from "./finalizar-form";

export const dynamic = "force-dynamic";

export default async function DetalheParecer(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { usuario, conta } = await exigirSessaoCompliance();

  const pedido = await prisma.complianceParecer.findFirst({
    where: { id: params.id, complianceContaId: conta.id },
    include: { complianceProcesso: true },
  });
  if (!pedido) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/compliance/painel/pareceres" className="text-sm text-slate-500 hover:underline">
          ← Pareceres
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{ROTULO_TIPO_PARECER[pedido.tipo] ?? pedido.tipo}</h1>
        <p className="mt-1 text-sm text-slate-700">{pedido.tema}</p>
        <p className="mt-1 text-xs text-slate-400">
          Pedido em {dataCurta(pedido.criadoEm)}
          {pedido.complianceProcesso && ` — processo ${formatarNumeroProcessoCnj(pedido.complianceProcesso.numeroProcesso)}`}
          {pedido.arquivoNome && ` — arquivo: ${pedido.arquivoNome}`}
        </p>
      </div>

      {pedido.situacao === "ERRO" && (
        <div className="aviso-erro flex items-center justify-between gap-3">
          <span>Não foi possível gerar a minuta: {pedido.erro}</span>
          <BotaoGerarMinuta pedidoId={pedido.id} />
        </div>
      )}

      {pedido.situacao === "GERANDO_MINUTA" && <div className="aviso-atencao">Gerando minuta…</div>}

      {pedido.situacao === "MINUTA_PRONTA" && pedido.minuta && (
        <>
          <section className="cartao">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">Minuta (rascunho da IA)</h2>
              <BotaoGerarMinuta pedidoId={pedido.id} />
            </div>
            <div className="whitespace-pre-line text-sm text-slate-700">{pedido.minuta}</div>
          </section>

          <section className="cartao">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Finalizar</h2>
            <FinalizarParecer pedidoId={pedido.id} minuta={pedido.minuta} nomeUsuario={usuario.nome} />
          </section>
        </>
      )}

      {pedido.situacao === "FINALIZADO" && pedido.parecerFinal && (
        <section className="cartao space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">Parecer final</h2>
            <a href={`/api/compliance/pareceres/${pedido.id}/baixar`} className="botao-secundario">
              Baixar .docx
            </a>
          </div>

          <div className="whitespace-pre-line text-sm text-slate-700">{pedido.parecerFinal}</div>

          <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">
            {pedido.assinado ? (
              <p>
                Assinado por <strong>{pedido.assinadoPorNome}</strong>
                {pedido.assinadoPorCargo ? `, ${pedido.assinadoPorCargo}` : ""}
                {pedido.assinadoPorRegistro ? ` (${pedido.assinadoPorRegistro})` : ""} em{" "}
                {pedido.assinadoEm ? dataCurta(pedido.assinadoEm) : ""}.
              </p>
            ) : (
              <p>Finalizado sem registro de autoria em {pedido.finalizadoEm ? dataCurta(pedido.finalizadoEm) : ""}.</p>
            )}
            {pedido.hashParecerSha256 && <p className="mt-1 font-mono">hash: {pedido.hashParecerSha256}</p>}
          </div>
        </section>
      )}
    </div>
  );
}
