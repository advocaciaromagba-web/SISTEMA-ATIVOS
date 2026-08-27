"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { criarContaLicitacoes, type ResultadoCadastro } from "./acoes";

const inicial: ResultadoCadastro = {};

const FORMAS_COBRANCA = [
  {
    valor: "ASSINATURA",
    nome: "Assinatura",
    descricao: "Mensalidade fixa, com verificações incluídas conforme o plano.",
  },
  {
    valor: "CREDITO",
    nome: "Crédito pré-pago",
    descricao: "Carrega um saldo e cada verificação desconta do saldo, sem mensalidade.",
  },
  {
    valor: "AVULSO",
    nome: "Avulso",
    descricao: "Paga só quando usa, sem saldo nem mensalidade.",
  },
];

export function FormularioCadastroLicitacoes() {
  const [estado, acao] = useFormState(criarContaLicitacoes, inicial);
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

      <div>
        <label className="rotulo">Como prefere pagar</label>
        <div className="space-y-2">
          {FORMAS_COBRANCA.map((f) => (
            <label key={f.valor} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3">
              <input type="radio" name="formaCobranca" value={f.valor} defaultChecked={f.valor === "ASSINATURA"} className="mt-1" />
              <span>
                <span className="block text-sm font-medium text-slate-900">{f.nome}</span>
                <span className="block text-xs text-slate-500">{f.descricao}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="ajuda">14 dias de teste antes de qualquer cobrança, em qualquer forma escolhida.</p>
      </div>

      <button type="submit" className="botao-principal w-full">
        Criar conta
      </button>
    </form>
  );
}
