import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import { formatarDocumento, formatarTelefone } from "@/lib/validacao";

export const dynamic = "force-dynamic";

export default async function Pessoas({ searchParams }: { searchParams: { busca?: string } }) {
  const { organizacao } = await exigirSessao();
  const busca = (searchParams.busca ?? "").trim();

  const pessoas = await prisma.pessoa.findMany({
    where: {
      organizacaoId: organizacao.id,
      ...(busca
        ? {
            OR: [
              { nome: { contains: busca, mode: "insensitive" as const } },
              { documento: { contains: busca.replace(/\D/g, "") } },
              { email: { contains: busca, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    include: { _count: { select: { partes: true } } },
    orderBy: { nome: "asc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Partes</h1>
          <p className="text-sm text-slate-500">
            Cedentes, cessionários, intermediários e demais envolvidos nas operações.
          </p>
        </div>
        <Link href="/painel/pessoas/nova" className="botao-principal">
          Nova parte
        </Link>
      </div>

      <form className="flex gap-2">
        <input
          name="busca"
          defaultValue={busca}
          placeholder="Buscar por nome, documento ou e-mail"
          className="campo max-w-md"
        />
        <button className="botao-secundario">Buscar</button>
      </form>

      {pessoas.length === 0 ? (
        <div className="cartao text-center text-sm text-slate-500">
          {busca ? "Nenhuma parte encontrada." : "Nenhuma parte cadastrada ainda."}
        </div>
      ) : (
        <div className="cartao overflow-x-auto p-0">
          <table className="tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Documento</th>
                <th>Contato</th>
                <th>Operações</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {pessoas.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/painel/pessoas/${p.id}`} className="font-medium text-slate-900 hover:underline">
                      {p.nome}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {p.tipo === "PJ" ? "Pessoa jurídica" : "Pessoa física"}
                      {p.pep && " · PEP"}
                    </div>
                  </td>
                  <td className="text-slate-600">{formatarDocumento(p.documento) || "—"}</td>
                  <td className="text-slate-600">
                    {p.email && <div>{p.email}</div>}
                    {p.telefone && <div className="text-xs">{formatarTelefone(p.telefone)}</div>}
                    {!p.email && !p.telefone && "—"}
                  </td>
                  <td className="text-slate-600">{p._count.partes}</td>
                  <td>
                    <SituacaoCompliance valor={p.situacaoCompliance} />
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

function SituacaoCompliance({ valor }: { valor: string | null }) {
  if (!valor) return <span className="etiqueta bg-slate-100 text-slate-600">não auditada</span>;

  const estilos: Record<string, string> = {
    SEM_APONTAMENTO: "bg-emerald-100 text-emerald-800",
    ATENCAO: "bg-amber-100 text-amber-800",
    RESTRICAO: "bg-red-100 text-red-800",
  };
  const rotulos: Record<string, string> = {
    SEM_APONTAMENTO: "sem apontamentos",
    ATENCAO: "atenção",
    RESTRICAO: "restrição",
  };

  return <span className={`etiqueta ${estilos[valor] ?? "bg-slate-100 text-slate-600"}`}>{rotulos[valor] ?? valor}</span>;
}
