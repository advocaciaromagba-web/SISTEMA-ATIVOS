/**
 * Carrega a Dívida Ativa da União na base local.
 *
 * A PGFN publica a base inteira em dados abertos, por trimestre, feita para uso
 * em massa: https://dadosabertos.pgfn.gov.br
 *
 * Uso:
 *   node scripts/importar-divida-ativa.mjs                 (FGTS + previdenciário)
 *   node scripts/importar-divida-ativa.mjs --tudo          (inclui o não previdenciário, ~1,3 GB)
 *   node scripts/importar-divida-ativa.mjs --conjunto FGTS
 *   node scripts/importar-divida-ativa.mjs --trimestre 2026_trimestre_02
 *
 * O conjunto NÃO PREVIDENCIÁRIO tem mais de 1,3 GB comprimidos e dezenas de
 * milhões de linhas. Ele fica de fora por padrão porque exige um banco
 * dimensionado para isso — e o sistema avisa, em toda auditoria, que ele não
 * foi consultado. Resultado limpo obtido de meia base não pode parecer
 * atestado.
 */
import fs from "fs";
import path from "path";
import os from "os";
import { PrismaClient } from "@prisma/client";
import { listarItens, lerLinhas } from "./zip.mjs";

const prisma = new PrismaClient();

const BASE = "https://dadosabertos.pgfn.gov.br";

const CONJUNTOS = {
  FGTS: { arquivo: "Dados_abertos_FGTS.zip", rotulo: "FGTS" },
  PREVIDENCIARIO: { arquivo: "Dados_abertos_Previdenciario.zip", rotulo: "Previdenciário" },
  NAO_PREVIDENCIARIO: { arquivo: "Dados_abertos_Nao_Previdenciario.zip", rotulo: "Não previdenciário" },
};

const LOTE = 2000;

// ---------------------------------------------------------------------
// Ajudantes
// ---------------------------------------------------------------------

const soAlfanumerico = (t) => (t ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "");

function normalizarNome(t) {
  return (t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "30/07/2019" vira Date; qualquer outra coisa vira null. */
function lerData(texto) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((texto ?? "").trim());
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
  return Number.isNaN(d.getTime()) ? null : d;
}

function lerValor(texto) {
  const n = Number((texto ?? "").trim().replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

async function descobrirUltimoTrimestre() {
  const html = await (await fetch(`${BASE}/`)).text();
  const pastas = [...html.matchAll(/href="(\d{4}_trimestre_\d{2})\//g)].map((m) => m[1]);
  if (pastas.length === 0) throw new Error("Não consegui listar os trimestres na PGFN.");
  return pastas[pastas.length - 1];
}

async function baixar(url, destino) {
  if (fs.existsSync(destino)) {
    console.log(`  já baixado: ${path.basename(destino)}`);
    return;
  }

  console.log(`  baixando ${url}`);
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status} ao baixar ${url}`);

  const total = Number(resposta.headers.get("content-length") ?? 0);
  const parcial = `${destino}.parcial`;
  const saida = fs.createWriteStream(parcial);

  let recebido = 0;
  let ultimoAviso = Date.now();

  for await (const pedaco of resposta.body) {
    saida.write(pedaco);
    recebido += pedaco.length;

    if (Date.now() - ultimoAviso > 5000) {
      const pct = total ? ` (${((recebido / total) * 100).toFixed(0)}%)` : "";
      console.log(`    ${(recebido / 1024 / 1024).toFixed(0)} MB${pct}`);
      ultimoAviso = Date.now();
    }
  }

  await new Promise((ok) => saida.end(ok));
  // Só renomeia no fim: download interrompido não vira arquivo bom pela metade.
  fs.renameSync(parcial, destino);
  console.log(`    concluído: ${(recebido / 1024 / 1024).toFixed(0)} MB`);
}

// ---------------------------------------------------------------------
// Carga
// ---------------------------------------------------------------------

async function importarConjunto(conjunto, trimestre, pasta) {
  const definicao = CONJUNTOS[conjunto];
  const url = `${BASE}/${trimestre}/${definicao.arquivo}`;
  const destino = path.join(pasta, `${trimestre}_${definicao.arquivo}`);

  console.log(`\n=== ${definicao.rotulo} — ${trimestre} ===`);

  await prisma.cargaDados.upsert({
    where: { fonte_conjunto: { fonte: "PGFN_DIVIDA_ATIVA", conjunto } },
    create: { fonte: "PGFN_DIVIDA_ATIVA", conjunto, referencia: trimestre, situacao: "EM_ANDAMENTO" },
    update: { referencia: trimestre, situacao: "EM_ANDAMENTO", registros: 0, erro: null, iniciadaEm: new Date(), concluidaEm: null },
  });

  try {
    await baixar(url, destino);

    // Recarga substitui: dado de trimestre antigo misturado com novo mentiria
    // sobre a situação atual.
    const apagados = await prisma.dividaAtivaUniao.deleteMany({ where: { tipoDivida: conjunto } });
    if (apagados.count > 0) console.log(`  removidos ${apagados.count} registros da carga anterior`);

    const itens = listarItens(destino).filter((i) => i.nome.toLowerCase().endsWith(".csv"));
    console.log(`  ${itens.length} arquivo(s) dentro do zip`);

    let total = 0;
    let lote = [];

    for (const item of itens) {
      console.log(`  lendo ${item.nome} (${(item.tamanhoAberto / 1024 / 1024).toFixed(0)} MB abertos)`);
      let primeira = true;

      for await (const linha of lerLinhas(destino, item)) {
        if (primeira) {
          primeira = false;
          if (linha.startsWith("CPF_CNPJ")) continue;
        }
        if (!linha.trim()) continue;

        const c = linha.split(";");
        if (c.length < 15) continue;

        const documentoBruto = (c[0] ?? "").trim();
        const ehPf = (c[1] ?? "").toLowerCase().includes("física");

        // No arquivo público o CPF vem mascarado: XXX878.325XX. Guardamos os
        // seis dígitos do meio, que é tudo o que dá para casar depois.
        const documento = soAlfanumerico(documentoBruto);
        const cpfMiolo = ehPf ? (documentoBruto.match(/(\d{3})\.(\d{3})/)?.slice(1, 3).join("") ?? null) : null;

        const nome = (c[3] ?? "").trim();

        lote.push({
          documento,
          cpfMiolo,
          tipoPessoa: ehPf ? "PF" : "PJ",
          nome,
          nomeNormalizado: normalizarNome(nome),
          uf: (c[4] ?? "").trim() || null,
          tipoDivida: conjunto,
          numeroInscricao: (c[8] ?? "").trim(),
          tipoSituacao: (c[9] ?? "").trim() || null,
          situacao: (c[10] ?? "").trim() || null,
          receitaPrincipal: (c[11] ?? "").trim() || null,
          dataInscricao: lerData(c[12]),
          ajuizado: (c[13] ?? "").trim().toUpperCase() === "SIM",
          valorConsolidado: lerValor(c[14]),
          origem: trimestre,
        });

        if (lote.length >= LOTE) {
          await prisma.dividaAtivaUniao.createMany({ data: lote });
          total += lote.length;
          lote = [];
          if (total % 100_000 === 0) console.log(`    ${total.toLocaleString("pt-BR")} registros`);
        }
      }
    }

    if (lote.length > 0) {
      await prisma.dividaAtivaUniao.createMany({ data: lote });
      total += lote.length;
    }

    await prisma.cargaDados.update({
      where: { fonte_conjunto: { fonte: "PGFN_DIVIDA_ATIVA", conjunto } },
      data: { situacao: "CONCLUIDA", registros: total, concluidaEm: new Date() },
    });

    console.log(`  pronto: ${total.toLocaleString("pt-BR")} inscrições carregadas`);
  } catch (erro) {
    await prisma.cargaDados.update({
      where: { fonte_conjunto: { fonte: "PGFN_DIVIDA_ATIVA", conjunto } },
      data: { situacao: "ERRO", erro: String(erro.message ?? erro), concluidaEm: new Date() },
    });
    throw erro;
  }
}

// ---------------------------------------------------------------------

async function principal() {
  const argumentos = process.argv.slice(2);
  const valorDe = (nome) => {
    const i = argumentos.indexOf(nome);
    return i >= 0 ? argumentos[i + 1] : null;
  };

  const trimestre = valorDe("--trimestre") ?? (await descobrirUltimoTrimestre());
  const pedido = valorDe("--conjunto");

  let conjuntos;
  if (pedido) {
    if (!CONJUNTOS[pedido]) throw new Error(`Conjunto desconhecido: ${pedido}`);
    conjuntos = [pedido];
  } else if (argumentos.includes("--tudo")) {
    conjuntos = Object.keys(CONJUNTOS);
  } else {
    conjuntos = ["FGTS", "PREVIDENCIARIO"];
  }

  const pasta = valorDe("--pasta") ?? path.join(os.tmpdir(), "pgfn-divida-ativa");
  fs.mkdirSync(pasta, { recursive: true });

  console.log(`Trimestre: ${trimestre}`);
  console.log(`Conjuntos: ${conjuntos.join(", ")}`);
  console.log(`Arquivos em: ${pasta}`);

  if (!conjuntos.includes("NAO_PREVIDENCIARIO")) {
    console.log(
      "\nATENÇÃO: o conjunto NÃO PREVIDENCIÁRIO ficou de fora (é o maior, mais de 1,3 GB).\n" +
        "O sistema vai avisar, em toda auditoria, que essa parte não foi consultada.\n" +
        "Para incluir: node scripts/importar-divida-ativa.mjs --tudo\n"
    );
  }

  const comeco = Date.now();
  for (const conjunto of conjuntos) {
    await importarConjunto(conjunto, trimestre, pasta);
  }

  console.log(`\nTudo pronto em ${((Date.now() - comeco) / 60000).toFixed(1)} minutos.`);
}

principal()
  .catch((erro) => {
    console.error("\nFALHOU:", erro.message ?? erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
