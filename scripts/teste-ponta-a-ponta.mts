/**
 * Prova de ponta a ponta: cadastra uma parte, roda a auditoria completa e
 * emite uma certidao de verdade — gravando tudo no banco.
 *
 * Usa o CNPJ da propria Romacred, para nao consultar dado de terceiro.
 */
import { PrismaClient } from "@prisma/client";
import { executarAuditoria } from "../src/lib/auditoria/executar.ts";
import { emitirCertidao } from "../src/lib/auditoria/fontes/infosimples.ts";
import { moeda } from "../src/lib/formato.ts";

const prisma = new PrismaClient();

const CNPJ = "30044017000101"; // Romacred Solucoes Financeiras Ltda

const org = await prisma.organizacao.findFirst();
const usuario = await prisma.usuario.findFirst();
if (!org || !usuario) throw new Error("Rode o seed primeiro.");

console.log("Organizacao:", org.nome);

// ---------- 1. cadastro ----------
let pessoa = await prisma.pessoa.findFirst({ where: { organizacaoId: org.id, documento: CNPJ } });
if (!pessoa) {
  pessoa = await prisma.pessoa.create({
    data: {
      organizacaoId: org.id,
      tipo: "PJ",
      nome: "ROMACRED SOLUCOES FINANCEIRAS LTDA",
      documento: CNPJ,
      enderecoRua: "Praca Silvio Vaz de Arruda",
      enderecoNumero: "140",
      enderecoComplemento: "Sala 03",
      enderecoCidade: "Guariba",
      enderecoUf: "SP",
      enderecoCep: "14840049",
      repNome: "JOSE LUCIANO DA COSTA ROMA",
      repCpf: "26746311805",
      repCargo: "socio",
    },
  });
  console.log("Parte cadastrada.");
} else {
  console.log("Parte ja cadastrada.");
}

// ---------- 2. auditoria ----------
console.log("\nRodando auditoria...");
const { resultado } = await executarAuditoria({ pessoa, usuario, organizacaoId: org.id });

console.log("  idoneidade :", resultado.idoneidade);
console.log("  capacidade :", resultado.capacidade);
console.log("  pontuacao  :", resultado.pontuacao);
console.log("\n  FONTES:");
for (const f of resultado.fontes) {
  console.log(`    ${f.fonte.padEnd(22)} ${f.status.padEnd(13)} ${(f.resumo ?? "").slice(0, 70)}`);
}
console.log("\n  PARECER:\n  " + resultado.parecer.replace(/(.{100})/g, "$1\n  "));

// ---------- 3. emissao de certidao ----------
console.log("\nEmitindo CNDT...");
const emissao = await emitirCertidao({
  chaveCertidao: "CNDT",
  parte: { documento: CNPJ, nome: pessoa.nome, uf: pessoa.enderecoUf },
});

if (!emissao.ok) {
  console.log("  FALHOU:", emissao.erro);
} else {
  const c = emissao.certidao;
  console.log("  resultado   :", c.resultado);
  console.log("  numero      :", c.numero ?? "-");
  console.log("  comprovantes:", c.comprovantes.length);
  if (c.comprovantes[0]) console.log("  endereco    :", c.comprovantes[0].slice(0, 90));
  console.log("  custo       :", c.custo ? moeda(Number(c.custo)) : "-");
}

await prisma.$disconnect();
