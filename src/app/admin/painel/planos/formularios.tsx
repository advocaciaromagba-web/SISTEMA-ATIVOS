"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { salvarPlano, salvarConfiguracao, type ResultadoPlano } from "./acoes";

const INICIAL: ResultadoPlano = {};

function Recado({ estado }: { estado: ResultadoPlano }) {
  if (estado.erro) return <div className="aviso-erro mt-3">{estado.erro}</div>;
  if (estado.ok)
    return <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{estado.ok}</div>;
  return null;
}

export type PlanoEditavel = {
  chave: string;
  nome: string;
  paraQuem: string | null;
  precoMensal: number;
  precoAnual: number;
  inclui: string[];
  naoInclui: string[];
  destaque: boolean;
  ordem: number;
  ativo: boolean;
};

function reais(v: number): string {
  return v.toFixed(2).replace(".", ",");
}

export function FormularioPlano({
  solucao,
  plano,
  novo,
}: {
  solucao: string;
  plano?: PlanoEditavel;
  novo?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [estado, acao] = useFormState(salvarPlano, INICIAL);

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="text-sm font-medium underline">
        {novo ? "Adicionar plano" : "Editar"}
      </button>
    );
  }

  return (
    <form action={acao} className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <input type="hidden" name="solucao" value={solucao} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="rotulo">Identificador</label>
          <input
            name="chave"
            className="campo"
            defaultValue={plano?.chave ?? ""}
            placeholder="ESSENCIAL"
            readOnly={!novo}
            required
          />
          {!novo && <p className="ajuda">Não muda: é o que liga este plano às assinaturas existentes.</p>}
        </div>
        <div>
          <label className="rotulo">Nome que o cliente vê</label>
          <input name="nome" className="campo" defaultValue={plano?.nome ?? ""} placeholder="Essencial" required />
        </div>
        <div>
          <label className="rotulo">Preço mensal (R$)</label>
          <input name="precoMensal" className="campo" inputMode="decimal" defaultValue={plano ? reais(plano.precoMensal) : ""} required />
        </div>
        <div>
          <label className="rotulo">Preço anual (R$)</label>
          <input name="precoAnual" className="campo" inputMode="decimal" defaultValue={plano ? reais(plano.precoAnual) : ""} required />
        </div>
        <div className="sm:col-span-2">
          <label className="rotulo">Para quem é</label>
          <input name="paraQuem" className="campo" defaultValue={plano?.paraQuem ?? ""} placeholder="Para escritório que atende..." />
        </div>
        <div className="sm:col-span-2">
          <label className="rotulo">O que inclui — uma linha por item</label>
          <textarea name="inclui" className="campo" rows={5} defaultValue={(plano?.inclui ?? []).join("\n")} />
        </div>
        <div className="sm:col-span-2">
          <label className="rotulo">O que NÃO inclui — uma linha por item</label>
          <textarea name="naoInclui" className="campo" rows={3} defaultValue={(plano?.naoInclui ?? []).join("\n")} />
          <p className="ajuda">Dizer o que não vem junto evita cliente frustrado depois de pagar.</p>
        </div>
        <div>
          <label className="rotulo">Ordem na página</label>
          <input name="ordem" className="campo" inputMode="numeric" defaultValue={String(plano?.ordem ?? 0)} />
        </div>
        <div>
          <label className="rotulo">Destacar como recomendado</label>
          <select name="destaque" className="campo" defaultValue={plano?.destaque ? "sim" : "nao"}>
            <option value="nao">Não</option>
            <option value="sim">Sim</option>
          </select>
        </div>
        <div>
          <label className="rotulo">À venda</label>
          <select name="ativo" className="campo" defaultValue={plano?.ativo === false ? "nao" : "sim"}>
            <option value="sim">Sim</option>
            <option value="nao">Não — some da página, quem já assinou continua</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit" className="botao-principal">
          Salvar plano
        </button>
        <button type="button" onClick={() => setAberto(false)} className="text-sm underline">
          Fechar
        </button>
      </div>

      <Recado estado={estado} />
    </form>
  );
}

export function FormularioConfiguracao({
  solucao,
  diasDeTeste,
  consultasGratisTeste,
}: {
  solucao: string;
  diasDeTeste: number;
  consultasGratisTeste: number;
}) {
  const [estado, acao] = useFormState(salvarConfiguracao, INICIAL);

  return (
    <form action={acao} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="solucao" value={solucao} />
      <div>
        <label className="rotulo">Dias de teste</label>
        <input name="diasDeTeste" className="campo w-28" inputMode="numeric" defaultValue={String(diasDeTeste)} />
      </div>
      <div>
        <label className="rotulo">Análises grátis no teste</label>
        <input name="consultasGratisTeste" className="campo w-28" inputMode="numeric" defaultValue={String(consultasGratisTeste)} />
      </div>
      <button type="submit" className="botao-principal">
        Salvar
      </button>
      <div className="w-full">
        <Recado estado={estado} />
      </div>
    </form>
  );
}
