// Copia para dist/vendor os arquivos de terceiros que precisam existir como
// arquivo estático dentro do pacote da extensão (Manifest V3 não permite
// carregar código executável de fora da extensão — só dados, como o texto
// reconhecido, podem vir da rede).
import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = dirname(dirname(fileURLToPath(import.meta.url)));
const nodeModules = join(raiz, "node_modules");
const destino = join(raiz, "dist", "vendor");

function copiarPrimeiroExistente(candidatos, nomeDestino, obrigatorio = true) {
  for (const candidato of candidatos) {
    const origem = join(nodeModules, candidato);
    if (existsSync(origem)) {
      mkdirSync(dirname(join(destino, nomeDestino)), { recursive: true });
      copyFileSync(origem, join(destino, nomeDestino));
      console.log(`vendor: ${candidato} -> vendor/${nomeDestino}`);
      return true;
    }
  }
  const aviso = `vendor: nenhum candidato encontrado para "${nomeDestino}" (tentado: ${candidatos.join(", ")})`;
  if (obrigatorio) {
    console.warn(`${aviso} — copie manualmente ou ajuste a versão da dependência.`);
  }
  return false;
}

mkdirSync(destino, { recursive: true });

// pdf.js: o nome do worker mudou entre versões (pdf.worker.min.js x .mjs).
copiarPrimeiroExistente(
  [
    "pdfjs-dist/build/pdf.worker.min.mjs",
    "pdfjs-dist/build/pdf.worker.min.js",
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
  ],
  "pdf.worker.min.mjs"
);

// tesseract.js: worker + core (wasm). O nome do core varia conforme o
// pacote "tesseract.js-core" instalado suportar SIMD ou não.
copiarPrimeiroExistente(["tesseract.js/dist/worker.min.js"], "tesseract/worker.min.js");
const coreOk = copiarPrimeiroExistente(
  ["tesseract.js-core/tesseract-core-simd-lstm.wasm.js", "tesseract.js-core/tesseract-core-lstm.wasm.js"],
  "tesseract/tesseract-core.wasm.js"
);
if (coreOk) {
  copiarPrimeiroExistente(
    ["tesseract.js-core/tesseract-core-simd-lstm.wasm", "tesseract.js-core/tesseract-core-lstm.wasm"],
    "tesseract/tesseract-core.wasm"
  );
}

console.log(
  "vendor: dado de idioma (por.traineddata) não é copiado — o tesseract.js baixa e guarda em cache na" +
    " primeira vez que reconhece uma página em português. Para uso totalmente offline, baixe o" +
    " arquivo *.traineddata.gz do idioma e aponte `langPath` em src/ocr/ocr-imagem.ts para um caminho local."
);
