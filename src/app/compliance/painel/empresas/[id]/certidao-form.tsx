"use client";

import { useFormState } from "react-dom";
import { anexarCertidao, type ResultadoAcao } from "../acoes";
import { BotaoSalvar } from "@/components/campos";

const inicial: ResultadoAcao = {};

const TIPOS = [
  { valor: "CERTIDAO_TRIBUTOS_FEDERAIS", rotulo: "Certidão de tributos federais" },
  { valor: "CERTIDAO_FGTS", rotulo: "Certidão do FGTS" },
  { valor: "CNDT", rotulo: "CNDT" },
  { valor: "CERTIDAO_FALENCIA_CONCORDATA", rotulo: "Certidão de falência e concordata" },
  { valor: "OUTRO", rotulo: "Outro" },
];

export function FormularioCertidao({ complianceEmpresaId }: { complianceEmpresaId: string }) {
  const [estado, acao] = useFormState(anexarCertidao, inicial);

  return (
    <form action={acao} className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
      <input type="hidden" name="complianceEmpresaId" value={complianceEmpresaId} />

      {estado.erro && <div className="aviso-erro w-full">{estado.erro}</div>}

      <div>
        <label className="rotulo" htmlFor="tipo">
          Certidão
        </label>
        <select id="tipo" name="tipo" className="campo" defaultValue="CERTIDAO_TRIBUTOS_FEDERAIS">
          {TIPOS.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.rotulo}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="rotulo" htmlFor="validaAte">
          Válida até
        </label>
        <input id="validaAte" name="validaAte" type="date" className="campo" />
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
