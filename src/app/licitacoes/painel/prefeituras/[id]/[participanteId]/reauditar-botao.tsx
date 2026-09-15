"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { reauditarParticipante } from "../../acoes";

export function BotaoReauditarParticipante({
  participanteCertameId,
  certameId,
}: {
  participanteCertameId: string;
  certameId: string;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState("");

  return (
    <div className="text-right">
      <button
        type="button"
        disabled={pendente}
        onClick={() => {
          setErro("");
          iniciar(async () => {
            const r = await reauditarParticipante(participanteCertameId, certameId);
            if (r.erro) setErro(r.erro);
            router.refresh();
          });
        }}
        className="botao-secundario"
      >
        {pendente ? "Verificando..." : "Verificar novamente"}
      </button>
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
