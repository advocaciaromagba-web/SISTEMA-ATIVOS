"use client";

import { useState } from "react";
import type { Acesso } from "@/lib/auditoria/links-certidoes";

/**
 * Caixa "confira direto no órgão" — link para a página oficial, com o aviso
 * certo sobre o que falta fazer lá dentro.
 *
 * Mostra dois textos de botão bem diferentes de propósito: quando `preenchido`
 * é `true`, o documento já chega digitado na página de destino e só falta
 * resolver o captcha — dito assim, sem meio-termo. Quando é `false`, o botão
 * diz para colar o número, e aparece um "Copiar documento" ao lado para isso
 * ser um clique em vez de digitação. Prometer "já preenchido" quando não é
 * verdade seria pior do que não ter o botão.
 */
export function AcessoOrgao({ acesso, documento }: { acesso: Acesso; documento?: string | null }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    if (!documento) return;
    try {
      await navigator.clipboard.writeText(documento);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Sem permissão de clipboard: o número aparece no texto abaixo mesmo assim.
    }
  }

  if (!acesso.url) {
    return <p className="text-sm text-slate-600">{acesso.instrucao}</p>;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm">
      <p className="text-slate-700">{acesso.instrucao}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <a href={acesso.url} target="_blank" rel="noreferrer" className="botao-principal py-1 text-xs">
          {acesso.preenchido
            ? "Conferir agora — só falta o captcha"
            : acesso.direto
              ? "Abrir a página do órgão"
              : "Procurar no site do órgão"}
        </a>
        {!acesso.preenchido && documento && (
          <button type="button" onClick={copiar} className="botao-secundario py-1 text-xs">
            {copiado ? "Copiado" : "Copiar documento"}
          </button>
        )}
        {acesso.captcha && <span className="etiqueta bg-amber-100 text-amber-800">exige captcha</span>}
        {!acesso.direto && <span className="text-slate-500">sistema próprio — a busca abre no site do órgão</span>}
      </div>
    </div>
  );
}
