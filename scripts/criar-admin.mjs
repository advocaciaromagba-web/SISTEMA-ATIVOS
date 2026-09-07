/**
 * Cria (ou redefine a senha de) um administrador da Blackbird.
 *
 * Roda no terminal, e a senha é DIGITADA por quem executa: ela não fica em
 * arquivo, não passa por chat, não vai para o histórico do git. O script
 * também não mostra a senha na tela enquanto é digitada.
 *
 * Uso:
 *   npm run admin:criar
 *
 * Se o e-mail já existir, o script pergunta se deve trocar a senha daquele
 * administrador em vez de criar outro.
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { pergunta, perguntaOculta } from "./perguntar.mjs";

const prisma = new PrismaClient();
const MINIMO_SENHA = 12;

function valido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function principal() {
  console.log("\n=== Criar administrador da Blackbird ===\n");
  console.log("Esta conta enxerga e altera os dados de todos os clientes, em todas as soluções.");
  console.log("Tudo o que ela fizer fica registrado na auditoria.\n");

  const nome = await pergunta("Nome de quem vai usar a conta: ");
  if (!nome) {
    console.error("\nNome é obrigatório. Nada foi criado.");
    process.exitCode = 1;
    return;
  }

  const email = (await pergunta("E-mail de acesso: ")).toLowerCase();
  if (!valido(email)) {
    console.error("\nE-mail inválido. Nada foi criado.");
    process.exitCode = 1;
    return;
  }

  const existente = await prisma.administrador.findUnique({ where: { email } });
  if (existente) {
    console.log(`\nJá existe um administrador com esse e-mail: ${existente.nome}.`);
    const r = (await pergunta("Trocar a senha dele? (sim/não): ")).toLowerCase();
    if (r !== "sim" && r !== "s") {
      console.log("Nada foi alterado.");
      return;
    }
  }

  const senha = await perguntaOculta(`Senha (mínimo ${MINIMO_SENHA} caracteres): `);
  if (senha.length < MINIMO_SENHA) {
    console.error(`\nA senha precisa ter pelo menos ${MINIMO_SENHA} caracteres. Nada foi criado.`);
    process.exitCode = 1;
    return;
  }

  const confirmacao = await perguntaOculta("Digite a senha de novo: ");
  if (senha !== confirmacao) {
    console.error("\nAs senhas não são iguais. Nada foi criado.");
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(senha, 12);

  if (existente) {
    await prisma.administrador.update({ where: { email }, data: { nome, passwordHash, ativo: true } });
    await prisma.adminAuditoria.create({
      data: {
        administradorId: existente.id,
        administradorNome: nome,
        administradorEmail: email,
        acao: "CONFIGURAR",
        resumo: "Senha do administrador redefinida pelo script criar-admin, no servidor.",
      },
    });
    console.log(`\nSenha trocada para ${email}.`);
  } else {
    const criado = await prisma.administrador.create({ data: { nome, email, passwordHash } });
    await prisma.adminAuditoria.create({
      data: {
        administradorId: criado.id,
        administradorNome: nome,
        administradorEmail: email,
        acao: "CRIAR",
        resumo: "Administrador criado pelo script criar-admin, no servidor.",
      },
    });
    console.log(`\nAdministrador criado: ${email}`);
  }

  console.log("\nEntre em /admin/entrar e, na primeira vez, ative a verificação em duas etapas.");
  console.log("Enquanto ela estiver desligada, só a senha separa o mundo dos dados dos clientes.\n");
}

principal()
  .catch((erro) => {
    console.error("\nFalhou:", erro.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
