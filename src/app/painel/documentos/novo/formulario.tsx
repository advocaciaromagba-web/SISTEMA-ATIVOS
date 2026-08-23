"use client";

import { useFormState } from "react-dom";
import { gerarEsalvar } from "../acoes";
import type { ResultadoAcao } from "../../pessoas/acoes";
import { BotaoSalvar, Secao } from "@/components/campos";
import type { CampoExtra } from "@/lib/documentos/catalogo";

const inicial: ResultadoAcao = {};

export function FormularioGeracao({
  tipo,
  campos,
  operacoes,
  operacaoSelecionada,
  exigeTestemunhas,
  baseLegal,
}: {
  tipo: string;
  campos: CampoExtra[];
  operacoes: Array<{ id: string; codigo: string; titulo: string }>;
  operacaoSelecionada: string;
  exigeTestemunhas: boolean;
  baseLegal: string[];
}) {
  const [estado, acao] = useFormState(gerarEsalvar, inicial);

  return (
    <form action={acao} className="space-y-5">
      <input type="hidden" name="tipo" value={tipo} />

      {estado.erro && <div className="aviso-erro">{estado.erro}</div>}

      <Secao titulo="Operação">
        <div>
          <label className="rotulo" htmlFor="operacaoId">
            A que operação este documento se refere
          </label>
          <select id="operacaoId" name="operacaoId" defaultValue={operacaoSelecionada} className="campo">
            <option value="">Nenhuma — documento avulso</option>
            {operacoes.map((o) => (
              <option key={o.id} value={o.id}>
                {o.codigo} — {o.titulo}
              </option>
            ))}
          </select>
          <p className="ajuda">
            É da operação que saem as partes, os valores e a descrição do ativo. Ao trocar aqui, recarregue a página
            para reconferir o que falta.
          </p>
        </div>
      </Secao>

      {campos.length > 0 && (
        <Secao titulo="Condições do documento">
          <div className="grid gap-4 sm:grid-cols-2">
            {campos.map((c) => (
              <CampoDinamico key={c.chave} campo={c} />
            ))}
          </div>
        </Secao>
      )}

      {exigeTestemunhas && (
        <div className="aviso-info">
          Este documento sai com espaço para <strong>duas testemunhas</strong>. Com as duas assinaturas ele vale como
          título executivo extrajudicial (CPC, art. 784, III) — ou seja, dá para executar direto, sem processo de
          conhecimento.
        </div>
      )}

      <details className="cartao">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">Em que a redação se apoia</summary>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-600">
          {baseLegal.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </details>

      <div className="flex gap-3">
        <BotaoSalvar>Gerar documento</BotaoSalvar>
        <a href="/painel/documentos" className="botao-secundario">
          Cancelar
        </a>
      </div>
    </form>
  );
}

function CampoDinamico({ campo }: { campo: CampoExtra }) {
  const nome = `campo_${campo.chave}`;
  const largura = campo.tipo === "area" ? "sm:col-span-2" : "";

  return (
    <div className={largura}>
      <label className="rotulo" htmlFor={nome}>
        {campo.rotulo}
        {campo.obrigatorio && <span className="text-red-500"> *</span>}
      </label>

      {campo.tipo === "area" ? (
        <textarea id={nome} name={nome} rows={3} defaultValue={campo.padrao ?? ""} className="campo" />
      ) : campo.tipo === "opcao" ? (
        <select id={nome} name={nome} defaultValue={String(campo.padrao ?? "")} className="campo">
          {(campo.opcoes ?? []).map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={nome}
          name={nome}
          type={campo.tipo === "data" ? "date" : "text"}
          defaultValue={campo.padrao ?? ""}
          className="campo"
          placeholder={campo.tipo === "moeda" ? "0,00" : campo.tipo === "percentual" ? "0,0" : undefined}
        />
      )}

      {campo.ajuda && <p className="ajuda">{campo.ajuda}</p>}
    </div>
  );
}
