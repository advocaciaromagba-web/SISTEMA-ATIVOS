"use client";

import { useRef } from "react";
import { useFormState } from "react-dom";
import { salvarEmpresa, type ResultadoAcao } from "./acoes";
import { Campo, BotaoSalvar, Secao } from "@/components/campos";
import { BuscarPorDocumento } from "@/components/buscar-por-documento";

const inicial: ResultadoAcao = {};

export function FormularioEmpresa() {
  const [estado, acao] = useFormState(salvarEmpresa, inicial);
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
      <BuscarPorDocumento perfil="PESSOA_PJ" aoAplicar={aplicarLeitura} />

      <form ref={formulario} action={acao} className="space-y-5">
        {estado.erro && <div className="aviso-erro">{estado.erro}</div>}

        <Secao titulo="Identificação">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo nome="nome" rotulo="Razão social" obrigatorio className="sm:col-span-2" />
            <Campo nome="documento" rotulo="CNPJ" obrigatorio />
            <Campo nome="inscricaoEstadual" rotulo="Inscrição estadual" />
            <Campo nome="emailContato" rotulo="E-mail" tipo="email" />
            <Campo nome="telefone" rotulo="Telefone" />
          </div>
        </Secao>

        <Secao titulo="Endereço">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo nome="enderecoRua" rotulo="Rua" className="sm:col-span-2" />
            <Campo nome="enderecoNumero" rotulo="Número" />
            <Campo nome="enderecoComplemento" rotulo="Complemento" />
            <Campo nome="enderecoBairro" rotulo="Bairro" />
            <Campo nome="enderecoCidade" rotulo="Cidade" />
            <Campo nome="enderecoUf" rotulo="UF" />
            <Campo nome="enderecoCep" rotulo="CEP" />
          </div>
        </Secao>

        <div className="flex gap-3">
          <BotaoSalvar>Salvar e auditar</BotaoSalvar>
          <a href="/compliance/painel/empresas" className="botao-secundario">
            Cancelar
          </a>
        </div>
      </form>
    </div>
  );
}
