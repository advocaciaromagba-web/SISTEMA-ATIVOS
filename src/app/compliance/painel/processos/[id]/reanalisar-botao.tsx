"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { reanalisarProcesso } from "../acoes";

export function BotaoReanalisar({ processoId }: { processoId: string }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();

  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          await reanalisarProcesso(processoId);
          router.refresh();
        })
      }
      className="botao-secundario"
    >
      {pendente ? "Analisando..." : "Analisar novamente"}
    </button>
  );
}
