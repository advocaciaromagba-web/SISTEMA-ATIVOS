import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import { formatarDocumento } from "@/lib/validacao";

export const dynamic = "force-dynamic";

export default async function Licitantes() {
  const { organizacao } = await exigirSessao();

  const licitantes = await prisma.licitanteEmpresa.findMany({
    where: { organizacaoId: organizacao.id, ativa: true },
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
        <Link href="/painel/licitacoes/licitantes/nova" className="botao-principal">
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
              </tr>
            </thead>
            <tbody>
              {licitantes.map((l) => (
                <tr key={l.id}>
                  <td>
                    <Link
                      href={`/painel/licitacoes/licitantes/${l.id}`}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
