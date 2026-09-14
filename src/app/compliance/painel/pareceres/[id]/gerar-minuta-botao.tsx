"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { gerarMinutaNovamente } from "../acoes";

export function BotaoGerarMinuta({ pedidoId, children = "Gerar minuta novamente" }: { pedidoId: string; children?: string }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();

  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          await gerarMinutaNovamente(pedidoId);
          router.refresh();
        })
      }
      className="botao-secundario"
    >
      {pendente ? "Gerando..." : children}
    </button>
  );
}
