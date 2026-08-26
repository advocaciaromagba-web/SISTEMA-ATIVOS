"use client";

import { useFormState } from "react-dom";
import { gerarEnvelope, type ResultadoAcao } from "../acoes";
import { BotaoSalvar } from "@/components/campos";
import type { EditalInteresse } from "@prisma/client";

const inicial: ResultadoAcao = {};

export function FormularioEnvelope({
  licitanteEmpresaId,
  editais,
}: {
  licitanteEmpresaId: string;
  editais: EditalInteresse[];
}) {
  const [estado, acao] = useFormState(gerarEnvelope, inicial);

  if (editais.length === 0) {
    return <p className="text-sm text-slate-500">Cadastre um edital de interesse para poder gerar o envelope.</p>;
  }

  return (
    <form action={acao} className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
      <input type="hidden" name="licitanteEmpresaId" value={licitanteEmpresaId} />

      {estado.erro && <div className="aviso-erro w-full">{estado.erro}</div>}

      <div className="min-w-64 flex-1">
        <label className="rotulo" htmlFor="editalInteresseId">
          Edital
        </label>
        <select id="editalInteresseId" name="editalInteresseId" className="campo" required defaultValue="">
          <option value="" disabled>
            Selecione o edital
          </option>
          {editais.map((e) => (
            <option key={e.id} value={e.id}>
              {e.modalidade} nº {e.numeroCertame} — {e.orgaoLicitante}
            </option>
          ))}
        </select>
      </div>

      <BotaoSalvar>Gerar envelope</BotaoSalvar>
    </form>
  );
}
