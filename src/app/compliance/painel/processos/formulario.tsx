"use client";

import { useActionState } from "react";
import { salvarProcesso, type ResultadoAcao } from "./acoes";
import { Campo, BotaoSalvar, Secao } from "@/components/campos";

const inicial: ResultadoAcao = {};

export function FormularioProcesso() {
  const [estado, acao] = useActionState(salvarProcesso, inicial);

  return (
    <form action={acao} className="space-y-5">
      {estado.erro && <div className="aviso-erro">{estado.erro}</div>}

      <Secao titulo="Processo">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            nome="numeroProcesso"
            rotulo="Número do processo"
            obrigatorio
            placeholder="0000000-00.0000.0.00.0000"
            ajuda="Padrão CNJ, 20 dígitos. É por ele que o DataJud confirma o processo e traz a movimentação."
            className="sm:col-span-2"
          />
          <Campo
            nome="apelido"
            rotulo="Referência"
            placeholder="Ex.: Precatório João da Silva x Município de Guariba"
            ajuda="Opcional — só para você achar o processo na lista depois."
            className="sm:col-span-2"
          />
        </div>
      </Secao>

      <div className="flex gap-3">
        <BotaoSalvar>Salvar e analisar</BotaoSalvar>
        <a href="/compliance/painel/processos" className="botao-secundario">
          Cancelar
        </a>
      </div>
    </form>
  );
}
