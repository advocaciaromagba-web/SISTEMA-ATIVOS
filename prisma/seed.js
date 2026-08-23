/**
 * Primeira carga do banco: cria a organizacao inicial e o usuario dono.
 *
 * A senha NAO fica escrita aqui nem no codigo. Ou voce informa em
 * ADMIN_SENHA no .env, ou o script sorteia uma senha forte e mostra na tela
 * uma unica vez. Senha padrao em sistema publicado e a falha que mais derruba
 * plataforma nova.
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const prisma = new PrismaClient();

function sortearSenha() {
  // Sem caracteres ambiguos (l, I, 1, O, 0) — a senha vai ser digitada a mao.
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
  return Array.from(crypto.randomFillSync(new Uint32Array(20)))
    .map((n) => alfabeto[n % alfabeto.length])
    .join("");
}

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@exemplo.com.br").toLowerCase().trim();
  const nome = process.env.ADMIN_NOME || "Administrador";
  const empresa = process.env.ADMIN_EMPRESA || "Organizacao de teste";

  const jaExiste = await prisma.usuario.findUnique({ where: { email } });
  if (jaExiste) {
    console.log(`Usuario ${email} ja existe. Nada a fazer.`);
    return;
  }

  const senha = process.env.ADMIN_SENHA || sortearSenha();
  const gerada = !process.env.ADMIN_SENHA;

  const trintaDias = new Date();
  trintaDias.setDate(trintaDias.getDate() + 30);

  const organizacao = await prisma.organizacao.create({
    data: {
      nome: empresa,
      emailContato: email,
      plano: "TESTE",
      statusAssinatura: "TESTE",
      testeExpiraEm: trintaDias,
    },
  });

  await prisma.usuario.create({
    data: {
      organizacaoId: organizacao.id,
      nome,
      email,
      passwordHash: await bcrypt.hash(senha, 12),
      papel: "DONO",
      admin: true,
    },
  });

  console.log("");
  console.log("=================================================");
  console.log("  Acesso criado");
  console.log("=================================================");
  console.log(`  Empresa : ${empresa}`);
  console.log(`  E-mail  : ${email}`);
  console.log(`  Senha   : ${senha}`);
  if (gerada) {
    console.log("");
    console.log("  Esta senha foi sorteada e NAO sera mostrada de novo.");
    console.log("  Guarde-a agora, entre no sistema e troque-a.");
  }
  console.log("=================================================");
  console.log("");
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
