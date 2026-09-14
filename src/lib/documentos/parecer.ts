/**
 * Documento do parecer da solução Compliance e Due Diligence.
 *
 * Diferente dos outros documentos gerados (contrato, procuração, relatório de
 * diligência), o parecer é texto corrido, não um formulário de campos fixos
 * — por isso não passa pelo catálogo/`ContextoDocumento` de
 * `src/lib/documentos/index.ts`. Usa as mesmas peças visuais (cabeçalho,
 * rodapé, título, assinatura) para sair com a cara dos demais documentos da
 * marca.
 */
import crypto from "crypto";
import { Document, Packer } from "docx";
import { cabecalho, rodape, titulo, subtitulo, paragrafoRico, localEData, assinaturas, paginaA4, ou } from "./base";
import { marca } from "@/lib/marca";

export type ParecerParaDocumento = {
  tipoRotulo: string;
  tema: string;
  /** Texto final do parecer — parágrafos separados por linha em branco. */
  corpo: string;
  cidade: string | null;
  uf: string | null;
  assinatura?: { nome: string; cargo: string; registro?: string | null } | null;
};

export async function gerarDocumentoParecer(
  p: ParecerParaDocumento
): Promise<{ buffer: Buffer; nomeArquivo: string; hashSha256: string }> {
  const tituloDocumento = `Parecer — ${p.tipoRotulo}`;

  const paragrafosCorpo = p.corpo
    .split(/\n{2,}/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => paragrafoRico(t));

  const construir = (codigo?: string) =>
    new Document({
      creator: marca.nome,
      title: tituloDocumento,
      description: `Parecer — ${p.tipoRotulo}`,
      sections: [
        {
          properties: paginaA4,
          headers: { default: cabecalho(null, null) },
          footers: { default: rodape(codigo) },
          children: [
            titulo(tituloDocumento),
            subtitulo(p.tema),
            ...paragrafosCorpo,
            localEData(ou(p.cidade, "cidade"), ou(p.uf, "uf")),
            ...(p.assinatura
              ? assinaturas([
                  {
                    nome: p.assinatura.nome,
                    papel: p.assinatura.cargo,
                    identificacao: p.assinatura.registro ?? undefined,
                  },
                ])
              : []),
          ],
        },
      ],
    });

  const provisorio = await Packer.toBuffer(construir());
  const hashProvisorio = crypto.createHash("sha256").update(provisorio).digest("hex");
  const codigo = hashProvisorio.slice(0, 8).toUpperCase();

  const buffer = Buffer.from(await Packer.toBuffer(construir(codigo)));

  return {
    buffer,
    nomeArquivo: `parecer-${codigo.toLowerCase()}.docx`,
    hashSha256: crypto.createHash("sha256").update(buffer).digest("hex"),
  };
}
