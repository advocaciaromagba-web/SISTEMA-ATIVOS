/**
 * Confere, um a um, se os caminhos de serviço da Infosimples estão certos.
 *
 * POR QUE ESTE SCRIPT EXISTE
 *
 * Os caminhos foram deduzidos do catálogo público, e a API valida o token antes
 * de rotear — um caminho errado devolve o mesmo erro de autenticação que um
 * caminho certo. Ou seja: sem token, não dá para saber quais estão corretos.
 *
 * Com o token na mão, este script descobre em um minuto. Ele não faz consulta
 * de verdade: manda um documento propositalmente inválido, de modo que um
 * caminho existente responda "parâmetro inválido" e um caminho inexistente
 * responda "serviço não encontrado". A diferença entre os dois é a resposta.
 *
 * Uso:
 *   node scripts/testar-infosimples.mjs
 *   node scripts/testar-infosimples.mjs --cpf 52998224725 --cnpj 11222333000181
 *
 * Com --cpf e --cnpj de verdade ele faz as consultas para valer, e aí cada
 * chamada é cobrada pela Infosimples.
 */
import fs from "fs";
import path from "path";

const BASE = "https://api.infosimples.com/api/v2/consultas";

/** Lê o token do .env sem depender de biblioteca. */
function lerToken() {
  if (process.env.INFOSIMPLES_TOKEN) return process.env.INFOSIMPLES_TOKEN.trim();

  try {
    const env = fs.readFileSync(path.join(process.cwd(), ".env"), "utf8");
    const linha = env.split("\n").find((l) => l.trim().startsWith("INFOSIMPLES_TOKEN"));
    if (!linha) return null;
    return linha.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "") || null;
  } catch {
    return null;
  }
}

/**
 * Caminhos a conferir. Mantenha em sincronia com
 * src/lib/auditoria/fontes/infosimples-servicos.ts
 */
const CAMINHOS = [
  ["Mandados de prisão (BNMP)", "cnj/mandados-prisao", "cpf"],
  ["Improbidade (CNJ)", "cnj/improbidade", "cpf"],
  ["Antecedentes criminais (PF)", "antecedentes-criminais/pf/emit", "cpf"],
  ["CNDT — devedores trabalhistas", "tribunal/tst/cndt", "cnpj"],
  ["Banco de falências (TST)", "tribunal/tst/banco-falencias", "cnpj"],
  ["CND federal (Receita/PGFN)", "receita-federal/pgfn", "cnpj"],
  ["Protesto (IEPTB/CENPROT)", "ieptb/protestos", "cnpj"],
  ["Débitos estaduais (SEFAZ)", "sefaz/certidao-debitos", "cnpj"],
  ["Certidão unificada — Justiça Federal", "tribunal/trf/cert-unificada", "cnpj"],
  ["TRF1 — certidão", "tribunal/trf1/certidao", "cnpj"],
  ["TRF2 — certidão", "tribunal/trf2/certidao", "cnpj"],
  ["TRF3 — pedido", "tribunal/trf3/certidao-distr", "cnpj"],
  ["TRF3 — retirada", "tribunal/trf3/obter-certidao", null],
  ["TRF4 — certidão", "tribunal/trf4/certidao", "cnpj"],
  ["TRF5 — certidão", "tribunal/trf5/certidao", "cnpj"],
  ["TRF6 — certidão", "tribunal/trf6/certidao", "cnpj"],
  ["TJSP — pedido cível", "tribunal/tjsp/pedido-civel", "cnpj"],
  ["TJSP — pedido criminal", "tribunal/tjsp/pedido-criminal", "cnpj"],
  ["TJSP — retirada", "tribunal/tjsp/obter-certidao", null],
  ["TJRJ — pedido", "tribunal/tjrj/pedido-cert", "cnpj"],
  ["TJRJ — retirada", "tribunal/tjrj/obter-certidao", null],
  ["TJSC — pedido", "tribunal/tjsc/pedido-certidao", "cnpj"],
  ["TJSC — retirada", "tribunal/tjsc/obter-certidao", null],
  ["TJMS — pedido", "tribunal/tjms/pedido-cert", "cnpj"],
  ["TJMS — retirada", "tribunal/tjms/obter-certidao", null],
  ["TJDF — nada consta", "tribunal/tjdf/nada-consta", "cnpj"],
  ["TJGO — nada consta", "tribunal/tjgo/nada-consta", "cnpj"],
  ["TJMA — nada consta", "tribunal/tjma/nada-consta", "cnpj"],
  ["TJTO — certidão judicial", "tribunal/tjto/cert-judicial", "cnpj"],
  ["TJPA — certidão criminal", "tribunal/tjpa/cert-criminal", "cnpj"],
  ["STJ — certidão negativa", "tribunal/stj/certidao-negativa", "cnpj"],
  ["CAMINHO INVENTADO (controle)", "tribunal/tjxx/nao-existe", "cnpj"],
];

/** Códigos que a API devolve e o que eles significam para este teste. */
function classificar(code, mensagem) {
  if (code === 200) return { simbolo: "OK   ", nota: "respondeu com sucesso" };
  if (code === 601) return { simbolo: "TOKEN", nota: "token recusado — confira INFOSIMPLES_TOKEN" };
  if (code === 602) return { simbolo: "SALDO", nota: "sem saldo na conta" };

  // Erro de parâmetro significa que o serviço EXISTE e recebeu a chamada.
  if (/par[aâ]metro|inv[aá]lid|obrigat[oó]ri|preenc/i.test(mensagem)) {
    return { simbolo: "EXISTE", nota: "serviço existe (recusou o documento de teste)" };
  }

  if (/n[aã]o encontrad|inexistente|not found|indispon[ií]vel/i.test(mensagem)) {
    return { simbolo: "FALTA", nota: "caminho não existe — corrigir no mapa de serviços" };
  }

  return { simbolo: "?    ", nota: mensagem.slice(0, 60) };
}

async function principal() {
  const token = lerToken();

  if (!token) {
    console.log("\nINFOSIMPLES_TOKEN não encontrado no .env nem no ambiente.");
    console.log("Crie a conta em https://api.infosimples.com, gere o token e preencha o .env.\n");
    process.exit(1);
  }

  const argumentos = process.argv.slice(2);
  const valorDe = (nome) => {
    const i = argumentos.indexOf(nome);
    return i >= 0 ? argumentos[i + 1] : null;
  };

  // Sem documento real, manda um propositalmente inválido: serviço existente
  // responde erro de parâmetro; serviço inexistente responde outra coisa.
  const cpf = valorDe("--cpf") ?? "00000000000";
  const cnpj = valorDe("--cnpj") ?? "00000000000000";
  const comDocumentoReal = Boolean(valorDe("--cpf") || valorDe("--cnpj"));

  console.log("");
  console.log(comDocumentoReal ? "MODO REAL — cada consulta será cobrada." : "MODO SECO — documentos inválidos, sem cobrança esperada.");
  console.log("");

  const problemas = [];

  for (const [nome, caminho, tipo] of CAMINHOS) {
    const parametros = { token, timeout: 300 };
    if (tipo === "cpf") {
      parametros.cpf = cpf;
      parametros.nome = "TESTE DE INTEGRACAO";
    } else if (tipo === "cnpj") {
      parametros.cnpj = cnpj;
    } else {
      parametros.numero_pedido = "000000";
    }

    try {
      const resposta = await fetch(`${BASE}/${caminho}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(parametros),
        signal: AbortSignal.timeout(120_000),
      });

      const corpo = await resposta.json().catch(() => ({}));
      const mensagem = [corpo.code_message, ...(corpo.errors ?? [])].filter(Boolean).join(" ");
      const { simbolo, nota } = classificar(corpo.code, mensagem);

      console.log(`  ${simbolo}  ${nome.padEnd(38)} ${String(corpo.code ?? "-").padStart(3)}  ${nota}`);

      if (simbolo === "FALTA") problemas.push(`${nome} → ${caminho}`);
      if (simbolo === "TOKEN" || simbolo === "SALDO") {
        console.log("\n  Interrompido: resolva a conta antes de continuar.\n");
        process.exit(1);
      }
    } catch (erro) {
      console.log(`  ERRO   ${nome.padEnd(38)}      ${erro.message.slice(0, 50)}`);
    }
  }

  console.log("");
  if (problemas.length > 0) {
    console.log("Caminhos a corrigir em src/lib/auditoria/fontes/infosimples-servicos.ts:");
    problemas.forEach((p) => console.log("  - " + p));
  } else {
    console.log("Nenhum caminho quebrado. O controle inventado deve ter aparecido como FALTA —");
    console.log("se ele apareceu como EXISTE, a classificação precisa de ajuste.");
  }
  console.log("");
}

principal().catch((erro) => {
  console.error("\nFALHOU:", erro.message ?? erro);
  process.exit(1);
});
