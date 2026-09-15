"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { relerCertame } from "../acoes";

export function BotaoRelerCertame({ certameId }: { certameId: string }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();

  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          await relerCertame(certameId);
          router.refresh();
        })
      }
      className="botao-secundario"
    >
      {pendente ? "Lendo..." : "Ler edital novamente"}
    </button>
  );
}
