"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { excluirDocumentoVerificacao } from "./acoes";

export function ExcluirBotao({ id }: { id: string }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();

  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          if (!confirm("Excluir este documento?")) return;
          await excluirDocumentoVerificacao(id);
          router.refresh();
        })
      }
      className="text-xs text-slate-400 hover:text-red-600 hover:underline"
    >
      {pendente ? "Excluindo..." : "Excluir"}
    </button>
  );
}
