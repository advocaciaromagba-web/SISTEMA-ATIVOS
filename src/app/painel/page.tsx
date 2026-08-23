import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import { FASES, TIPOS_ATIVO } from "@/lib/documentos/catalogo";
import { moeda, dataHora } from "@/lib/formato";

export const dynamic = "force-dynamic";

export default async function Painel() {
  const { organizacao, usuario } = await exigirSessao();
  const id = organizacao.id;

  const [totalOperacoes, totalPartes, totalDocumentos, porFase, ultimasOperacoes, ultimosDocumentos, semQualificacao] =
    await Promise.all([
      prisma.operacao.count({ where: { organizacaoId: id, fase: { notIn: ["CONCLUIDA", "CANCELADA"] } } }),
      prisma.pessoa.count({ where: { organizacaoId: id } }),
      prisma.documento.count({ where: { organizacaoId: id } }),
      prisma.operacao.groupBy({
        by: ["fase"],
        where: { organizacaoId: id },
        _count: { _all: true },
        _sum: { valorNegociado: true },
      }),
      prisma.operacao.findMany({
        where: { organizacaoId: id },
        orderBy: { atualizadoEm: "desc" },
        take: 6,
        select: { id: true, codigo: true, titulo: true, fase: true, tipoAtivo: true, valorNegociado: true, moeda: true },
      }),
      prisma.documento.findMany({
        where: { organizacaoId: id },
        orderBy: { criadoEm: "desc" },
        take: 6,
        select: { id: true, titulo: true, criadoEm: true, operacao: { select: { codigo: true } } },
      }),
      // Partes sem CPF/CNPJ ou sem endereço travam a geração de contrato.
      prisma.pessoa.count({
        where: { organizacaoId: id, OR: [{ documento: null }, { enderecoRua: null }] },
      }),
    ]);

  const emAndamento = porFase.filter((f) => !["CONCLUIDA", "CANCELADA"].includes(f.fase));
  const valorEmAndamento = emAndamento.reduce((t, f) => t + Number(f._sum.valorNegociado ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Olá, {usuario.nome.split(" ")[0]}</h1>
        <p className="text-sm text-slate-500">{organizacao.nome}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador rotulo="Operações em andamento" valor={String(totalOperacoes)} href="/painel/operacoes" />
        <Indicador rotulo="Valor em negociação" valor={moeda(valorEmAndamento)} />
        <Indicador rotulo="Partes cadastradas" valor={String(totalPartes)} href="/painel/pessoas" />
        <Indicador rotulo="Documentos gerados" valor={String(totalDocumentos)} href="/painel/documentos" />
      </div>

      {semQualificacao > 0 && (
        <div className="aviso-atencao">
          <strong className="block">
            {semQualificacao} {semQualificacao === 1 ? "parte está" : "partes estão"} com cadastro incompleto
          </strong>
          <span className="mt-1 block">
            Falta CPF/CNPJ ou endereço. Contratos gerados com essas partes saem com lacunas marcadas.{" "}
            <Link href="/painel/pessoas" className="font-medium underline">
              Conferir
            </Link>
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="cartao">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Operações recentes</h2>
            <Link href="/painel/operacoes/nova" className="text-sm text-slate-500 hover:underline">
              nova
            </Link>
          </div>

          {ultimasOperacoes.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhuma operação ainda.{" "}
              <Link href="/painel/operacoes/nova" className="underline">
                Crie a primeira
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {ultimasOperacoes.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link href={`/painel/operacoes/${o.id}`} className="font-medium hover:underline">
                      {o.titulo}
                    </Link>
                    <div className="truncate text-xs text-slate-500">
                      {o.codigo} · {TIPOS_ATIVO[o.tipoAtivo] ?? o.tipoAtivo}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-slate-900">
                      {o.valorNegociado != null ? moeda(Number(o.valorNegociado), o.moeda) : "—"}
                    </div>
                    <div className="text-xs text-slate-500">{FASES[o.fase] ?? o.fase}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="cartao">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Documentos recentes</h2>
            <Link href="/painel/documentos/novo" className="text-sm text-slate-500 hover:underline">
              gerar
            </Link>
          </div>

          {ultimosDocumentos.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum documento gerado ainda.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {ultimosDocumentos.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/painel/documentos/${d.id}`} className="min-w-0 truncate font-medium hover:underline">
                    {d.titulo}
                  </Link>
                  <span className="shrink-0 text-xs text-slate-500">
                    {d.operacao?.codigo ? `${d.operacao.codigo} · ` : ""}
                    {dataHora(d.criadoEm)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Indicador({ rotulo, valor, href }: { rotulo: string; valor: string; href?: string }) {
  const conteudo = (
    <div className="cartao">
      <div className="text-xs uppercase tracking-wide text-slate-500">{rotulo}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{valor}</div>
    </div>
  );

  return href ? (
    <Link href={href} className="block transition hover:opacity-80">
      {conteudo}
    </Link>
  ) : (
    conteudo
  );
}
