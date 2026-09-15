import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirSessaoLicitacoes } from "@/lib/licitacoes/sessao";
import { LeituraEditalVista } from "../../../leitura-edital-vista";
import type { LeituraEdital } from "@/lib/licitacoes/leitura-edital";
import { BotaoRelerEdital } from "./reler-botao";

export const dynamic = "force-dynamic";

export default async function DetalheEditalInteresse(props: { params: Promise<{ editalId: string }> }) {
  const params = await props.params;
  const { conta } = await exigirSessaoLicitacoes();

  const edital = await prisma.editalInteresse.findFirst({
    where: { id: params.editalId, licitacaoContaId: conta.id },
  });
  if (!edital) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/licitacoes/painel/licitantes/editais" className="text-sm text-slate-500 hover:underline">
          ← Editais de interesse
        </Link>
        <h1 className="mt-1 text-xl font-semibold">
          {edital.modalidade} nº {edital.numeroCertame}
        </h1>
        <p className="text-sm text-slate-500">
          {edital.orgaoLicitante}
          {edital.objeto ? ` — ${edital.objeto}` : ""}
        </p>
        {edital.linkPncp && (
          <a href={edital.linkPncp} target="_blank" rel="noreferrer" className="text-sm text-slate-500 underline">
            Ver no PNCP
          </a>
        )}
      </div>

      <section className="cartao">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Requisitos de habilitação (leitura automática do edital)</h2>
          {edital.arquivo && <BotaoRelerEdital editalId={edital.id} />}
        </div>
        {edital.arquivo ? (
          <LeituraEditalVista
            leitura={edital.requisitosExtraidos as unknown as LeituraEdital | null}
            erro={edital.leituraIaErro}
            lidoEm={edital.leituraIaEm}
          />
        ) : (
          <p className="text-sm text-slate-500">
            Este edital não tem PDF anexado — veio da busca do PNCP, que só devolve os metadados, não o arquivo.
            Anexe o PDF cadastrando de novo com o arquivo, se quiser a leitura automática.
          </p>
        )}
      </section>
    </div>
  );
}
