"use client";

import { useRef } from "react";
import { useFormState } from "react-dom";
import { salvarPessoa, type ResultadoAcao } from "./acoes";
import { Campo, BotaoSalvar, Secao } from "@/components/campos";
import { BuscarPorDocumento } from "@/components/buscar-por-documento";

const inicial: ResultadoAcao = {};

export function FormularioPessoa() {
  const [estado, acao] = useFormState(salvarPessoa, inicial);
  const formulario = useRef<HTMLFormElement>(null);

  function aplicarLeitura(campos: Record<string, string>) {
    const form = formulario.current;
    if (!form) return;
    for (const [chave, valor] of Object.entries(campos)) {
      const campo = form.elements.namedItem(chave);
      if (campo instanceof HTMLInputElement || campo instanceof HTMLTextAreaElement) campo.value = valor;
    }
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="space-y-5">
      <BuscarPorDocumento perfil="PESSOA_PF" aoAplicar={aplicarLeitura} />

      <form ref={formulario} action={acao} className="space-y-5">
        {estado.erro && <div className="aviso-erro">{estado.erro}</div>}

        <Secao titulo="Identificação">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo nome="nome" rotulo="Nome completo" obrigatorio className="sm:col-span-2" />
            <Campo nome="documento" rotulo="CPF" obrigatorio />
            <Campo nome="uf" rotulo="UF" />
            <Campo nome="nomeMae" rotulo="Nome da mãe" ajuda="Exigido para antecedentes e improbidade, quando essas fontes estiverem contratadas." />
            <Campo nome="dataNascimento" rotulo="Data de nascimento" tipo="date" />
            <Campo nome="emailContato" rotulo="E-mail" tipo="email" />
            <Campo nome="telefone" rotulo="Telefone" />
          </div>
        </Secao>

        <div className="flex gap-3">
          <BotaoSalvar>Salvar e auditar</BotaoSalvar>
          <a href="/diligencia/painel/pessoas" className="botao-secundario">
            Cancelar
          </a>
        </div>
      </form>
    </div>
  );
}
