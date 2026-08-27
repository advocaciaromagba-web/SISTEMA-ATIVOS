"use client";

import { useFormState } from "react-dom";
import { salvarEditalInteresse, type ResultadoAcao } from "../acoes";
import { Campo, BotaoSalvar } from "@/components/campos";

const inicial: ResultadoAcao = {};

const MODALIDADES = [
  "Pregão Presencial",
  "Pregão Eletrônico",
  "Concorrência",
  "Tomada de Preços",
  "Dispensa de Licitação",
  "Convite",
];

export function FormularioEdital() {
  const [estado, acao] = useFormState(salvarEditalInteresse, inicial);

  return (
    <form action={acao} className="space-y-4">
      {estado.erro && <div className="aviso-erro">{estado.erro}</div>}
      {estado.ok && <div className="aviso-ok">Edital cadastrado.</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          nome="orgaoLicitante"
          rotulo="Órgão licitante"
          obrigatorio
          placeholder="Prefeitura Municipal de Icém/SP"
          className="sm:col-span-2"
        />
        <div>
          <label className="rotulo" htmlFor="modalidade">
            Modalidade <span className="text-red-500">*</span>
          </label>
          <select id="modalidade" name="modalidade" className="campo" required defaultValue="">
            <option value="" disabled>
              Selecione
            </option>
            {MODALIDADES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <Campo nome="numeroCertame" rotulo="Número do certame" obrigatorio placeholder="004/2021" />
        <Campo nome="objeto" rotulo="Objeto" className="sm:col-span-2" />
        <Campo nome="prazoEnvio" rotulo="Prazo de envio" tipo="date" />
        <div>
          <label className="rotulo" htmlFor="arquivo">
            Arquivo do edital (opcional)
          </label>
          <input id="arquivo" name="arquivo" type="file" accept="application/pdf" className="campo" />
        </div>
      </div>

      <BotaoSalvar>Cadastrar edital</BotaoSalvar>
    </form>
  );
}
