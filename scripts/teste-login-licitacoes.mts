/**
 * Prova o login isolado da solucao de Licitacoes contra o banco de verdade:
 * cria a conta e o usuario, confere senha e 2FA na logica de `authorize`,
 * gera um envelope, e confirma que nada disso toca Organizacao/Usuario.
 *
 * Uso: node --experimental-strip-types --import ./scripts/registrar.mjs scripts/teste-login-licitacoes.mts
 */
import bcrypt from "bcryptjs";
import { generate as gerarCodigoOtp, generateSecret, generateURI, verify as verificarCodigoOtp } from "otplib";
import { prisma } from "@/lib/prisma";

async function principal() {
  const antesOrg = await prisma.organizacao.count();
  const antesUsuario = await prisma.usuario.count();

  const email = `teste-${Date.now()}@exemplo.com`;
  const senha = "senhaForte123";
  const passwordHash = await bcrypt.hash(senha, 10);

  const conta = await prisma.licitacaoConta.create({
    data: {
      tipo: "PJ",
      nome: "Empresa Teste Licitacoes Ltda",
      documento: "11222333000181",
      formaCobranca: "CREDITO",
      usuarios: { create: { nome: "Usuario Teste", email, passwordHash, papel: "DONO" } },
    },
    include: { usuarios: true },
  });
  const usuario = conta.usuarios[0];

  try {
    console.log("=== Login sem 2FA ===");
    const buscado = await prisma.licitacaoUsuario.findUnique({ where: { email }, include: { licitacaoConta: true } });
    const senhaConfere = await bcrypt.compare(senha, buscado!.passwordHash);
    console.log("senha confere:", senhaConfere);
    console.log("conta ativa:", buscado!.licitacaoConta.ativa);
    console.log("2FA ativado:", buscado!.totpAtivado, "(esperado: false, login passa direto)");

    console.log("");
    console.log("=== Ativando 2FA ===");
    const segredo = await generateSecret();
    const uri = generateURI({ secret: segredo, label: email, issuer: "Blackbird Licitacoes" });
    console.log("uri gerada:", uri.slice(0, 40) + "...");

    const codigoValido = await gerarCodigoOtp({ secret: segredo });
    const conferencia = await verificarCodigoOtp({ secret: segredo, token: codigoValido });
    console.log("codigo gerado confere:", conferencia.valid);

    await prisma.licitacaoUsuario.update({
      where: { id: usuario.id },
      data: { totpSegredo: segredo, totpAtivado: true, totpAtivadoEm: new Date() },
    });

    console.log("");
    console.log("=== Login com 2FA, codigo errado ===");
    const erradoConfere = await verificarCodigoOtp({ secret: segredo, token: "000000" });
    console.log("codigo errado confere:", erradoConfere.valid, "(esperado: false)");

    console.log("");
    console.log("=== Gerando envelope com a conta isolada ===");
    const edital = await prisma.editalInteresse.create({
      data: { licitacaoContaId: conta.id, orgaoLicitante: "Teste", modalidade: "Pregão Eletrônico", numeroCertame: "1/2026" },
    });
    const licitanteEmpresa = await prisma.licitanteEmpresa.create({
      data: { licitacaoContaId: conta.id, nome: conta.nome, documento: conta.documento!, repNome: "Fulano", repCpf: "52998224725", repCargo: "sócio" },
    });
    await prisma.envelope.create({
      data: {
        licitacaoContaId: conta.id,
        licitanteEmpresaId: licitanteEmpresa.id,
        editalInteresseId: edital.id,
        itens: { teste: true } as never,
      },
    });
    console.log("envelope criado sob a LicitacaoConta:", conta.id);

    const depoisOrg = await prisma.organizacao.count();
    const depoisUsuario = await prisma.usuario.count();
    console.log("");
    console.log(`Organizacao antes/depois: ${antesOrg} / ${depoisOrg}   ${antesOrg === depoisOrg ? "OK" : "ISOLAMENTO QUEBRADO"}`);
    console.log(`Usuario antes/depois:     ${antesUsuario} / ${depoisUsuario}   ${antesUsuario === depoisUsuario ? "OK" : "ISOLAMENTO QUEBRADO"}`);
  } finally {
    await prisma.envelope.deleteMany({ where: { licitacaoContaId: conta.id } });
    await prisma.editalInteresse.deleteMany({ where: { licitacaoContaId: conta.id } });
    await prisma.licitanteEmpresa.deleteMany({ where: { licitacaoContaId: conta.id } });
    await prisma.licitacaoUsuario.deleteMany({ where: { licitacaoContaId: conta.id } });
    await prisma.licitacaoConta.delete({ where: { id: conta.id } });
    console.log("");
    console.log("Dados de teste removidos.");
  }
}

principal().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
