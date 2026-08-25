"use client";

import { useEffect, useState } from "react";
import { ROTULO_ESTADO, type EstadoSolucao, type Solucao } from "@/lib/solucoes";

const CORES_ESTADO: Record<EstadoSolucao, string> = {
  DISPONIVEL: "bg-emerald-100 text-emerald-800",
  PARCIAL: "bg-amber-100 text-amber-800",
  EM_CONSTRUCAO: "bg-slate-200 text-slate-700",
};

/**
 * As soluções em abas.
 *
 * Cada aba mostra a mesma estrutura, na mesma ordem: para quem serve, o que
 * entra, o que sai, onde foi apurado, e o que a solução não faz. Repetir a
 * estrutura permite comparar as soluções entre si, que é o que alguém decidindo
 * a compra precisa fazer.
 */
export function AbasSolucoes({ solucoes }: { solucoes: Solucao[] }) {
  const [ativa, setAtiva] = useState(solucoes[0]?.chave ?? "");

  /**
   * Enquanto o JavaScript não assumiu, TODAS as soluções ficam visíveis, uma
   * embaixo da outra.
   *
   * Não é detalhe de acessibilidade: se só a aba escolhida fosse para o HTML,
   * quatro das cinco soluções sumiriam da página que o Google lê, e quem
   * chegasse pela busca nunca acharia "análise de licitações". A aba é
   * conforto de navegação, não o que decide se o texto existe.
   */
  const [interativo, setInterativo] = useState(false);
  useEffect(() => setInterativo(true), []);

  if (solucoes.length === 0) return null;

  return (
    <div>
      {/* ---- as abas ---- */}
      {interativo && (
        <div role="tablist" aria-label="Soluções" className="flex flex-wrap gap-1 border-b border-slate-200">
          {solucoes.map((s) => {
            const selecionada = s.chave === ativa;
            return (
              <button
                key={s.chave}
                role="tab"
                type="button"
                id={`aba-${s.chave}`}
                aria-selected={selecionada}
                aria-controls={`painel-${s.chave}`}
                onClick={() => setAtiva(s.chave)}
                className={`-mb-px border-b-2 px-4 py-3 text-sm transition ${
                  selecionada
                    ? "border-[color:var(--marca-destaque)] font-semibold text-slate-900"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
                }`}
              >
                {s.nome}
              </button>
            );
          })}
        </div>
      )}

      {solucoes.map((s) => (
        <div
          key={s.chave}
          role={interativo ? "tabpanel" : undefined}
          id={`painel-${s.chave}`}
          aria-labelledby={interativo ? `aba-${s.chave}` : undefined}
          hidden={interativo && s.chave !== ativa}
          className={interativo ? "pt-8" : "border-t border-slate-200 py-10 first:border-t-0 first:pt-0"}
        >
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="titulo text-2xl font-semibold text-slate-900">{s.nome}</h2>
            <span className={`etiqueta ${CORES_ESTADO[s.estado]}`}>{ROTULO_ESTADO[s.estado]}</span>
          </div>

          <p className="chamada mt-3 max-w-3xl">{s.resumo}</p>

          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <h3 className="sobretitulo">Para quem</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{s.paraQuem}</p>

              <h3 className="sobretitulo mt-8">O que você informa</h3>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
                {s.entrada.map((e, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="destaque">—</span>
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-2">
              <h3 className="sobretitulo">O que você recebe</h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {s.entrega.map((e, i) => (
                  <li
                    key={i}
                    className="filete-destaque rounded-r bg-slate-50 py-2 pl-3 pr-3 text-sm text-slate-700"
                  >
                    {e}
                  </li>
                ))}
              </ul>

              <h3 className="sobretitulo mt-8">Apurado em</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{s.fontes.join(" · ")}</p>
            </div>
          </div>

          {/* O limite fica junto da promessa, de propósito. */}
          <div className="aviso-atencao mt-8 max-w-4xl">
            <strong className="block">O que esta solução não faz</strong>
            <span className="serif mt-1 block leading-relaxed">{s.limite}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
