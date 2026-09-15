"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { relerEditalInteresse } from "../../acoes";

export function BotaoRelerEdital({ editalId }: { editalId: string }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();

  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          await relerEditalInteresse(editalId);
          router.refresh();
        })
      }
      className="botao-secundario"
    >
      {pendente ? "Lendo..." : "Ler edital novamente"}
    </button>
  );
}
