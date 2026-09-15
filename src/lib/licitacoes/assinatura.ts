/**
 * Assinatura digital ICP-Brasil das declarações do envelope.
 *
 * QUEM ASSINA É O LICITANTE, com o certificado A1 dele. A plataforma nunca
 * assina em nome de terceiro com credencial própria — o .pfx fica na conta do
 * cliente, cifrado no cofre (src/lib/seguranca/cofre.ts), e só é aberto no
 * instante da assinatura.
 *
 * Padrão: PAdES (assinatura PKCS#7 embutida no próprio PDF, com /ByteRange),
 * que é o que os portais de licitação e o validador oficial do ITI
 * (validar.iti.gov.br) leem. A cadeia de confiança é a do próprio certificado
 * do licitante — se ele tem um A1 ICP-Brasil, a assinatura é ICP-Brasil.
 *
 * LIMITE DECLARADO, porque isto não pode ficar implícito: não há CARIMBO DO
 * TEMPO de uma ACT credenciada. A data da assinatura é a do relógio do
 * servidor, o que caracteriza PAdES básico (AD-RB), não PAdES-T. Para o que
 * o edital exige — documento assinado digitalmente pelo representante legal,
 * com certificado ICP-Brasil válido — isso basta; para prova de data contra
 * terceiros, o carimbo seria um passo a mais, e ele depende de contratar uma
 * Autoridade de Carimbo do Tempo.
 *
 * A3 (token/cartão) não serve: a chave privada não sai do dispositivo, que
 * precisaria estar plugado no servidor. Só A1 (arquivo .pfx/.p12).
 */
import forge from "node-forge";
// A classe, não a instância padrão: `@signpdf/signpdf` é CommonJS, e o
// `export default` dele chega como `.default` ou como o módulo inteiro
// conforme quem empacota. Instanciar aqui elimina essa diferença.
import { SignPdf } from "@signpdf/signpdf";
import { P12Signer } from "@signpdf/signer-p12";
import { pdflibAddPlaceholder } from "@signpdf/placeholder-pdf-lib";
import type { PDFDocument } from "pdf-lib";
import { marca } from "@/lib/marca";

/**
 * A cadeia ICP-Brasil costuma ser longa; 16 KB reservados evitam o erro de
 * "assinatura maior que o espaço reservado" com certificado de cadeia cheia.
 */
const ESPACO_ASSINATURA = 16384;

export type TitularDoCertificado = {
  /** Nome como está no certificado, sem o documento colado. */
  nome: string;
  /** CNPJ ou CPF extraído do CN (padrão ICP-Brasil "NOME:DOCUMENTO"). */
  documento: string | null;
  validoAte: Date | null;
};

/**
 * Lê o titular do .pfx. Serve para dois fins: mostrar na tela quem vai
 * assinar (antes de assinar), e gravar ao lado do documento quem assinou.
 */
export function lerTitularDoCertificado(
  pfx: Buffer,
  senha: string
): { ok: true; titular: TitularDoCertificado } | { ok: false; erro: string } {
  try {
    const asn1 = forge.asn1.fromDer(pfx.toString("binary"));
    const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, senha);

    const bags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? [];
    const certificado = bags.map((b) => b.cert).find((c) => c != null);
    if (!certificado) return { ok: false, erro: "O arquivo não contém um certificado legível." };

    const cn = certificado.subject.getField("CN")?.value ?? "";
    // ICP-Brasil escreve "RAZAO SOCIAL LTDA:12345678000199" no CN.
    const separador = cn.lastIndexOf(":");
    const nome = separador > 0 ? cn.slice(0, separador).trim() : cn.trim();
    const documentoBruto = separador > 0 ? cn.slice(separador + 1).replace(/\D/g, "") : "";

    return {
      ok: true,
      titular: {
        nome: nome || "(nome não informado no certificado)",
        documento: documentoBruto.length === 11 || documentoBruto.length === 14 ? documentoBruto : null,
        validoAte: certificado.validity?.notAfter ?? null,
      },
    };
  } catch (erro) {
    const mensagem = (erro as Error).message ?? "";
    // node-forge não distingue "senha errada" de "arquivo corrompido" de
    // forma limpa; a causa esmagadoramente mais comum é a senha.
    if (/mac|password|invalid/i.test(mensagem)) {
      return { ok: false, erro: "Não foi possível abrir o certificado — confira se a senha está correta." };
    }
    return { ok: false, erro: `Não foi possível ler o certificado: ${mensagem}` };
  }
}

export type ResultadoAssinatura =
  | { ok: true; pdf: Buffer; titular: TitularDoCertificado }
  | { ok: false; erro: string };

/**
 * Assina o PDF com o certificado do licitante.
 *
 * Recebe o documento pdf-lib ainda aberto porque o espaço reservado da
 * assinatura precisa entrar ANTES de salvar os bytes — assinar é selar
 * exatamente os bytes que foram salvos.
 */
export async function assinarPdfComCertificado(params: {
  pdfDoc: PDFDocument;
  pfx: Buffer;
  senha: string;
  motivo: string;
  local: string;
}): Promise<ResultadoAssinatura> {
  const titular = lerTitularDoCertificado(params.pfx, params.senha);
  if (!titular.ok) return { ok: false, erro: titular.erro };

  try {
    pdflibAddPlaceholder({
      pdfDoc: params.pdfDoc,
      reason: params.motivo,
      contactInfo: "",
      name: titular.titular.nome,
      location: params.local,
      signatureLength: ESPACO_ASSINATURA,
      appName: marca.nome,
    });

    // `useObjectStreams: false` é exigência do fluxo de assinatura: o
    // /ByteRange precisa enxergar os objetos soltos, não comprimidos.
    const bytes = await params.pdfDoc.save({ useObjectStreams: false });

    const assinador = new P12Signer(params.pfx, { passphrase: params.senha });
    const assinado = await new SignPdf().sign(Buffer.from(bytes), assinador);

    return { ok: true, pdf: Buffer.from(assinado), titular: titular.titular };
  } catch (erro) {
    return { ok: false, erro: `Falha ao assinar: ${(erro as Error).message}` };
  }
}
