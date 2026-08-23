"use client";

import { useState, useTransition } from "react";
import { useFormState } from "react-dom";
import { auditarParte, liberarParte, rebloquearParte } from "@/app/painel/auditoria/acoes";
import type { ResultadoAcao } from "@/app/painel/pessoas/acoes";
import { BotaoSalvar } from "@/components/campos";
import {
  ROTULO_CAPACIDADE,
  ROTULO_IDONEIDADE,
  type Apontamento,
  type Capacidade,
  type Idoneidade,
} from "@/lib/auditoria/tipos";

const inicial: ResultadoAcao = {};

const CORES_IDONEIDADE: Record<Idoneidade, string> = {
  SEM_APONTAMENTO: "bg-emerald-100 text-emerald-800",
  ATENCAO: "bg-amber-100 text-amber-800",
  RESTRICAO: "bg-red-100 text-red-800",
};

const CORES_CAPACIDADE: Record<Capacidade, string> = {
  SUFICIENTE: "bg-emerald-100 text-emerald-800",
  LIMITADA: "bg-amber-100 text-amber-800",
  INSUFICIENTE: "bg-red-100 text-red-800",
  NAO_AVALIADA: "bg-slate-100 text-slate-600",
};

const CORES_GRAVIDADE: Record<string, string> = {
  GRAVE: "border-red-400 bg-red-50",
  MEDIA: "border-amber-400 bg-amber-50",
  BAIXA: "border-sky-400 bg-sky-50",
  INFO: "border-slate-300 bg-slate-50",
};

const ROTULO_GRAVIDADE: Record<string, string> = {
  GRAVE: "Grave",
  MEDIA: "Atenção",
  BAIXA: "Menor",
  INFO: "Informação",
};

export type DossieProps = {
  pessoaId: string;
  pessoaNome: string;
  bloqueada: boolean;
  ehDono: boolean;
  liberacao: { justificativa: string; por: string | null; em: string } | null;
  auditoria: {
    idoneidade: Idoneidade | null;
    capacidade: Capacidade | null;
    pontuacao: number | null;
    parecer: string | null;
    apontamentos: Apontamento[];
    criadoEm: string;
    vencida: boolean;
    valorReferencia: string | null;
    operacao: string | null;
    fontes: Array<{ fonte: string; status: string; resumo: string | null }>;
  } | null;
  /** Operações da parte, para medir a capacidade contra um valor. */
  operacoes: Array<{ id: string; codigo: string; titulo: string }>;
};

export function Dossie(props: DossieProps) {
  const { pessoaId, pessoaNome, bloqueada, ehDono, liberacao, auditoria, operacoes } = props;

  const [rodando, iniciar] = useTransition();
  const [erro, setErro] = useState("");
  const [operacaoEscolhida, setOperacaoEscolhida] = useState(operacoes[0]?.id ?? "");
  const [abrirLiberacao, setAbrirLiberacao] = useState(false);
  const [estadoLiberacao, acaoLiberar] = useFormState(liberarParte, inicial);

  function auditar() {
    setErro("");
    iniciar(async () => {
      const r = await auditarParte(pessoaId, operacaoEscolhida || null);
      if (r.erro) setErro(r.erro);
    });
  }

  function rebloquear() {
    iniciar(async () => {
      const r = await rebloquearParte(pessoaId);
      if (r.erro) setErro(r.erro);
    });
  }

  return (
    <section className="cartao">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Auditoria</h2>
          <p className="text-sm text-slate-500">
            Idoneidade e capacidade de pagamento, conferidas em fontes oficiais.
          </p>
        </div>

        <div className="flex items-end gap-2">
          {operacoes.length > 0 && (
            <div>
              <label className="mb-1 block text-xs text-slate-500" htmlFor="operacaoAuditoria">
                Medir capacidade contra
              </label>
              <select
                id="operacaoAuditoria"
                value={operacaoEscolhida}
                onChange={(e) => setOperacaoEscolhida(e.target.value)}
                className="campo py-1.5 text-sm"
              >
                <option value="">Sem operação</option>
                {operacoes.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.codigo} — {o.titulo}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button onClick={auditar} disabled={rodando} className="botao-principal">
            {rodando ? "Consultando..." : auditoria ? "Auditar de novo" : "Auditar agora"}
          </button>
        </div>
      </div>

      {erro && <div className="aviso-erro mb-4">{erro}</div>}

      {/* ---------- estado de bloqueio ---------- */}
      {bloqueada && (
        <div className="aviso-erro mb-4">
          <strong className="block">Parte bloqueada</strong>
          <span className="mt-1 block">
            Enquanto estiver bloqueada, esta parte não pode ser vinculada a operações nem entrar em documentos.
          </span>
          {ehDono && !abrirLiberacao && (
            <button onClick={() => setAbrirLiberacao(true)} className="mt-3 text-sm font-medium underline">
              Liberar assumindo o risco
            </button>
          )}
          {!ehDono && (
            <span className="mt-2 block text-xs">
              Somente o responsável pela empresa pode liberar uma parte bloqueada.
            </span>
          )}
        </div>
      )}

      {bloqueada && abrirLiberacao && ehDono && (
        <form action={acaoLiberar} className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <input type="hidden" name="pessoaId" value={pessoaId} />
          <label className="rotulo" htmlFor="justificativa">
            Por que você está liberando esta parte?
          </label>
          <textarea
            id="justificativa"
            name="justificativa"
            rows={3}
            className="campo"
            placeholder="Ex.: a inaptidão decorre de declaração em atraso, já regularizada; certidão anexada à operação."
            required
          />
          <p className="ajuda">
            A justificativa fica registrada com o seu nome e não apaga o apontamento do dossiê.
          </p>
          {estadoLiberacao.erro && <div className="aviso-erro mt-3">{estadoLiberacao.erro}</div>}
          <div className="mt-3 flex gap-2">
            <BotaoSalvar>Liberar</BotaoSalvar>
            <button type="button" onClick={() => setAbrirLiberacao(false)} className="botao-secundario">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {liberacao && !bloqueada && (
        <div className="aviso-atencao mb-4">
          <strong className="block">Parte liberada manualmente</strong>
          <span className="mt-1 block">&ldquo;{liberacao.justificativa}&rdquo;</span>
          <span className="mt-1 block text-xs">
            {liberacao.por ? `Por ${liberacao.por}, em ${liberacao.em}` : `Em ${liberacao.em}`}
          </span>
          {ehDono && (
            <button onClick={rebloquear} disabled={rodando} className="mt-2 text-xs font-medium underline">
              Voltar a bloquear
            </button>
          )}
        </div>
      )}

      {/* ---------- resultado ---------- */}
      {!auditoria ? (
        <div className="aviso-atencao">
          <strong className="block">Esta parte ainda não foi auditada</strong>
          <span className="mt-1 block">
            Sem auditoria, {pessoaNome} não pode ser vinculada a operações nem entrar em documentos.
          </span>
        </div>
      ) : (
        <div className="space-y-4">
          {auditoria.vencida && (
            <div className="aviso-atencao">
              A última auditoria é de {auditoria.criadoEm} e já passou da validade. Situação cadastral muda —
              refaça antes de assinar.
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <Indicador
              rotulo="Idoneidade"
              valor={auditoria.idoneidade ? ROTULO_IDONEIDADE[auditoria.idoneidade] : "—"}
              cor={auditoria.idoneidade ? CORES_IDONEIDADE[auditoria.idoneidade] : "bg-slate-100 text-slate-600"}
            />
            <Indicador
              rotulo="Capacidade de pagamento"
              valor={auditoria.capacidade ? ROTULO_CAPACIDADE[auditoria.capacidade] : "—"}
              cor={auditoria.capacidade ? CORES_CAPACIDADE[auditoria.capacidade] : "bg-slate-100 text-slate-600"}
            />
            <Indicador
              rotulo="Pontuação"
              valor={auditoria.pontuacao != null ? `${auditoria.pontuacao}/100` : "—"}
              cor="bg-slate-100 text-slate-700"
            />
          </div>

          {auditoria.parecer && (
            <div className="rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
              {auditoria.parecer}
            </div>
          )}

          <div className="text-xs text-slate-500">
            Auditada em {auditoria.criadoEm}
            {auditoria.operacao && ` · medida contra ${auditoria.operacao}`}
            {auditoria.valorReferencia && ` · valor de referência ${auditoria.valorReferencia}`}
          </div>

          {auditoria.apontamentos.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-800">
                O que a auditoria encontrou ({auditoria.apontamentos.length})
              </h3>
              <ul className="space-y-2">
                {auditoria.apontamentos.map((a, i) => (
                  <li key={i} className={`rounded-lg border-l-4 p-3 ${CORES_GRAVIDADE[a.gravidade] ?? ""}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{a.titulo}</span>
                      <span className="etiqueta bg-white/70 text-slate-600">
                        {ROTULO_GRAVIDADE[a.gravidade] ?? a.gravidade}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-700">{a.detalhe}</p>
                    <p className="mt-1 text-xs text-slate-500">Fonte: {a.fonte}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <details>
            <summary className="cursor-pointer text-sm font-medium text-slate-700">
              Fontes consultadas ({auditoria.fontes.length})
            </summary>
            <ul className="mt-3 space-y-1.5 text-sm">
              {auditoria.fontes.map((f, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-2">
                  <span className="font-mono text-xs text-slate-500">{f.fonte}</span>
                  <span
                    className={`etiqueta ${
                      f.status === "CONCLUIDA" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {f.status === "CONCLUIDA" ? "consultada" : "não consultada"}
                  </span>
                  <span className="text-slate-600">{f.resumo}</span>
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </section>
  );
}

function Indicador({ rotulo, valor, cor }: { rotulo: string; valor: string; cor: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{rotulo}</div>
      <div className={`mt-1.5 inline-flex rounded-full px-2.5 py-1 text-sm font-medium ${cor}`}>{valor}</div>
    </div>
  );
}
