"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { somenteAlfanumerico, validarDocumento, validarEmail } from "@/lib/validacao";

export type ResultadoCadastro = { erro?: string };

const texto = (dados: FormData, chave: string) => (dados.get(chave)?.toString() ?? "").trim() || null;

const FORMAS_COBRANCA = ["AVULSO", "CREDITO", "ASSINATURA"];

/**
 * Cria a conta e o primeiro usuário da solução de Licitações.
 *
 * É a conta própria desta solução (`LicitacaoConta`/`LicitacaoUsuario`) —
 * não toca `Organizacao`/`Usuario`, mesmo que a pessoa já assine a Gestão de
 * Ativos com o mesmo e-mail. As duas soluções têm assinantes independentes.
 */
export async function criarContaLicitacoes(_anterior: ResultadoCadastro, dados: FormData): Promise<ResultadoCadastro> {
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

  const jaExiste = await prisma.licitacaoUsuario.findUnique({ where: { email } });
  if (jaExiste) return { erro: "Já existe uma conta com este e-mail nesta solução." };

  const passwordHash = await bcrypt.hash(senha, 10);
  const testeExpiraEm = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  await prisma.licitacaoConta.create({
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

  redirect("/licitacoes/entrar?cadastro=ok");
}
