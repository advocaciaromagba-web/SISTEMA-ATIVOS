"use client";

import { useRef } from "react";
import { useFormState } from "react-dom";
import type { LicitanteEmpresa } from "@prisma/client";
import { salvarLicitante, type ResultadoAcao } from "./acoes";
import { Campo, BotaoSalvar, Marcador, Secao } from "@/components/campos";
import { BuscarPorDocumento } from "@/components/buscar-por-documento";

const inicial: ResultadoAcao = {};

/**
 * Cadastro da empresa licitante.
 *
 * Sempre pessoa jurídica — quem participa de licitação é a empresa, não o
 * representante dela isoladamente. Por isso reaproveita `BuscarPorDocumento`
 * com o perfil fixo de pessoa jurídica: é busca na Receita, não gravação em
 * tabela de outra solução, então não fere o isolamento.
 */
export function FormularioLicitante({ licitante }: { licitante?: LicitanteEmpresa }) {
  const [estado, acao] = useFormState(salvarLicitante, inicial);
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
        {licitante && <input type="hidden" name="id" value={licitante.id} />}

        {estado.erro && <div className="aviso-erro">{estado.erro}</div>}

        <Secao titulo="Identificação">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo nome="nome" rotulo="Razão social" valor={licitante?.nome} obrigatorio className="sm:col-span-2" />
            <Campo nome="documento" rotulo="CNPJ" valor={licitante?.documento} obrigatorio />
            <Campo nome="inscricaoEstadual" rotulo="Inscrição estadual" valor={licitante?.inscricaoEstadual} />
            <Campo nome="emailContato" rotulo="E-mail" valor={licitante?.emailContato} tipo="email" />
            <Campo nome="telefone" rotulo="Telefone" valor={licitante?.telefone} />
          </div>
          <Marcador
            nome="microempresaOuEpp"
            rotulo="Microempresa ou Empresa de Pequeno Porte"
            marcado={licitante?.microempresaOuEpp ?? false}
            ajuda="Inclui a declaração de ME/EPP no envelope automaticamente."
          />
        </Secao>

        <Secao titulo="Endereço">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo nome="enderecoRua" rotulo="Rua" valor={licitante?.enderecoRua} className="sm:col-span-2" />
            <Campo nome="enderecoNumero" rotulo="Número" valor={licitante?.enderecoNumero} />
            <Campo nome="enderecoComplemento" rotulo="Complemento" valor={licitante?.enderecoComplemento} />
            <Campo nome="enderecoBairro" rotulo="Bairro" valor={licitante?.enderecoBairro} />
            <Campo nome="enderecoCidade" rotulo="Cidade" valor={licitante?.enderecoCidade} />
            <Campo nome="enderecoUf" rotulo="UF" valor={licitante?.enderecoUf} />
            <Campo nome="enderecoCep" rotulo="CEP" valor={licitante?.enderecoCep} />
          </div>
        </Secao>

        <Secao titulo="Representante legal" descricao="Quem assina as declarações e o termo de credenciamento.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo nome="repNome" rotulo="Nome" valor={licitante?.repNome} obrigatorio className="sm:col-span-2" />
            <Campo nome="repCpf" rotulo="CPF" valor={licitante?.repCpf} obrigatorio />
            <Campo nome="repRg" rotulo="RG" valor={licitante?.repRg} />
            <Campo nome="repCargo" rotulo="Cargo" valor={licitante?.repCargo} placeholder="Sócio administrador" />
            <Campo nome="repNacionalidade" rotulo="Nacionalidade" valor={licitante?.repNacionalidade} placeholder="brasileiro(a)" />
            <Campo nome="repEstadoCivil" rotulo="Estado civil" valor={licitante?.repEstadoCivil} />
            <Campo nome="repProfissao" rotulo="Profissão" valor={licitante?.repProfissao} />
          </div>
        </Secao>

        <div className="flex gap-3">
          <BotaoSalvar>Salvar</BotaoSalvar>
          <a href="/painel/licitacoes/licitantes" className="botao-secundario">
            Cancelar
          </a>
        </div>
      </form>
    </div>
  );
}
