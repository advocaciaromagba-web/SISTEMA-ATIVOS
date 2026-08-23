"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import type { Pessoa } from "@prisma/client";
import { salvarPessoa, type ResultadoAcao } from "./acoes";
import { Area, BotaoSalvar, Campo, Marcador, Secao, Selecao } from "@/components/campos";

const ESTADOS_CIVIS = [
  { valor: "solteiro(a)", rotulo: "Solteiro(a)" },
  { valor: "casado(a)", rotulo: "Casado(a)" },
  { valor: "divorciado(a)", rotulo: "Divorciado(a)" },
  { valor: "viúvo(a)", rotulo: "Viúvo(a)" },
  { valor: "união estável", rotulo: "União estável" },
];

const inicial: ResultadoAcao = {};

export function FormularioPessoa({ pessoa }: { pessoa?: Pessoa }) {
  const [estado, acao] = useFormState(salvarPessoa, inicial);
  const [tipo, setTipo] = useState<"PF" | "PJ">((pessoa?.tipo as "PF" | "PJ") ?? "PF");

  return (
    <form action={acao} className="space-y-5">
      {pessoa && <input type="hidden" name="id" value={pessoa.id} />}

      {estado.erro && <div className="aviso-erro">{estado.erro}</div>}

      <Secao titulo="Identificação">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="rotulo">Tipo</label>
            <div className="flex gap-2">
              {(["PF", "PJ"] as const).map((t) => (
                <label
                  key={t}
                  className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm transition ${
                    tipo === t ? "border-slate-800 bg-slate-800 text-white" : "border-slate-300 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="tipo"
                    value={t}
                    checked={tipo === t}
                    onChange={() => setTipo(t)}
                    className="sr-only"
                  />
                  {t === "PF" ? "Pessoa física" : "Pessoa jurídica"}
                </label>
              ))}
            </div>
          </div>

          <Campo
            nome="documento"
            rotulo={tipo === "PJ" ? "CNPJ" : "CPF"}
            valor={pessoa?.documento}
            ajuda="Conferido automaticamente pelos dígitos verificadores."
          />

          <Campo
            nome="nome"
            rotulo={tipo === "PJ" ? "Razão social" : "Nome completo"}
            valor={pessoa?.nome}
            obrigatorio
            className="sm:col-span-2"
          />

          {tipo === "PJ" ? (
            <>
              <Campo nome="nomeFantasia" rotulo="Nome fantasia" valor={pessoa?.nomeFantasia} />
              <Campo nome="inscricaoEstadual" rotulo="Inscrição estadual" valor={pessoa?.inscricaoEstadual} />
            </>
          ) : (
            <>
              <Campo nome="rg" rotulo="RG" valor={pessoa?.rg} />
              <Campo nome="orgaoEmissor" rotulo="Órgão emissor" valor={pessoa?.orgaoEmissor} placeholder="SSP/SP" />
              <Campo nome="nacionalidade" rotulo="Nacionalidade" valor={pessoa?.nacionalidade ?? "brasileiro(a)"} />
              <Selecao
                nome="estadoCivil"
                rotulo="Estado civil"
                valor={pessoa?.estadoCivil}
                opcoes={ESTADOS_CIVIS}
                vazio="Selecione"
              />
              <Campo nome="profissao" rotulo="Profissão" valor={pessoa?.profissao} className="sm:col-span-2" />
            </>
          )}
        </div>
      </Secao>

      <Secao titulo="Contato">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo nome="email" rotulo="E-mail" valor={pessoa?.email} tipo="email" ajuda="Necessário para assinatura eletrônica." />
          <Campo nome="telefone" rotulo="Telefone / WhatsApp" valor={pessoa?.telefone} />
        </div>
      </Secao>

      <Secao
        titulo="Endereço"
        descricao="Entra na qualificação dos contratos. Endereço incompleto é a causa mais comum de recusa em cartório."
      >
        <div className="grid gap-4 sm:grid-cols-6">
          <Campo nome="enderecoRua" rotulo="Logradouro" valor={pessoa?.enderecoRua} className="sm:col-span-4" />
          <Campo nome="enderecoNumero" rotulo="Número" valor={pessoa?.enderecoNumero} className="sm:col-span-2" />
          <Campo nome="enderecoComplemento" rotulo="Complemento" valor={pessoa?.enderecoComplemento} className="sm:col-span-2" />
          <Campo nome="enderecoBairro" rotulo="Bairro" valor={pessoa?.enderecoBairro} className="sm:col-span-2" />
          <Campo nome="enderecoCep" rotulo="CEP" valor={pessoa?.enderecoCep} className="sm:col-span-2" />
          <Campo nome="enderecoCidade" rotulo="Cidade" valor={pessoa?.enderecoCidade} className="sm:col-span-4" />
          <Campo nome="enderecoUf" rotulo="UF" valor={pessoa?.enderecoUf} className="sm:col-span-2" />
        </div>
      </Secao>

      {tipo === "PJ" && (
        <Secao
          titulo="Representante legal"
          descricao="Quem assina pela empresa. Sem isso, o contrato sai sem indicação de quem assina — e não se registra."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo nome="repNome" rotulo="Nome" valor={pessoa?.repNome} />
            <Campo nome="repCpf" rotulo="CPF" valor={pessoa?.repCpf} />
            <Campo nome="repRg" rotulo="RG" valor={pessoa?.repRg} />
            <Campo nome="repCargo" rotulo="Cargo" valor={pessoa?.repCargo} placeholder="sócio administrador" />
            <Campo nome="repNacionalidade" rotulo="Nacionalidade" valor={pessoa?.repNacionalidade ?? "brasileiro(a)"} />
            <Selecao
              nome="repEstadoCivil"
              rotulo="Estado civil"
              valor={pessoa?.repEstadoCivil}
              opcoes={ESTADOS_CIVIS}
              vazio="Selecione"
            />
            <Campo nome="repProfissao" rotulo="Profissão" valor={pessoa?.repProfissao} />
            <Campo nome="repEmail" rotulo="E-mail" valor={pessoa?.repEmail} tipo="email" />
          </div>
        </Secao>
      )}

      <Secao titulo="Compliance">
        <div className="space-y-4">
          <Marcador
            nome="pep"
            rotulo="Pessoa exposta politicamente (PEP)"
            marcado={pessoa?.pep}
            ajuda="Agente público, seus familiares e pessoas de relacionamento próximo. Exige diligência reforçada (Lei 9.613/1998)."
          />
          <Campo nome="pepDetalhe" rotulo="Detalhamento do PEP" valor={pessoa?.pepDetalhe} />
          <Area nome="observacoes" rotulo="Observações internas" valor={pessoa?.observacoes} />
        </div>
      </Secao>

      <div className="flex gap-3">
        <BotaoSalvar>{pessoa ? "Salvar alterações" : "Cadastrar parte"}</BotaoSalvar>
        <a href="/painel/pessoas" className="botao-secundario">
          Cancelar
        </a>
      </div>
    </form>
  );
}
