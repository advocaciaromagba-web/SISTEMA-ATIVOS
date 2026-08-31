"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export function FormularioEntrarCliente() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [codigo, setCodigo] = useState("");
  const [pedirCodigo, setPedirCodigo] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro("");
    setCarregando(true);

    const resposta = await signIn("credentials", { email, senha, codigo, redirect: false });

    setCarregando(false);

    if (resposta?.error === "CODIGO_NECESSARIO") {
      setPedirCodigo(true);
      return;
    }

    if (resposta?.error) {
      setErro(resposta.error === "CredentialsSignin" ? "E-mail ou senha incorretos." : resposta.error);
      return;
    }

    router.push("/cliente/painel");
    router.refresh();
  }

  return (
    <form onSubmit={entrar} className="cartao space-y-4">
      <div>
        <label className="rotulo" htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          className="campo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
          disabled={pedirCodigo}
        />
      </div>

      <div>
        <label className="rotulo" htmlFor="senha">
          Senha
        </label>
        <input
          id="senha"
          type="password"
          className="campo"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoComplete="current-password"
          required
          disabled={pedirCodigo}
        />
      </div>

      {pedirCodigo && (
        <div>
          <label className="rotulo" htmlFor="codigo">
            Código de verificação
          </label>
          <input
            id="codigo"
            type="text"
            inputMode="numeric"
            className="campo tracking-widest"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="000000"
            autoFocus
            required
          />
          <p className="ajuda">Abra o aplicativo autenticador e digite o código de 6 dígitos.</p>
        </div>
      )}

      {erro && <div className="aviso-erro">{erro}</div>}

      <button type="submit" className="botao-principal w-full" disabled={carregando}>
        {carregando ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
