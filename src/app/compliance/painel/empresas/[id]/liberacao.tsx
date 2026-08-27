"use client";

import { useState, useTransition } from "react";
import { useFormState } from "react-dom";
import { liberarEmpresaCompliance, rebloquearEmpresaCompliance, type ResultadoAcao } from "../acoes";
import { BotaoSalvar } from "@/components/campos";

const inicial: ResultadoAcao = {};

/**
 * Alerta de restrição com confirmação manual — a auditoria automática nunca
 * bloqueia sozinha para sempre: quem decide seguir mesmo assim é uma pessoa,
 * com justificativa registrada.
 */
export function LiberacaoEmpresa({
  complianceEmpresaId,
  bloqueada,
  ehDono,
  liberacao,
}: {
  complianceEmpresaId: string;
  bloqueada: boolean;
  ehDono: boolean;
  liberacao: { justificativa: string; por: string | null; em: string } | null;
}) {
  const [rodando, iniciar] = useTransition();
  const [abrir, setAbrir] = useState(false);
  const [erro, setErro] = useState("");
  const [estado, acao] = useFormState(liberarEmpresaCompliance, inicial);

  function rebloquear() {
    setErro("");
    iniciar(async () => {
      const r = await rebloquearEmpresaCompliance(complianceEmpresaId);
      if (r.erro) setErro(r.erro);
    });
  }

  if (bloqueada) {
    return (
      <div className="aviso-erro mt-3">
        <strong className="block">Empresa bloqueada — restrição encontrada na auditoria</strong>
        <span className="mt-1 block">
          Enquanto bloqueada, esta empresa fica marcada para revisão manual antes de qualquer relatório novo.
        </span>
        {ehDono && !abrir && (
          <button onClick={() => setAbrir(true)} className="mt-3 text-sm font-medium underline">
            Liberar assumindo o risco
          </button>
        )}
        {!ehDono && (
          <span className="mt-2 block text-xs">
            Somente o responsável pela conta pode liberar uma empresa bloqueada.
          </span>
        )}

        {abrir && ehDono && (
          <form action={acao} className="mt-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <input type="hidden" name="complianceEmpresaId" value={complianceEmpresaId} />
            <label className="rotulo" htmlFor="justificativa">
              Por que você está liberando esta empresa?
            </label>
            <textarea
              id="justificativa"
              name="justificativa"
              rows={3}
              className="campo"
              placeholder="Ex.: a restrição decorre de débito já parcelado, com certidão anexada ao processo."
              required
            />
            <p className="ajuda">A justificativa fica registrada com o seu nome.</p>
            {estado.erro && <div className="aviso-erro mt-3">{estado.erro}</div>}
            <div className="mt-3 flex gap-2">
              <BotaoSalvar>Liberar</BotaoSalvar>
              <button type="button" onClick={() => setAbrir(false)} className="botao-secundario">
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  if (liberacao) {
    return (
      <div className="aviso-atencao mt-3">
        <strong className="block">Empresa liberada manualmente</strong>
        <span className="mt-1 block">&ldquo;{liberacao.justificativa}&rdquo;</span>
        <span className="mt-1 block text-xs">
          {liberacao.por ? `Por ${liberacao.por}, em ${liberacao.em}` : `Em ${liberacao.em}`}
        </span>
        {erro && <div className="aviso-erro mt-2">{erro}</div>}
        {ehDono && (
          <button onClick={rebloquear} disabled={rodando} className="mt-2 text-xs font-medium underline">
            Voltar a bloquear
          </button>
        )}
      </div>
    );
  }

  return null;
}
