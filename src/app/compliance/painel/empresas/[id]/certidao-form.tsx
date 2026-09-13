"use client";

import { useState } from "react";
import { useActionState } from "react";
import { anexarCertidao, type ResultadoAcao } from "../acoes";
import { BotaoSalvar } from "@/components/campos";
import { acessoDaCertidao } from "@/lib/auditoria/links-certidoes";
import { AcessoOrgao } from "@/components/acesso-orgao";

const inicial: ResultadoAcao = {};

/** Mesmas chaves da emissão automática — ver nota em `TIPOS_CERTIDAO`, nas ações. */
const TIPOS = [
  { valor: "CNDT", rotulo: "CNDT — débitos trabalhistas" },
  { valor: "CND_FEDERAL", rotulo: "Certidão de débitos federais" },
  { valor: "DIVIDA_ATIVA_ESTADUAL", rotulo: "Certidão de débitos estaduais" },
  { valor: "PROTESTO", rotulo: "Certidão de protesto" },
  { valor: "FALENCIA_RECUPERACAO", rotulo: "Certidão de falência e recuperação judicial" },
  { valor: "DISTRIBUICAO_CIVEL", rotulo: "Certidão de distribuição cível" },
  { valor: "IMPROBIDADE_CNJ", rotulo: "Certidão de improbidade administrativa" },
  { valor: "CADIN_FEDERAL", rotulo: "Extrato do CADIN federal" },
  { valor: "CERTIDAO_FGTS", rotulo: "Certidão do FGTS" },
  { valor: "OUTRO", rotulo: "Outro" },
];

export function FormularioCertidao({
  complianceEmpresaId,
  documento,
  uf,
}: {
  complianceEmpresaId: string;
  /** CNPJ da empresa, para colar no site do órgão. */
  documento: string | null;
  /** UF do endereço cadastrado — decide o tribunal, na certidão de falência. */
  uf: string | null;
}) {
  const [estado, acao] = useActionState(anexarCertidao, inicial);
  const [tipo, setTipo] = useState("CNDT");

  const acesso = tipo === "OUTRO" ? null : acessoDaCertidao(tipo, uf, documento);

  return (
    <form action={acao} className="space-y-3 border-t border-slate-100 pt-4">
      <input type="hidden" name="complianceEmpresaId" value={complianceEmpresaId} />

      {estado.erro && <div className="aviso-erro">{estado.erro}</div>}

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="rotulo" htmlFor="tipo">
            Certidão
          </label>
          <select
            id="tipo"
            name="tipo"
            className="campo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.rotulo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="rotulo" htmlFor="validaAte">
            Válida até
          </label>
          <input id="validaAte" name="validaAte" type="date" className="campo" />
        </div>

        <div className="min-w-56 flex-1">
          <label className="rotulo" htmlFor="arquivo">
            Arquivo
          </label>
          <input id="arquivo" name="arquivo" type="file" accept="image/*,application/pdf" className="campo" required />
        </div>

        <BotaoSalvar>Anexar</BotaoSalvar>
      </div>

      {acesso && <AcessoOrgao acesso={acesso} documento={documento} />}
    </form>
  );
}
