"use client";

import { useActionState, useState } from "react";
import { finalizarParecerAcao, type ResultadoAcao } from "../acoes";
import { Campo, BotaoSalvar } from "@/components/campos";

const inicial: ResultadoAcao = {};

export function FinalizarParecer({ pedidoId, minuta, nomeUsuario }: { pedidoId: string; minuta: string; nomeUsuario: string }) {
  const [estado, acao] = useActionState(finalizarParecerAcao, inicial);
  const [assinar, setAssinar] = useState(false);

  return (
    <form action={acao} className="space-y-4">
      {estado.erro && <div className="aviso-erro">{estado.erro}</div>}
      <input type="hidden" name="pedidoId" value={pedidoId} />

      <div>
        <label className="rotulo" htmlFor="textoFinal">
          Texto do parecer
        </label>
        <textarea
          id="textoFinal"
          name="textoFinal"
          rows={16}
          defaultValue={minuta}
          required
          className="campo font-mono text-sm"
        />
        <p className="ajuda">Ajuste o que precisar antes de finalizar — esta é a versão que vira o parecer definitivo.</p>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="assinar"
          checked={assinar}
          onChange={(e) => setAssinar(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300"
        />
        <span className="text-slate-700">
          Registrar autoria — grava nome, cargo e data no documento como quem assina este parecer. Sem certificado
          digital: é um registro de responsabilidade, não uma assinatura ICP-Brasil.
        </span>
      </label>

      {assinar && (
        <div className="grid gap-4 rounded-lg border border-slate-200 p-4 sm:grid-cols-2">
          <Campo nome="responsavelNome" rotulo="Nome" valor={nomeUsuario} obrigatorio />
          <Campo nome="responsavelCargo" rotulo="Cargo" placeholder="Ex.: Analista de compliance" />
          <Campo nome="responsavelRegistro" rotulo="Registro (opcional)" placeholder="Ex.: OAB, CRC, matrícula" className="sm:col-span-2" />
        </div>
      )}

      <BotaoSalvar>{assinar ? "Finalizar e assinar" : "Finalizar sem assinar"}</BotaoSalvar>
    </form>
  );
}
