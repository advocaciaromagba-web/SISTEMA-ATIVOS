"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { calcular, type ResultadoCalculadora } from "./acoes";
import { BotaoSalvar, Campo, Marcador, Secao, Selecao } from "@/components/campos";
import { moeda, moedaComExtenso, numero as formatarNumero } from "@/lib/formato";

const inicial: ResultadoCalculadora = {};

const hoje = new Date().toISOString().slice(0, 10);

export function FormularioCalculadora() {
  const [estado, acao] = useFormState(calcular, inicial);
  const [honorarios, setHonorarios] = useState("DESTACADOS");
  const [mostrarMeses, setMostrarMeses] = useState(false);

  const r = estado.atualizacao;
  const d = estado.deducoes;
  const c = estado.cessao;

  return (
    <div className="space-y-6">
      <form action={acao} className="space-y-5">
        {estado.erro && <div className="aviso-erro">{estado.erro}</div>}

        <Secao
          titulo="O valor e o período"
          descricao="O valor apurado na conta de liquidação e o intervalo a corrigir."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo nome="valorOriginal" rotulo="Valor da conta" obrigatorio placeholder="500.000,00" />
            <Campo nome="dataBase" rotulo="Data-base do valor" tipo="date" obrigatorio />
            <Campo nome="dataFinal" rotulo="Atualizar até" tipo="date" valor={hoje} obrigatorio />
          </div>
        </Secao>

        <Secao
          titulo="Regime de correção"
          descricao="Desde 09/12/2021 vale a Selic única (EC 113/2021). Antes disso, IPCA-E mais juros de mora à parte."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Selecao
              nome="naturezaRelacao"
              rotulo="Natureza da relação"
              valor="NAO_TRIBUTARIA"
              opcoes={[
                { valor: "NAO_TRIBUTARIA", rotulo: "Não tributária (IPCA-E + juros até a EC 113)" },
                { valor: "TRIBUTARIA", rotulo: "Tributária (Selic desde sempre)" },
              ]}
            />
            <Campo
              nome="jurosMensalAntigo"
              rotulo="Juros de mora ao mês, antes da EC 113 (%)"
              valor="0,5"
              ajuda="0,5% é o índice da poupança na maior parte do período."
            />
            <Campo
              nome="dataApresentacao"
              rotulo="Apresentação do precatório"
              tipo="date"
              ajuda="Define o período de graça, em que não correm juros."
            />
            <Campo
              nome="anoOrcamentario"
              rotulo="Ano orçamentário (LOA)"
              placeholder="2027"
              ajuda="Está no ofício requisitório e na certidão do tribunal."
            />
            <div className="sm:col-span-2">
              <Marcador
                nome="aplicarSumula17"
                rotulo="Afastar juros no período de graça (Súmula Vinculante 17)"
                marcado
                ajuda="Se a Súmula sobrevive à Selic única da EC 113 é discussão viva. Aplicada só no trecho anterior a ela."
              />
            </div>
          </div>
        </Secao>

        <Secao titulo="Deduções" descricao="O que sai antes de o credor receber.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Selecao
              nome="naturezaCredito"
              rotulo="Natureza do crédito"
              valor="ALIMENTAR"
              opcoes={[
                { valor: "ALIMENTAR", rotulo: "Alimentar (com retenção de imposto)" },
                { valor: "COMUM", rotulo: "Comum (sem retenção na fonte)" },
              ]}
            />

            <div>
              <label className="rotulo" htmlFor="tratamentoHonorarios">
                Honorários contratuais
              </label>
              <select
                id="tratamentoHonorarios"
                name="tratamentoHonorarios"
                value={honorarios}
                onChange={(e) => setHonorarios(e.target.value)}
                className="campo"
              >
                <option value="DESTACADOS">Já destacados no ofício requisitório</option>
                <option value="DEDUZIR">Deduzir agora, por percentual</option>
                <option value="SEM">Sem honorários contratuais</option>
              </select>
              <p className="ajuda">
                {honorarios === "DESTACADOS"
                  ? "O tribunal expediu requisitório separado em nome do advogado. O valor calculado já é o do credor — nada a deduzir."
                  : honorarios === "DEDUZIR"
                    ? "Serão pagos dentro do mesmo precatório e saem do que o credor recebe."
                    : "Nenhum honorário contratual incide sobre este crédito."}
              </p>
            </div>

            {honorarios === "DEDUZIR" && (
              <Campo
                nome="honorariosContratuaisPercentual"
                rotulo="Percentual dos honorários (%)"
                placeholder="20"
                ajuda="Informe o percentual do contrato com o advogado."
              />
            )}

            <Campo nome="honorariosSucumbenciais" rotulo="Honorários sucumbenciais (R$)" placeholder="0,00" />
            <Campo nome="contribuicaoPrevidenciaria" rotulo="Contribuição previdenciária (R$)" placeholder="0,00" />

            <div className="sm:col-span-2">
              <Marcador
                nome="jurosIsentosDeIr"
                rotulo="Não tributar os juros de mora (STF, Tema 808)"
                marcado
                ajuda="O STF fixou que não incide imposto de renda sobre juros de mora por atraso de remuneração."
              />
            </div>
          </div>
        </Secao>

        <Secao titulo="A cessão" descricao="Quanto o comprador paga e quanto sobra para cada um.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo nome="desagioPercentual" rotulo="Deságio (%)" placeholder="35" />
            <Campo nome="comissoesPercentual" rotulo="Comissão total dos intermediários (%)" placeholder="3" />
          </div>
        </Secao>

        <BotaoSalvar>Calcular</BotaoSalvar>
      </form>

      {/* ---------------------------------------------------------------- */}
      {r && d && c && (
        <div className="space-y-5">
          <Secao titulo="Resultado">
            <div className="space-y-1 text-sm">
              <Linha rotulo="Valor da conta" valor={moeda(r.valorOriginal)} />
              <Linha rotulo="Correção monetária" valor={moeda(r.correcaoTotal)} />
              {r.jurosTotal > 0 && <Linha rotulo="Juros de mora" valor={moeda(r.jurosTotal)} />}
              <Linha
                rotulo="Valor atualizado"
                valor={moeda(r.valorAtualizado)}
                destaque
                nota={`${formatarNumero(r.variacaoPercentual, 2)}% em ${r.linhas.length} meses`}
              />

              <div className="h-3" />

              {d.honorariosContratuais > 0 && (
                <Linha rotulo="Honorários contratuais" valor={`− ${moeda(d.honorariosContratuais)}`} />
              )}
              {d.honorariosSucumbenciais > 0 && (
                <Linha rotulo="Honorários sucumbenciais" valor={`− ${moeda(d.honorariosSucumbenciais)}`} />
              )}
              {d.contribuicaoPrevidenciaria > 0 && (
                <Linha rotulo="Contribuição previdenciária" valor={`− ${moeda(d.contribuicaoPrevidenciaria)}`} />
              )}
              {d.irrf > 0 && (
                <Linha
                  rotulo="Imposto de renda"
                  valor={`− ${moeda(d.irrf)}`}
                  nota={`${formatarNumero(d.aliquotaEfetiva, 2)}% efetivo sobre o bruto`}
                />
              )}
              <Linha rotulo="Líquido a receber do tribunal" valor={moeda(d.valorLiquido)} destaque />

              <div className="h-3" />

              <Linha rotulo="Deságio" valor={`− ${moeda(c.desagioValor)}`} />
              <Linha rotulo="Valor da cessão" valor={moeda(c.valorCessao)} destaque />
              {c.comissoes > 0 && <Linha rotulo="Comissões" valor={`− ${moeda(c.comissoes)}`} />}
              <Linha rotulo="Cedente recebe" valor={moeda(c.liquidoParaCedente)} destaque />

              <div className="h-3" />

              <Linha
                rotulo="Ganho bruto do comprador"
                valor={moeda(c.ganhoBrutoComprador)}
                nota={`retorno de ${formatarNumero(c.retornoPercentual, 2)}% sobre o desembolso`}
              />
            </div>

            <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              Valor da cessão por extenso: <strong>{moedaComExtenso(c.valorCessao)}</strong>
            </p>
          </Secao>

          <Secao titulo="Em que a conta se apoia">
            <ul className="list-inside list-disc space-y-1.5 text-sm text-slate-700">
              {r.regimeAplicado.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
              {d.explicacoes.map((x, i) => (
                <li key={`d${i}`}>{x}</li>
              ))}
            </ul>

            {r.prazoConstitucional && <div className="aviso-info mt-4">{r.prazoConstitucional}</div>}

            {r.avisos.map((x, i) => (
              <div key={i} className="aviso-atencao mt-3">
                {x}
              </div>
            ))}

            <p className="mt-4 text-xs text-slate-500">
              Índices obtidos das séries oficiais do Banco Central (Selic acumulada e IPCA-E). Este cálculo é uma
              estimativa para negociação: a conta que vale é a homologada pelo tribunal.
            </p>
          </Secao>

          <Secao titulo="Mês a mês">
            <button onClick={() => setMostrarMeses(!mostrarMeses)} className="botao-secundario">
              {mostrarMeses ? "Ocultar" : `Ver os ${r.linhas.length} meses`}
            </button>

            {mostrarMeses && (
              <div className="mt-4 max-h-96 overflow-auto">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Mês</th>
                      <th>Regime</th>
                      <th className="text-right">Índice</th>
                      <th className="text-right">Juros</th>
                      <th className="text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.linhas.map((l, i) => (
                      <tr key={i}>
                        <td className="whitespace-nowrap">
                          {String(l.mes).padStart(2, "0")}/{l.ano}
                        </td>
                        <td className="text-slate-600">
                          {l.regime === "SELIC" ? "Selic única" : "IPCA-E + juros"}
                          {l.periodoDeGraca && (
                            <span className="ml-2 etiqueta bg-sky-100 text-sky-800">período de graça</span>
                          )}
                        </td>
                        <td className="text-right text-slate-600">
                          {l.indicePercentual != null ? `${formatarNumero(l.indicePercentual, 2)}%` : "—"}
                        </td>
                        <td className="text-right text-slate-600">
                          {l.jurosPercentual > 0 ? `${formatarNumero(l.jurosPercentual, 2)}%` : "—"}
                        </td>
                        <td className="text-right font-medium">{moeda(l.saldo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Secao>
        </div>
      )}
    </div>
  );
}

function Linha({
  rotulo,
  valor,
  destaque,
  nota,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
  nota?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-baseline justify-between gap-2 ${
        destaque ? "border-t border-slate-200 pt-1.5 font-semibold text-slate-900" : "text-slate-600"
      }`}
    >
      <span>{rotulo}</span>
      <span className="text-right">
        {valor}
        {nota && <span className="ml-2 text-xs font-normal text-slate-500">{nota}</span>}
      </span>
    </div>
  );
}
