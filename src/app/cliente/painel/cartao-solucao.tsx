"use client";

import { useState, useTransition, type ReactNode } from "react";
import { assinarSolucao, cancelarSolucao, acessarSolucao } from "./acoes";

export function CartaoSolucao({
  chave,
  nome,
  resumo,
  icone,
  assinada,
}: {
  chave: string;
  nome: string;
  resumo: string;
  icone: ReactNode;
  assinada: boolean;
}) {
  const [rodando, iniciar] = useTransition();
  const [erro, setErro] = useState("");

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
        <div className="mt-auto flex items-center gap-2">
          <button onClick={acessar} disabled={rodando} className="botao-principal flex-1 py-1.5 text-sm">
            {rodando ? "Abrindo..." : "Acessar"}
          </button>
          <button onClick={cancelar} disabled={rodando} className="text-xs text-slate-400 hover:text-red-600 hover:underline">
            Cancelar
          </button>
        </div>
      ) : (
        <button onClick={assinar} disabled={rodando} className="botao-secundario mt-auto py-1.5 text-sm">
          {rodando ? "Assinando..." : "Assinar"}
        </button>
      )}
    </div>
  );
}
