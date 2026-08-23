"use client";

import { useState, useTransition } from "react";
import { useFormState } from "react-dom";
import Link from "next/link";
import { desvincularParte, vincularParte } from "../acoes";
import type { ResultadoAcao } from "../../pessoas/acoes";
import { BotaoSalvar } from "@/components/campos";
import { PAPEIS } from "@/lib/documentos/catalogo";

const inicial: ResultadoAcao = {};

export type PessoaResumo = { id: string; nome: string; documento: string | null; tipo: string };
export type ParteResumo = {
  id: string;
  papel: string;
  comissaoPercentual: string | null;
  ordemCadeia: number | null;
  pessoa: PessoaResumo;
};

export function Partes({
  operacaoId,
  partes,
  pessoas,
  podeEditar,
}: {
  operacaoId: string;
  partes: ParteResumo[];
  pessoas: PessoaResumo[];
  podeEditar: boolean;
}) {
  const [estado, acao] = useFormState(vincularParte, inicial);
  const [abrirForm, setAbrirForm] = useState(false);
  const [removendo, iniciarRemocao] = useTransition();
  const [erroRemocao, setErroRemocao] = useState("");

  function remover(parteId: string) {
    setErroRemocao("");
    iniciarRemocao(async () => {
      const resultado = await desvincularParte(parteId);
      if (resultado.erro) setErroRemocao(resultado.erro);
    });
  }

  return (
    <section className="cartao">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Partes da operação</h2>
          <p className="text-sm text-slate-500">
            Os documentos são montados a partir daqui. Sem parte vinculada, não há contrato.
          </p>
        </div>
        {podeEditar && (
          <button onClick={() => setAbrirForm(!abrirForm)} className="botao-secundario">
            {abrirForm ? "Fechar" : "Vincular parte"}
          </button>
        )}
      </div>

      {(estado.erro || erroRemocao) && <div className="aviso-erro mb-4">{estado.erro || erroRemocao}</div>}

      {abrirForm && (
        <form action={acao} className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <input type="hidden" name="operacaoId" value={operacaoId} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="rotulo" htmlFor="pessoaId">
                Parte
              </label>
              <select id="pessoaId" name="pessoaId" className="campo" required>
                <option value="">Selecione</option>
                {pessoas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} {p.documento ? `— ${p.documento}` : ""}
                  </option>
                ))}
              </select>
              <p className="ajuda">
                Não está na lista?{" "}
                <Link href="/painel/pessoas/nova" className="underline">
                  Cadastre a parte
                </Link>
                .
              </p>
            </div>

            <div>
              <label className="rotulo" htmlFor="papel">
                Papel
              </label>
              <select id="papel" name="papel" className="campo" required>
                {Object.entries(PAPEIS).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="rotulo" htmlFor="comissaoPercentual">
                  Comissão (%)
                </label>
                <input id="comissaoPercentual" name="comissaoPercentual" className="campo" placeholder="2,5" />
              </div>
              <div>
                <label className="rotulo" htmlFor="ordemCadeia">
                  Ordem na cadeia
                </label>
                <input id="ordemCadeia" name="ordemCadeia" type="number" min="1" className="campo" placeholder="1" />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <BotaoSalvar>Vincular</BotaoSalvar>
          </div>
        </form>
      )}

      {partes.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma parte vinculada ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="tabela">
            <thead>
              <tr>
                <th>Parte</th>
                <th>Papel</th>
                <th>Comissão</th>
                <th>Ordem</th>
                {podeEditar && <th></th>}
              </tr>
            </thead>
            <tbody>
              {partes.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/painel/pessoas/${p.pessoa.id}`} className="font-medium hover:underline">
                      {p.pessoa.nome}
                    </Link>
                    <div className="text-xs text-slate-500">{p.pessoa.documento ?? "sem documento"}</div>
                  </td>
                  <td className="text-slate-600">
                    {PAPEIS[p.papel as keyof typeof PAPEIS]?.replace(/ \(.*\)$/, "") ?? p.papel}
                  </td>
                  <td className="text-slate-600">{p.comissaoPercentual ? `${p.comissaoPercentual}%` : "—"}</td>
                  <td className="text-slate-600">{p.ordemCadeia ?? "—"}</td>
                  {podeEditar && (
                    <td className="text-right">
                      <button
                        onClick={() => remover(p.id)}
                        disabled={removendo}
                        className="text-xs text-red-600 hover:underline disabled:opacity-50"
                      >
                        remover
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
