/**
 * Prepara os arquivos de marca a partir dos originais.
 *
 * Os arquivos que a Blackbird entregou tem 2.500 a 5.500 pixels de largura e
 * pesam entre 3 e 5 MB cada. Isso e material de identidade, nao arquivo de
 * site: uma pagina que carrega 3 MB so de logo demora em conexao movel, e o
 * fundo branco chapado impede usar a marca sobre o azul.
 *
 * Este script resolve as duas coisas de uma vez e fica versionado para o dia
 * em que a logo mudar: recorta o fundo, deixa transparente, apara as bordas e
 * grava nos tamanhos que a aplicacao usa.
 *
 * Uso:  node scripts/preparar-marca.mjs
 */
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

// Os originais ficam fora de /public de proposito: pasta public inteira vai
// para o ar, e ninguem precisa baixar 5 MB de arte para ver o site.
const ORIGEM = path.join(process.cwd(), "identidade");
const DESTINO = path.join(process.cwd(), "public", "marca");

/**
 * Torna transparente tudo o que for proximo da cor de fundo.
 *
 * Recorte duro deixa serrilhado nas bordas do passaro. Por isso a
 * transparencia e gradual: cor identica ao fundo some por completo, cor a
 * meio caminho fica meio transparente, e o contorno continua liso.
 */
async function removerFundo(entrada, corFundo, tolerancia = 42, margem = 30) {
  const { data, info } = await sharp(entrada).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const [rf, gf, bf] = corFundo;

  for (let i = 0; i < data.length; i += 4) {
    const distancia = Math.sqrt(
      (data[i] - rf) ** 2 + (data[i + 1] - gf) ** 2 + (data[i + 2] - bf) ** 2
    );

    if (distancia <= tolerancia) {
      data[i + 3] = 0;
    } else if (distancia < tolerancia + margem) {
      const proporcao = (distancia - tolerancia) / margem;
      data[i + 3] = Math.round(data[i + 3] * proporcao);
    }
  }

  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
}

/**
 * Recorta a area realmente ocupada pelo desenho.
 *
 * `sharp.trim()` compara com o pixel do canto, o que nao serve depois de
 * remover o fundo — o canto virou transparente e ele apararia tudo. Aqui a
 * conta e sobre o alfa: onde ha tinta, ha marca.
 */
async function ararBordas(imagem, { ateAltura = 1 } = {}) {
  const { data, info } = await imagem.raw().toBuffer({ resolveWithObject: true });
  const limite = Math.floor(info.height * ateAltura);

  let x0 = info.width;
  let y0 = info.height;
  let x1 = 0;
  let y1 = 0;

  for (let y = 0; y < limite; y++) {
    for (let x = 0; x < info.width; x++) {
      // Alfa baixo e sobra do recorte suave, nao desenho.
      if (data[(y * info.width + x) * 4 + 3] > 24) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }

  if (x1 <= x0 || y1 <= y0) throw new Error("nada encontrado para recortar");

  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).extract({
    left: x0,
    top: y0,
    width: x1 - x0 + 1,
    height: y1 - y0 + 1,
  });
}

/** Grava PNG comprimido e informa o tamanho, que e o ponto do exercicio. */
async function gravar(imagem, nome, largura) {
  const destino = path.join(DESTINO, nome);
  await imagem.clone().resize({ width: largura, withoutEnlargement: true }).png({ compressionLevel: 9, palette: true }).toFile(destino);
  const { size } = await fs.stat(destino);
  const { width, height } = await sharp(destino).metadata();
  console.log(`  ${nome.padEnd(26)} ${String(width).padStart(4)}x${String(height).padEnd(4)}  ${(size / 1024).toFixed(0)} kB`);
}

const BRANCO = [252, 253, 251];
const AZUL = [10, 22, 40];

async function principal() {
  await fs.mkdir(DESTINO, { recursive: true });
  console.log("");

  // ---- horizontal, para cabecalho claro ----
  const horizontal = await ararBordas(await removerFundo(path.join(ORIGEM, "logo.png"), BRANCO));
  await gravar(horizontal, "horizontal.png", 900);

  // ---- lockup vertical sobre azul, para a tela de entrada ----
  const vertical = await sharp(path.join(ORIGEM, "logo-vertical.png")).ensureAlpha();
  await gravar(vertical, "vertical.png", 720);

  // ---- so o passaro, dourado e transparente, para fundo escuro ----
  // O passaro ocupa ate cerca de 57% da altura do lockup vertical; logo
  // abaixo comeca o filete dourado e o nome, que aqui nao entram.
  const simbolo = await ararBordas(await removerFundo(path.join(ORIGEM, "logo-vertical.png"), AZUL, 46, 26), {
    ateAltura: 0.58,
  });
  await gravar(simbolo, "simbolo.png", 256);

  // ---- icone do aplicativo: quadrado azul com o passaro ----
  const icone = sharp(await sharp(path.join(ORIGEM, "logo-icone.png")).trim().toBuffer());
  await gravar(icone, "icone-512.png", 512);
  await gravar(icone, "icone-192.png", 192);
  await gravar(icone, "apple-icon.png", 180);

  // O cabecalho dos documentos gerados NAO usa esta marca de proposito: o
  // contrato e do assinante, e leva a logo dele, enviada em Configuracoes.

  console.log("");
  console.log(`Arquivos em: ${DESTINO}`);
}

principal().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
