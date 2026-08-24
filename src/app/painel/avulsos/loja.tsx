"use client";

import { useState, useTransition } from "react";
import { useFormState } from "react-dom";
import { cancelarPedido, confirmarPagamento, criarPedido } from "./acoes";
import type { ResultadoAcao } from "../pessoas/acoes";
import { BotaoSalvar } from "@/components/campos";
import { AVULSOS, ROTULO_GRUPO, ROTULO_SITUACAO, type ItemAvulso } from "@/lib/avulsos";
import { moeda } from "@/lib/formato";

const inicial: ResultadoAcao = {};

const CORES_SITUACAO: Record<string, string> = {
  AGUARDANDO_PAGAMENTO: "bg-amber-100 text-amber-800",
  PAGO: "bg-sky-100 text-sky-800",
  EM_EXECUCAO: "bg-indigo-100 text-indigo-800",
  ENTREGUE: "bg-emerald-100 text-emerald-800",
  CANCELADO: "bg-slate-100 text-slate-600",
  ESTORNADO: "bg-red-100 text-red-800",
};

export type PedidoResumo = {
  id: string;
  numero: string;
  descricao: string;
  quantidade: number;
  valorTotal: string;
  situacao: string;
  referente: string | null;
  prometidoAte: string | null;
  criadoEm: string;
};

export function Loja({
  pessoas,
  operacoes,
  pedidos,
  ehDono,
}: {
  pessoas: Array<{ id: string; nome: string }>;
  operacoes: Array<{ id: string; codigo: string; titulo: string }>;
  pedidos: PedidoResumo[];
  ehDono: boolean;
}) {
  const [estado, acao] = useFormState(criarPedido, inicial);
  const [estadoPagamento, acaoPagamento] = useFormState(confirmarPagamento, inicial);
  const [escolhido, setEscolhido] = useState<ItemAvulso | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [pagando, setPagando] = useState<string | null>(null);
  const [processando, iniciar] = useTransition();
  const [erro, setErro] = useState("");

  function cancelar(id: string) {
    setErro("");
    iniciar(async () => {
      const r = await cancelarPedido(id);
      if (r.erro) setErro(r.erro);
    });
  }

  const grupos = AVULSOS.reduce<Record<string, ItemAvulso[]>>((mapa, item) => {
    (mapa[item.grupo] ??= []).push(item);
    return mapa;
  }, {});

  return (
    <div className="space-y-8">
      {(estado.erro || erro || estadoPagamento.erro) && (
        <div className="aviso-erro">{estado.erro || erro || estadoPagamento.erro}</div>
      )}

      {/* ---------------- catálogo ---------------- */}
      {Object.entries(grupos).map(([grupo, itens]) => (
        <section key={grupo}>
          <h2 className="mb-3 text-base font-semibold text-slate-900">
            {ROTULO_GRUPO[grupo as ItemAvulso["grupo"]] ?? grupo}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {itens.map((item) => (
              <div
                key={item.chave}
                className={`flex flex-col rounded-xl border bg-white p-5 ${
                  escolhido?.chave === item.chave ? "border-2 border-slate-800" : "border-slate-200"
                }`}
              >
                <h3 className="font-medium text-slate-900">{item.nome}</h3>
                <p className="mt-1 flex-1 text-sm text-slate-600">{item.descricao}</p>

                <div className="mt-4 text-2xl font-semibold text-slate-900">
                  {moeda(item.preco)}
                  <span className="text-sm font-normal text-slate-500"> / {item.unidade}</span>
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  {item.prazoUteis === 0
                    ? "resultado imediato"
                    : `entrega em ${item.prazoUteis} ${item.prazoUteis === 1 ? "dia útil" : "dias úteis"}`}
                </div>

                <p className="mt-2 text-xs text-slate-500">{item.entrega}</p>

                {item.requer && (
                  <p className="mt-2 text-xs text-amber-700">Depende de: {item.requer}</p>
                )}

                <button
                  onClick={() => {
                    setEscolhido(escolhido?.chave === item.chave ? null : item);
                    setQuantidade(1);
                  }}
                  className={`mt-4 ${escolhido?.chave === item.chave ? "botao-secundario" : "botao-principal"}`}
                >
                  {escolhido?.chave === item.chave ? "Fechar" : "Comprar"}
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* ---------------- formulário do pedido ---------------- */}
      {escolhido && (
        <section className="cartao border-2 border-slate-800">
          <h2 className="text-base font-semibold text-slate-900">{escolhido.nome}</h2>
          <p className="mt-1 text-sm text-slate-500">{escolhido.entrega}</p>

          <form action={acao} className="mt-4 space-y-4">
            <input type="hidden" name="item" value={escolhido.chave} />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="rotulo" htmlFor="quantidade">
                  Quantidade
                </label>
                <input
                  id="quantidade"
                  name="quantidade"
                  type="number"
                  min={1}
                  value={quantidade}
                  onChange={(e) => setQuantidade(Math.max(1, Number(e.target.value) || 1))}
                  className="campo"
                />
              </div>

              <div className="flex items-end">
                <div className="text-2xl font-semibold text-slate-900">
                  Total: {moeda(escolhido.preco * quantidade)}
                </div>
              </div>

              {escolhido.exigeParte && (
                <div className="sm:col-span-2">
                  <label className="rotulo" htmlFor="pessoaId">
                    A qual parte se refere <span className="text-red-500">*</span>
                  </label>
                  <select id="pessoaId" name="pessoaId" className="campo" required>
                    <option value="">Selecione</option>
                    {pessoas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {escolhido.exigeOperacao && (
                <div className="sm:col-span-2">
                  <label className="rotulo" htmlFor="operacaoId">
                    A qual operação se refere <span className="text-red-500">*</span>
                  </label>
                  <select id="operacaoId" name="operacaoId" className="campo" required>
                    <option value="">Selecione</option>
                    {operacoes.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.codigo} — {o.titulo}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="rotulo" htmlFor="observacao">
                  Observação
                </label>
                <textarea id="observacao" name="observacao" rows={2} className="campo" />
              </div>
            </div>

            <div className="aviso-info">
              O pedido é registrado agora e <strong>só entra em execução depois do pagamento confirmado</strong>.
              Nada é consultado nem cobrado antes disso.
            </div>

            <div className="flex gap-3">
              <BotaoSalvar>Fazer pedido</BotaoSalvar>
              <button type="button" onClick={() => setEscolhido(null)} className="botao-secundario">
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ---------------- pedidos ---------------- */}
      <section className="cartao p-0">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-900">Seus pedidos</h2>
        </div>

        {pedidos.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">Nenhum pedido avulso ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Item</th>
                  <th>Referente a</th>
                  <th className="text-right">Valor</th>
                  <th>Entrega</th>
                  <th>Situação</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap font-mono text-xs text-slate-500">
                      {p.numero}
                      <div className="text-xs">{p.criadoEm}</div>
                    </td>
                    <td>
                      <div className="font-medium text-slate-900">{p.descricao}</div>
                      {p.quantidade > 1 && <div className="text-xs text-slate-500">{p.quantidade} unidades</div>}
                    </td>
                    <td className="text-slate-600">{p.referente ?? "—"}</td>
                    <td className="text-right font-medium text-slate-900">{p.valorTotal}</td>
                    <td className="text-slate-600">{p.prometidoAte ?? "imediata"}</td>
                    <td>
                      <span className={`etiqueta ${CORES_SITUACAO[p.situacao] ?? "bg-slate-100"}`}>
                        {ROTULO_SITUACAO[p.situacao] ?? p.situacao}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-right">
                      {p.situacao === "AGUARDANDO_PAGAMENTO" && (
                        <>
                          {ehDono && (
                            <button
                              onClick={() => setPagando(pagando === p.id ? null : p.id)}
                              className="mr-3 text-xs font-medium text-slate-700 underline"
                            >
                              confirmar pagamento
                            </button>
                          )}
                          <button
                            onClick={() => cancelar(p.id)}
                            disabled={processando}
                            className="text-xs text-red-600 underline disabled:opacity-50"
                          >
                            cancelar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagando && ehDono && (
          <form action={acaoPagamento} className="border-t border-slate-200 bg-slate-50 p-5">
            <input type="hidden" name="pedidoId" value={pagando} />
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="rotulo" htmlFor="formaPagamento">
                  Como foi pago
                </label>
                <select id="formaPagamento" name="formaPagamento" className="campo" defaultValue="PIX">
                  <option value="PIX">Pix</option>
                  <option value="BOLETO">Boleto</option>
                  <option value="CARTAO">Cartão</option>
                </select>
              </div>
              <BotaoSalvar>Confirmar</BotaoSalvar>
              <button type="button" onClick={() => setPagando(null)} className="botao-secundario">
                Fechar
              </button>
            </div>
            <p className="ajuda mt-2">
              Confirmação manual enquanto a cobrança automática não está ligada. Quando o meio de pagamento for
              configurado, esta confirmação passa a acontecer sozinha.
            </p>
          </form>
        )}
      </section>
    </div>
  );
}
