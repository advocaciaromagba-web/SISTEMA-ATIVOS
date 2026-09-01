"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { moeda } from "@/lib/formato";
import { iniciarAssinaturaPaga } from "./acoes";
import type { PlanoResumido } from "../planos-por-solucao";

export function FormularioAssinatura({
  solucao,
  planos,
  documentoJaCadastrado,
}: {
  solucao: string;
  planos: PlanoResumido[];
  documentoJaCadastrado: boolean;
}) {
  const router = useRouter();
  const [rodando, iniciar] = useTransition();
  const [erro, setErro] = useState("");
  const [planoChave, setPlanoChave] = useState(planos.find((p) => p.destaque)?.chave ?? planos[0]?.chave ?? "");
  const [ciclo, setCiclo] = useState<"MENSAL" | "ANUAL">("MENSAL");
  const [formaPagamento, setFormaPagamento] = useState<"PIX" | "CREDIT_CARD">("PIX");

  function enviar(dados: FormData) {
    setErro("");
    dados.set("plano", planoChave);
    dados.set("ciclo", ciclo);
    dados.set("formaPagamento", formaPagamento);
    iniciar(async () => {
      const r = await iniciarAssinaturaPaga(solucao, dados);
      if (r.erro) setErro(r.erro);
      else router.push("/cliente/painel");
    });
  }

  return (
    <form action={enviar} className="space-y-6">
      {erro && <div className="aviso-erro">{erro}</div>}

      <div>
        <label className="rotulo mb-2 block">Plano</label>
        <div className="grid gap-3 sm:grid-cols-3">
          {planos.map((p) => (
            <button
              key={p.chave}
              type="button"
              onClick={() => setPlanoChave(p.chave)}
              className={`cartao text-left transition ${planoChave === p.chave ? "ring-2" : ""}`}
              style={planoChave === p.chave ? ({ "--tw-ring-color": "var(--marca)" } as React.CSSProperties) : undefined}
            >
              <div className="text-sm font-semibold text-slate-900">{p.nome}</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{moeda(p.precoMensal)}</div>
              <div className="text-xs text-slate-500">por mês</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="rotulo mb-2 block">Ciclo de cobrança</label>
        <div className="flex gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="ciclo-ui" checked={ciclo === "MENSAL"} onChange={() => setCiclo("MENSAL")} />
            Mensal
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="ciclo-ui" checked={ciclo === "ANUAL"} onChange={() => setCiclo("ANUAL")} />
            Anual (com desconto)
          </label>
        </div>
      </div>

      <div>
        <label className="rotulo mb-2 block">Forma de pagamento</label>
        <div className="flex gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="forma-ui"
              checked={formaPagamento === "PIX"}
              onChange={() => setFormaPagamento("PIX")}
            />
            PIX
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="forma-ui"
              checked={formaPagamento === "CREDIT_CARD"}
              onChange={() => setFormaPagamento("CREDIT_CARD")}
            />
            Cartão de crédito
          </label>
        </div>
      </div>

      {!documentoJaCadastrado && (
        <div>
          <label className="rotulo" htmlFor="documento">
            CPF ou CNPJ
          </label>
          <input id="documento" name="documento" type="text" className="campo" required autoComplete="off" />
          <p className="ajuda">Só é pedido aqui, na primeira assinatura — exigência do meio de pagamento.</p>
        </div>
      )}

      <button type="submit" disabled={rodando || !planoChave} className="botao-principal w-full">
        {rodando ? "Configurando..." : "Confirmar assinatura"}
      </button>
    </form>
  );
}
