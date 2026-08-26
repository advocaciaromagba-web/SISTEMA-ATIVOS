"use client";

import { useFormState } from "react-dom";
import { anexarDocumentoParticipante, type ResultadoAcao } from "../../acoes";
import { BotaoSalvar } from "@/components/campos";

const inicial: ResultadoAcao = {};

const TIPOS = [
  { valor: "CONTRATO_SOCIAL", rotulo: "Contrato social" },
  { valor: "CERTIDAO_TRIBUTOS_FEDERAIS", rotulo: "Certidão de tributos federais" },
  { valor: "CERTIDAO_FGTS", rotulo: "Certidão do FGTS" },
  { valor: "CNDT", rotulo: "CNDT" },
  { valor: "CERTIDAO_FALENCIA_CONCORDATA", rotulo: "Certidão de falência e concordata" },
  { valor: "DECLARACAO_NAO_EMPREGA_MENOR", rotulo: "Declaração de não emprega menor" },
  { valor: "OUTRO", rotulo: "Outro" },
];

export function FormularioDocumentoParticipante({
  certameId,
  participanteCertameId,
}: {
  certameId: string;
  participanteCertameId: string;
}) {
  const [estado, acao] = useFormState(anexarDocumentoParticipante, inicial);

  return (
    <form action={acao} className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
      <input type="hidden" name="certameId" value={certameId} />
      <input type="hidden" name="participanteCertameId" value={participanteCertameId} />

      {estado.erro && <div className="aviso-erro w-full">{estado.erro}</div>}

      <div>
        <label className="rotulo" htmlFor="tipo">
          Documento
        </label>
        <select id="tipo" name="tipo" className="campo" defaultValue="CONTRATO_SOCIAL">
          {TIPOS.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.rotulo}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-56 flex-1">
        <label className="rotulo" htmlFor="arquivo">
          Arquivo apresentado
        </label>
        <input id="arquivo" name="arquivo" type="file" accept="image/*,application/pdf" className="campo" required />
      </div>

      <BotaoSalvar>Anexar</BotaoSalvar>
    </form>
  );
}
