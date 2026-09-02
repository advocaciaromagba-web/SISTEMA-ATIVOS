// Normaliza qualquer upload (imagem ou PDF) para PDF em orientação
// vertical antes de anexar — mesmo critério que já era seguido manualmente
// (tudo em PDF, tudo em pé), agora automatizado.
import { PDFDocument, degrees } from "pdf-lib";

const TIPOS_IMAGEM_SUPORTADOS = new Set(["image/png", "image/jpeg"]);

export async function converterImagemParaPdf(arquivo: File): Promise<Uint8Array> {
  const documento = await PDFDocument.create();
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const imagem = arquivo.type === "image/png" ? await documento.embedPng(bytes) : await documento.embedJpg(bytes);
  const pagina = documento.addPage([imagem.width, imagem.height]);
  pagina.drawImage(imagem, { x: 0, y: 0, width: imagem.width, height: imagem.height });
  return documento.save();
}

/** Gira (só a rotação de exibição, sem re-diagramar o conteúdo) toda
 * página que estiver "deitada" para ficar em pé. É um ajuste rápido e
 * reversível — não um recorte de conteúdo. */
export async function garantirOrientacaoVertical(bytesPdf: Uint8Array): Promise<Uint8Array> {
  const documento = await PDFDocument.load(bytesPdf);
  for (const pagina of documento.getPages()) {
    const { width, height } = pagina.getSize();
    if (width > height) {
      const rotacaoAtual = pagina.getRotation().angle;
      pagina.setRotation(degrees((rotacaoAtual + 90) % 360));
    }
  }
  return documento.save();
}

export async function prepararDocumento(arquivo: File): Promise<Uint8Array> {
  const ehPdf = arquivo.type === "application/pdf";
  if (!ehPdf && !TIPOS_IMAGEM_SUPORTADOS.has(arquivo.type)) {
    throw new Error(`Tipo de arquivo não suportado para organização automática: ${arquivo.type || "desconhecido"}.`);
  }
  const bytes = ehPdf ? new Uint8Array(await arquivo.arrayBuffer()) : await converterImagemParaPdf(arquivo);
  return garantirOrientacaoVertical(bytes);
}
