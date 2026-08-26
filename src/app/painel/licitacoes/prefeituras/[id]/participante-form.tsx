"use client";

import { useFormState } from "react-dom";
import { salvarParticipante, type ResultadoAcao } from "../acoes";
import { Campo, BotaoSalvar } from "@/components/campos";

const inicial: ResultadoAcao = {};

export function FormularioParticipante({ certameId }: { certameId: string }) {
  const [estado, acao] = useFormState(salvarParticipante, inicial);

  return (
    <form action={acao} className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
      <input type="hidden" name="certameId" value={certameId} />

      {estado.erro && <div className="aviso-erro w-full">{estado.erro}</div>}

      <Campo nome="nome" rotulo="Nome ou razão social" obrigatorio className="min-w-56 flex-1" />
      <Campo nome="documento" rotulo="CNPJ" placeholder="00.000.000/0000-00" />

      <BotaoSalvar>Adicionar participante</BotaoSalvar>
    </form>
  );
}
