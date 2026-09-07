"use client";

import { useFormState } from "react-dom";
import { pedirRedefinicaoSenha, type ResultadoEsqueciSenha } from "./acoes";

const inicial: ResultadoEsqueciSenha = {};

export function FormularioEsqueciSenha() {
  const [estado, acao] = useFormState(pedirRedefinicaoSenha, inicial);

  if (estado.enviado) {
    return (
      <div className="cartao text-sm text-slate-700">
        Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha. Confira também a caixa de
        spam.
      </div>
    );
  }

  return (
    <form action={acao} className="cartao space-y-4">
      {estado.erro && <div className="aviso-erro">{estado.erro}</div>}

      <div>
        <label className="rotulo" htmlFor="email">
          E-mail da conta
        </label>
        <input id="email" name="email" type="email" className="campo" autoComplete="username" required />
      </div>

      <button type="submit" className="botao-principal w-full">
        Enviar link de redefinição
      </button>
    </form>
  );
}
