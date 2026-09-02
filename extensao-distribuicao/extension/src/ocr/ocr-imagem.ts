// 2ª tentativa, só para página sem camada de texto (documento escaneado):
// renderiza a página em canvas e reconhece com tesseract.js — continua sem
// custo, tudo rodando dentro do navegador.
import { createWorker, type Worker } from "tesseract.js";
import { carregarPdf } from "./texto-pdf";

let workerCompartilhado: Worker | null = null;

async function obterWorker(): Promise<Worker> {
  if (workerCompartilhado) return workerCompartilhado;
  workerCompartilhado = await createWorker("por", 1, {
    workerPath: chrome.runtime.getURL("vendor/tesseract/worker.min.js"),
    corePath: chrome.runtime.getURL("vendor/tesseract/tesseract-core.wasm.js"),
    // langPath fica no padrão do tesseract.js (baixa e guarda em cache o
    // idioma português na primeira vez). Para uso totalmente offline, veja
    // a observação em scripts/copiar-vendor.mjs.
  });
  return workerCompartilhado;
}

export async function encerrarWorkerOcr(): Promise<void> {
  if (!workerCompartilhado) return;
  await workerCompartilhado.terminate();
  workerCompartilhado = null;
}

export async function ocrPaginaImagem(arquivo: File, numeroPagina: number): Promise<string> {
  const documento = await carregarPdf(arquivo);
  try {
    const pagina = await documento.getPage(numeroPagina);
    try {
      const viewport = pagina.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const contexto = canvas.getContext("2d");
      if (!contexto) throw new Error("Não foi possível criar o contexto de desenho para o OCR.");
      await pagina.render({ canvasContext: contexto, viewport }).promise;

      const worker = await obterWorker();
      const { data } = await worker.recognize(canvas);
      return data.text.trim();
    } finally {
      pagina.cleanup();
    }
  } finally {
    await documento.destroy();
  }
}
