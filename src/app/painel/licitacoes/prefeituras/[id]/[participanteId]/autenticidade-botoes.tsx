"use client";

import { useTransition } from "react";
import { registrarAutenticidade } from "../../acoes";

const OPCOES = [
  { valor: "CONFERE" as const, rotulo: "Confere", cor: "border-emerald-300 text-emerald-700 hover:bg-emerald-50" },
  { valor: "DIVERGE" as const, rotulo: "Diverge", cor: "border-red-300 text-red-700 hover:bg-red-50" },
  { valor: "NAO_VERIFICAVEL" as const, rotulo: "Não verificável", cor: "border-slate-300 text-slate-600 hover:bg-slate-50" },
];

/**
 * Marca se o documento apresentado confere com o que a fonte oficial
 * responde hoje. Três botões, não um formulário — é uma decisão de um
 * clique depois que o analista já comparou os dois.
 */
export function BotoesAutenticidade({
  documentoId,
  certameId,
  participanteCertameId,
  atual,
}: {
  documentoId: string;
  certameId: string;
  participanteCertameId: string;
  atual: string | null;
}) {
  const [pendente, iniciar] = useTransition();

  return (
    <div className="flex flex-wrap gap-1.5">
      {OPCOES.map((o) => (
        <button
          key={o.valor}
          type="button"
          disabled={pendente}
          onClick={() =>
            iniciar(() => {
              void registrarAutenticidade(documentoId, o.valor, certameId, participanteCertameId);
            })
          }
          className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 ${o.cor} ${
            atual === o.valor ? "ring-2 ring-offset-1" : ""
          }`}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}
