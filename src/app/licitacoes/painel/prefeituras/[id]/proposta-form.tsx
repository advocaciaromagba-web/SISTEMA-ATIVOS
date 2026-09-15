"use client";

import { useActionState, useState } from "react";
import { salvarProposta, desclassificarProposta, type ResultadoAcao } from "../acoes";
import { BotaoSalvar } from "@/components/campos";

const inicial: ResultadoAcao = {};

/** Lançamento do valor ofertado, e desclassificação por ato da comissão. */
export function FormularioProposta({
  certameId,
  participanteCertameId,
  valorAtual,
  desclassificada,
}: {
  certameId: string;
  participanteCertameId: string;
  valorAtual: string | null;
  desclassificada: boolean;
}) {
  const [estadoValor, acaoValor] = useActionState(salvarProposta, inicial);
  const [estadoDesc, acaoDesc] = useActionState(desclassificarProposta, inicial);
  const [abrirDesclassificar, setAbrirDesclassificar] = useState(false);

  return (
    <div className="space-y-2">
      {(estadoValor.erro || estadoDesc.erro) && (
        <div className="aviso-erro text-xs">{estadoValor.erro || estadoDesc.erro}</div>
      )}

      <form action={acaoValor} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="certameId" value={certameId} />
        <input type="hidden" name="participanteCertameId" value={participanteCertameId} />
        <div>
          <label className="rotulo text-xs" htmlFor={`proposta-${participanteCertameId}`}>
            Proposta
          </label>
          <input
            id={`proposta-${participanteCertameId}`}
            name="propostaValor"
            defaultValue={valorAtual ?? ""}
            placeholder="0,00"
            className="campo w-36"
            required
          />
        </div>
        <BotaoSalvar>Lançar</BotaoSalvar>
        {!desclassificada && (
          <button
            type="button"
            onClick={() => setAbrirDesclassificar((v) => !v)}
            className="text-xs text-red-600 underline"
          >
            desclassificar proposta
          </button>
        )}
      </form>

      {abrirDesclassificar && !desclassificada && (
        <form action={acaoDesc} className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <input type="hidden" name="certameId" value={certameId} />
          <input type="hidden" name="participanteCertameId" value={participanteCertameId} />
          <label className="rotulo text-xs" htmlFor={`motivo-${participanteCertameId}`}>
            Motivo da desclassificação
          </label>
          <textarea
            id={`motivo-${participanteCertameId}`}
            name="motivo"
            rows={2}
            className="campo text-sm"
            placeholder="Ex.: proposta não atende à especificação do item 3.2 do edital."
            required
          />
          <p className="text-xs text-slate-500">
            O motivo fundamenta o ato e fica registrado. A desclassificação da comissão prevalece sobre a apuração
            automática.
          </p>
          <BotaoSalvar>Desclassificar</BotaoSalvar>
        </form>
      )}
    </div>
  );
}
