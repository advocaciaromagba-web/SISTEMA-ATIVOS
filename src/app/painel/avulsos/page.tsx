import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import { moeda, dataCurta } from "@/lib/formato";
import { PLANO_POR_CHAVE } from "@/lib/planos";
import { Loja, type PedidoResumo } from "./loja";
import { usoDoMes } from "./acoes";

export const dynamic = "force-dynamic";

export default async function Avulsos() {
  const { organizacao, usuario } = await exigirSessao();

  const [pessoas, operacoes, pedidos, uso] = await Promise.all([
    prisma.pessoa.findMany({
      where: { organizacaoId: organizacao.id },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
    prisma.operacao.findMany({
      where: { organizacaoId: organizacao.id, fase: { notIn: ["CANCELADA", "CONCLUIDA"] } },
      select: { id: true, codigo: true, titulo: true },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.pedido.findMany({
      where: { organizacaoId: organizacao.id },
      include: {
        pessoa: { select: { nome: true } },
        operacao: { select: { codigo: true, titulo: true } },
      },
      orderBy: { criadoEm: "desc" },
      take: 100,
    }),
    usoDoMes(),
  ]);

  const plano = PLANO_POR_CHAVE[organizacao.plano];

  const pedidosResumo: PedidoResumo[] = pedidos.map((p) => ({
    id: p.id,
    numero: p.numero,
    descricao: p.descricao,
    quantidade: p.quantidade,
    valorTotal: moeda(Number(p.valorTotal)),
    situacao: p.situacao,
    referente: p.pessoa?.nome ?? (p.operacao ? `${p.operacao.codigo} — ${p.operacao.titulo}` : null),
    prometidoAte: p.prometidoAte ? dataCurta(p.prometidoAte) : null,
    criadoEm: dataCurta(p.criadoEm),
  }));

  const emAberto = pedidos.filter((p) => p.situacao === "AGUARDANDO_PAGAMENTO");
  const relevante = uso.filter((u) => u.incluido > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Consultas e serviços avulsos</h1>
        <p className="text-sm text-slate-500">
          O que não cabe no plano, comprado por unidade. Nada é executado antes do pagamento confirmado.
        </p>
      </div>

      {/* ---------------- consumo do plano ---------------- */}
      {relevante.length > 0 && (
        <section className="cartao">
          <h2 className="text-base font-semibold">
            O que você já usou do plano {plano?.nome ?? organizacao.plano} este mês
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            Ao acabar o incluído, você compra avulso em vez de ser empurrado para o plano de cima.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relevante.map((u) => (
              <div key={u.tipo} className="rounded-lg border border-slate-200 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">{u.rotulo}</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {u.usado} <span className="text-sm font-normal text-slate-500">de {u.incluido}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full ${u.estourou ? "bg-amber-500" : "bg-slate-700"}`}
                    style={{ width: `${Math.min(100, (u.usado / u.incluido) * 100)}%` }}
                  />
                </div>
                {u.estourou && <div className="mt-1.5 text-xs text-amber-700">acabou — o excedente é avulso</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {emAberto.length > 0 && (
        <div className="aviso-atencao">
          <strong className="block">
            {emAberto.length} pedido(s) aguardando pagamento — {moeda(
              emAberto.reduce((total, p) => total + Number(p.valorTotal), 0)
            )}
          </strong>
          <span className="mt-1 block">Eles só entram em execução depois que o pagamento for confirmado.</span>
        </div>
      )}

      <Loja
        pessoas={pessoas}
        operacoes={operacoes}
        pedidos={pedidosResumo}
        ehDono={usuario.papel === "DONO" || usuario.admin}
      />
    </div>
  );
}
