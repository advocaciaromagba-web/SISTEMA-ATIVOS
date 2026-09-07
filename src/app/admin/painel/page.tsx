import Link from "next/link";
import { exigirSessaoAdmin } from "@/lib/admin/sessao";
import { prisma } from "@/lib/prisma";
import { SOLUCOES_ADMIN, modelo } from "@/lib/admin/solucoes";

export const dynamic = "force-dynamic";

const TRINTA_DIAS = 30 * 24 * 60 * 60 * 1000;

export default async function VisaoGeralAdmin() {
  await exigirSessaoAdmin();

  const desde = new Date(Date.now() - TRINTA_DIAS);

  const porSolucao = await Promise.all(
    SOLUCOES_ADMIN.map(async (s) => {
      const m = modelo(s.modeloConta);
      const [total, novas, bloqueadas, ativas] = await Promise.all([
        m.count(),
        m.count({ where: { criadoEm: { gte: desde } } }),
        m.count({ where: { bloqueadoEm: { not: null } } }),
        m.count({ where: { statusAssinatura: "ATIVA" } }),
      ]);
      return { ...s, total, novas, bloqueadas, ativas };
    })
  );

  const [clientes, assinaturasAtivas, acoesRecentes, acessosAbertos] = await Promise.all([
    prisma.cliente.count(),
    prisma.clienteAssinatura.count({ where: { status: "ATIVA" } }),
    prisma.adminAuditoria.count({ where: { criadoEm: { gte: desde } } }),
    prisma.adminAcesso.count({ where: { encerradoEm: null } }),
  ]);

  const totalContas = porSolucao.reduce((s, x) => s + x.total, 0);
  const totalAtivas = porSolucao.reduce((s, x) => s + x.ativas, 0);
  const totalNovas = porSolucao.reduce((s, x) => s + x.novas, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Visão geral</h1>
        <p className="mt-1 text-sm text-slate-500">
          Números lidos das tabelas de cada solução, na hora. Nada aqui é estimado.
        </p>
      </div>

      {acessosAbertos > 0 && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          <span className="font-semibold">
            {acessosAbertos} acesso(s) administrativo(s) a conta de cliente em aberto.
          </span>{" "}
          Uma sessão aberta continua com os dados do cliente à vista.{" "}
          <Link href="/admin/painel/auditoria" className="font-medium underline">
            Ver quais
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Numero rotulo="Contas cadastradas" valor={totalContas} detalhe="somando as sete soluções" />
        <Numero rotulo="Com assinatura ativa" valor={totalAtivas} detalhe="statusAssinatura = ATIVA" />
        <Numero rotulo="Contas novas" valor={totalNovas} detalhe="nos últimos 30 dias" />
        <Numero rotulo="Ações registradas" valor={acoesRecentes} detalhe="da administração, em 30 dias" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Numero rotulo="Clientes no hub" valor={clientes} detalhe="conta única que acessa várias soluções" />
        <Numero rotulo="Assinaturas no hub" valor={assinaturasAtivas} detalhe="vínculos ativos cliente ↔ solução" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Solução</th>
              <th className="px-4 py-3">Contas</th>
              <th className="px-4 py-3">Assinatura ativa</th>
              <th className="px-4 py-3">Novas (30 dias)</th>
              <th className="px-4 py-3">Bloqueadas</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {porSolucao.map((s) => (
              <tr key={s.chave} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-900">{s.rotulo}</td>
                <td className="px-4 py-3 text-slate-600">{s.total}</td>
                <td className="px-4 py-3 text-slate-600">{s.ativas}</td>
                <td className="px-4 py-3 text-slate-600">{s.novas}</td>
                <td className="px-4 py-3">
                  {s.bloqueadas > 0 ? (
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                      {s.bloqueadas}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/painel/contas?solucao=${s.chave}`} className="text-sm font-medium underline">
                    Ver contas
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Numero({ rotulo, valor, detalhe }: { rotulo: string; valor: number; detalhe: string }) {
  return (
    <div className="cartao">
      <p className="text-xs uppercase tracking-wide text-slate-500">{rotulo}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{valor}</p>
      <p className="mt-0.5 text-xs text-slate-400">{detalhe}</p>
    </div>
  );
}
