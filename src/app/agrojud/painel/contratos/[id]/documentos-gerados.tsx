"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { gerarPeticaoComIa, excluirDocumentoGerado } from "../acoes";

export type DocumentoGeradoExistente = {
  id: string;
  tipo: string;
  origem: string;
  /** GERANDO | PRONTO | ERRO. */
  status: string;
  /** Só quando status = ERRO. */
  erro: string | null;
  nomeArquivo: string | null;
  criadoEm: string;
  /** `[CONFIRMAR: ...]` que a IA escreveu no texto — cada um é uma pendência que ela mesma sinalizou. */
  pendenciasMarcadas: string[];
  /** Rótulos dos campos essenciais que estavam faltando no cadastro quando esta peça foi gerada. */
  camposEssenciaisFaltantes: string[];
  /** Faltava dado essencial e a peça não marcou nenhuma pendência — pode ter omitido em vez de sinalizar. */
  alertaOmissaoPossivel: boolean;
};

const ROTULO_TIPO: Record<string, string> = {
  REQUERIMENTO_ADMINISTRATIVO: "Requerimento administrativo",
  PETICAO_INICIAL: "Petição inicial",
};

/**
 * Sem worker/cron para varrer jobs mortos, a tela mesma decide: um registro
 * GERANDO há mais tempo que isso quase certamente morreu (deploy no meio,
 * conexão da IA que nunca resolveu) — mostra como provável falha em vez de
 * girar para sempre. Tem folga sobre o timeout interno da chamada (10min).
 */
const MINUTOS_GERANDO_PROVAVEL_FALHA = 15;

function estaGerandoAtivo(d: DocumentoGeradoExistente): boolean {
  if (d.status !== "GERANDO") return false;
  const minutos = (Date.now() - new Date(d.criadoEm).getTime()) / 60_000;
  return minutos < MINUTOS_GERANDO_PROVAVEL_FALHA;
}

export function DocumentosGerados({ contratoId, documentos }: { contratoId: string; documentos: DocumentoGeradoExistente[] }) {
  const router = useRouter();
  const [disparando, iniciarDisparo] = useTransition();
  const [excluindo, iniciarExclusao] = useTransition();
  const [tipoEmAndamento, setTipoEmAndamento] = useState<string | null>(null);
  const [erro, setErro] = useState("");

  // Enquanto existir peça GERANDO (e ainda dentro do prazo razoável),
  // consulta o servidor de novo a cada alguns segundos — troca a espera
  // numa única conexão HTTP aberta por várias consultas curtas, que é o
  // que resolve o timeout silencioso (ver comentário em acoes.ts).
  const temGerandoAtivo = documentos.some(estaGerandoAtivo);
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (temGerandoAtivo) {
      intervaloRef.current = setInterval(() => router.refresh(), 5000);
    }
    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
    };
  }, [temGerandoAtivo, router]);

  function gerar(tipo: "REQUERIMENTO_ADMINISTRATIVO" | "PETICAO_INICIAL") {
    setErro("");
    setTipoEmAndamento(tipo);
    iniciarDisparo(async () => {
      const r = await gerarPeticaoComIa(contratoId, tipo);
      if (!r.ok) setErro(r.erro ?? "Não foi possível gerar a peça.");
      setTipoEmAndamento(null);
      router.refresh();
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
          disabled={disparando}
          className="botao-secundario text-sm disabled:opacity-50"
        >
          {disparando && tipoEmAndamento === "REQUERIMENTO_ADMINISTRATIVO" ? "Iniciando..." : "Gerar requerimento com IA"}
        </button>
        <button
          type="button"
          onClick={() => gerar("PETICAO_INICIAL")}
          disabled={disparando}
          className="botao-principal text-sm disabled:opacity-50"
        >
          {disparando && tipoEmAndamento === "PETICAO_INICIAL" ? "Iniciando..." : "Gerar petição inicial com IA"}
        </button>
      </div>

      {documentos.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma peça gerada por IA ainda.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {documentos.map((d) => {
            const gerandoAtivo = estaGerandoAtivo(d);
            const gerandoMorto = d.status === "GERANDO" && !gerandoAtivo;
            return (
              <li key={d.id} className="rounded-lg border border-slate-200 p-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="etiqueta bg-indigo-100 text-indigo-700">{ROTULO_TIPO[d.tipo] ?? d.tipo}</span>
                    <span className="ml-2 text-slate-600">{new Date(d.criadoEm).toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {d.status === "PRONTO" && (
                      <a href={`/api/agro/documentos/${d.id}`} className="text-xs font-medium text-slate-600 underline">
                        baixar
                      </a>
                    )}
                    <button onClick={() => remover(d.id)} disabled={excluindo} className="text-xs text-red-600 underline disabled:opacity-50">
                      excluir
                    </button>
                  </div>
                </div>

                {gerandoAtivo && (
                  <p className="mt-2 text-xs text-slate-500">
                    Gerando com IA... peça longa pode levar alguns minutos — a página atualiza sozinha, pode continuar
                    usando o resto da tela.
                  </p>
                )}

                {gerandoMorto && (
                  <div className="aviso-erro mt-2 text-xs">
                    Está &ldquo;gerando&rdquo; há mais de {MINUTOS_GERANDO_PROVAVEL_FALHA} minutos — provavelmente parou sem
                    terminar. Exclua esta entrada e gere de novo.
                  </div>
                )}

                {d.status === "ERRO" && <div className="aviso-erro mt-2 text-xs">{d.erro ?? "A geração falhou."}</div>}

                {d.alertaOmissaoPossivel && (
                  <div className="aviso-erro mt-2 text-xs">
                    Esta minuta não marcou nenhuma pendência, mas o cadastro tem {d.camposEssenciaisFaltantes.length}{" "}
                    dado(s) essencial(is) faltando ({d.camposEssenciaisFaltantes.join(", ")}). A IA pode ter omitido em
                    vez de sinalizar — revise a peça inteira com atenção redobrada antes de usar.
                  </div>
                )}

                {d.pendenciasMarcadas.length > 0 && (
                  <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
                    <p className="font-medium">Pendências marcadas pela própria IA nesta minuta ({d.pendenciasMarcadas.length}):</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4">
                      {d.pendenciasMarcadas.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
