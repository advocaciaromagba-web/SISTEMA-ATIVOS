"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { assinarSolucao, cancelarSolucao, acessarSolucao, obterLinkPagamento } from "./acoes";

/** Só o Serasa não tem plano por mensalidade — o resto passa pelo seletor de planos. */
const SOLUCOES_SEM_PLANO = new Set(["CONSULTA_CADASTRAL_SERASA"]);

export function CartaoSolucao({
  chave,
  nome,
  resumo,
  icone,
  assinada,
  temCobranca,
}: {
  chave: string;
  nome: string;
  resumo: string;
  icone: ReactNode;
  assinada: boolean;
  temCobranca: boolean;
}) {
  const [rodando, iniciar] = useTransition();
  const [erro, setErro] = useState("");
  const temPlano = !SOLUCOES_SEM_PLANO.has(chave);

  function assinar() {
    setErro("");
    iniciar(async () => {
      const r = await assinarSolucao(chave);
      if (r.erro) setErro(r.erro);
    });
  }

  function cancelar() {
    if (!confirm(`Cancelar a assinatura de "${nome}"? Seus dados continuam guardados.`)) return;
    setErro("");
    iniciar(async () => {
      const r = await cancelarSolucao(chave);
      if (r.erro) setErro(r.erro);
    });
  }

  function acessar() {
    setErro("");
    iniciar(async () => {
      const r = await acessarSolucao(chave);
      if (r?.erro) setErro(r.erro);
    });
  }

  function verPagamento() {
    setErro("");
    iniciar(async () => {
      const r = await obterLinkPagamento(chave);
      if (r.erro) setErro(r.erro);
      else if (r.url) window.open(r.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <div className="cartao flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ background: "var(--marca-clara)" }}
        >
          {icone}
        </span>
        <div>
          <div className="text-sm font-semibold text-slate-900">{nome}</div>
          <p className="mt-1 text-xs text-slate-500">{resumo}</p>
        </div>
      </div>

      {erro && <div className="aviso-erro text-xs">{erro}</div>}

      {assinada ? (
        <div className="mt-auto space-y-2">
          <button onClick={acessar} disabled={rodando} className="botao-principal w-full py-1.5 text-sm">
            {rodando ? "Abrindo..." : "Acessar"}
          </button>
          <div className="flex items-center justify-between gap-2 text-xs">
            {temCobranca ? (
              <button onClick={verPagamento} disabled={rodando} className="text-slate-500 hover:underline">
                Ver pagamento
              </button>
            ) : (
              <span />
            )}
            <button onClick={cancelar} disabled={rodando} className="text-slate-400 hover:text-red-600 hover:underline">
              Cancelar
            </button>
          </div>
        </div>
      ) : temPlano ? (
        <Link href={`/cliente/painel/assinar/${chave}`} className="botao-secundario mt-auto py-1.5 text-center text-sm">
          Assinar
        </Link>
      ) : (
        <button onClick={assinar} disabled={rodando} className="botao-secundario mt-auto py-1.5 text-sm">
          {rodando ? "Assinando..." : "Assinar"}
        </button>
      )}
    </div>
  );
}
