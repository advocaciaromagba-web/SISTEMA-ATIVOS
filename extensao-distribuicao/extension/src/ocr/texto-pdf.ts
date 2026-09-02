// 1ª tentativa de leitura, sem custo: a maioria das petições iniciais já
// nasce digital (editor de texto -> PDF), então a camada de texto do PDF já
// tem o conteúdo — não precisa de OCR de verdade para essas páginas.
import * as pdfjsLib from "pdfjs-dist";

let workerConfigurado = false;

function configurarWorker(): void {
  if (workerConfigurado) return;
  pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("vendor/pdf.worker.min.mjs");
  workerConfigurado = true;
}

export interface PaginaTexto {
  numero: number;
  texto: string;
  temTexto: boolean; // false = provavelmente escaneada, precisa de OCR de imagem
}

const MINIMO_CARACTERES_PARA_CONSIDERAR_TEXTO = 20;

export async function carregarPdf(arquivo: File): Promise<pdfjsLib.PDFDocumentProxy> {
  configurarWorker();
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  return pdfjsLib.getDocument({ data: bytes }).promise;
}

export async function extrairTextoPdf(arquivo: File): Promise<PaginaTexto[]> {
  const documento = await carregarPdf(arquivo);
  const paginas: PaginaTexto[] = [];
  try {
    for (let numero = 1; numero <= documento.numPages; numero += 1) {
      const pagina = await documento.getPage(numero);
      try {
        const conteudo = await pagina.getTextContent();
        const texto = conteudo.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ")
          .trim();
        paginas.push({ numero, texto, temTexto: texto.length >= MINIMO_CARACTERES_PARA_CONSIDERAR_TEXTO });
      } finally {
        pagina.cleanup();
      }
    }
  } finally {
    await documento.destroy();
  }
  return paginas;
}
