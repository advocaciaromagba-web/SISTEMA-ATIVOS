"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { criarContaSerasa, type ResultadoCadastro } from "./acoes";

const inicial: ResultadoCadastro = {};

export function FormularioCadastroSerasa() {
  const [estado, acao] = useFormState(criarContaSerasa, inicial);
  const [tipo, setTipo] = useState<"PF" | "PJ">("PJ");

  return (
    <form action={acao} className="cartao space-y-5">
      {estado.erro && <div className="aviso-erro">{estado.erro}</div>}

      <div>
        <label className="rotulo">Você assina como</label>
        <div className="flex gap-2">
          {(["PJ", "PF"] as const).map((t) => (
            <label
              key={t}
              className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm transition ${
                tipo === t ? "border-slate-800 bg-slate-800 text-white" : "border-slate-300 bg-white"
              }`}
            >
              <input type="radio" name="tipo" value={t} checked={tipo === t} onChange={() => setTipo(t)} className="hidden" />
              {t === "PJ" ? "Empresa" : "Pessoa física"}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="rotulo" htmlFor="nome">
          {tipo === "PJ" ? "Razão social" : "Nome completo"}
        </label>
        <input id="nome" name="nome" className="campo" required />
      </div>

      <div>
        <label className="rotulo" htmlFor="documento">
          {tipo === "PJ" ? "CNPJ" : "CPF"}
        </label>
        <input id="documento" name="documento" className="campo" placeholder={tipo === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"} />
      </div>

      <div>
        <label className="rotulo" htmlFor="nomeUsuario">
          Quem vai acessar
        </label>
        <input id="nomeUsuario" name="nomeUsuario" className="campo" placeholder="Nome de quem vai fazer login" />
      </div>

      <div>
        <label className="rotulo" htmlFor="email">
          E-mail de acesso
        </label>
        <input id="email" name="email" type="email" className="campo" required autoComplete="username" />
      </div>

      <div>
        <label className="rotulo" htmlFor="senha">
          Senha
        </label>
        <input id="senha" name="senha" type="password" className="campo" required minLength={8} autoComplete="new-password" />
        <p className="ajuda">Pelo menos 8 caracteres.</p>
      </div>

      <div className="aviso-info text-sm">
        Cobrança só por crédito pré-pago — sem mensalidade. Sua conta já nasce com um pequeno saldo de cortesia
        para testar.
      </div>

      <button type="submit" className="botao-principal w-full">
        Criar conta
      </button>
    </form>
  );
}
