/**
 * Leitura das certidões apresentadas e o peso de cada apontamento.
 *
 * A distinção que este arquivo protege é a mais importante de todas:
 * **processo em curso não é condenação**. A presunção de inocência é regra
 * constitucional (art. 5º, LVII), e o STJ já fixou que inquéritos e ações penais
 * em andamento não servem para agravar a situação de ninguém (Súmula 444).
 *
 * Tratar um processo em curso como condenação, além de errado, expõe a
 * plataforma a responder por dano moral. Por isso: processo em curso é ponto de
 * atenção que o operador precisa conhecer; condenação transitada em julgado e
 * mandado em aberto são outra coisa.
 */
import type { Certidao } from "@prisma/client";
import type { Apontamento } from "./tipos";
import {
  CERTIDAO_POR_CHAVE,
  certidaoValida,
  exigenciasDe,
  ROTULO_NATUREZA,
  type ExigenciaCertidao,
} from "./certidoes";

export type SituacaoCertidao = {
  exigencia: ExigenciaCertidao;
  certidao: Certidao | null;
  /** FALTA | VENCIDA | PENDENTE | OK | APONTAMENTO */
  estado: "FALTA" | "VENCIDA" | "PENDENTE" | "OK" | "APONTAMENTO";
};

/** Cruza o que é exigido com o que a parte já apresentou. */
export function conferirCertidoes(params: {
  tipoPessoa: "PF" | "PJ";
  papel: string;
  tipoAtivo: string | null;
  certidoes: Certidao[];
}): SituacaoCertidao[] {
  const { tipoPessoa, papel, tipoAtivo, certidoes } = params;

  return exigenciasDe({ tipoPessoa, papel, tipoAtivo }).map((exigencia) => {
    // A mais recente de cada tipo é a que vale.
    const apresentadas = certidoes
      .filter((c) => c.tipo === exigencia.tipo.chave)
      .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());

    const certidao = apresentadas[0] ?? null;

    if (!certidao) return { exigencia, certidao: null, estado: "FALTA" as const };

    if (!certidaoValida(certidao.validaAte, certidao.emitidaEm, exigencia.tipo.validadeDias)) {
      return { exigencia, certidao, estado: "VENCIDA" as const };
    }

    if (certidao.resultado === "PENDENTE") {
      return { exigencia, certidao, estado: "PENDENTE" as const };
    }

    if (certidao.resultado === "CONSTA") {
      return { exigencia, certidao, estado: "APONTAMENTO" as const };
    }

    return { exigencia, certidao, estado: "OK" as const };
  });
}

/** Traduz o que foi conferido em apontamentos da auditoria. */
export function apontamentosDasCertidoes(situacoes: SituacaoCertidao[]): Apontamento[] {
  const apontamentos: Apontamento[] = [];

  // ----- o que a parte apresentou e o que apareceu nelas -----
  for (const s of situacoes) {
    if (s.estado !== "APONTAMENTO" || !s.certidao) continue;

    const natureza = s.certidao.natureza as keyof typeof ROTULO_NATUREZA;
    const detalheParte = s.certidao.apontamento ? ` Consta: ${s.certidao.apontamento}` : "";
    const nome = s.exigencia.tipo.nome;

    if (natureza === "MANDADO_ABERTO") {
      apontamentos.push({
        gravidade: "GRAVE",
        eixo: "IDONEIDADE",
        titulo: "Mandado de prisão em aberto",
        detalhe:
          `Apurado em ${nome}.${detalheParte} A parte pode ser presa a qualquer momento. Não assine contrato, ` +
          "procuração ou escritura nessa condição: além do risco prático, a transferência de patrimônio por quem " +
          "está foragido levanta suspeita de ocultação de bens e pode ser desfeita.",
        fonte: s.exigencia.tipo.orgao,
      });
      continue;
    }

    if (natureza === "MEDIDA_CONSTRITIVA") {
      apontamentos.push({
        gravidade: "GRAVE",
        eixo: "IDONEIDADE",
        titulo: "Bem sob constrição judicial",
        detalhe:
          `Apurado em ${nome}.${detalheParte} Há sequestro, indisponibilidade ou penhora atingindo o patrimônio ` +
          "da parte. Se a constrição alcançar o crédito negociado, a cessão não produz efeito e o dinheiro pago " +
          "se perde. Confirme na certidão de objeto e pé se o crédito está livre antes de qualquer pagamento.",
        fonte: s.exigencia.tipo.orgao,
      });
      continue;
    }

    if (natureza === "CONDENACAO_TRANSITADA") {
      apontamentos.push({
        gravidade: "GRAVE",
        eixo: "IDONEIDADE",
        titulo: "Condenação transitada em julgado",
        detalhe:
          `Apurado em ${nome}.${detalheParte} Condenação definitiva. Avalie a natureza do crime: condenação por ` +
          "estelionato, falsidade, lavagem ou crime contra o sistema financeiro tem relação direta com o tipo de " +
          "operação em curso e pesa de forma diferente de uma condenação sem qualquer ligação patrimonial.",
        fonte: s.exigencia.tipo.orgao,
      });
      continue;
    }

    if (natureza === "PROCESSO_EM_CURSO") {
      apontamentos.push({
        // Deliberadamente MÉDIA, e não grave: sem trânsito em julgado ninguém é
        // culpado (CF, art. 5º, LVII; Súmula 444 do STJ).
        gravidade: "MEDIA",
        eixo: "IDONEIDADE",
        titulo: "Processo em curso, sem trânsito em julgado",
        detalhe:
          `Apurado em ${nome}.${detalheParte} Processo em andamento NÃO é condenação — a parte é presumida ` +
          "inocente. Serve para você conhecer o cenário e decidir se pede garantia adicional, não para tratar a " +
          "pessoa como culpada. Verifique se o processo pode gerar constrição sobre o crédito negociado.",
        fonte: s.exigencia.tipo.orgao,
      });
      continue;
    }

    apontamentos.push({
      gravidade: "MEDIA",
      eixo: "IDONEIDADE",
      titulo: `Apontamento em ${nome}`,
      detalhe: `${ROTULO_NATUREZA[natureza] ?? "Apontamento"}.${detalheParte}`,
      fonte: s.exigencia.tipo.orgao,
    });
  }

  // ----- o que falta -----
  const faltando = situacoes.filter((s) => s.exigencia.obrigatoria && (s.estado === "FALTA" || s.estado === "PENDENTE"));
  const vencidas = situacoes.filter((s) => s.exigencia.obrigatoria && s.estado === "VENCIDA");

  if (faltando.length > 0) {
    const criminais = faltando.filter((s) => s.exigencia.tipo.eixo === "CRIMINAL");

    apontamentos.push({
      gravidade: "GRAVE",
      eixo: "IDONEIDADE",
      titulo:
        criminais.length > 0
          ? `Faltam certidões obrigatórias, incluindo ${criminais.length} criminal(is)`
          : `Faltam ${faltando.length} certidão(ões) obrigatória(s)`,
      detalhe:
        `Ainda não foram apresentadas: ${faltando.map((s) => s.exigencia.tipo.nome).join("; ")}. ` +
        "Enquanto faltarem, a parte fica bloqueada para esta operação. As certidões são gratuitas e a maioria " +
        "sai na hora — a lista com os endereços está na tela da parte.",
      fonte: "Exigência da operação",
    });
  }

  if (vencidas.length > 0) {
    apontamentos.push({
      gravidade: "MEDIA",
      eixo: "IDONEIDADE",
      titulo: `${vencidas.length} certidão(ões) vencida(s)`,
      detalhe:
        `Perderam a validade: ${vencidas.map((s) => s.exigencia.tipo.nome).join("; ")}. ` +
        "Certidão vencida não prova a situação de hoje. Peça a atualização antes de assinar.",
      fonte: "Exigência da operação",
    });
  }

  return apontamentos;
}

/** Resumo para as travas do sistema. */
export function pendenciasObrigatorias(situacoes: SituacaoCertidao[]): string[] {
  return situacoes
    .filter((s) => s.exigencia.obrigatoria && s.estado !== "OK" && s.estado !== "APONTAMENTO")
    .map((s) => s.exigencia.tipo.nome);
}
