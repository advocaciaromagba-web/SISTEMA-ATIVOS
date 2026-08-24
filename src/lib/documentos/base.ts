/**
 * Peças de montagem comuns a todos os documentos gerados.
 *
 * Todo documento sai em .docx (Word). Foi escolha deliberada: o intermediário
 * quase sempre precisa ajustar uma linha antes de assinar, e um PDF fechado o
 * obrigaria a redigitar tudo. O arquivo final assinado vira PDF no Autentique.
 */
import {
  AlignmentType,
  Footer,
  Header,
  ImageRun,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  BorderStyle,
} from "docx";
import { marca } from "@/lib/marca";

const FONTE = "Arial";
const TAMANHO = 22; // 11pt — docx conta em meio-ponto

// ---------------------------------------------------------------------
// Cabeçalho e rodapé
// ---------------------------------------------------------------------

/** Cabeçalho com o logo do próprio assinante, quando ele tiver enviado um. */
/**
 * Lê as dimensões da imagem direto dos bytes do arquivo.
 *
 * O .docx exige largura e altura em número; sem saber a proporção real, o
 * cabeçalho esticava toda logo para 160x60 e uma marca quadrada saía achatada.
 * PNG guarda o tamanho logo no começo; JPEG, num dos marcadores SOF.
 */
function dimensoesDaImagem(dados: Buffer): { largura: number; altura: number } | null {
  // PNG: assinatura de 8 bytes, depois o bloco IHDR com largura e altura.
  if (dados.length > 24 && dados.readUInt32BE(0) === 0x89504e47) {
    return { largura: dados.readUInt32BE(16), altura: dados.readUInt32BE(20) };
  }

  // JPEG: percorre os marcadores até achar um SOF, que carrega as medidas.
  if (dados.length > 4 && dados[0] === 0xff && dados[1] === 0xd8) {
    let i = 2;
    while (i + 9 < dados.length) {
      if (dados[i] !== 0xff) {
        i += 1;
        continue;
      }
      const marcador = dados[i + 1];
      // SOF0 a SOF15, fora dos marcadores que não descrevem quadro.
      if (marcador >= 0xc0 && marcador <= 0xcf && marcador !== 0xc4 && marcador !== 0xc8 && marcador !== 0xcc) {
        return { largura: dados.readUInt16BE(i + 7), altura: dados.readUInt16BE(i + 5) };
      }
      i += 2 + dados.readUInt16BE(i + 2);
    }
  }

  return null;
}

export function cabecalho(logo?: Buffer | null, tipo?: string | null): Header {
  if (!logo || logo.length === 0) {
    return new Header({ children: [new Paragraph({})] });
  }

  const formato = (tipo ?? "").includes("jpeg") || (tipo ?? "").includes("jpg") ? "jpg" : "png";

  // Cabe até 180 pontos de largura e 60 de altura; a menor das duas escalas
  // manda, para a marca nunca invadir o texto nem sair esticada.
  const LARGURA_MAXIMA = 180;
  const ALTURA_MAXIMA = 60;
  const medidas = dimensoesDaImagem(logo);
  let largura = LARGURA_MAXIMA;
  let altura = ALTURA_MAXIMA;

  if (medidas && medidas.largura > 0 && medidas.altura > 0) {
    const escala = Math.min(LARGURA_MAXIMA / medidas.largura, ALTURA_MAXIMA / medidas.altura);
    largura = Math.round(medidas.largura * escala);
    altura = Math.round(medidas.altura * escala);
  }

  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new ImageRun({
            data: logo,
            type: formato as "png" | "jpg",
            transformation: { width: largura, height: altura },
          }),
        ],
      }),
    ],
  });
}

/**
 * Rodapé com numeração e a origem do documento.
 *
 * A linha de origem existe por transparência: quem recebe o documento sabe que
 * ele foi montado a partir de um cadastro, com data e código de conferência.
 */
export function rodape(codigoConferencia?: string): Footer {
  const origem = codigoConferencia
    ? `Documento gerado eletronicamente em ${marca.nome} — código de conferência ${codigoConferencia}`
    : `Documento gerado eletronicamente em ${marca.nome}`;

  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120 },
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 6 } },
        children: [new TextRun({ text: origem, size: 14, color: "666666", font: FONTE })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "Página ", size: 14, color: "666666", font: FONTE }),
          new TextRun({ children: [PageNumber.CURRENT], size: 14, color: "666666", font: FONTE }),
          new TextRun({ text: " de ", size: 14, color: "666666", font: FONTE }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, color: "666666", font: FONTE }),
        ],
      }),
    ],
  });
}

// ---------------------------------------------------------------------
// Texto
// ---------------------------------------------------------------------

export function titulo(texto: string) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 160 },
    children: [new TextRun({ text: texto.toUpperCase(), bold: true, size: 26, font: FONTE })],
  });
}

export function subtitulo(texto: string) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 320 },
    children: [new TextRun({ text: texto, italics: true, size: 20, font: FONTE, color: "444444" })],
  });
}

/** Título de cláusula: "CLÁUSULA PRIMEIRA — DO OBJETO". */
export function clausulaTitulo(texto: string) {
  return new Paragraph({
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text: texto.toUpperCase(), bold: true, size: 22, font: FONTE })],
  });
}

export function paragrafo(
  texto: string,
  opcoes: { negrito?: boolean; italico?: boolean; alinhamento?: (typeof AlignmentType)[keyof typeof AlignmentType]; espacoDepois?: number } = {}
) {
  return new Paragraph({
    alignment: opcoes.alinhamento ?? AlignmentType.JUSTIFIED,
    spacing: { after: opcoes.espacoDepois ?? 160, line: 300 },
    children: [new TextRun({ text: texto, bold: opcoes.negrito, italics: opcoes.italico, size: TAMANHO, font: FONTE })],
  });
}

/** Parágrafo numerado: rótulo em negrito seguido do texto. */
export function item(rotulo: string, texto: string) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 140, line: 300 },
    children: [
      new TextRun({ text: `${rotulo} `, bold: true, size: TAMANHO, font: FONTE }),
      new TextRun({ text: texto, size: TAMANHO, font: FONTE }),
    ],
  });
}

/** Parágrafo com trechos em negrito no meio, marcados com **asteriscos**. */
export function paragrafoRico(texto: string) {
  const pedacos = texto.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 160, line: 300 },
    children: pedacos.map((p) =>
      p.startsWith("**") && p.endsWith("**")
        ? new TextRun({ text: p.slice(2, -2), bold: true, size: TAMANHO, font: FONTE })
        : new TextRun({ text: p, size: TAMANHO, font: FONTE })
    ),
  });
}

export function espaco(altura = 200) {
  return new Paragraph({ spacing: { after: altura }, children: [] });
}

// ---------------------------------------------------------------------
// Local, data e assinaturas
// ---------------------------------------------------------------------

export function localEData(cidade: string, uf: string, data: Date = new Date()) {
  const texto = `${cidade}/${uf}, ${data.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}.`;
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 480, after: 480 },
    children: [new TextRun({ text: texto, size: TAMANHO, font: FONTE })],
  });
}

export type BlocoAssinatura = {
  nome: string;
  papel: string;
  /// Linha de identificação sob o nome: CPF, CNPJ, cargo.
  identificacao?: string;
};

/** Linhas de assinatura, uma abaixo da outra. */
export function assinaturas(blocos: BlocoAssinatura[]): Paragraph[] {
  const saida: Paragraph[] = [];

  for (const bloco of blocos) {
    saida.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 560, after: 0 },
        children: [new TextRun({ text: "_".repeat(52), size: TAMANHO, font: FONTE })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
        children: [new TextRun({ text: bloco.nome, bold: true, size: TAMANHO, font: FONTE })],
      })
    );

    if (bloco.identificacao) {
      saida.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 0 },
          children: [new TextRun({ text: bloco.identificacao, size: 20, font: FONTE })],
        })
      );
    }

    saida.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: bloco.papel, size: 20, italics: true, font: FONTE, color: "444444" })],
      })
    );
  }

  return saida;
}

/** Duas linhas de testemunha lado a lado, como manda o CPC 784, III. */
export function testemunhas(): Paragraph[] {
  return [
    new Paragraph({
      spacing: { before: 480, after: 120 },
      children: [new TextRun({ text: "TESTEMUNHAS:", bold: true, size: TAMANHO, font: FONTE })],
    }),
    new Paragraph({
      spacing: { before: 360, after: 0 },
      children: [new TextRun({ text: `1) ${"_".repeat(44)}`, size: TAMANHO, font: FONTE })],
    }),
    new Paragraph({
      children: [new TextRun({ text: "     Nome:                                    CPF:", size: 20, font: FONTE })],
    }),
    new Paragraph({
      spacing: { before: 360, after: 0 },
      children: [new TextRun({ text: `2) ${"_".repeat(44)}`, size: TAMANHO, font: FONTE })],
    }),
    new Paragraph({
      children: [new TextRun({ text: "     Nome:                                    CPF:", size: 20, font: FONTE })],
    }),
  ];
}

// ---------------------------------------------------------------------
// Tabela simples (quadro-resumo do ativo, cadeia de comissões)
// ---------------------------------------------------------------------

export function tabela(cabecalhos: string[], linhas: string[][]): Table {
  const celula = (texto: string, negrito = false) =>
    new TableCell({
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [
        new Paragraph({
          children: [new TextRun({ text: texto, bold: negrito, size: 20, font: FONTE })],
        }),
      ],
    });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: cabecalhos.map((c) => celula(c, true)) }),
      ...linhas.map((linha) => new TableRow({ children: linha.map((c) => celula(c)) })),
    ],
  });
}

// ---------------------------------------------------------------------
// Marcação de campo faltante
// ---------------------------------------------------------------------

/**
 * Campo em branco vira um marcador visível em vez de sumir do texto.
 * É de propósito: um contrato com lacuna gritante é conferido; um contrato com
 * a lacuna silenciosamente omitida é assinado com defeito.
 */
export function ou(valor: string | null | undefined, rotulo: string): string {
  const v = (valor ?? "").toString().trim();
  return v || `[${rotulo.toUpperCase()} NÃO INFORMADO]`;
}

/** Configuração de página padrão: A4 com margens de contrato. */
export const paginaA4 = {
  page: {
    size: { width: 11906, height: 16838 },
    margin: { top: 1134, right: 1134, bottom: 1134, left: 1418 },
  },
};
