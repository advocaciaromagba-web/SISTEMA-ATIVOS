"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { reauditarEmpresa } from "../acoes";

export function BotaoReauditar({ empresaId }: { empresaId: string }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();

  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          await reauditarEmpresa(empresaId);
          router.refresh();
        })
      }
      className="botao-secundario"
    >
      {pendente ? "Auditando..." : "Auditar novamente"}
    </button>
  );
}
