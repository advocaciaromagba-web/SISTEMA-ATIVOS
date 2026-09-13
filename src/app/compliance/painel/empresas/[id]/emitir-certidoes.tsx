"use client";

import { useState, useTransition } from "react";
import { emitirCertidaoCompliance } from "../acoes";

export type CertidaoDisponivel = {
  chave: string;
  nome: string;
  orgao: string;
  /** Há emissão automática contratada e com cobertura para esta certidão/UF. */
  automatica: boolean;
};

/**
 * Emissão das certidões direto na fonte.
 *
 * Cada certidão emitida é uma consulta paga: o botão diz isso antes de ser
 * clicado, e emite uma de cada vez — nada de "emitir todas" que gasta o
 * pacote inteiro num clique sem querer.
 */
export function EmitirCertidoes({
  complianceEmpresaId,
  certidoes,
  temContrato,
}: {
  complianceEmpresaId: string;
  certidoes: CertidaoDisponivel[];
  /** A emissão automática está contratada (token configurado). */
  temContrato: boolean;
}) {
  const [processando, iniciar] = useTransition();
  const [emitindo, setEmitindo] = useState<string | null>(null);
  const [erro, setErro] = useState("");

  function emitir(chave: string) {
    setErro("");
    setEmitindo(chave);
    iniciar(async () => {
      const r = await emitirCertidaoCompliance(complianceEmpresaId, chave);
      if (r.erro) setErro(r.erro);
      setEmitindo(null);
    });
  }

  if (!temContrato) {
    return (
      <div className="aviso-info">
        A emissão automática de certidões ainda não está contratada. Enquanto isso, emita pelo site do órgão (os
        links estão abaixo) e anexe o arquivo aqui.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {erro && <div className="aviso-erro">{erro}</div>}

      <p className="text-sm text-slate-500">
        Cada emissão é uma consulta cobrada e fica registrada no consumo desta solução. O comprovante do órgão é
        baixado e guardado junto.
      </p>

      <ul className="divide-y divide-slate-100">
        {certidoes.map((c) => (
          <li key={c.chave} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-slate-900">{c.nome}</div>
              <div className="truncate text-xs text-slate-500">{c.orgao}</div>
            </div>

            {c.automatica ? (
              <button
                type="button"
                onClick={() => emitir(c.chave)}
                disabled={processando}
                className="botao-secundario shrink-0 text-xs disabled:opacity-50"
              >
                {emitindo === c.chave ? "emitindo…" : "Emitir agora"}
              </button>
            ) : (
              <span className="shrink-0 text-xs text-slate-400">só pelo site do órgão</span>
            )}
          </li>
        ))}
      </ul>

      {processando && (
        <p className="text-xs text-slate-500">
          Certidão de tribunal pode levar alguns minutos — o órgão é consultado ao vivo. Não feche a página.
        </p>
      )}
    </div>
  );
}
