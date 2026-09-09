"use client";

import { useState, useTransition } from "react";
import { gerarPeticaoComIa, excluirDocumentoGerado } from "../acoes";

export type DocumentoGeradoExistente = {
  id: string;
  tipo: string;
  origem: string;
  nomeArquivo: string;
  criadoEm: string;
};

const ROTULO_TIPO: Record<string, string> = {
  REQUERIMENTO_ADMINISTRATIVO: "Requerimento administrativo",
  PETICAO_INICIAL: "Petição inicial",
};

export function DocumentosGerados({ contratoId, documentos }: { contratoId: string; documentos: DocumentoGeradoExistente[] }) {
  const [gerando, iniciarGeracao] = useTransition();
  const [excluindo, iniciarExclusao] = useTransition();
  const [tipoEmAndamento, setTipoEmAndamento] = useState<string | null>(null);
  const [erro, setErro] = useState("");

  function gerar(tipo: "REQUERIMENTO_ADMINISTRATIVO" | "PETICAO_INICIAL") {
    setErro("");
    setTipoEmAndamento(tipo);
    iniciarGeracao(async () => {
      const r = await gerarPeticaoComIa(contratoId, tipo);
      if (!r.ok) setErro(r.erro ?? "Não foi possível gerar a peça.");
      setTipoEmAndamento(null);
    });
  }

  function remover(id: string) {
    if (!confirm("Excluir esta peça gerada? Não pode ser desfeito.")) return;
    iniciarExclusao(async () => {
      await excluirDocumentoGerado(id);
    });
  }

  return (
    <div className="cartao space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Dossiê — peças redigidas por IA</h2>
        <p className="mt-1 text-sm text-slate-500">
          A IA redige a peça inteira, livremente, a partir só dos fatos já verificados deste contrato e da
          jurisprudência conferida na fonte primária — nunca protocole sem revisão integral do advogado. Cada
          geração fica arquivada abaixo, com o texto que a IA produziu e os dados que ela recebeu.
        </p>
      </div>

      {erro && <div className="aviso-erro text-xs">{erro}</div>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => gerar("REQUERIMENTO_ADMINISTRATIVO")}
          disabled={gerando}
          className="botao-secundario text-sm disabled:opacity-50"
        >
          {gerando && tipoEmAndamento === "REQUERIMENTO_ADMINISTRATIVO" ? "Gerando com IA..." : "Gerar requerimento com IA"}
        </button>
        <button
          type="button"
          onClick={() => gerar("PETICAO_INICIAL")}
          disabled={gerando}
          className="botao-principal text-sm disabled:opacity-50"
        >
          {gerando && tipoEmAndamento === "PETICAO_INICIAL" ? "Gerando com IA..." : "Gerar petição inicial com IA"}
        </button>
      </div>

      {documentos.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma peça gerada por IA ainda.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {documentos.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-2">
              <div>
                <span className="etiqueta bg-indigo-100 text-indigo-700">{ROTULO_TIPO[d.tipo] ?? d.tipo}</span>
                <span className="ml-2 text-slate-600">{new Date(d.criadoEm).toLocaleString("pt-BR")}</span>
              </div>
              <div className="flex items-center gap-3">
                <a href={`/api/agro/documentos/${d.id}`} className="text-xs font-medium text-slate-600 underline">
                  baixar
                </a>
                <button onClick={() => remover(d.id)} disabled={excluindo} className="text-xs text-red-600 underline disabled:opacity-50">
                  excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
