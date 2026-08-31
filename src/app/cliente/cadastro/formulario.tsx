"use client";

import { useFormState } from "react-dom";
import { criarCliente, type ResultadoCadastro } from "./acoes";

const inicial: ResultadoCadastro = {};

export function FormularioCadastroCliente() {
  const [estado, acao] = useFormState(criarCliente, inicial);

  return (
    <form action={acao} className="cartao space-y-5">
      {estado.erro && <div className="aviso-erro">{estado.erro}</div>}

      <div>
        <label className="rotulo" htmlFor="nome">
          Nome completo
        </label>
        <input id="nome" name="nome" className="campo" required />
      </div>

      <div>
        <label className="rotulo" htmlFor="email">
          E-mail
        </label>
        <input id="email" name="email" type="email" className="campo" required autoComplete="username" />
      </div>

      <div>
        <label className="rotulo" htmlFor="senha">
          Senha
        </label>
        <input id="senha" name="senha" type="password" className="campo" required minLength={8} autoComplete="new-password" />
        <p className="ajuda">Pelo menos 8 caracteres. É a mesma senha usada em qualquer solução que você assinar.</p>
      </div>

      <button type="submit" className="botao-principal w-full">
        Criar conta
      </button>
    </form>
  );
}
