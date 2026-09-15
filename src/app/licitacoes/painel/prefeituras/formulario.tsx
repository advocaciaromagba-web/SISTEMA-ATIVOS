"use client";

import { useActionState } from "react";
import { salvarCertame, type ResultadoAcao } from "./acoes";
import { Campo, BotaoSalvar } from "@/components/campos";

const inicial: ResultadoAcao = {};

const MODALIDADES = [
  "Pregão Presencial",
  "Pregão Eletrônico",
  "Concorrência",
  "Tomada de Preços",
  "Dispensa de Licitação",
  "Convite",
];

export function FormularioCertame() {
  const [estado, acao] = useActionState(salvarCertame, inicial);

  return (
    <form action={acao} className="space-y-4">
      {estado.erro && <div className="aviso-erro">{estado.erro}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          nome="orgaoLicitante"
          rotulo="Órgão licitante"
          obrigatorio
          placeholder="Prefeitura Municipal de Icém/SP"
          className="sm:col-span-2"
        />
        <div>
          <label className="rotulo" htmlFor="modalidade">
            Modalidade <span className="text-red-500">*</span>
          </label>
          <select id="modalidade" name="modalidade" className="campo" required defaultValue="">
            <option value="" disabled>
              Selecione
            </option>
            {MODALIDADES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <Campo nome="numeroCertame" rotulo="Número do certame" obrigatorio placeholder="004/2021" />
        <Campo nome="objeto" rotulo="Objeto" className="sm:col-span-2" />
        <Campo nome="dataSessao" rotulo="Data da sessão" tipo="date" />
        <div>
          <label className="rotulo" htmlFor="arquivoEdital">
            Edital (opcional)
          </label>
          <input id="arquivoEdital" name="arquivoEdital" type="file" accept="application/pdf" className="campo" />
        </div>

        <div>
          <label className="rotulo" htmlFor="criterioJulgamento">
            Critério de julgamento
          </label>
          <select id="criterioJulgamento" name="criterioJulgamento" className="campo" defaultValue="MENOR_PRECO">
            <option value="MENOR_PRECO">Menor preço</option>
            <option value="MAIOR_DESCONTO">Maior desconto</option>
            <option value="MAIOR_LANCE">Maior lance</option>
            <option value="OUTRO">Outro (técnica, técnica e preço…)</option>
          </select>
          <p className="ajuda">Critérios com nota atribuída por banca não são ordenados automaticamente.</p>
        </div>

        <div>
          <label className="rotulo" htmlFor="tipoObjeto">
            Tipo de objeto
          </label>
          <select id="tipoObjeto" name="tipoObjeto" className="campo" defaultValue="COMPRA_SERVICO">
            <option value="COMPRA_SERVICO">Compra ou serviço comum</option>
            <option value="OBRA_SERVICO_ENGENHARIA">Obra ou serviço de engenharia</option>
          </select>
          <p className="ajuda">Em obra e serviço de engenharia vale o piso de exequibilidade de 75%.</p>
        </div>

        <Campo
          nome="valorEstimado"
          rotulo="Orçamento estimado (R$)"
          placeholder="150000,00"
          ajuda="Serve para conferir proposta acima do teto e indício de inexequibilidade."
        />

        <div className="flex items-start pt-6">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="orcamentoSigiloso" className="mt-0.5 h-4 w-4 rounded border-slate-300" />
            <span className="text-slate-700">Orçamento sigiloso (Lei nº 14.133/2021, art. 24)</span>
          </label>
        </div>
      </div>

      <div className="flex gap-3">
        <BotaoSalvar>Cadastrar certame</BotaoSalvar>
        <a href="/licitacoes/painel/prefeituras" className="botao-secundario">
          Cancelar
        </a>
      </div>
    </form>
  );
}
