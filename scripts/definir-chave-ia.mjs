/**
 * Troca a chave da Anthropic no arquivo .env local.
 *
 * A chave é DIGITADA aqui no terminal e não aparece na tela. Não passa por
 * chat, não vai para o histórico do git (o .env é ignorado) e não fica no
 * histórico de comandos do shell — que é o que aconteceria se ela fosse
 * passada como argumento.
 *
 * Antes de gravar, o script TESTA a chave contra a API. Isso importa na
 * ordem das coisas: você confirma que a nova funciona antes de revogar a
 * antiga, e não fica sem nenhuma das duas no meio do caminho.
 *
 * Uso:
 *   npm run ia:chave
 */
import fs from "node:fs";
import path from "node:path";
import { pergunta, perguntaOculta } from "./perguntar.mjs";

const ARQUIVO = path.resolve(process.cwd(), ".env");
const VARIAVEL = "ANTHROPIC_API_KEY";

function mascarar(chave) {
  if (chave.length <= 14) return "…";
  return `${chave.slice(0, 14)}…${chave.slice(-4)} (${chave.length} caracteres)`;
}

async function testar(chave) {
  const resposta = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": chave,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL?.trim() || "claude-opus-5",
      max_tokens: 8,
      messages: [{ role: "user", content: "responda apenas: ok" }],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (resposta.ok) return { ok: true };

  const corpo = await resposta.text().catch(() => "");
  return { ok: false, status: resposta.status, corpo: corpo.slice(0, 300) };
}

/** Troca a linha da variável, ou acrescenta se ainda não existir. */
function gravar(chave) {
  let conteudo = fs.existsSync(ARQUIVO) ? fs.readFileSync(ARQUIVO, "utf8") : "";

  const linha = `${VARIAVEL}=${chave}`;
  const padrao = new RegExp(`^${VARIAVEL}=.*$`, "m");

  if (padrao.test(conteudo)) {
    conteudo = conteudo.replace(padrao, linha);
  } else {
    if (conteudo.length > 0 && !conteudo.endsWith("\n")) conteudo += "\n";
    conteudo += `${linha}\n`;
  }

  fs.writeFileSync(ARQUIVO, conteudo);
}

async function principal() {
  console.log("\n=== Trocar a chave da Anthropic (.env local) ===\n");
  console.log("A chave não aparece na tela enquanto você digita.");
  console.log("Ela será testada contra a API antes de ser gravada.\n");

  const chave = await perguntaOculta("Cole a chave nova e tecle Enter: ");

  if (!chave) {
    console.error("\nNada foi digitado. O .env não foi alterado.");
    process.exitCode = 1;
    return;
  }

  if (!chave.startsWith("sk-ant-")) {
    console.error('\nIsso não parece uma chave da Anthropic (deveria começar com "sk-ant-"). O .env não foi alterado.');
    process.exitCode = 1;
    return;
  }

  // Colar duas vezes é o erro mais comum aqui: no PowerShell o botão direito
  // já cola, e quem também aperta Ctrl+V acaba com a chave emendada nela
  // mesma. Sem este aviso, a pessoa só vê "API key is invalid" e conclui que
  // a chave está errada — quando o problema foi a colagem.
  const metade = chave.length / 2;
  if (chave.length % 2 === 0 && chave.slice(0, metade) === chave.slice(metade)) {
    console.error("\nEsta chave parece ter sido COLADA DUAS VEZES: ela é a mesma sequência repetida.");
    console.error(`Tem ${chave.length} caracteres, e a metade (${metade}) já é uma chave inteira.`);
    console.error("Rode de novo e cole uma vez só — botão direito OU Ctrl+V, não os dois.");
    console.error("\nO .env não foi alterado.");
    process.exitCode = 1;
    return;
  }

  console.log(`\nChave recebida: ${mascarar(chave)}`);
  console.log("Testando contra a API...");

  const teste = await testar(chave);

  if (!teste.ok) {
    console.error(`\nA API recusou esta chave (HTTP ${teste.status}).`);
    console.error(teste.corpo);
    console.error("\nO .env NÃO foi alterado, e a chave antiga continua valendo. Não revogue nada ainda.");
    process.exitCode = 1;
    return;
  }

  console.log("A chave funciona.\n");

  const confirma = (await pergunta("Gravar no .env local? (sim/não): ")).toLowerCase();
  if (confirma !== "sim" && confirma !== "s") {
    console.log("Nada foi alterado.");
    return;
  }

  gravar(chave);
  console.log(`\nGravada em ${ARQUIVO}`);
  console.log("\nFalta o servidor: troque a mesma variável no painel do Railway (Variables).");
  console.log("Só DEPOIS que o Railway terminar o redeploy é que você deve revogar a chave antiga");
  console.log("em console.anthropic.com — assim o sistema não fica sem chave nenhuma no meio.\n");
}

principal().catch((erro) => {
  console.error("\nFalhou:", erro.message);
  process.exitCode = 1;
});
