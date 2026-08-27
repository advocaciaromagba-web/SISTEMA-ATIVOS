"use client";

import { useFormState } from "react-dom";
import { salvarParecer, type ResultadoAcao } from "../../acoes";
import { BotaoSalvar } from "@/components/campos";

const inicial: ResultadoAcao = {};

export function FormularioParecer({
  certameId,
  participanteCertameId,
  situacaoAtual,
}: {
  certameId: string;
  participanteCertameId: string;
  situacaoAtual: string;
}) {
  const [estado, acao] = useFormState(salvarParecer, inicial);

  return (
    <form action={acao} className="space-y-3">
      <input type="hidden" name="certameId" value={certameId} />
      <input type="hidden" name="participanteCertameId" value={participanteCertameId} />

      {estado.erro && <div className="aviso-erro">{estado.erro}</div>}

      <div className="flex gap-2">
        {(["QUALIFICADO", "INABILITADO"] as const).map((s) => (
          <label
            key={s}
            className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm transition ${
              situacaoAtual === s
                ? s === "QUALIFICADO"
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-red-600 bg-red-600 text-white"
                : "border-slate-300 bg-white text-slate-600"
            }`}
          >
            <input type="radio" name="situacao" value={s} defaultChecked={situacaoAtual === s} className="hidden" />
            {s === "QUALIFICADO" ? "Qualificado" : "Inabilitado"}
          </label>
        ))}
      </div>

      <div>
        <label className="rotulo" htmlFor="motivo">
          Motivo
        </label>
        <textarea id="motivo" name="motivo" rows={3} className="campo" placeholder="Requisito por requisito, o que fundamenta a decisão." />
      </div>

      <BotaoSalvar>Registrar parecer</BotaoSalvar>
    </form>
  );
}
