"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { novaConsulta, type ResultadoAcao } from "./acoes";
import { BotaoSalvar } from "@/components/campos";

const inicial: ResultadoAcao = {};

export function FormularioNovaConsulta() {
  const [estado, acao] = useFormState(novaConsulta, inicial);
  const [tipoPessoa, setTipoPessoa] = useState<"PF" | "PJ">("PJ");

  return (
    <form action={acao} className="space-y-4">
      {estado.erro && <div className="aviso-erro">{estado.erro}</div>}
      {estado.ok && <div className="aviso-ok">Consulta concluída — veja no histórico.</div>}

      <div>
        <label className="rotulo">Tipo</label>
        <div className="flex gap-2">
          {(["PJ", "PF"] as const).map((t) => (
            <label
              key={t}
              className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm transition ${
                tipoPessoa === t ? "border-slate-800 bg-slate-800 text-white" : "border-slate-300 bg-white"
              }`}
            >
              <input
                type="radio"
                name="tipoPessoa"
                value={t}
                checked={tipoPessoa === t}
                onChange={() => setTipoPessoa(t)}
                className="hidden"
              />
              {t === "PJ" ? "Empresa" : "Pessoa física"}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="rotulo" htmlFor="documento">
          {tipoPessoa === "PJ" ? "CNPJ" : "CPF"}
        </label>
        <input
          id="documento"
          name="documento"
          className="campo"
          placeholder={tipoPessoa === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"}
          required
        />
      </div>

      <div>
        <label className="rotulo" htmlFor="nomeInformado">
          Nome (opcional)
        </label>
        <input id="nomeInformado" name="nomeInformado" className="campo" placeholder="Para identificar no histórico" />
      </div>

      <BotaoSalvar>Consultar</BotaoSalvar>
    </form>
  );
}
