import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import { auditoriaVencida, VALIDADE_AUDITORIA_DIAS } from "@/lib/auditoria/executar";
import { ROTULO_CAPACIDADE, ROTULO_IDONEIDADE, type Capacidade, type Idoneidade } from "@/lib/auditoria/tipos";
import { dataHora } from "@/lib/formato";
import { formatarDocumento } from "@/lib/validacao";

export const dynamic = "force-dynamic";

const CORES_IDONEIDADE: Record<string, string> = {
  SEM_APONTAMENTO: "bg-emerald-100 text-emerald-800",
  ATENCAO: "bg-amber-100 text-amber-800",
  RESTRICAO: "bg-red-100 text-red-800",
};

const CORES_CAPACIDADE: Record<string, string> = {
  SUFICIENTE: "bg-emerald-100 text-emerald-800",
  LIMITADA: "bg-amber-100 text-amber-800",
  INSUFICIENTE: "bg-red-100 text-red-800",
  NAO_AVALIADA: "bg-slate-100 text-slate-600",
};

export default async function Auditoria() {
  const { organizacao } = await exigirSessao();

  const partes = await prisma.pessoa.findMany({
    where: { organizacaoId: organizacao.id },
    select: {
      id: true,
      nome: true,
      tipo: true,
      documento: true,
      situacaoCompliance: true,
      capacidadePagamento: true,
      pontuacao: true,
      complianceEm: true,
      bloqueada: true,
      justificativaLiberacao: true,
      _count: { select: { partes: true } },
    },
    orderBy: [{ bloqueada: "desc" }, { pontuacao: "asc" }, { nome: "asc" }],
  });

  const semAuditoria = partes.filter((p) => !p.complianceEm);
  const bloqueadas = partes.filter((p) => p.bloqueada);
  const vencidas = partes.filter((p) => p.complianceEm && auditoriaVencida(p.complianceEm));
  const liberadas = partes.filter((p) => p.justificativaLiberacao && !p.bloqueada);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Auditoria</h1>
        <p className="text-sm text-slate-500">
          Situação de cada parte cadastrada. Toda parte passa por auditoria antes de entrar numa operação.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cartao rotulo="Bloqueadas" valor={bloqueadas.length} destaque={bloqueadas.length > 0 ? "red" : undefined} />
        <Cartao
          rotulo="Sem auditoria"
          valor={semAuditoria.length}
          destaque={semAuditoria.length > 0 ? "amber" : undefined}
        />
        <Cartao rotulo="Auditoria vencida" valor={vencidas.length} destaque={vencidas.length > 0 ? "amber" : undefined} />
        <Cartao rotulo="Liberadas manualmente" valor={liberadas.length} />
      </div>

      {partes.length === 0 ? (
        <div className="cartao text-center text-sm text-slate-500">Nenhuma parte cadastrada ainda.</div>
      ) : (
        <div className="cartao overflow-x-auto p-0">
          <table className="tabela">
            <thead>
              <tr>
                <th>Parte</th>
                <th>Idoneidade</th>
                <th>Capacidade</th>
                <th className="text-right">Pontuação</th>
                <th>Auditada em</th>
                <th>Operações</th>
              </tr>
            </thead>
            <tbody>
              {partes.map((p) => {
                const vencida = p.complianceEm ? auditoriaVencida(p.complianceEm) : false;
                return (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/painel/pessoas/${p.id}`} className="font-medium text-slate-900 hover:underline">
                        {p.nome}
                      </Link>
                      <div className="text-xs text-slate-500">
                        {formatarDocumento(p.documento) || "sem documento"}
                        {p.bloqueada && <span className="ml-2 text-red-700">bloqueada</span>}
                        {p.justificativaLiberacao && !p.bloqueada && (
                          <span className="ml-2 text-amber-700">liberada manualmente</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {p.situacaoCompliance ? (
                        <span className={`etiqueta ${CORES_IDONEIDADE[p.situacaoCompliance] ?? ""}`}>
                          {ROTULO_IDONEIDADE[p.situacaoCompliance as Idoneidade] ?? p.situacaoCompliance}
                        </span>
                      ) : (
                        <span className="etiqueta bg-slate-100 text-slate-600">não auditada</span>
                      )}
                    </td>
                    <td>
                      {p.capacidadePagamento ? (
                        <span className={`etiqueta ${CORES_CAPACIDADE[p.capacidadePagamento] ?? ""}`}>
                          {ROTULO_CAPACIDADE[p.capacidadePagamento as Capacidade] ?? p.capacidadePagamento}
                        </span>
                      ) : (
                        <span className="etiqueta bg-slate-100 text-slate-600">—</span>
                      )}
                    </td>
                    <td className="text-right text-slate-700">{p.pontuacao ?? "—"}</td>
                    <td className={vencida ? "text-amber-700" : "text-slate-600"}>
                      {p.complianceEm ? dataHora(p.complianceEm) : "nunca"}
                      {vencida && <div className="text-xs">vencida</div>}
                    </td>
                    <td className="text-slate-600">{p._count.partes}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="aviso-info">
        <strong className="block">Como ler estes resultados</strong>
        <p className="mt-1">
          A auditoria consulta o cadastro da Receita Federal, os cadastros oficiais de empresas punidas e as listas
          internacionais de sanções. Ela vale para as fontes que responderam e por{" "}
          {VALIDADE_AUDITORIA_DIAS} dias — não é atestado de idoneidade nem substitui as certidões que a outra parte
          deve apresentar.
        </p>
        <p className="mt-2">
          A capacidade de pagamento é estimada pelo capital social e pelo porte declarados na Receita. Isso é indício,
          não prova de dinheiro em caixa. Para ver protesto, negativação e recuperação judicial é preciso contratar um
          bureau de crédito.
        </p>
      </div>
    </div>
  );
}

function Cartao({ rotulo, valor, destaque }: { rotulo: string; valor: number; destaque?: "red" | "amber" }) {
  const cor =
    destaque === "red"
      ? "border-red-200 bg-red-50"
      : destaque === "amber"
        ? "border-amber-200 bg-amber-50"
        : "border-slate-200 bg-white";

  return (
    <div className={`rounded-xl border p-5 shadow-sm ${cor}`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{rotulo}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{valor}</div>
    </div>
  );
}
