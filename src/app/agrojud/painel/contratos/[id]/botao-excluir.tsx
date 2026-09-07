"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { excluirContrato } from "../acoes";

export function BotaoExcluir({ id, titulo }: { id: string; titulo: string }) {
  const router = useRouter();
  const [rodando, iniciar] = useTransition();
  const [erro, setErro] = useState("");

  function excluir() {
    if (!confirm(`Excluir a análise de "${titulo}"? Não pode ser desfeito.`)) return;
    setErro("");
    iniciar(async () => {
      const r = await excluirContrato(id);
      if (r.erro) setErro(r.erro);
      else router.push("/agrojud/painel/contratos");
    });
  }

  return (
    <div className="text-right">
      <button onClick={excluir} disabled={rodando} className="text-sm text-slate-400 hover:text-red-600 hover:underline">
        {rodando ? "Excluindo..." : "Excluir"}
      </button>
      {erro && <div className="mt-1 text-xs text-red-600">{erro}</div>}
    </div>
  );
}
