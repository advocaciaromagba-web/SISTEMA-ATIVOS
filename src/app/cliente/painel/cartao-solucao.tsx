"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { acessarSolucao } from "./acoes";

const ROTULO_STATUS: Record<string, string> = {
  TESTE: "em teste",
  ATIVA: "assinatura ativa",
  INADIMPLENTE: "pagamento pendente",
  CANCELADA: "cancelada",
};

/**
 * Cartão de uma solução no hub.
 *
 * Duas situações, e só duas: ou o cliente já tem conta ali — e o cartão leva
 * para dentro — ou não tem, e o cartão leva para a página de planos DAQUELA
 * solução. Não existe mais botão de assinar aqui: assinar é dentro da
 * solução, com o preço e o contrato dela.
 */
export function CartaoSolucao({
  chave,
  nome,
  resumo,
  icone,
  temConta,
  statusAssinatura,
  paginaDePlanos,
}: {
  chave: string;
  nome: string;
  resumo: string;
  icone: ReactNode;
  temConta: boolean;
  statusAssinatura: string | null;
  paginaDePlanos: string;
}) {
  const [rodando, iniciar] = useTransition();
  const [erro, setErro] = useState("");

  function acessar() {
    setErro("");
    iniciar(async () => {
      const r = await acessarSolucao(chave);
      if (r?.erro) setErro(r.erro);
    });
  }

  return (
    <div className="cartao flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ background: "var(--marca-clara)" }}
        >
          {icone}
        </span>
        <div>
          <div className="text-sm font-semibold text-slate-900">{nome}</div>
          <p className="mt-1 text-xs text-slate-500">{resumo}</p>
        </div>
      </div>

      {erro && <div className="aviso-erro text-xs">{erro}</div>}

      {temConta ? (
        <div className="mt-auto space-y-2">
          {statusAssinatura && (
            <p className="text-xs text-slate-500">
              Situação: {ROTULO_STATUS[statusAssinatura] ?? statusAssinatura.toLowerCase()}
            </p>
          )}
          <button onClick={acessar} disabled={rodando} className="botao-principal w-full py-1.5 text-sm">
            {rodando ? "Abrindo..." : "Acessar"}
          </button>
          <p className="text-center text-xs text-slate-400">
            Plano, cobrança e cancelamento ficam dentro da solução.
          </p>
        </div>
      ) : (
        <Link href={paginaDePlanos} className="botao-secundario mt-auto py-1.5 text-center text-sm">
          Ver planos
        </Link>
      )}
    </div>
  );
}
