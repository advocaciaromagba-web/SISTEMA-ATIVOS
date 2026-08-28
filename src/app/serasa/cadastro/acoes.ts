"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { somenteAlfanumerico, validarDocumento, validarEmail } from "@/lib/validacao";
import { PRECO_CONSULTA } from "@/lib/serasa/fonte";

export type ResultadoCadastro = { erro?: string };

const texto = (dados: FormData, chave: string) => (dados.get(chave)?.toString() ?? "").trim() || null;

/** Cortesia de teste: duas consultas, para experimentar sem pagar nada. */
const CREDITO_TESTE = PRECO_CONSULTA * 2;

/**
 * Cria a conta e o primeiro usuário da solução de Consulta Cadastral SERASA.
 *
 * Sem forma de cobrança para escolher — esta solução vende só por crédito
 * pré-pago, decisão do dono do negócio, diferente das outras cinco.
 */
export async function criarContaSerasa(_anterior: ResultadoCadastro, dados: FormData): Promise<ResultadoCadastro> {
  const tipo = texto(dados, "tipo") === "PF" ? "PF" : "PJ";
  const nome = texto(dados, "nome");
  const documento = somenteAlfanumerico(texto(dados, "documento") ?? "");
  const email = (texto(dados, "email") ?? "").toLowerCase();
  const senha = texto(dados, "senha") ?? "";
  const nomeUsuario = texto(dados, "nomeUsuario") || nome;

  if (!nome) return { erro: tipo === "PF" ? "Informe seu nome." : "Informe a razão social." };
  if (documento && !validarDocumento(documento, tipo)) {
    return { erro: tipo === "PF" ? "CPF inválido — confira os números." : "CNPJ inválido — confira os números." };
  }
  if (!email || !validarEmail(email)) return { erro: "Informe um e-mail válido." };
  if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." };

  const jaExiste = await prisma.serasaUsuario.findUnique({ where: { email } });
  if (jaExiste) return { erro: "Já existe uma conta com este e-mail nesta solução." };

  const passwordHash = await bcrypt.hash(senha, 12);
  const testeExpiraEm = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  await prisma.serasaConta.create({
    data: {
      tipo,
      nome,
      documento: documento || null,
      emailContato: email,
      saldoCredito: CREDITO_TESTE,
      statusAssinatura: "TESTE",
      testeExpiraEm,
      usuarios: {
        create: { nome: nomeUsuario ?? nome, email, passwordHash, papel: "DONO" },
      },
    },
  });

  redirect("/serasa/entrar?cadastro=ok");
}
