"use client";

import { useActionState, useState } from "react";
import { salvarParecer, type ResultadoAcao } from "./acoes";
import { Area, Selecao, BotaoSalvar, Secao } from "@/components/campos";

const inicial: ResultadoAcao = {};

const OPCOES_TIPO = [
  { valor: "CONTRATO", rotulo: "Contrato" },
  { valor: "DOCUMENTO", rotulo: "Documento" },
  { valor: "PARECER", rotulo: "Parecer existente" },
  { valor: "PROCESSO", rotulo: "Processo já cadastrado" },
];

export function FormularioParecer({ processos }: { processos: { id: string; rotulo: string }[] }) {
  const [estado, acao] = useActionState(salvarParecer, inicial);
  const [tipo, setTipo] = useState("CONTRATO");

  return (
    <form action={acao} className="space-y-5">
      {estado.erro && <div className="aviso-erro">{estado.erro}</div>}

      <Secao titulo="O que analisar">
        <div className="space-y-4">
          <div>
            <label className="rotulo" htmlFor="tipo">
              Tipo de material
            </label>
            <select
              id="tipo"
              name="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="campo"
              required
            >
              {OPCOES_TIPO.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.rotulo}
                </option>
              ))}
            </select>
          </div>

          {tipo === "PROCESSO" ? (
            <Selecao
              nome="complianceProcessoId"
              rotulo="Processo cadastrado"
              opcoes={processos.map((p) => ({ valor: p.id, rotulo: p.rotulo }))}
              vazio={processos.length === 0 ? "Nenhum processo cadastrado ainda" : "Escolha um processo"}
              obrigatorio
              ajuda={
                processos.length === 0
                  ? "Cadastre o processo na aba Processos antes de pedir um parecer sobre ele."
                  : "O parecer usa a última análise de regularidade já feita para este processo."
              }
            />
          ) : (
            <div>
              <label className="rotulo" htmlFor="arquivo">
                Arquivo
              </label>
              <input id="arquivo" name="arquivo" type="file" accept="application/pdf,image/*" className="campo" required />
              <p className="ajuda">PDF ou imagem, até 15 MB. Arquivo .docx ainda não é lido automaticamente.</p>
            </div>
          )}

          <Area
            nome="tema"
            rotulo="Tema — o que o parecer deve analisar ou responder"
            obrigatorio
            linhas={4}
            ajuda="Descreva livremente. Ex.: 'há cláusula abusiva de multa ou foro?', 'o processo está em condições de receber cessão de crédito?'"
          />
        </div>
      </Secao>

      <div className="flex gap-3">
        <BotaoSalvar>Salvar e gerar minuta</BotaoSalvar>
        <a href="/compliance/painel/pareceres" className="botao-secundario">
          Cancelar
        </a>
      </div>
    </form>
  );
}
