"use client";

import { useState, useTransition } from "react";
import { useFormState } from "react-dom";
import { gerarSegredoDuasEtapas, confirmarDuasEtapas, desligarDuasEtapas, type ResultadoSeguranca } from "./acoes";
import { BotaoSalvar } from "@/components/campos";

const inicial: ResultadoSeguranca = {};

/**
 * Ativação da verificação em duas etapas.
 *
 * Sem gerador de QR nesta primeira versão: mostra a chave para digitar à mão
 * no aplicativo autenticador (Google Authenticator, Authy e afins aceitam
 * entrada manual). É honesto sobre a limitação em vez de fingir um QR que
 * não existe.
 */
export function FormularioDuasEtapas({ ativado }: { ativado: boolean }) {
  const [segredo, setSegredo] = useState<string | null>(null);
  const [gerando, iniciarGeracao] = useTransition();
  const [estado, acao] = useFormState(confirmarDuasEtapas, inicial);
  const [desligando, iniciarDesligamento] = useTransition();

  if (ativado) {
    return (
      <div className="space-y-4">
        <div className="aviso-ok">Verificação em duas etapas ligada.</div>
        <button
          type="button"
          disabled={desligando}
          onClick={() =>
            iniciarDesligamento(() => {
              void desligarDuasEtapas();
            })
          }
          className="botao-perigo"
        >
          {desligando ? "Desligando..." : "Desligar verificação em duas etapas"}
        </button>
      </div>
    );
  }

  if (estado.ok) {
    return <div className="aviso-ok">Verificação em duas etapas ativada. A partir de agora, o login pede o código.</div>;
  }

  if (!segredo) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          Num sistema que guarda dados de terceiros, senha sozinha não basta. Ligue a verificação em duas etapas
          com o aplicativo autenticador que preferir.
        </p>
        <button
          type="button"
          disabled={gerando}
          onClick={() =>
            iniciarGeracao(async () => {
              const resultado = await gerarSegredoDuasEtapas();
              if (resultado.segredo) setSegredo(resultado.segredo);
            })
          }
          className="botao-principal"
        >
          {gerando ? "Gerando..." : "Ligar verificação em duas etapas"}
        </button>
      </div>
    );
  }

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="segredo" value={segredo} />

      {estado.erro && <div className="aviso-erro">{estado.erro}</div>}

      <div className="aviso-info">
        <p className="font-medium">No aplicativo autenticador, adicione uma conta manualmente com esta chave:</p>
        <p className="mt-2 select-all rounded bg-white px-3 py-2 font-mono text-sm tracking-wider">{segredo}</p>
      </div>

      <div>
        <label className="rotulo" htmlFor="codigo">
          Código gerado pelo aplicativo
        </label>
        <input
          id="codigo"
          name="codigo"
          type="text"
          inputMode="numeric"
          className="campo tracking-widest"
          placeholder="000000"
          autoFocus
          required
        />
      </div>

      <BotaoSalvar>Confirmar e ligar</BotaoSalvar>
    </form>
  );
}
