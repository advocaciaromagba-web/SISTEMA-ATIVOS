"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { validarEmail } from "@/lib/validacao";

export type ResultadoCadastro = { erro?: string };

const texto = (dados: FormData, chave: string) => (dados.get(chave)?.toString() ?? "").trim() || null;

export async function criarCliente(_anterior: ResultadoCadastro, dados: FormData): Promise<ResultadoCadastro> {
  const nome = texto(dados, "nome");
  const email = (texto(dados, "email") ?? "").toLowerCase();
  const senha = texto(dados, "senha") ?? "";

  if (!nome) return { erro: "Informe seu nome." };
  if (!email || !validarEmail(email)) return { erro: "Informe um e-mail válido." };
  if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." };

  const jaExiste = await prisma.cliente.findUnique({ where: { email } });
  if (jaExiste) return { erro: "Já existe uma conta com este e-mail." };

  const passwordHash = await bcrypt.hash(senha, 12);

  await prisma.cliente.create({ data: { nome, email, passwordHash } });

  redirect("/cliente/entrar?cadastro=ok");
}
