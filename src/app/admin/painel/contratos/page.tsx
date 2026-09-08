import { exigirSessaoAdmin } from "@/lib/admin/sessao";
import { prisma } from "@/lib/prisma";
import { SOLUCOES_ADMIN } from "@/lib/admin/solucoes";
import { FormularioRascunho, FormularioPublicar } from "./formularios";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const dynamic = "force-dynamic";

function quando(d: Date | null): string {
  return d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
}

export default async function ContratosAdmin() {
  await exigirSessaoAdmin();

  const solucoes = await Promise.all(
    SOLUCOES_ADMIN.map(async (s) => {
      const versoes = await prisma.contratoSolucao.findMany({
        where: { solucao: s.chave },
        orderBy: { versao: "desc" },
      });
      const rascunho = versoes.find((v) => !v.publicado) ?? null;
      const vigente = versoes.find((v) => v.publicado) ?? null;

      const aceites = vigente
        ? await prisma.aceiteContrato.count({ where: { solucao: s.chave, versao: vigente.versao } })
        : 0;

      return { ...s, versoes, rascunho, vigente, aceites };
    })
  );

  const semContrato = solucoes.filter((s) => !s.vigente).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Contratos</h1>
        <p className="mt-1 text-sm text-slate-500">
          Cada solução tem o contrato dela, com versões. Quem assina o Agrojud não pode estar aceitando cláusulas
          sobre precatórios — por isso não existe um contrato único da plataforma.
        </p>
      </div>

      {semContrato > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">
            {semContrato} solução(ões) ainda sem contrato publicado.
          </p>
          <p className="mt-0.5">
            Enquanto não houver, o cadastro dessas soluções continua funcionando, mas{" "}
            <span className="font-medium">nada é aceito nem registrado</span> — não há o que aceitar. Preferi deixar o
            cliente entrar a travar o cadastro por uma pendência que é nossa.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <p className="font-medium text-slate-900">Como funciona o versionamento</p>
        <p className="mt-0.5">
          Você escreve um rascunho e publica quando estiver revisado. Publicado, o texto congela: a cada aceite fica
          guardada a impressão digital do texto aceito, para provar depois o que o cliente leu. Para mudar o contrato,
          cria-se uma versão nova — quem já aceitou continua vinculado à versão que aceitou.
        </p>
      </div>

      {solucoes.map((s) => (
        <section key={s.chave} className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-2">
            <h2 className="text-base font-semibold text-slate-900">{s.rotulo}</h2>
            <span className="text-xs text-slate-400">{s.chave}</span>
          </div>

          <div className="cartao space-y-3">
            {s.vigente ? (
              <div>
                <p className="text-sm">
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                    em vigor
                  </span>{" "}
                  <span className="font-medium text-slate-900">
                    Versão {s.vigente.versao} — {s.vigente.titulo}
                  </span>
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Publicada em {quando(s.vigente.publicadoEm)} por {s.vigente.publicadoPor ?? "—"} · {s.aceites}{" "}
                  aceite(s) registrado(s)
                </p>
                <p className="mt-1 break-all text-xs text-slate-400">
                  Impressão digital: {s.vigente.hashConteudo?.slice(0, 32)}…
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Nenhuma versão publicada ainda.</p>
            )}

            {s.rascunho && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm">
                  <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                    rascunho
                  </span>{" "}
                  <span className="font-medium text-slate-900">
                    Versão {s.rascunho.versao} — {s.rascunho.titulo}
                  </span>
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {s.rascunho.conteudo.length.toLocaleString("pt-BR")} caracteres · editado em{" "}
                  {quando(s.rascunho.editadoEm)}
                </p>
                <div className="mt-2">
                  <FormularioPublicar solucao={s.chave} versao={s.rascunho.versao} />
                </div>
              </div>
            )}

            <FormularioRascunho
              solucao={s.chave}
              titulo={s.rascunho?.titulo ?? s.vigente?.titulo ?? `Termos de uso — ${s.rotulo}`}
              conteudo={s.rascunho?.conteudo ?? s.vigente?.conteudo ?? ""}
              versao={s.rascunho?.versao ?? null}
              temRascunho={Boolean(s.rascunho)}
            />

            {s.versoes.length > 1 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-slate-600">Histórico de versões ({s.versoes.length})</summary>
                <ul className="mt-2 space-y-1 text-xs text-slate-500">
                  {s.versoes.map((v) => (
                    <li key={v.id}>
                      Versão {v.versao} — {v.publicado ? `publicada em ${quando(v.publicadoEm)}` : "rascunho"} ·{" "}
                      {v.titulo}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
