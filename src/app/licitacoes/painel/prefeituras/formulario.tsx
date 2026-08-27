"use client";

import { useFormState } from "react-dom";
import { salvarCertame, type ResultadoAcao } from "./acoes";
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

export function FormularioCertame() {
  const [estado, acao] = useFormState(salvarCertame, inicial);

  return (
    <form action={acao} className="space-y-4">
      {estado.erro && <div className="aviso-erro">{estado.erro}</div>}

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
        <Campo nome="dataSessao" rotulo="Data da sessão" tipo="date" />
        <div>
          <label className="rotulo" htmlFor="arquivoEdital">
            Edital (opcional)
          </label>
          <input id="arquivoEdital" name="arquivoEdital" type="file" accept="application/pdf" className="campo" />
        </div>
      </div>

      <div className="flex gap-3">
        <BotaoSalvar>Cadastrar certame</BotaoSalvar>
        <a href="/licitacoes/painel/prefeituras" className="botao-secundario">
          Cancelar
        </a>
      </div>
    </form>
  );
}
