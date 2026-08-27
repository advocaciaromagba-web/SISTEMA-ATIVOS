"use client";

import { useFormState } from "react-dom";
import { gerarRelatorio, type ResultadoAcao } from "../acoes";
import { Campo, BotaoSalvar } from "@/components/campos";

const inicial: ResultadoAcao = {};

export function FormularioRelatorio({ complianceEmpresaId, nomeUsuario }: { complianceEmpresaId: string; nomeUsuario: string }) {
  const [estado, acao] = useFormState(gerarRelatorio, inicial);

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="complianceEmpresaId" value={complianceEmpresaId} />

      {estado.erro && <div className="aviso-erro">{estado.erro}</div>}
      {estado.ok && <div className="aviso-ok">Relatório gerado.</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo nome="responsavelNome" rotulo="Quem assina o relatório" valor={nomeUsuario} obrigatorio />
        <Campo nome="responsavelCargo" rotulo="Cargo" placeholder="Responsável pela análise de compliance" />
        <Campo nome="responsavelRegistro" rotulo="Registro profissional" ajuda="OAB, CRC ou outro, quando houver." />
        <Campo nome="solicitante" rotulo="Solicitante" ajuda="Em branco, usa o nome da sua conta." />
        <Campo nome="validadeDias" rotulo="Validade do relatório (dias)" tipo="number" valor={30} />
      </div>

      <BotaoSalvar>Gerar relatório assinado</BotaoSalvar>
    </form>
  );
}
