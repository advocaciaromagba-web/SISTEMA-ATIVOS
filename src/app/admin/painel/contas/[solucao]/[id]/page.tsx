import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirSessaoAdmin } from "@/lib/admin/sessao";
import { registrarAcaoAdmin } from "@/lib/admin/auditoria";
import { buscarConta, descritor, modelo } from "@/lib/admin/solucoes";
import { prisma } from "@/lib/prisma";
import { FormularioAcesso, FormularioBloqueio, FormularioExclusao } from "./formularios";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const dynamic = "force-dynamic";

function data(d: Date | null | undefined): string {
  return d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
}

export default async function ContaAdmin(props: { params: Promise<{ solucao: string; id: string }> }) {
  const params = await props.params;
  const admin = await exigirSessaoAdmin();

  const d = descritor(params.solucao);
  const conta = await buscarConta(params.solucao, params.id);
  if (!d || !conta) notFound();

  const usuarios = (await modelo(d.modeloUsuario).findMany({
    where: { [d.campoContaNoUsuario]: params.id },
    orderBy: { criadoEm: "asc" },
  })) as (Record<string, unknown> & { id: string; nome: string; email: string; ativo: boolean; papel?: string; ultimoAcesso?: Date | null })[];

  const acessos = await prisma.adminAcesso.findMany({
    where: { solucao: params.solucao, contaId: params.id },
    orderBy: { iniciadoEm: "desc" },
    take: 10,
    include: { administrador: { select: { nome: true } } },
  });

  // Abrir a ficha de um cliente já é ver dado dele: fica registrado.
  await registrarAcaoAdmin({
    admin,
    acao: "VER",
    solucao: params.solucao,
    alvoTipo: "CONTA",
    alvoId: params.id,
    resumo: `Abriu a ficha da conta “${conta.nome}” em ${d.rotulo}.`,
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/painel/contas" className="text-sm text-slate-500 underline">
          ← Voltar para contas
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">{conta.nome}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {d.rotulo} · criada em {new Date(conta.criadoEm).toLocaleDateString("pt-BR")}
          {conta.bloqueadoEm ? " · bloqueada" : ""}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="cartao">
          <h2 className="text-sm font-semibold text-slate-900">Cadastro</h2>
          <dl className="mt-2 space-y-1.5 text-sm">
            <Linha rotulo="Documento" valor={conta.documento} />
            <Linha rotulo="E-mail de contato" valor={conta.emailContato} />
            <Linha rotulo="Plano" valor={conta.plano} />
            <Linha rotulo="Assinatura" valor={conta.statusAssinatura} />
            <Linha rotulo="Teste expira em" valor={conta.testeExpiraEm ? new Date(conta.testeExpiraEm).toLocaleDateString("pt-BR") : null} />
            <Linha rotulo="Identificador" valor={conta.id} />
          </dl>
        </div>

        <div className="cartao">
          <h2 className="text-sm font-semibold text-slate-900">Usuários desta conta</h2>
          {usuarios.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Nenhum usuário cadastrado.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {usuarios.map((u) => (
                <li key={u.id} className="flex items-baseline justify-between gap-2">
                  <span>
                    <span className="font-medium text-slate-900">{u.nome}</span>{" "}
                    <span className="text-slate-500">{u.email}</span>
                  </span>
                  <span className="text-xs text-slate-400">
                    {u.ativo ? u.papel ?? "—" : "inativo"} · último acesso {data(u.ultimoAcesso ?? null)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <FormularioAcesso solucao={params.solucao} id={params.id} nome={conta.nome} />

      <FormularioBloqueio
        solucao={params.solucao}
        id={params.id}
        bloqueada={Boolean(conta.bloqueadoEm)}
        motivoAtual={conta.bloqueadoMotivo}
      />

      <div className="cartao">
        <h2 className="text-sm font-semibold text-slate-900">Acessos administrativos a esta conta</h2>
        {acessos.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Nenhum administrador entrou nesta conta ainda.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {acessos.map((a) => (
              <li key={a.id} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                <p className="text-slate-900">
                  {a.administrador.nome} — {data(a.iniciadoEm)}
                  {a.encerradoEm ? ` até ${data(a.encerradoEm)}` : " · ainda aberto"}
                </p>
                {a.motivo && <p className="text-xs text-slate-500">Motivo: {a.motivo}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <FormularioExclusao solucao={params.solucao} id={params.id} nome={conta.nome} />
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{rotulo}</dt>
      <dd className="text-right font-medium text-slate-900">{valor ?? "—"}</dd>
    </div>
  );
}
