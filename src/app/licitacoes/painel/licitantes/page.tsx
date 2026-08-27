import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirSessaoLicitacoes } from "@/lib/licitacoes/sessao";
import { formatarDocumento } from "@/lib/validacao";

export const dynamic = "force-dynamic";

export default async function Licitantes() {
  const { conta } = await exigirSessaoLicitacoes();

  const licitantes = await prisma.licitanteEmpresa.findMany({
    where: { licitacaoContaId: conta.id, ativa: true },
    include: { _count: { select: { envelopes: true, documentosPessoais: true } } },
    orderBy: { nome: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Empresas licitantes</h2>
          <p className="text-sm text-slate-500">
            O cadastro é próprio desta solução — preencha uma vez e reaproveite em qualquer certame.
          </p>
        </div>
        <Link href="/licitacoes/painel/licitantes/nova" className="botao-principal">
          Nova empresa
        </Link>
      </div>

      {licitantes.length === 0 ? (
        <div className="cartao text-center text-sm text-slate-500">Nenhuma empresa cadastrada ainda.</div>
      ) : (
        <div className="cartao overflow-x-auto p-0">
          <table className="tabela">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>CNPJ</th>
                <th>Representante</th>
                <th>Documentos pessoais</th>
                <th>Envelopes</th>
                <th>Compliance</th>
              </tr>
            </thead>
            <tbody>
              {licitantes.map((l) => (
                <tr key={l.id}>
                  <td>
                    <Link
                      href={`/licitacoes/painel/licitantes/${l.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {l.nome}
                    </Link>
                    {l.microempresaOuEpp && (
                      <div className="text-xs text-slate-500">Microempresa / EPP</div>
                    )}
                  </td>
                  <td className="text-slate-600">{formatarDocumento(l.documento) || "—"}</td>
                  <td className="text-slate-600">{l.repNome || "—"}</td>
                  <td className="text-slate-600">{l._count.documentosPessoais}</td>
                  <td className="text-slate-600">{l._count.envelopes}</td>
                  <td>
                    <SituacaoCompliance valor={l.situacaoCompliance} />
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
