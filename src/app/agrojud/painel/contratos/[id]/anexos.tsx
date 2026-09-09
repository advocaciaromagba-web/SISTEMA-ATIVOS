"use client";

import { useState, useTransition } from "react";
import {
  sugerirLeituraAnexo,
  anexarDocumento,
  excluirAnexo,
  type ResultadoAnexo,
} from "../acoes";
import { ROTULO_TIPO_ANEXO, type RascunhoAnexo, type TipoAnexo } from "@/lib/agro/leitura-anexo";

const TIPOS: TipoAnexo[] = ["OAB_ADVOGADO", "LAUDO_FRUSTRACAO_SAFRA", "LAUDO_CAPACIDADE_PAGAMENTO", "OUTRO"];

const ROTULO_CAMPO: Record<string, string> = {
  advogadoNome: "Nome do(a) advogado(a)",
  advogadoOab: "OAB",
  numeroSafrasComPerda: "Nº de safras com perda",
  anosSafrasComPerda: "Anos das safras",
  percentualReducaoRenda: "% de redução da renda",
  causaPerda: "Causa da perda",
  eventosClimaticos: "Eventos climáticos",
  profissionalHabilitadoNome: "Nome do profissional",
  profissionalHabilitadoRegistro: "Registro profissional",
  capacidadePagamentoComprometida: "Capacidade de pagamento comprometida",
  capacidadePagamentoResumo: "Resumo da capacidade de pagamento",
};

function valorParaExibir(valor: unknown): string {
  if (Array.isArray(valor)) return valor.join(", ");
  if (typeof valor === "boolean") return valor ? "Sim" : "Não";
  return String(valor);
}

export type AnexoExistente = {
  id: string;
  tipo: string;
  nomeArquivo: string;
  criadoEm: string;
};

export function Anexos({ contratoId, anexos }: { contratoId: string; anexos: AnexoExistente[] }) {
  const [tipo, setTipo] = useState<TipoAnexo>("LAUDO_FRUSTRACAO_SAFRA");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [lendo, iniciarLeitura] = useTransition();
  const [enviando, iniciarEnvio] = useTransition();
  const [erro, setErro] = useState("");
  const [leitura, setLeitura] = useState<RascunhoAnexo | null>(null);
  const [descartados, setDescartados] = useState<Set<string>>(new Set());
  const [ultimoResultado, setUltimoResultado] = useState<ResultadoAnexo | null>(null);

  const campos = leitura ? (Object.entries(leitura).filter(([, v]) => v !== undefined && v !== "") as [string, unknown][]) : [];

  function limpar() {
    setArquivo(null);
    setLeitura(null);
    setDescartados(new Set());
    setErro("");
    setUltimoResultado(null);
    const input = document.getElementById("anexo-arquivo") as HTMLInputElement | null;
    if (input) input.value = "";
  }

  function ler() {
    if (!arquivo) {
      setErro("Escolha um arquivo primeiro.");
      return;
    }
    setErro("");
    setLeitura(null);
    const fd = new FormData();
    fd.set("arquivo", arquivo);
    iniciarLeitura(async () => {
      const r = await sugerirLeituraAnexo(tipo, fd);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      setLeitura(r.dados);
      setDescartados(new Set());
    });
  }

  function enviar(comLeitura: boolean) {
    if (!arquivo) {
      setErro("Escolha um arquivo primeiro.");
      return;
    }
    setErro("");
    const fd = new FormData();
    fd.set("contratoId", contratoId);
    fd.set("tipo", tipo);
    fd.set("arquivo", arquivo);
    if (comLeitura && leitura) {
      const aprovados: Record<string, unknown> = {};
      for (const [chave, valor] of campos) {
        if (!descartados.has(chave)) aprovados[chave] = valor;
      }
      fd.set("camposConfirmadosJson", JSON.stringify(aprovados));
      // A leitura bruta fica arquivada no anexo, mesmo que nenhum campo
      // tenha sido aplicado — é o rastro de que a IA leu e do que ela viu.
      fd.set("leituraIaJson", JSON.stringify(leitura));
    }
    iniciarEnvio(async () => {
      const r = await anexarDocumento({}, fd);
      setUltimoResultado(r);
      if (r.ok) limpar();
    });
  }

  function remover(id: string) {
    if (!confirm("Excluir este anexo? Não pode ser desfeito.")) return;
    iniciarEnvio(async () => {
      await excluirAnexo(id);
    });
  }

  return (
    <div className="cartao space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Documentos de apoio</h2>
        <p className="mt-1 text-sm text-slate-500">
          OAB do(a) advogado(a), laudo técnico de frustração de safra, laudo de capacidade de pagamento. A IA lê e
          sugere os campos — você confere e escolhe o que entra no contrato antes de qualquer coisa mudar.
        </p>
      </div>

      {anexos.length > 0 && (
        <ul className="space-y-1 text-sm">
          {anexos.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-2">
              <div>
                <span className="etiqueta bg-slate-100 text-slate-700">{ROTULO_TIPO_ANEXO[a.tipo as TipoAnexo] ?? a.tipo}</span>
                <span className="ml-2 text-slate-600">{a.nomeArquivo}</span>
              </div>
              <div className="flex items-center gap-3">
                <a href={`/api/agro/anexos/${a.id}`} className="text-xs font-medium text-slate-600 underline">
                  abrir
                </a>
                <button onClick={() => remover(a.id)} className="text-xs text-red-600 underline">
                  excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3 border-t border-slate-100 pt-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="rotulo" htmlFor="anexo-tipo">
              Tipo de documento
            </label>
            <select
              id="anexo-tipo"
              className="campo"
              value={tipo}
              onChange={(e) => {
                setTipo(e.target.value as TipoAnexo);
                setLeitura(null);
              }}
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {ROTULO_TIPO_ANEXO[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="rotulo" htmlFor="anexo-arquivo">
              Arquivo
            </label>
            <input
              id="anexo-arquivo"
              type="file"
              accept="application/pdf,image/*"
              className="campo"
              onChange={(e) => {
                setArquivo(e.target.files?.[0] ?? null);
                setLeitura(null);
              }}
            />
          </div>
        </div>

        {erro && <div className="aviso-erro text-xs">{erro}</div>}
        {ultimoResultado?.erro && <div className="aviso-erro text-xs">{ultimoResultado.erro}</div>}

        <div className="flex flex-wrap gap-2">
          {tipo !== "OUTRO" && (
            <button type="button" onClick={ler} disabled={lendo || !arquivo} className="botao-secundario text-sm disabled:opacity-50">
              {lendo ? "Lendo com IA..." : "Ler com IA"}
            </button>
          )}
          <button type="button" onClick={() => enviar(true)} disabled={enviando || !arquivo} className="botao-principal text-sm disabled:opacity-50">
            {enviando ? "Anexando..." : "Anexar"}
          </button>
        </div>

        {leitura && campos.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">
              A IA leu isto no documento. Desmarque o que não deve entrar no contrato — o resto é aplicado ao
              clicar em "Anexar".
            </p>
            <ul className="mt-2 space-y-1">
              {campos.map(([chave, valor]) => {
                const usar = !descartados.has(chave);
                return (
                  <li key={chave} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={usar}
                      onChange={() =>
                        setDescartados((atual) => {
                          const novo = new Set(atual);
                          if (novo.has(chave)) novo.delete(chave);
                          else novo.add(chave);
                          return novo;
                        })
                      }
                      className="mt-0.5 h-4 w-4 rounded border-slate-300"
                    />
                    <span className={usar ? "" : "text-slate-400 line-through"}>
                      <span className="font-medium text-slate-700">{ROTULO_CAMPO[chave] ?? chave}:</span> {valorParaExibir(valor)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
