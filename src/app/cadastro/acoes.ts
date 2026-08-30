"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { somenteAlfanumerico, validarDocumento, validarEmail } from "@/lib/validacao";
import { DIAS_DE_TESTE } from "@/lib/planos";

export type ResultadoCadastro = { erro?: string };

const texto = (dados: FormData, chave: string) => (dados.get(chave)?.toString() ?? "").trim() || null;

const FORMAS_COBRANCA = ["AVULSO", "CREDITO", "ASSINATURA"];

/**
 * Cria a organização e o primeiro usuário — o "assinar" que faltava: até
 * aqui só existia acesso via `npm run setup`, rodado à mão uma vez. Sem
 * este cadastro, quem clicava em "assinar" nos planos ia parar direto no
 * login, sem conta nenhuma para entrar.
 */
export async function criarConta(_anterior: ResultadoCadastro, dados: FormData): Promise<ResultadoCadastro> {
  const tipo = texto(dados, "tipo") === "PF" ? "PF" : "PJ";
  const nome = texto(dados, "nome");
  const documento = somenteAlfanumerico(texto(dados, "documento") ?? "");
  const email = (texto(dados, "email") ?? "").toLowerCase();
  const senha = texto(dados, "senha") ?? "";
  const formaCobranca = texto(dados, "formaCobranca") ?? "ASSINATURA";
  const nomeUsuario = texto(dados, "nomeUsuario") || nome;

  if (!nome) return { erro: tipo === "PF" ? "Informe seu nome." : "Informe a razão social." };
  if (documento && !validarDocumento(documento, tipo)) {
    return { erro: tipo === "PF" ? "CPF inválido — confira os números." : "CNPJ inválido — confira os números." };
  }
  if (!email || !validarEmail(email)) return { erro: "Informe um e-mail válido." };
  if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." };
  if (!FORMAS_COBRANCA.includes(formaCobranca)) return { erro: "Forma de cobrança inválida." };

  const jaExiste = await prisma.usuario.findUnique({ where: { email } });
  if (jaExiste) return { erro: "Já existe uma conta com este e-mail." };

  if (tipo === "PJ" && documento) {
    const cnpjEmUso = await prisma.organizacao.findUnique({ where: { cnpj: documento } });
    if (cnpjEmUso) return { erro: "Já existe uma conta com este CNPJ." };
  }

  const passwordHash = await bcrypt.hash(senha, 12);
  const testeExpiraEm = new Date(Date.now() + DIAS_DE_TESTE * 24 * 60 * 60 * 1000);

  await prisma.organizacao.create({
    data: {
      tipo,
      nome,
      cnpj: tipo === "PJ" ? documento || null : null,
      emailContato: email,
      formaCobranca,
      plano: "TESTE",
      statusAssinatura: "TESTE",
      testeExpiraEm,
      usuarios: {
        create: {
          nome: nomeUsuario ?? nome,
          email,
          passwordHash,
          papel: "DONO",
          admin: false,
          cpf: tipo === "PF" ? documento || null : null,
        },
      },
    },
  });

  redirect("/login?cadastro=ok");
}
