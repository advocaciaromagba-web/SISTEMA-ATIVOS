/**
 * Confere o preenchimento do cadastro pelo documento colado.
 *
 * Usa CNPJ, que vem de base aberta e nao custa nada. O caminho de CPF
 * depende de consulta paga e nao entra em teste automatico.
 *
 * Uso: node --experimental-strip-types --import ./scripts/registrar.mjs scripts/testar-por-documento.mts <cnpj>
 */
import { preencherPorDocumento } from "@/lib/cadastro/por-documento";
import { rotuloDoCampo } from "@/lib/ia/leitura";

const cnpj = process.argv[2] ?? "00000000000191"; // Banco do Brasil

const r = await preencherPorDocumento({ documento: cnpj });

if (!r.ok) {
  console.log("FALHOU:", r.erro);
  process.exit(1);
}

console.log(`tipo: ${r.tipo}`);
for (const d of r.leitura.documentosReconhecidos) console.log(d);
console.log("");
for (const [chave, campo] of Object.entries(r.leitura.campos)) {
  const rotulo = rotuloDoCampo(r.tipo === "PJ" ? "PESSOA_PJ" : "PESSOA_PF", chave);
  console.log(`  ${rotulo.padEnd(26)} ${campo.valor}   [${campo.confianca}]`);
}
console.log("");
for (const aviso of r.leitura.avisos) console.log("* " + aviso);
