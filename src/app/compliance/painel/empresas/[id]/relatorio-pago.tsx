"use client";

import { useState, useTransition } from "react";
import { pedirRelatorioCompleto, reexecutarRelatorio } from "../acoes";

export type PedidoResumo = {
  id: string;
  numero: string;
  situacao: string;
  valor: string;
  linkPagamento: string | null;
  erro: string | null;
  criadoEm: string;
  entregueEm: string | null;
};

const SITUACAO: Record<string, { texto: string; cor: string }> = {
  AGUARDANDO_PAGAMENTO: { texto: "aguardando pagamento", cor: "bg-amber-100 text-amber-800" },
  PAGO: { texto: "pago — gerando", cor: "bg-sky-100 text-sky-800" },
  EM_EXECUCAO: { texto: "consultando os órgãos", cor: "bg-indigo-100 text-indigo-800" },
  ENTREGUE: { texto: "entregue", cor: "bg-emerald-100 text-emerald-800" },
  CANCELADO: { texto: "cancelado", cor: "bg-slate-100 text-slate-600" },
};

export function RelatorioPago({
  complianceEmpresaId,
  preco,
  pedidos,
}: {
  complianceEmpresaId: string;
  preco: string;
  pedidos: PedidoResumo[];
}) {
  const [processando, iniciar] = useTransition();
  const [erro, setErro] = useState("");

  const emAndamento = pedidos.find((p) =>
    ["AGUARDANDO_PAGAMENTO", "PAGO", "EM_EXECUCAO"].includes(p.situacao)
  );

  function pedir() {
    setErro("");
    iniciar(async () => {
      const r = await pedirRelatorioCompleto(complianceEmpresaId);
      if (r.erro) setErro(r.erro);
    });
  }

  function rodarDeNovo(id: string) {
    setErro("");
    iniciar(async () => {
      const r = await reexecutarRelatorio(id);
      if (r.erro) setErro(r.erro);
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        A verificação completa: certidões emitidas na fonte, processos judiciais no tribunal da sede, dívida ativa,
        sanções e cadastros de empresas punidas — tudo num documento assinado, com o que não foi possível
        verificar declarado no mesmo destaque do resto.
      </p>

      {erro && <div className="aviso-erro">{erro}</div>}

      {pedidos.length > 0 && (
        <ul className="divide-y divide-slate-100 text-sm">
          {pedidos.map((p) => {
            const s = SITUACAO[p.situacao] ?? { texto: p.situacao, cor: "bg-slate-100 text-slate-600" };
            return (
              <li key={p.id} className="py-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-mono text-xs text-slate-500">{p.numero}</span>
                    <span className={`etiqueta ml-2 ${s.cor}`}>{s.texto}</span>
                    <span className="ml-2 text-slate-600">{p.valor}</span>
                  </div>
                  <div className="shrink-0 text-xs">
                    {p.situacao === "AGUARDANDO_PAGAMENTO" && p.linkPagamento && (
                      <a
                        href={p.linkPagamento}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-emerald-700 underline"
                      >
                        pagar agora
                      </a>
                    )}
                    {p.situacao === "PAGO" && (
                      <button
                        type="button"
                        onClick={() => rodarDeNovo(p.id)}
                        disabled={processando}
                        className="font-medium text-slate-700 underline disabled:opacity-50"
                      >
                        gerar agora
                      </button>
                    )}
                    {p.situacao === "ENTREGUE" && (
                      <span className="text-slate-400">entregue em {p.entregueEm}</span>
                    )}
                  </div>
                </div>
                {p.erro && (
                  <p className="mt-1 text-xs text-red-700">
                    A geração parou: {p.erro} O pagamento continua valendo — use &quot;gerar agora&quot; para
                    tentar de novo, sem custo adicional.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!emAndamento && (
        <div className="border-t border-slate-100 pt-3">
          <button type="button" onClick={pedir} disabled={processando} className="botao-principal disabled:opacity-50">
            {processando ? "gerando cobrança…" : `Pedir relatório completo — ${preco}`}
          </button>
          <p className="ajuda mt-2">
            Você recebe o link de pagamento na hora. As consultas nos órgãos só acontecem depois que o pagamento
            é confirmado, e levam alguns minutos.
          </p>
        </div>
      )}

      {emAndamento?.situacao === "EM_EXECUCAO" && (
        <p className="text-xs text-slate-500">
          Consultando os órgãos agora. Isso leva alguns minutos — pode fechar a página e voltar depois.
        </p>
      )}
    </div>
  );
}
