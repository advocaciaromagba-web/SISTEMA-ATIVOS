"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { reauditarPessoa } from "../acoes";

export function BotaoReauditar({ pessoaId }: { pessoaId: string }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();

  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          await reauditarPessoa(pessoaId);
          router.refresh();
        })
      }
      className="botao-secundario"
    >
      {pendente ? "Auditando..." : "Auditar novamente"}
    </button>
  );
}
