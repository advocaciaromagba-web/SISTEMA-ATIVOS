"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { registrarValidacaoAssinatura, type ResultadoAcao } from "../../acoes";
import { BotaoSalvar } from "@/components/campos";
import type { ValidacaoAssinatura } from "@prisma/client";

const inicial: ResultadoAcao = {};

/**
 * Registra a validação da assinatura de um documento.
 *
 * A distinção entre os dois tipos não é cosmética: assinatura digital tem
 * certificado que se confere na fonte — é verificação de verdade. Assinatura
 * manuscrita, escaneada, não tem base pública de comparação automática
 * confiável, e a tela não finge que tem: o resultado é sempre a conclusão do
 * analista depois de olhar as duas assinaturas lado a lado, nunca um
 * veredito gerado pelo sistema.
 */
export function FormularioAssinatura({
  documentoId,
  certameId,
  participanteCertameId,
  validacao,
}: {
  documentoId: string;
  certameId: string;
  participanteCertameId: string;
  validacao: ValidacaoAssinatura | null;
}) {
  const [estado, acao] = useFormState(registrarValidacaoAssinatura, inicial);
  const [tipo, setTipo] = useState<"DIGITAL" | "MANUSCRITA">((validacao?.tipo as "DIGITAL" | "MANUSCRITA") ?? "DIGITAL");

  return (
    <form action={acao} className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <input type="hidden" name="documentoParticipanteId" value={documentoId} />
      <input type="hidden" name="certameId" value={certameId} />
      <input type="hidden" name="participanteCertameId" value={participanteCertameId} />

      {estado.erro && <div className="aviso-erro">{estado.erro}</div>}

      <div className="flex gap-2">
        {(["DIGITAL", "MANUSCRITA"] as const).map((t) => (
          <label
            key={t}
            className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              tipo === t ? "border-slate-800 bg-slate-800 text-white" : "border-slate-300 bg-white text-slate-600"
            }`}
          >
            <input type="radio" name="tipo" value={t} checked={tipo === t} onChange={() => setTipo(t)} className="hidden" />
            {t === "DIGITAL" ? "Assinatura digital" : "Assinatura manuscrita"}
          </label>
        ))}
      </div>

      {tipo === "DIGITAL" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="rotulo" htmlFor={`provedor-${documentoId}`}>
              Provedor
            </label>
            <select id={`provedor-${documentoId}`} name="provedor" className="campo" defaultValue={validacao?.provedor ?? "ICP_BRASIL"}>
              <option value="ICP_BRASIL">ICP-Brasil</option>
              <option value="GOV_BR">gov.br</option>
              <option value="AUTENTIQUE">Autentique</option>
              <option value="OUTRO">Outro</option>
            </select>
          </div>
          <div>
            <label className="rotulo" htmlFor={`identificador-${documentoId}`}>
              Código de verificação
            </label>
            <input
              id={`identificador-${documentoId}`}
              name="identificadorValidacao"
              defaultValue={validacao?.identificadorValidacao ?? ""}
              className="campo"
              placeholder="Código ou URL do provedor"
            />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              name="certificadoValido"
              defaultChecked={validacao?.certificadoValido ?? false}
              className="h-4 w-4 rounded border-slate-300"
            />
            Certificado conferido e válido na fonte
          </label>
        </div>
      ) : (
        <div className="aviso-info text-xs">
          Não existe comparação automática confiável de assinatura manuscrita. Coloque o documento apresentado ao
          lado de um documento de referência (RG, procuração) e registre a sua própria conclusão abaixo.
        </div>
      )}

      {tipo === "MANUSCRITA" && (
        <div>
          <label className="rotulo" htmlFor={`observacao-${documentoId}`}>
            Observação do analista
          </label>
          <textarea
            id={`observacao-${documentoId}`}
            name="observacaoAnalista"
            rows={2}
            defaultValue={validacao?.observacaoAnalista ?? ""}
            className="campo"
          />
        </div>
      )}

      <div>
        <label className="rotulo" htmlFor={`resultado-${documentoId}`}>
          Resultado
        </label>
        <select id={`resultado-${documentoId}`} name="resultado" className="campo" defaultValue={validacao?.resultado ?? "PENDENTE"}>
          <option value="PENDENTE">Pendente</option>
          <option value="VALIDA">Válida</option>
          <option value="INVALIDA">Inválida</option>
          <option value="NAO_VERIFICAVEL">Não verificável</option>
        </select>
      </div>

      <BotaoSalvar>Registrar validação</BotaoSalvar>
    </form>
  );
}
