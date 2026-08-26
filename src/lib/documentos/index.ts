/**
 * Ponto de entrada do gerador de documentos.
 *
 * Recebe o tipo e o contexto, confere o que falta, monta o arquivo .docx e
 * devolve o conteúdo já com a impressão digital (SHA-256) que permite provar
 * depois que nada foi alterado.
 */
import crypto from "crypto";
import { AlignmentType, Document, Packer, Paragraph, TextRun } from "docx";
import { cabecalho, rodape, localEData, titulo as tituloDoc, subtitulo as subtituloDoc, assinaturas, testemunhas, paginaA4 } from "./base";
import { CATALOGO_POR_CHAVE, PAPEIS, type TipoDocumento } from "./catalogo";
import { foro, partesPor, type ContextoDocumento } from "./contexto";
import type { MontagemDocumento } from "./montagem";
import { marca } from "@/lib/marca";

import { gerarNDA, gerarNCNDA, gerarIMFPA } from "./geradores/sigilo";
import { gerarProcuracao, gerarMandato } from "./geradores/representacao";
import {
  gerarLOI,
  gerarCessaoCredito,
  gerarCessaoDireitos,
  gerarCessaoPrecatorio,
  gerarNotificacaoDevedor,
} from "./geradores/cessao";
import { gerarTermoComissao, gerarTermoQuitacao, gerarAditivo, gerarDistrato } from "./geradores/encerramento";
import { gerarDeclaracaoOrigem, gerarFichaKyc } from "./geradores/compliance";
import { gerarRelatorioDiligencia } from "./geradores/diligencia";
import {
  gerarLicitCredenciamento,
  gerarLicitFatoSuperveniente,
  gerarLicitNaoEmpregaMenor,
  gerarLicitPlenoAtendimento,
  gerarLicitMeEpp,
} from "./geradores/licitacao";

type Gerador = (ctx: ContextoDocumento) => MontagemDocumento;

const GERADORES: Record<string, Gerador> = {
  NDA: gerarNDA,
  NCNDA: gerarNCNDA,
  IMFPA: gerarIMFPA,
  PROCURACAO: gerarProcuracao,
  MANDATO: gerarMandato,
  LOI: gerarLOI,
  CESSAO_CREDITO: gerarCessaoCredito,
  CESSAO_DIREITOS: gerarCessaoDireitos,
  CESSAO_PRECATORIO: gerarCessaoPrecatorio,
  NOTIFICACAO_DEVEDOR: gerarNotificacaoDevedor,
  TERMO_COMISSAO: gerarTermoComissao,
  TERMO_QUITACAO: gerarTermoQuitacao,
  ADITIVO: gerarAditivo,
  DISTRATO: gerarDistrato,
  DECLARACAO_ORIGEM: gerarDeclaracaoOrigem,
  FICHA_KYC: gerarFichaKyc,
  RELATORIO_DILIGENCIA: gerarRelatorioDiligencia,
  LICIT_CREDENCIAMENTO: gerarLicitCredenciamento,
  LICIT_FATO_SUPERVENIENTE: gerarLicitFatoSuperveniente,
  LICIT_NAO_EMPREGA_MENOR: gerarLicitNaoEmpregaMenor,
  LICIT_PLENO_ATENDIMENTO: gerarLicitPlenoAtendimento,
  LICIT_ME_EPP: gerarLicitMeEpp,
};

export function tipoExiste(tipo: string): boolean {
  return tipo in GERADORES && tipo in CATALOGO_POR_CHAVE;
}

// ---------------------------------------------------------------------
// Conferência antes de gerar
// ---------------------------------------------------------------------

export type Pendencia = { campo: string; motivo: string };

/**
 * Confere o que falta ANTES de montar o arquivo.
 *
 * Não impede a geração: um contrato com lacunas marcadas é útil para circular
 * internamente. Só avisa, para que ninguém mande para assinatura sem ver.
 */
export function conferirRequisitos(tipo: string, ctx: ContextoDocumento): Pendencia[] {
  const definicao = CATALOGO_POR_CHAVE[tipo];
  if (!definicao) return [{ campo: "tipo", motivo: "Tipo de documento desconhecido." }];

  const pendencias: Pendencia[] = [];

  for (const papel of definicao.papeisObrigatorios) {
    if (partesPor(ctx, papel).length === 0) {
      pendencias.push({
        campo: PAPEIS[papel],
        motivo: `Nenhuma parte cadastrada nesta operação com o papel de ${PAPEIS[papel]}.`,
      });
    }
  }

  for (const c of definicao.campos ?? []) {
    if (!c.obrigatorio) continue;
    const valor = (ctx.campos?.[c.chave] ?? "").toString().trim();
    if (!valor) pendencias.push({ campo: c.rotulo, motivo: "Campo obrigatório não preenchido." });
  }

  // Qualificação incompleta das partes envolvidas — é o que mais derruba
  // contrato em cartório.
  const papeisEnvolvidos = [...definicao.papeisObrigatorios, ...(definicao.papeisOpcionais ?? [])];
  for (const papel of papeisEnvolvidos) {
    for (const p of partesPor(ctx, papel)) {
      const pessoa = p.pessoa;
      if (!pessoa.documento) {
        pendencias.push({ campo: pessoa.nome, motivo: "Sem CPF/CNPJ cadastrado." });
      }
      if (!pessoa.enderecoRua) {
        pendencias.push({ campo: pessoa.nome, motivo: "Sem endereço cadastrado." });
      }
      if (pessoa.tipo === "PJ" && !pessoa.repNome) {
        pendencias.push({ campo: pessoa.nome, motivo: "Pessoa jurídica sem representante legal cadastrado." });
      }
    }
  }

  // Declarações de licitação não têm operação nem partes — pedem a empresa
  // licitante avulsa. Sem ela, não há quem declarar.
  if (definicao.exigeLicitante) {
    if (!ctx.licitante) {
      pendencias.push({ campo: "Empresa licitante", motivo: "Nenhuma empresa selecionada para gerar a declaração." });
    } else {
      if (!ctx.licitante.documento) {
        pendencias.push({ campo: ctx.licitante.nome, motivo: "Sem CPF/CNPJ cadastrado." });
      }
      if (ctx.licitante.tipo === "PJ" && !ctx.licitante.repNome) {
        pendencias.push({ campo: ctx.licitante.nome, motivo: "Pessoa jurídica sem representante legal cadastrado." });
      }
    }
  }

  return pendencias;
}

// ---------------------------------------------------------------------
// Geração
// ---------------------------------------------------------------------

export type DocumentoGerado = {
  buffer: Buffer;
  nomeArquivo: string;
  titulo: string;
  hashSha256: string;
  pendencias: Pendencia[];
  definicao: TipoDocumento;
};

export async function gerarDocumento(tipo: string, ctx: ContextoDocumento): Promise<DocumentoGerado> {
  const definicao = CATALOGO_POR_CHAVE[tipo];
  const gerador = GERADORES[tipo];
  if (!definicao || !gerador) throw new Error(`Tipo de documento desconhecido: ${tipo}`);

  const pendencias = conferirRequisitos(tipo, ctx);
  const montagem = gerador(ctx);
  const f = foro(ctx);

  // Código de conferência: primeiros 8 caracteres do hash do conteúdo, gerado
  // depois de montar o arquivo. Como ele precisa aparecer no rodapé, o
  // documento é montado duas vezes: a primeira para calcular, a segunda para
  // valer. É barato e evita depender de um contador no banco.
  const construir = (codigo?: string) =>
    new Document({
      creator: marca.nome,
      title: montagem.titulo,
      description: `${definicao.nome} — ${ctx.operacao?.codigo ?? "sem operação vinculada"}`,
      sections: [
        {
          properties: paginaA4,
          headers: { default: cabecalho(ctx.organizacao.logo as Buffer | null, ctx.organizacao.logoTipo) },
          footers: { default: rodape(codigo) },
          children: [
            tituloDoc(montagem.titulo),
            ...(montagem.subtitulo ? [subtituloDoc(montagem.subtitulo)] : []),
            ...montagem.corpo,
            ...(montagem.semLocalEData ? [] : [localEData(f.cidade, f.uf, ctx.agora)]),
            ...assinaturas(montagem.assinantes),
            ...(montagem.comTestemunhas ? testemunhas() : []),
            ...notaLegal(definicao),
          ],
        },
      ],
    });

  const provisorio = await Packer.toBuffer(construir());
  const hash = crypto.createHash("sha256").update(provisorio).digest("hex");
  const codigo = hash.slice(0, 8).toUpperCase();

  const buffer = Buffer.from(await Packer.toBuffer(construir(codigo)));

  return {
    buffer,
    nomeArquivo: montarNomeArquivo(definicao, ctx),
    titulo: montagem.titulo,
    // O hash definitivo é o do arquivo que fica guardado.
    hashSha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    pendencias,
    definicao,
  };
}

/** Rodapé jurídico: em que a redação se apoia. */
function notaLegal(definicao: TipoDocumento): Paragraph[] {
  if (definicao.baseLegal.length === 0) return [];

  return [
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 600 },
      children: [
        new TextRun({
          text: `Fundamentos: ${definicao.baseLegal.join("; ")}.`,
          size: 16,
          italics: true,
          color: "666666",
          font: "Arial",
        }),
      ],
    }),
  ];
}

function montarNomeArquivo(definicao: TipoDocumento, ctx: ContextoDocumento): string {
  const data = ctx.agora.toISOString().slice(0, 10);
  const operacao = ctx.operacao?.codigo ? `-${ctx.operacao.codigo}` : "";
  const nome = definicao.chave.toLowerCase().replace(/_/g, "-");
  return `${data}${operacao}-${nome}.docx`;
}

export { CATALOGO, CATALOGO_POR_CHAVE, documentosOrdenados, PAPEIS, TIPOS_ATIVO, FASES } from "./catalogo";
export type { ContextoDocumento } from "./contexto";
