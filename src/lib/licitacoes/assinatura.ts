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
  /** Autoridade Certificadora que emitiu — é o que amarra à ICP-Brasil. */
  emissor: string | null;
  /** Número de série, como aparece no visualizador de certificados. */
  numeroSerie: string | null;
  validoDe: Date | null;
  validoAte: Date | null;
  /**
   * Quantos certificados vieram no arquivo. Um A1 de verdade traz a cadeia:
   * o da empresa, a AC intermediária e a raiz. Todos entram na assinatura.
   */
  certificadosNaCadeia: number;
  /**
   * Veio uma AC junto do certificado da empresa. Sem isso, o validador pode
   * não conseguir montar a cadeia de confiança e a assinatura aparece como
   * não verificada, mesmo estando criptograficamente correta.
   */
  temCadeia: boolean;
};

/** "12345678000199" -> "12.345.678/0001-99"; CPF análogo. */
export function formatarDocumentoDoCertificado(doc: string | null): string | null {
  if (!doc) return null;
  if (doc.length === 14) return doc.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  if (doc.length === 11) return doc.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  return doc;
}

/**
 * Lê TUDO o que o .pfx tem a dizer: titular, documento, AC emissora, número
 * de série, validade e a cadeia que vai junto.
 *
 * Serve para três coisas: conferir o certificado na hora do envio, mostrar na
 * tela o que foi cadastrado, e carimbar no próprio PDF quem assinou — que é o
 * que permite conferir o documento impresso sem abrir o validador.
 */
export function lerTitularDoCertificado(
  pfx: Buffer,
  senha: string
): { ok: true; titular: TitularDoCertificado } | { ok: false; erro: string } {
  try {
    const asn1 = forge.asn1.fromDer(pfx.toString("binary"));
    const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, senha);

    const bags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? [];
    const certificados = bags.map((b) => b.cert).filter((c): c is forge.pki.Certificate => c != null);
    if (certificados.length === 0) return { ok: false, erro: "O arquivo não contém um certificado legível." };

    // O certificado do titular é o que NÃO é autoridade certificadora. Pegar
    // o primeiro da lista erraria em arquivo que traz a raiz na frente.
    const ehAutoridade = (c: forge.pki.Certificate) => {
      const bc = c.getExtension("basicConstraints") as { cA?: boolean } | undefined;
      return Boolean(bc?.cA);
    };
    const certificado = certificados.find((c) => !ehAutoridade(c)) ?? certificados[0];

    const cn = certificado.subject.getField("CN")?.value ?? "";
    // ICP-Brasil escreve "RAZAO SOCIAL LTDA:12345678000199" no CN.
    const separador = cn.lastIndexOf(":");
    const nome = separador > 0 ? cn.slice(0, separador).trim() : cn.trim();
    const documentoBruto = separador > 0 ? cn.slice(separador + 1).replace(/\D/g, "") : "";

    const serie = (certificado.serialNumber ?? "").replace(/^0+/, "").toUpperCase();

    return {
      ok: true,
      titular: {
        nome: nome || "(nome não informado no certificado)",
        documento: documentoBruto.length === 11 || documentoBruto.length === 14 ? documentoBruto : null,
        emissor: certificado.issuer.getField("CN")?.value ?? null,
        numeroSerie: serie || null,
        validoDe: certificado.validity?.notBefore ?? null,
        validoAte: certificado.validity?.notAfter ?? null,
        certificadosNaCadeia: certificados.length,
        temCadeia: certificados.some((c) => c !== certificado && ehAutoridade(c)),
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
  /** Contato do assinante, gravado no próprio campo de assinatura. */
  contato?: string | null;
  /**
   * Momento da assinatura. Vem de fora porque o mesmo instante precisa ser
   * impresso no corpo do PDF: se a página dissesse uma hora e o atributo
   * criptográfico outra, quem confere teria motivo para desconfiar.
   */
  quando: Date;
}): Promise<ResultadoAssinatura> {
  const titular = lerTitularDoCertificado(params.pfx, params.senha);
  if (!titular.ok) return { ok: false, erro: titular.erro };

  try {
    pdflibAddPlaceholder({
      pdfDoc: params.pdfDoc,
      reason: params.motivo,
      contactInfo: params.contato ?? "",
      name: titular.titular.nome,
      location: params.local,
      signingTime: params.quando,
      signatureLength: ESPACO_ASSINATURA,
      appName: marca.nome,
    });

    // `useObjectStreams: false` é exigência do fluxo de assinatura: o
    // /ByteRange precisa enxergar os objetos soltos, não comprimidos.
    const bytes = await params.pdfDoc.save({ useObjectStreams: false });

    const assinador = new P12Signer(params.pfx, { passphrase: params.senha });
    const assinado = await new SignPdf().sign(Buffer.from(bytes), assinador, params.quando);

    return { ok: true, pdf: Buffer.from(assinado), titular: titular.titular };
  } catch (erro) {
    return { ok: false, erro: `Falha ao assinar: ${(erro as Error).message}` };
  }
}
