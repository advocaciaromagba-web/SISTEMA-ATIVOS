import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import { CATALOGO_POR_CHAVE } from "@/lib/documentos/catalogo";
import { dataHora } from "@/lib/formato";

export const dynamic = "force-dynamic";

export default async function Documentos() {
  const { organizacao } = await exigirSessao();

  const documentos = await prisma.documento.findMany({
    where: { organizacaoId: organizacao.id },
    include: {
      operacao: { select: { id: true, codigo: true, titulo: true } },
      criadoPor: { select: { nome: true } },
    },
    orderBy: { criadoEm: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Documentos</h1>
          <p className="text-sm text-slate-500">Tudo o que foi gerado, com data, autor e código de conferência.</p>
        </div>
        <Link href="/painel/documentos/novo" className="botao-principal">
          Gerar documento
        </Link>
      </div>

      {documentos.length === 0 ? (
        <div className="cartao text-center text-sm text-slate-500">Nenhum documento gerado ainda.</div>
      ) : (
        <div className="cartao overflow-x-auto p-0">
          <table className="tabela">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Operação</th>
                <th>Gerado por</th>
                <th>Quando</th>
                <th>Conferência</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {documentos.map((d) => (
                <tr key={d.id}>
                  <td>
                    <Link href={`/painel/documentos/${d.id}`} className="font-medium text-slate-900 hover:underline">
                      {d.titulo}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {CATALOGO_POR_CHAVE[d.tipo]?.nome ?? d.tipo} · versão {d.versao}
                    </div>
                  </td>
                  <td className="text-slate-600">
                    {d.operacao ? (
                      <Link href={`/painel/operacoes/${d.operacao.id}`} className="hover:underline">
                        {d.operacao.codigo}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="text-slate-600">{d.criadoPor?.nome ?? "—"}</td>
                  <td className="text-slate-600">{dataHora(d.criadoEm)}</td>
                  <td className="font-mono text-xs text-slate-500">
                    {d.hashSha256 ? d.hashSha256.slice(0, 8).toUpperCase() : "—"}
                  </td>
                  <td>
                    <Estado status={d.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Estado({ status }: { status: string }) {
  const estilos: Record<string, string> = {
    RASCUNHO: "bg-slate-100 text-slate-600",
    GERADO: "bg-sky-100 text-sky-800",
    ENVIADO_ASSINATURA: "bg-amber-100 text-amber-800",
    ASSINADO: "bg-emerald-100 text-emerald-800",
    CANCELADO: "bg-red-100 text-red-800",
  };
  const rotulos: Record<string, string> = {
    RASCUNHO: "rascunho",
    GERADO: "gerado",
    ENVIADO_ASSINATURA: "aguardando assinatura",
    ASSINADO: "assinado",
    CANCELADO: "cancelado",
  };
  return <span className={`etiqueta ${estilos[status] ?? "bg-slate-100"}`}>{rotulos[status] ?? status}</span>;
}
