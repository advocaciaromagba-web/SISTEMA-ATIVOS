"use client";

import { useFormState } from "react-dom";
import { anexarDocumentoPessoal, type ResultadoAcao } from "../acoes";
import { BotaoSalvar } from "@/components/campos";

const inicial: ResultadoAcao = {};

const TIPOS = [
  { valor: "RG", rotulo: "RG" },
  { valor: "CPF", rotulo: "CPF" },
  { valor: "COMPROVANTE_RESIDENCIA", rotulo: "Comprovante de residência" },
  { valor: "CONTRATO_SOCIAL", rotulo: "Contrato social" },
  { valor: "OUTRO", rotulo: "Outro" },
];

export function FormularioDocumentoPessoal({ licitanteEmpresaId }: { licitanteEmpresaId: string }) {
  const [estado, acao] = useFormState(anexarDocumentoPessoal, inicial);

  return (
    <form action={acao} className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
      <input type="hidden" name="licitanteEmpresaId" value={licitanteEmpresaId} />

      {estado.erro && <div className="aviso-erro w-full">{estado.erro}</div>}

      <div>
        <label className="rotulo" htmlFor="tipo">
          Tipo
        </label>
        <select id="tipo" name="tipo" className="campo" defaultValue="RG">
          {TIPOS.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.rotulo}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-56 flex-1">
        <label className="rotulo" htmlFor="arquivo">
          Arquivo
        </label>
        <input id="arquivo" name="arquivo" type="file" accept="image/*,application/pdf" className="campo" required />
      </div>

      <BotaoSalvar>Anexar</BotaoSalvar>
    </form>
  );
}
