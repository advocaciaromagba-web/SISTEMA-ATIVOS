"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { emitirCertidaoVerificacao, type ResultadoAcao } from "./acoes";
import { BotaoSalvar } from "@/components/campos";
import { CATALOGO_CERTIDOES } from "@/lib/auditoria/certidoes";

const inicial: ResultadoAcao = {};

/**
 * Emite a certidão direto no órgão, pela mesma integração que a Gestão de
 * Ativos usa — e compara automaticamente com a última versão apresentada
 * do mesmo tipo e do mesmo CPF/CNPJ, quando existir.
 */
export function FormularioEmissao() {
  const [estado, acao] = useFormState(emitirCertidaoVerificacao, inicial);
  const [tipoPessoa, setTipoPessoa] = useState<"PF" | "PJ">("PJ");

  const certidoes = CATALOGO_CERTIDOES.filter((c) => c.aplicaA === tipoPessoa || c.aplicaA === "AMBAS");

  return (
    <form action={acao} className="space-y-4">
      {estado.erro && <div className="aviso-erro">{estado.erro}</div>}
      {estado.ok && <div className="aviso-ok">Certidão emitida — veja no histórico.</div>}

      <div>
        <label className="rotulo">Tipo de pessoa</label>
        <div className="flex gap-2">
          {(["PJ", "PF"] as const).map((t) => (
            <label
              key={t}
              className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm transition ${
                tipoPessoa === t ? "border-slate-800 bg-slate-800 text-white" : "border-slate-300 bg-white"
              }`}
            >
              <input
                type="radio"
                value={t}
                checked={tipoPessoa === t}
                onChange={() => setTipoPessoa(t)}
                className="hidden"
              />
              {t === "PJ" ? "Empresa" : "Pessoa física"}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="rotulo" htmlFor="chaveCertidao">
          Certidão
        </label>
        <select id="chaveCertidao" name="chaveCertidao" className="campo" required>
          <option value="">Selecione</option>
          {certidoes.map((c) => (
            <option key={c.chave} value={c.chave}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="rotulo" htmlFor="documentoEmissao">
          {tipoPessoa === "PJ" ? "CNPJ" : "CPF"}
        </label>
        <input id="documentoEmissao" name="documento" className="campo" required />
      </div>

      <div>
        <label className="rotulo" htmlFor="nomeEmissao">
          Nome
        </label>
        <input id="nomeEmissao" name="nome" className="campo" required />
      </div>

      {tipoPessoa === "PF" && (
        <>
          <div>
            <label className="rotulo" htmlFor="dataNascimento">
              Data de nascimento
            </label>
            <input id="dataNascimento" name="dataNascimento" type="date" className="campo" />
          </div>
          <div>
            <label className="rotulo" htmlFor="ufEmissao">
              UF
            </label>
            <input id="ufEmissao" name="uf" className="campo" maxLength={2} />
          </div>
        </>
      )}

      <p className="ajuda">Nem toda certidão tem emissão automática em todo estado — se não tiver, o sistema avisa.</p>

      <BotaoSalvar>Emitir certidão</BotaoSalvar>
    </form>
  );
}
