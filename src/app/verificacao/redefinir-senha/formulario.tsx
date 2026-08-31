"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { redefinirSenha, type ResultadoRedefinirSenha } from "./acoes";

const inicial: ResultadoRedefinirSenha = {};

export function FormularioRedefinirSenha({ token }: { token: string }) {
  const [estado, acao] = useFormState(redefinirSenha, inicial);

  if (estado.redefinida) {
    return (
      <div className="cartao space-y-4 text-sm text-slate-700">
        <p>Senha redefinida. Já pode entrar com a senha nova.</p>
        <Link href="/verificacao/entrar" className="botao-principal block w-full text-center">
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <form action={acao} className="cartao space-y-4">
      <input type="hidden" name="token" value={token} />
      {estado.erro && <div className="aviso-erro">{estado.erro}</div>}

      <div>
        <label className="rotulo" htmlFor="senha">
          Nova senha
        </label>
        <input id="senha" name="senha" type="password" className="campo" required minLength={8} autoComplete="new-password" />
        <p className="ajuda">Pelo menos 8 caracteres.</p>
      </div>

      <div>
        <label className="rotulo" htmlFor="confirmacao">
          Confirmar nova senha
        </label>
        <input id="confirmacao" name="confirmacao" type="password" className="campo" required minLength={8} autoComplete="new-password" />
      </div>

      <button type="submit" className="botao-principal w-full">
        Redefinir senha
      </button>
    </form>
  );
}
