/**
 * O pacote de dados que todo gerador de documento recebe.
 *
 * O gerador nunca vai ao banco por conta própria: recebe tudo pronto. Isso
 * permite guardar o contexto junto com o documento e reproduzir o mesmo arquivo
 * meses depois, mesmo que o cadastro tenha mudado desde então.
 */
import type { Organizacao, Operacao, ParteOperacao, Pessoa, Usuario } from "@prisma/client";
import { marca } from "@/lib/marca";
import { TIPOS_ATIVO, type PapelParte } from "./catalogo";
import { moedaComExtenso, percentualComExtenso, numero } from "@/lib/formato";
import { formatarNumeroProcessoCnj } from "@/lib/validacao";
import { ou } from "./base";

export type ParteComPessoa = ParteOperacao & { pessoa: Pessoa };
export type OperacaoCompleta = Operacao & { partes: ParteComPessoa[] };

export type ContextoDocumento = {
  organizacao: Organizacao;
  operacao: OperacaoCompleta | null;
  usuario: Usuario;
  /** Campos preenchidos na tela de geração, conforme o catálogo. */
  campos: Record<string, string>;
  agora: Date;
  /**
   * Dossiê consolidado, carregado só quando o documento é o relatório de due
   * diligence. Fica fora do resto porque exige varrer auditorias, consultas e
   * certidões de todas as partes — trabalho que nenhum outro documento faz.
   */
  diligencia?: import("./geradores/diligencia").DadosDiligencia;
  /**
   * A empresa que participa de uma licitação, para as declarações de
   * habilitação.
   *
   * Fica fora de `operacao` de propósito: não existe cessão, cedente ou
   * cessionário aqui — é uma declaração unilateral da própria empresa perante
   * o ente público, reaproveitável em qualquer certame. Por isso é uma
   * `Pessoa` avulsa do cadastro, não uma parte vinculada a um negócio.
   */
  licitante?: Pessoa | null;
};

// ---------------------------------------------------------------------
// Acesso às partes
// ---------------------------------------------------------------------

export function partesPor(ctx: ContextoDocumento, papel: PapelParte): ParteComPessoa[] {
  if (!ctx.operacao) return [];
  return ctx.operacao.partes
    .filter((p) => p.papel === papel)
    .sort((a, b) => (a.ordemCadeia ?? 999) - (b.ordemCadeia ?? 999));
}

export function parte(ctx: ContextoDocumento, papel: PapelParte): ParteComPessoa | null {
  return partesPor(ctx, papel)[0] ?? null;
}

export function pessoaDe(ctx: ContextoDocumento, papel: PapelParte): Pessoa | null {
  return parte(ctx, papel)?.pessoa ?? null;
}

// ---------------------------------------------------------------------
// Campos preenchidos na tela
// ---------------------------------------------------------------------

export function campo(ctx: ContextoDocumento, chave: string, padrao = ""): string {
  const v = (ctx.campos?.[chave] ?? "").toString().trim();
  return v || padrao;
}

export function campoNumero(ctx: ContextoDocumento, chave: string, padrao: number | null = null): number | null {
  const bruto = (ctx.campos?.[chave] ?? "").toString().trim();
  if (!bruto) return padrao;
  const n = Number(numeroDeTexto(bruto));
  return Number.isFinite(n) ? n : padrao;
}

/**
 * Lê número escrito por gente, em formato brasileiro ou não.
 *
 * Apagar todo ponto como separador de milhar transformava "2.5" em 25 — numa
 * cláusula de comissão, erro de dez vezes. A regra abaixo decide pelo formato
 * do próprio texto:
 *
 *   "1.000,50"   vírgula presente   → ponto é milhar, vírgula é decimal
 *   "2.5"        um ponto, 1 casa   → ponto decimal
 *   "1.000"      um ponto, 3 casas  → ambíguo; vale a leitura brasileira (mil)
 *   "1.000.000"  vários pontos      → milhar
 */
export function numeroDeTexto(bruto: string): string {
  const texto = bruto.trim().replace(/\s/g, "");

  if (texto.includes(",")) return texto.replace(/\./g, "").replace(",", ".");

  const pontos = texto.split(".").length - 1;
  if (pontos === 0) return texto;
  if (pontos > 1) return texto.replace(/\./g, "");

  const decimais = texto.slice(texto.indexOf(".") + 1);
  // Três dígitos depois do ponto é a grafia brasileira de milhar.
  return decimais.length === 3 ? texto.replace(".", "") : texto;
}

export function campoSim(ctx: ContextoDocumento, chave: string, padrao = false): boolean {
  const v = campo(ctx, chave).toLowerCase();
  if (!v) return padrao;
  return v === "sim" || v === "true" || v === "1";
}

// ---------------------------------------------------------------------
// Foro e local
// ---------------------------------------------------------------------

export function foro(ctx: ContextoDocumento): { cidade: string; uf: string } {
  const o = ctx.organizacao;
  return {
    cidade: o.foroCidade || o.enderecoCidade || marca.foroCidade,
    uf: o.foroUf || o.enderecoUf || marca.foroUf,
  };
}

// ---------------------------------------------------------------------
// Descrição do ativo — o parágrafo que identifica o que está sendo negociado
// ---------------------------------------------------------------------

/**
 * Monta a descrição do ativo conforme o tipo. Um precatório se identifica por
 * tribunal, número e ente devedor; uma commodity, por produto, quantidade e
 * incoterm. Descrever errado é o mesmo que não descrever.
 */
export function descreverAtivo(ctx: ContextoDocumento): string {
  const op = ctx.operacao;
  if (!op) return "[OPERAÇÃO NÃO VINCULADA]";

  const nome = TIPOS_ATIVO[op.tipoAtivo] ?? op.tipoAtivo;
  const partes: string[] = [];

  switch (op.tipoAtivo) {
    case "PRECATORIO": {
      partes.push(`${nome} nº ${ou(op.numeroPrecatorio, "número do precatório")}`);
      if (op.numeroProcesso) partes.push(`oriundo do processo nº ${formatarNumeroProcessoCnj(op.numeroProcesso)}`);
      partes.push(`em trâmite perante o ${ou(op.tribunal, "tribunal")}`);
      partes.push(`tendo como entidade devedora ${ou(op.enteDevedor, "ente devedor")}`);
      if (op.naturezaCredito) {
        partes.push(`de natureza ${op.naturezaCredito === "ALIMENTAR" ? "alimentar" : "comum"}`);
      }
      if (op.anoOrcamentario) partes.push(`inscrito no orçamento de ${op.anoOrcamentario}`);
      break;
    }

    case "CREDITO_ICMS":
    case "CREDITO_PIS_COFINS":
    case "CREDITO_TRIBUTARIO": {
      partes.push(nome);
      if (op.tributo) partes.push(`referente a ${op.tributo}`);
      if (op.ufCredito) partes.push(`apurado no estado de ${op.ufCredito}`);
      if (op.processoAdmin) partes.push(`objeto do processo administrativo nº ${op.processoAdmin}`);
      if (op.homologado != null) {
        partes.push(op.homologado ? "já homologado pela autoridade fiscal" : "pendente de homologação pela autoridade fiscal");
      }
      break;
    }

    case "OURO":
    case "METAIS": {
      // Em metal, o que identifica o ativo e o teor e o laudo que o comprova.
      partes.push(`${ou(op.produto, nome)}`);
      if (op.teor) partes.push(`com teor de ${op.teor}`);
      if (op.forma) partes.push(`na forma de ${op.forma}`);
      if (op.quantidade) partes.push(`na quantidade de ${numero(Number(op.quantidade), 4)} ${ou(op.unidade, "unidade")}`);
      if (op.laudoEnsaio) partes.push(`conforme laudo de ensaio ${op.laudoEnsaio}`);
      if (op.tituloMinerario) partes.push(`com origem no título minerário ${op.tituloMinerario}`);
      else if (op.origem) partes.push(`com origem em ${op.origem}`);
      if (op.incoterm) partes.push(`nas condições ${op.incoterm}`);
      if (op.destino) partes.push(`e destino a ${op.destino}`);
      if (op.embarque) partes.push(`entrega prevista para ${op.embarque}`);
      break;
    }

    case "COMMODITY": {
      partes.push(`${ou(op.produto, "produto")} (${nome})`);
      if (op.quantidade) partes.push(`na quantidade de ${numero(Number(op.quantidade), 2)} ${ou(op.unidade, "unidade")}`);
      if (op.incoterm) partes.push(`nas condições ${op.incoterm}`);
      if (op.origem) partes.push(`com origem em ${op.origem}`);
      if (op.destino) partes.push(`e destino a ${op.destino}`);
      if (op.embarque) partes.push(`embarque previsto para ${op.embarque}`);
      break;
    }

    default: {
      partes.push(nome);
      if (op.numeroProcesso) partes.push(`vinculado ao processo nº ${formatarNumeroProcessoCnj(op.numeroProcesso)}`);
      if (op.enteDevedor) partes.push(`tendo como devedor ${op.enteDevedor}`);
    }
  }

  if (op.descricao) partes.push(op.descricao);

  return partes.join(", ");
}

/** Linha com os números do negócio: valor de face, deságio e valor pago. */
export function descreverValores(ctx: ContextoDocumento): string {
  const op = ctx.operacao;
  if (!op) return "";

  const moedaOp = (op.moeda || "BRL") as "BRL" | "USD" | "EUR";
  const trechos: string[] = [];

  if (op.valorFace != null) trechos.push(`valor de face de ${moedaComExtenso(Number(op.valorFace), moedaOp)}`);
  if (op.desagioPercentual != null) trechos.push(`deságio de ${percentualComExtenso(Number(op.desagioPercentual))}`);
  if (op.valorNegociado != null) trechos.push(`valor negociado de ${moedaComExtenso(Number(op.valorNegociado), moedaOp)}`);

  return trechos.join(", ");
}

/** Quadro-resumo do ativo, em tabela. */
export function linhasResumoAtivo(ctx: ContextoDocumento): string[][] {
  const op = ctx.operacao;
  if (!op) return [];

  const moedaOp = (op.moeda || "BRL") as "BRL" | "USD" | "EUR";
  const linhas: string[][] = [["Tipo de ativo", TIPOS_ATIVO[op.tipoAtivo] ?? op.tipoAtivo]];

  const adiciona = (rotulo: string, valor: unknown) => {
    if (valor == null || valor === "") return;
    linhas.push([rotulo, String(valor)]);
  };

  adiciona("Identificação", op.titulo);
  adiciona("Tribunal", op.tribunal);
  adiciona("Precatório nº", op.numeroPrecatorio);
  adiciona("Processo nº", op.numeroProcesso ? formatarNumeroProcessoCnj(op.numeroProcesso) : null);
  adiciona("Entidade devedora", op.enteDevedor);
  adiciona("Natureza", op.naturezaCredito === "ALIMENTAR" ? "Alimentar" : op.naturezaCredito === "COMUM" ? "Comum" : null);
  adiciona("Tributo", op.tributo);
  adiciona("Produto", op.produto);
  adiciona("Quantidade", op.quantidade ? `${numero(Number(op.quantidade), 2)} ${op.unidade ?? ""}`.trim() : null);
  adiciona("Incoterm", op.incoterm);
  adiciona("Valor de face", op.valorFace != null ? moedaComExtenso(Number(op.valorFace), moedaOp) : null);
  adiciona("Deságio", op.desagioPercentual != null ? percentualComExtenso(Number(op.desagioPercentual)) : null);
  adiciona("Valor negociado", op.valorNegociado != null ? moedaComExtenso(Number(op.valorNegociado), moedaOp) : null);

  return linhas;
}

/** Valor de referência para multas proporcionais ao negócio. */
export function valorReferencia(ctx: ContextoDocumento): number | null {
  const op = ctx.operacao;
  if (!op) return null;
  if (op.valorNegociado != null) return Number(op.valorNegociado);
  if (op.valorFace != null) return Number(op.valorFace);
  return null;
}
