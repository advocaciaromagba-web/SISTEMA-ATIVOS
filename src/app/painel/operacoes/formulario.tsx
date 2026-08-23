"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import type { Operacao } from "@prisma/client";
import { salvarOperacao } from "./acoes";
import type { ResultadoAcao } from "../pessoas/acoes";
import { Area, BotaoSalvar, Campo, Marcador, Secao, Selecao } from "@/components/campos";
import { FASES, TIPOS_ATIVO } from "@/lib/documentos/catalogo";

const inicial: ResultadoAcao = {};

const opcoes = (mapa: Record<string, string>) =>
  Object.entries(mapa).map(([valor, rotulo]) => ({ valor, rotulo }));

/** Tipos de ativo que puxam o bloco de crédito judicial. */
const JUDICIAL = ["PRECATORIO", "DIREITO_CREDITORIO", "CREDITO_RURAL"];
const TRIBUTARIO = ["CREDITO_ICMS", "CREDITO_PIS_COFINS", "CREDITO_TRIBUTARIO", "CREDAQ"];

export function FormularioOperacao({ operacao }: { operacao?: Operacao }) {
  const [estado, acao] = useFormState(salvarOperacao, inicial);
  const [tipo, setTipo] = useState(operacao?.tipoAtivo ?? "PRECATORIO");

  const numero = (v: unknown) => (v == null ? "" : String(v));

  return (
    <form action={acao} className="space-y-5">
      {operacao && <input type="hidden" name="id" value={operacao.id} />}

      {estado.erro && <div className="aviso-erro">{estado.erro}</div>}

      <Secao titulo="Identificação">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            nome="titulo"
            rotulo="Nome da operação"
            valor={operacao?.titulo}
            obrigatorio
            placeholder="Precatório TJSP — Município de Guariba"
            className="sm:col-span-2"
          />

          <div>
            <label className="rotulo" htmlFor="tipoAtivo">
              Tipo de ativo <span className="text-red-500">*</span>
            </label>
            <select
              id="tipoAtivo"
              name="tipoAtivo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="campo"
              required
            >
              {opcoes(TIPOS_ATIVO).map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.rotulo}
                </option>
              ))}
            </select>
          </div>

          <Selecao nome="fase" rotulo="Fase" valor={operacao?.fase ?? "PROSPECCAO"} opcoes={opcoes(FASES)} />

          <Area nome="descricao" rotulo="Descrição" valor={operacao?.descricao} className="sm:col-span-2" />
        </div>
      </Secao>

      <Secao titulo="Números do negócio" descricao="O deságio é calculado sozinho se você informar os dois valores.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Selecao
            nome="moeda"
            rotulo="Moeda"
            valor={operacao?.moeda ?? "BRL"}
            opcoes={[
              { valor: "BRL", rotulo: "Real (R$)" },
              { valor: "USD", rotulo: "Dólar (US$)" },
              { valor: "EUR", rotulo: "Euro (€)" },
            ]}
          />
          <Campo nome="comissaoPercentual" rotulo="Comissão total (%)" valor={numero(operacao?.comissaoPercentual)} />
          <Campo nome="valorFace" rotulo="Valor de face" valor={numero(operacao?.valorFace)} placeholder="1.500.000,00" />
          <Campo
            nome="valorNegociado"
            rotulo="Valor negociado"
            valor={numero(operacao?.valorNegociado)}
            placeholder="900.000,00"
          />
          <Campo
            nome="desagioPercentual"
            rotulo="Deságio (%)"
            valor={numero(operacao?.desagioPercentual)}
            ajuda="Deixe em branco para o sistema calcular."
          />
        </div>
      </Secao>

      {JUDICIAL.includes(tipo) && (
        <Secao titulo="Crédito judicial" descricao="É o que identifica o ativo no contrato e permite a auditoria no tribunal.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo nome="tribunal" rotulo="Tribunal" valor={operacao?.tribunal} placeholder="TJSP" />
            <Campo nome="numeroPrecatorio" rotulo="Número do precatório" valor={operacao?.numeroPrecatorio} />
            <Campo
              nome="numeroProcesso"
              rotulo="Processo de origem"
              valor={operacao?.numeroProcesso}
              ajuda="Padrão CNJ, conferido automaticamente."
              placeholder="0001327-64.2018.8.26.0158"
              className="sm:col-span-2"
            />
            <Campo nome="enteDevedor" rotulo="Entidade devedora" valor={operacao?.enteDevedor} />
            <Selecao
              nome="esferaDevedor"
              rotulo="Esfera"
              valor={operacao?.esferaDevedor}
              vazio="Selecione"
              opcoes={[
                { valor: "FEDERAL", rotulo: "Federal" },
                { valor: "ESTADUAL", rotulo: "Estadual" },
                { valor: "MUNICIPAL", rotulo: "Municipal" },
                { valor: "AUTARQUIA", rotulo: "Autarquia / fundação" },
              ]}
            />
            <Selecao
              nome="naturezaCredito"
              rotulo="Natureza do crédito"
              valor={operacao?.naturezaCredito}
              vazio="Selecione"
              opcoes={[
                { valor: "ALIMENTAR", rotulo: "Alimentar" },
                { valor: "COMUM", rotulo: "Comum" },
              ]}
              ajuda="A preferência da natureza alimentar não passa para o comprador (CF, art. 100, § 13)."
            />
            <Campo nome="anoOrcamentario" rotulo="Ano orçamentário" valor={numero(operacao?.anoOrcamentario)} />
          </div>
        </Secao>
      )}

      {TRIBUTARIO.includes(tipo) && (
        <Secao titulo="Crédito tributário">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo nome="tributo" rotulo="Tributo" valor={operacao?.tributo} placeholder="ICMS acumulado" />
            <Campo nome="ufCredito" rotulo="UF de apuração" valor={operacao?.ufCredito} />
            <Campo nome="processoAdmin" rotulo="Processo administrativo" valor={operacao?.processoAdmin} className="sm:col-span-2" />
          </div>
        </Secao>
      )}

      {tipo === "COMMODITY" && (
        <Secao titulo="Commodity">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo nome="produto" rotulo="Produto" valor={operacao?.produto} placeholder="Açúcar VHP" />
            <Campo nome="incoterm" rotulo="Incoterm" valor={operacao?.incoterm} placeholder="FOB Santos" />
            <Campo nome="quantidade" rotulo="Quantidade" valor={numero(operacao?.quantidade)} />
            <Campo nome="unidade" rotulo="Unidade" valor={operacao?.unidade} placeholder="toneladas métricas" />
            <Campo nome="origem" rotulo="Origem" valor={operacao?.origem} />
            <Campo nome="destino" rotulo="Destino" valor={operacao?.destino} />
            <Campo nome="embarque" rotulo="Embarque previsto" valor={operacao?.embarque} className="sm:col-span-2" />
          </div>
        </Secao>
      )}

      <Secao titulo="Sigilo">
        <Marcador
          nome="confidencial"
          rotulo="Operação confidencial"
          marcado={operacao?.confidencial ?? true}
          ajuda="Marca a operação como sigilosa e registra o acesso de cada usuário."
        />
      </Secao>

      <div className="flex gap-3">
        <BotaoSalvar>{operacao ? "Salvar alterações" : "Criar operação"}</BotaoSalvar>
        <a href="/painel/operacoes" className="botao-secundario">
          Cancelar
        </a>
      </div>
    </form>
  );
}
