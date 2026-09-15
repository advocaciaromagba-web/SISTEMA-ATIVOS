/**
 * Montagem das declarações do envelope, em PDF e — quando a conta tem
 * certificado A1 — já assinadas digitalmente.
 *
 * Por que PDF além do .docx: o .docx serve para conferir a redação antes de
 * assinar; nenhum edital aceita .docx assinado. A assinatura ICP-Brasil que o
 * certame exige vive dentro de um PDF.
 *
 * Quando a assinatura falha (certificado vencido, senha trocada depois do
 * envio, arquivo corrompido), o documento sai MESMO ASSIM, sem assinatura, e
 * o motivo fica gravado ao lado dele. Ficar sem documento nenhum na véspera
 * do certame é pior do que ter o documento e saber que falta assinar.
 */
import crypto from "crypto";
import type { LicitanteEmpresa } from "@prisma/client";
import { montarPdfDeclaracao } from "@/lib/documentos/pdf-declaracao";
import { TEXTO_DECLARACAO_LICITACAO } from "@/lib/documentos/geradores/licitacao";
import type { ContextoDocumento } from "@/lib/documentos/contexto";
import { assinarPdfComCertificado, type TitularDoCertificado } from "./assinatura";

export type DeclaracaoGerada = {
  tipo: string;
  titulo: string;
  nomeArquivo: string;
  pdf: Buffer;
  hashSha256: string;
  assinado: boolean;
  titular: TitularDoCertificado | null;
  erroAssinatura: string | null;
};

function nomeDoArquivo(tipo: string, licitante: LicitanteEmpresa): string {
  const empresa = (licitante.documento || licitante.nome)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return `${tipo.toLowerCase().replace(/_/g, "-")}-${empresa}.pdf`;
}

export async function gerarDeclaracaoDoEnvelope(params: {
  tipo: string;
  contexto: ContextoDocumento;
  licitante: LicitanteEmpresa;
  certificado: { pfx: Buffer; senha: string } | null;
  motivo: string;
}): Promise<DeclaracaoGerada | null> {
  const construtor = TEXTO_DECLARACAO_LICITACAO[params.tipo];
  if (!construtor) return null;

  const texto = construtor(params.contexto);
  const local = `${params.licitante.enderecoCidade ?? ""}${params.licitante.enderecoUf ? `/${params.licitante.enderecoUf}` : ""}`;

  const base = {
    titulo: texto.titulo,
    paragrafos: texto.paragrafos,
    assinantes: texto.assinantes,
    cidade: params.licitante.enderecoCidade,
    uf: params.licitante.enderecoUf,
    agora: params.contexto.agora,
  };

  const finalizar = (pdf: Buffer, assinado: boolean, titular: TitularDoCertificado | null, erroAssinatura: string | null): DeclaracaoGerada => ({
    tipo: params.tipo,
    titulo: texto.titulo,
    nomeArquivo: nomeDoArquivo(params.tipo, params.licitante),
    pdf,
    hashSha256: crypto.createHash("sha256").update(pdf).digest("hex"),
    assinado,
    titular,
    erroAssinatura,
  });

  if (!params.certificado) {
    const doc = await montarPdfDeclaracao({ ...base, comAssinaturaDigital: false });
    return finalizar(Buffer.from(await doc.save()), false, null, null);
  }

  const paraAssinar = await montarPdfDeclaracao({ ...base, comAssinaturaDigital: true });
  const assinatura = await assinarPdfComCertificado({
    pdfDoc: paraAssinar,
    pfx: params.certificado.pfx,
    senha: params.certificado.senha,
    motivo: params.motivo,
    local: local || "Brasil",
  });

  if (assinatura.ok) return finalizar(assinatura.pdf, true, assinatura.titular, null);

  // Falhou ao assinar: refaz o PDF sem a marca de assinatura digital (o
  // documento já tocado pelo espaço reservado não serve mais) e entrega
  // com o motivo à vista.
  const semAssinatura = await montarPdfDeclaracao({ ...base, comAssinaturaDigital: false });
  return finalizar(Buffer.from(await semAssinatura.save()), false, null, assinatura.erro);
}
