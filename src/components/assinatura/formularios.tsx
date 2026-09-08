"use client";

import { useState } from "react";
import { useActionState } from "react";
import { assinar, cancelar, type ResultadoAssinatura } from "./acoes";

const INICIAL: ResultadoAssinatura = {};

function Recado({ estado, sucesso }: { estado: ResultadoAssinatura; sucesso: string }) {
  if (estado.erro) return <div className="aviso-erro mt-3">{estado.erro}</div>;
  if (estado.ok)
    return <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{sucesso}</div>;
  return null;
}

export type PlanoParaEscolha = {
  chave: string;
  nome: string;
  precoMensal: number;
  precoAnual: number;
  precoMensalTexto: string;
  precoAnualTexto: string;
  destaque: boolean;
  paraQuem: string | null;
};

export function FormularioAssinar({ solucao, planos }: { solucao: string; planos: PlanoParaEscolha[] }) {
  const [estado, acao] = useActionState(assinar, INICIAL);
  const [escolhido, setEscolhido] = useState(planos.find((p) => p.destaque)?.chave ?? planos[0]?.chave ?? "");
  const [ciclo, setCiclo] = useState<"MENSAL" | "ANUAL">("MENSAL");

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="solucao" value={solucao} />
      <input type="hidden" name="plano" value={escolhido} />
      <input type="hidden" name="ciclo" value={ciclo} />

      <div>
        <p className="rotulo mb-2">Plano</p>
        <div className="space-y-2">
          {planos.map((p) => (
            <button
              type="button"
              key={p.chave}
              onClick={() => setEscolhido(p.chave)}
              className={`flex w-full items-start justify-between gap-3 rounded-lg border p-3 text-left ${
                escolhido === p.chave ? "border-2 bg-slate-50" : "border-slate-200"
              }`}
              style={escolhido === p.chave ? { borderColor: "var(--marca)" } : undefined}
            >
              <span>
                <span className="block text-sm font-medium text-slate-900">{p.nome}</span>
                {p.paraQuem && <span className="mt-0.5 block text-xs text-slate-500">{p.paraQuem}</span>}
              </span>
              <span className="shrink-0 text-sm font-medium text-slate-900">
                {ciclo === "ANUAL" ? `${p.precoAnualTexto}/ano` : `${p.precoMensalTexto}/mês`}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="rotulo">Cobrança</label>
          <select className="campo" value={ciclo} onChange={(e) => setCiclo(e.target.value as "MENSAL" | "ANUAL")}>
            <option value="MENSAL">Mensal</option>
            <option value="ANUAL">Anual</option>
          </select>
        </div>
        <div>
          <label className="rotulo" htmlFor="formaPagamento">
            Forma de pagamento
          </label>
          <select id="formaPagamento" name="formaPagamento" className="campo" defaultValue="PIX">
            <option value="PIX">PIX</option>
            <option value="CREDIT_CARD">Cartão de crédito</option>
          </select>
        </div>
      </div>

      <div>
        <label className="rotulo" htmlFor="documento">
          CPF ou CNPJ para a cobrança
        </label>
        <input id="documento" name="documento" className="campo" placeholder="somente números" />
        <p className="ajuda">
          Pedido só agora, na primeira vez que haverá cobrança de verdade — o cadastro continua sendo só nome, e-mail
          e senha. Se a conta já tiver documento, pode deixar em branco.
        </p>
      </div>

      <button type="submit" className="botao-principal w-full">
        Assinar
      </button>

      <p className="text-xs text-slate-500">
        Você não paga nada hoje. A primeira cobrança é programada para o fim do período de teste, e pode ser
        cancelada antes disso sem custo.
      </p>

      <Recado
        estado={estado}
        sucesso="Assinatura programada. A primeira cobrança acontece ao fim do teste — até lá, nada é debitado."
      />
    </form>
  );
}

export function FormularioCancelar({ solucao, rotulo }: { solucao: string; rotulo: string }) {
  const [aberto, setAberto] = useState(false);
  const [estado, acao] = useActionState(cancelar, INICIAL);

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="text-sm font-medium text-red-700 underline">
        Cancelar esta assinatura
      </button>
    );
  }

  return (
    <form action={acao} className="cartao space-y-3 border-red-200">
      <input type="hidden" name="solucao" value={solucao} />
      <p className="text-sm text-slate-700">
        Cancelar encerra a cobrança recorrente de <span className="font-medium">{rotulo}</span> e só dela. Seus dados
        continuam guardados, e as outras soluções que você assina não são afetadas.
      </p>
      <div>
        <label className="rotulo">Digite CANCELAR para confirmar</label>
        <input name="confirmacao" className="campo" placeholder="CANCELAR" autoComplete="off" required />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
          Cancelar assinatura
        </button>
        <button type="button" onClick={() => setAberto(false)} className="text-sm underline">
          Voltar
        </button>
      </div>
      <Recado estado={estado} sucesso="Assinatura cancelada. A cobrança recorrente foi encerrada no Asaas." />
    </form>
  );
}
