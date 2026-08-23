/**
 * Leitor de ZIP em fluxo, sem dependência externa.
 *
 * Os arquivos da PGFN passam de 1 GB comprimidos e vários gigabytes abertos.
 * Carregar isso na memória derruba o processo, então aqui o arquivo é lido do
 * disco em pedaços e descomprimido conforme se lê.
 *
 * O caminho é: achar o diretório central no fim do arquivo (é lá que ficam os
 * nomes e as posições de cada item), e depois abrir um fluxo por item.
 */
import fs from "fs";
import zlib from "zlib";
import readline from "readline";

const ASSINATURA_FIM_CENTRAL = 0x06054b50;
const ASSINATURA_ITEM_CENTRAL = 0x02014b50;

/** Lê o diretório central e devolve a lista de itens do ZIP. */
export function listarItens(caminho) {
  const tamanho = fs.statSync(caminho).size;

  // O fim do diretório central está nos últimos 64 KB, depois do comentário.
  const bytesFinais = Math.min(65_536 + 22, tamanho);
  const fim = Buffer.alloc(bytesFinais);
  const arquivo = fs.openSync(caminho, "r");
  fs.readSync(arquivo, fim, 0, bytesFinais, tamanho - bytesFinais);

  let posicaoFim = -1;
  for (let i = fim.length - 22; i >= 0; i--) {
    if (fim.readUInt32LE(i) === ASSINATURA_FIM_CENTRAL) {
      posicaoFim = i;
      break;
    }
  }
  if (posicaoFim < 0) {
    fs.closeSync(arquivo);
    throw new Error("ZIP sem diretório central — arquivo truncado ou corrompido.");
  }

  const quantidade = fim.readUInt16LE(posicaoFim + 10);
  const tamanhoCentral = fim.readUInt32LE(posicaoFim + 12);
  const inicioCentral = fim.readUInt32LE(posicaoFim + 16);

  const central = Buffer.alloc(tamanhoCentral);
  fs.readSync(arquivo, central, 0, tamanhoCentral, inicioCentral);
  fs.closeSync(arquivo);

  const itens = [];
  let p = 0;

  for (let n = 0; n < quantidade && p + 46 <= central.length; n++) {
    if (central.readUInt32LE(p) !== ASSINATURA_ITEM_CENTRAL) break;

    const metodo = central.readUInt16LE(p + 10);
    const tamanhoComprimido = central.readUInt32LE(p + 20);
    const tamanhoAberto = central.readUInt32LE(p + 24);
    const tamanhoNome = central.readUInt16LE(p + 28);
    const tamanhoExtra = central.readUInt16LE(p + 30);
    const tamanhoComentario = central.readUInt16LE(p + 32);
    const posicaoLocal = central.readUInt32LE(p + 42);
    const nome = central.slice(p + 46, p + 46 + tamanhoNome).toString("utf8");

    itens.push({ nome, metodo, tamanhoComprimido, tamanhoAberto, posicaoLocal });
    p += 46 + tamanhoNome + tamanhoExtra + tamanhoComentario;
  }

  return itens;
}

/** Onde os dados de um item realmente começam (depois do cabeçalho local). */
function inicioDosDados(caminho, item) {
  const cabecalho = Buffer.alloc(30);
  const arquivo = fs.openSync(caminho, "r");
  fs.readSync(arquivo, cabecalho, 0, 30, item.posicaoLocal);
  fs.closeSync(arquivo);

  const tamanhoNome = cabecalho.readUInt16LE(26);
  const tamanhoExtra = cabecalho.readUInt16LE(28);
  return item.posicaoLocal + 30 + tamanhoNome + tamanhoExtra;
}

/**
 * Percorre as linhas de um item do ZIP, uma a uma.
 *
 * Os arquivos da PGFN vêm em latin1 (não UTF-8): lidos como UTF-8, todo nome
 * com acento sai corrompido.
 */
export async function* lerLinhas(caminho, item, codificacao = "latin1") {
  const inicio = inicioDosDados(caminho, item);
  const fim = inicio + item.tamanhoComprimido - 1;

  const bruto = fs.createReadStream(caminho, { start: inicio, end: fim });
  // Método 8 é deflate; 0 é sem compressão.
  const fluxo = item.metodo === 8 ? bruto.pipe(zlib.createInflateRaw()) : bruto;

  fluxo.setEncoding(codificacao);

  const leitor = readline.createInterface({ input: fluxo, crlfDelay: Infinity });

  for await (const linha of leitor) {
    yield linha;
  }
}
