import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { emitirCertidao } from "../src/lib/auditoria/fontes/infosimples.ts";
import { CERTIDAO_POR_CHAVE } from "../src/lib/auditoria/certidoes.ts";

const prisma = new PrismaClient();
const org = await prisma.organizacao.findFirst();
const usuario = await prisma.usuario.findFirst();
const pessoa = await prisma.pessoa.findFirst({ where: { documento: "30044017000101" } });
if (!org || !usuario || !pessoa) throw new Error("faltam dados");

const chave = "CNDT";
const definicao = CERTIDAO_POR_CHAVE[chave];

console.log("Emitindo", definicao.nome, "para", pessoa.nome);
const emissao = await emitirCertidao({
  chaveCertidao: chave,
  parte: { documento: pessoa.documento!, nome: pessoa.nome, uf: pessoa.enderecoUf },
});
if (!emissao.ok) { console.log("FALHOU:", emissao.erro); process.exit(1); }
const c = emissao.certidao;

// ---- baixa o comprovante, exatamente como a acao do sistema faz ----
const url = c.comprovantes[0] ?? null;
let arquivo: Buffer | null = null, nome: string | null = null, tipo: string | null = null, hash: string | null = null;

if (url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  console.log("  download HTTP:", r.status);
  if (r.ok) {
    const conteudo = Buffer.from(await r.arrayBuffer());
    arquivo = conteudo;
    tipo = r.headers.get("content-type")?.split(";")[0] ?? "application/pdf";
    nome = `${chave.toLowerCase()}-${Date.now()}.${tipo.includes("pdf") ? "pdf" : "html"}`;
    hash = crypto.createHash("sha256").update(conteudo).digest("hex");
    console.log("  arquivo      :", (conteudo.length/1024).toFixed(1), "KB |", tipo);
    console.log("  hash         :", hash.slice(0,16) + "...");
  }
}

const criada = await prisma.certidao.create({
  data: {
    organizacaoId: org.id, pessoaId: pessoa.id, tipo: chave,
    orgaoEmissor: definicao.orgao, numero: c.numero,
    emitidaEm: new Date(),
    validaAte: new Date(Date.now() + definicao.validadeDias * 86400000),
    resultado: c.resultado, apontamento: c.apontamento, natureza: c.natureza,
    arquivo, arquivoNome: nome, arquivoTipo: tipo, hashSha256: hash,
    emissaoAutomatica: true, comprovanteUrl: url,
    dadosConsulta: (c.bruto ?? undefined) as never,
    registradaPorId: usuario.id,
  },
});

const conferencia = await prisma.certidao.findUnique({ where: { id: criada.id } });
console.log("\nGRAVADO NO BANCO:");
console.log("  id           :", conferencia!.id);
console.log("  resultado    :", conferencia!.resultado);
console.log("  numero       :", conferencia!.numero);
console.log("  arquivo      :", conferencia!.arquivo ? conferencia!.arquivo.length + " bytes" : "NENHUM");
console.log("  valida ate   :", conferencia!.validaAte?.toLocaleDateString("pt-BR"));
console.log("  automatica   :", conferencia!.emissaoAutomatica);

await prisma.$disconnect();
