"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { somenteAlfanumerico, validarDocumento, validarEmail } from "@/lib/validacao";
import { configuracaoDaSolucao } from "@/lib/planos-solucao";

export type ResultadoCadastro = { erro?: string };

const texto = (dados: FormData, chave: string) => (dados.get(chave)?.toString() ?? "").trim() || null;

const FORMAS_COBRANCA = ["AVULSO", "CREDITO", "ASSINATURA"];

export async function criarContaAgro(_anterior: ResultadoCadastro, dados: FormData): Promise<ResultadoCadastro> {
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

  const jaExiste = await prisma.agroUsuario.findUnique({ where: { email } });
  if (jaExiste) return { erro: "Já existe uma conta com este e-mail nesta solução." };

  const passwordHash = await bcrypt.hash(senha, 12);
  // Dias de teste desta solução — cada uma tem o seu, definido na administração.
  const { diasDeTeste } = await configuracaoDaSolucao("AGROJUD");
  const testeExpiraEm = new Date(Date.now() + diasDeTeste * 24 * 60 * 60 * 1000);

  await prisma.agroConta.create({
    data: {
      tipo,
      nome,
      documento: documento || null,
      emailContato: email,
      formaCobranca,
      plano: "TESTE",
      statusAssinatura: "TESTE",
      testeExpiraEm,
      usuarios: {
        create: { nome: nomeUsuario ?? nome, email, passwordHash, papel: "DONO" },
      },
    },
  });

  redirect("/agrojud/entrar?cadastro=ok");
}
