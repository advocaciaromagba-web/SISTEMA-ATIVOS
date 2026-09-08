"use client";

import { useActionState } from "react";
import { salvarPrecoIa, salvarRenovacaoIa, resolverAlerta, type ResultadoCustos } from "./acoes";

const INICIAL: ResultadoCustos = {};

function Recado({ estado }: { estado: ResultadoCustos }) {
  if (estado.erro) return <div className="aviso-erro mt-3">{estado.erro}</div>;
  if (estado.ok)
    return <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{estado.ok}</div>;
  return null;
}

export function FormularioPreco({
  modelos,
}: {
  modelos: { modelo: string; entrada: string; saida: string; fonte: string; atualizadoEm: string }[];
}) {
  const [estado, acao] = useActionState(salvarPrecoIa, INICIAL);

  return (
    <div className="cartao">
      <h2 className="text-sm font-semibold text-slate-900">Preço da IA por modelo</h2>
      <p className="mt-1 text-sm text-slate-600">
        O sistema mede os tokens de cada chamada, mas não sabe quanto eles custam — preço de terceiro muda, e deixá-lo
        fixo no código produziria relatório errado sem ninguém perceber. Informe o preço e a fonte de onde tirou.
        Enquanto não houver preço, o custo aparece como não calculado.
      </p>

      {modelos.length > 0 && (
        <table className="mt-3 w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-1">Modelo</th>
              <th className="py-1">Entrada (US$/milhão)</th>
              <th className="py-1">Saída (US$/milhão)</th>
              <th className="py-1">Fonte</th>
            </tr>
          </thead>
          <tbody>
            {modelos.map((m) => (
              <tr key={m.modelo} className="border-t border-slate-100">
                <td className="py-1.5 font-medium text-slate-900">{m.modelo}</td>
                <td className="py-1.5 text-slate-600">{m.entrada}</td>
                <td className="py-1.5 text-slate-600">{m.saida}</td>
                <td className="py-1.5 text-xs text-slate-500">
                  {m.fonte} · {m.atualizadoEm}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form action={acao} className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="rotulo" htmlFor="modelo">
            Modelo
          </label>
          <input id="modelo" name="modelo" className="campo" placeholder="claude-opus-5" required />
        </div>
        <div>
          <label className="rotulo" htmlFor="fonte">
            Fonte do preço
          </label>
          <input id="fonte" name="fonte" className="campo" placeholder="anthropic.com/pricing, consultado em 07/09/2026" required />
        </div>
        <div>
          <label className="rotulo" htmlFor="entrada">
            US$ por milhão de tokens de entrada
          </label>
          <input id="entrada" name="entrada" className="campo" inputMode="decimal" placeholder="0,00" required />
        </div>
        <div>
          <label className="rotulo" htmlFor="saida">
            US$ por milhão de tokens de saída
          </label>
          <input id="saida" name="saida" className="campo" inputMode="decimal" placeholder="0,00" required />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className="botao-principal">
            Salvar preço
          </button>
        </div>
      </form>
      <Recado estado={estado} />
    </div>
  );
}

export function FormularioRenovacao({ renovacao, saldo }: { renovacao: string; saldo: string }) {
  const [estado, acao] = useActionState(salvarRenovacaoIa, INICIAL);

  return (
    <div className="cartao">
      <h2 className="text-sm font-semibold text-slate-900">Renovação do crédito de IA</h2>
      <p className="mt-1 text-sm text-slate-600">
        A API da Anthropic <span className="font-medium">não informa saldo</span> com a chave que o sistema usa — só uma
        chave de administrador de organização faria isso. Então o sistema não finge que lê o saldo: ele guarda o que
        você anotar aqui e avisa quando a data se aproximar. Além disso, se o crédito acabar de fato, a recusa da API é
        reconhecida na hora e vira alerta crítico nesta mesma tela.
      </p>
      <form action={acao} className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="rotulo" htmlFor="renovacao">
            Data de renovação / vencimento
          </label>
          <input id="renovacao" name="renovacao" type="date" className="campo" defaultValue={renovacao} />
        </div>
        <div>
          <label className="rotulo" htmlFor="saldo">
            Saldo anotado (opcional)
          </label>
          <input id="saldo" name="saldo" className="campo" defaultValue={saldo} placeholder="ex.: US$ 200 em 07/09/2026" />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className="botao-principal">
            Anotar
          </button>
        </div>
      </form>
      <Recado estado={estado} />
    </div>
  );
}

export function BotaoResolver({ id }: { id: string }) {
  const [estado, acao] = useActionState(resolverAlerta, INICIAL);

  return (
    <>
      <form action={acao}>
        <input type="hidden" name="id" value={id} />
        <button type="submit" className="text-xs font-medium underline">
          Marcar como resolvido
        </button>
      </form>
      {estado.erro && <p className="mt-1 text-xs text-red-700">{estado.erro}</p>}
    </>
  );
}
