/**
 * Documentos de compliance: declaração de origem de recursos e ficha KYC.
 *
 * São eles que sustentam a operação numa fiscalização e dão à plataforma a
 * credibilidade que a diferencia de uma troca de arquivos por WhatsApp.
 */
import { clausulaTitulo, espaco, item, paragrafo, paragrafoRico, tabela } from "../base";
import { endereco, identificacao, nomeCurto, qualificar, qualificarComApelido } from "../qualificacao";
import { campo, campoSim, descreverAtivo, parte, partesPor, type ContextoDocumento } from "../contexto";
import type { MontagemDocumento } from "../montagem";
import { assinantesDe } from "./comum";
import { dataCurta, dataExtenso, moedaComExtenso } from "@/lib/formato";
import { formatarDocumento, formatarTelefone } from "@/lib/validacao";
import { PAPEIS, TIPOS_ATIVO } from "../catalogo";

// =====================================================================
// DECLARAÇÃO DE ORIGEM LÍCITA DE RECURSOS
// =====================================================================

export function gerarDeclaracaoOrigem(ctx: ContextoDocumento): MontagemDocumento {
  const declarante = parte(ctx, "CESSIONARIO") ?? parte(ctx, "INVESTIDOR") ?? parte(ctx, "CEDENTE");

  const origem = campo(ctx, "origemRecursos");
  const ehPep = campoSim(ctx, "pep", declarante?.pessoa.pep ?? false);
  const moedaOp = ((ctx.operacao?.moeda ?? "BRL") as "BRL" | "USD" | "EUR");
  const valor = ctx.operacao?.valorNegociado != null ? Number(ctx.operacao.valorNegociado) : null;

  const corpo = [];

  corpo.push(
    paragrafoRico(
      declarante
        ? `${qualificarComApelido(declarante.pessoa, "Declarante")}, DECLARA, sob as penas da lei, o quanto segue.`
        : "[DECLARANTE NÃO INFORMADO — cadastre a parte na operação]"
    )
  );

  corpo.push(clausulaTitulo("1. DA OPERAÇÃO"));
  corpo.push(
    paragrafo(
      `A presente declaração refere-se à operação relativa a ${descreverAtivo(ctx)}` +
        (valor != null ? `, no valor de ${moedaComExtenso(valor, moedaOp)}` : "") +
        "."
    )
  );

  corpo.push(clausulaTitulo("2. DA ORIGEM DOS RECURSOS"));
  corpo.push(
    paragrafo(
      origem ||
        "[ORIGEM DOS RECURSOS NÃO INFORMADA — este campo é obrigatório; descreva a atividade, o contrato ou o " +
          "patrimônio que deu origem aos valores]"
    )
  );
  corpo.push(
    paragrafo(
      "O DECLARANTE afirma que os recursos empregados nesta operação têm origem lícita e comprovável, decorrem de " +
        "atividade regular e não provêm, direta ou indiretamente, de qualquer das infrações penais previstas na " +
        "Lei nº 9.613, de 3 de março de 1998, com a redação da Lei nº 12.683/2012."
    )
  );

  corpo.push(clausulaTitulo("3. DAS DEMAIS DECLARAÇÕES"));
  corpo.push(paragrafo("O DECLARANTE afirma ainda que:"));
  corpo.push(
    paragrafo(
      "(a) atua em nome próprio e por sua exclusiva conta e risco, não representando interesses de terceiro oculto;"
    )
  );
  corpo.push(
    paragrafo(
      ehPep
        ? "(b) É pessoa exposta politicamente, ou a ela relacionada, nos termos da regulamentação aplicável, " +
            "comprometendo-se a prestar as informações complementares exigidas;"
        : "(b) não é pessoa exposta politicamente, nem cônjuge, companheiro ou parente até o segundo grau de pessoa " +
            "nessa condição, nem com ela mantém relação societária ou de representação;"
    )
  );
  corpo.push(
    paragrafo(
      "(c) não figura em listas restritivas nacionais ou internacionais de sanções, e comunicará imediatamente " +
        "qualquer alteração nas informações aqui prestadas;"
    )
  );
  corpo.push(
    paragrafo(
      "(d) autoriza a verificação das informações declaradas junto a fontes públicas e bureaus de dados, para as " +
        "finalidades de prevenção à lavagem de dinheiro e de análise de contraparte, nos termos do art. 7º, II e " +
        "IX, da Lei nº 13.709/2018;"
    )
  );
  corpo.push(
    paragrafo(
      "(e) tem ciência de que a prestação de declaração falsa sujeita o declarante às sanções dos arts. 299 do " +
        "Código Penal e 1º da Lei nº 9.613/1998."
    )
  );

  return {
    titulo: "Declaração de Origem Lícita de Recursos",
    subtitulo: "Lei nº 9.613/1998 — Prevenção à lavagem de dinheiro",
    corpo,
    assinantes: declarante
      ? [
          {
            nome: nomeCurto(declarante.pessoa),
            identificacao: identificacao(declarante.pessoa),
            papel: "Declarante",
          },
        ]
      : [],
    comTestemunhas: false,
  };
}

// =====================================================================
// FICHA KYC — CONHEÇA SEU CLIENTE
// =====================================================================

export function gerarFichaKyc(ctx: ContextoDocumento): MontagemDocumento {
  const finalidade = campo(ctx, "finalidade", "Análise de contraparte em operação de cessão de ativos");

  // A ficha cobre todas as partes cadastradas na operação.
  const todas = ctx.operacao?.partes ?? [];

  const corpo = [];

  corpo.push(
    paragrafo(
      `Documento interno de identificação e análise de contraparte, elaborado em ${dataExtenso(ctx.agora)}. ` +
        `Finalidade: ${finalidade}.`
    )
  );

  if (ctx.operacao) {
    corpo.push(clausulaTitulo("1. OPERAÇÃO"));
    corpo.push(
      tabela(
        ["Item", "Descrição"],
        [
          ["Código", ctx.operacao.codigo],
          ["Título", ctx.operacao.titulo],
          ["Tipo de ativo", TIPOS_ATIVO[ctx.operacao.tipoAtivo] ?? ctx.operacao.tipoAtivo],
          [
            "Valor negociado",
            ctx.operacao.valorNegociado != null
              ? moedaComExtenso(Number(ctx.operacao.valorNegociado), (ctx.operacao.moeda ?? "BRL") as "BRL")
              : "não informado",
          ],
        ]
      )
    );
    corpo.push(espaco(200));
  }

  corpo.push(clausulaTitulo("2. PARTES IDENTIFICADAS"));

  if (todas.length === 0) {
    corpo.push(paragrafo("[NENHUMA PARTE CADASTRADA NA OPERAÇÃO]"));
  }

  for (const p of todas) {
    const pessoa = p.pessoa;
    corpo.push(
      paragrafoRico(`**${nomeCurto(pessoa)}** — ${PAPEIS[p.papel as keyof typeof PAPEIS] ?? p.papel}`)
    );

    const linhas: string[][] = [
      ["Tipo", pessoa.tipo === "PJ" ? "Pessoa jurídica" : "Pessoa física"],
      ["Documento", formatarDocumento(pessoa.documento) || "não informado"],
    ];

    if (pessoa.tipo === "PF") {
      linhas.push(["RG", pessoa.rg ? `${pessoa.rg} ${pessoa.orgaoEmissor ?? ""}`.trim() : "não informado"]);
      linhas.push(["Nascimento", pessoa.dataNascimento ? dataCurta(pessoa.dataNascimento) : "não informado"]);
      linhas.push(["Profissão", pessoa.profissao ?? "não informada"]);
      linhas.push(["Estado civil", pessoa.estadoCivil ?? "não informado"]);
    } else {
      linhas.push(["Inscrição estadual", pessoa.inscricaoEstadual ?? "não informada"]);
      linhas.push([
        "Representante",
        pessoa.repNome
          ? `${pessoa.repNome} (${formatarDocumento(pessoa.repCpf) || "CPF não informado"})${pessoa.repCargo ? ` — ${pessoa.repCargo}` : ""}`
          : "não informado",
      ]);
    }

    linhas.push(["Endereço", endereco(pessoa, "").trim() || "não informado"]);
    linhas.push(["Contato", [pessoa.email, formatarTelefone(pessoa.telefone)].filter(Boolean).join(" · ") || "não informado"]);
    linhas.push(["Pessoa exposta politicamente", pessoa.pep ? `Sim — ${pessoa.pepDetalhe ?? "sem detalhamento"}` : "Não"]);
    linhas.push([
      "Situação na auditoria",
      pessoa.situacaoCompliance
        ? `${rotuloCompliance(pessoa.situacaoCompliance)}${pessoa.complianceEm ? ` (em ${dataCurta(pessoa.complianceEm)})` : ""}`
        : "não auditada",
    ]);

    corpo.push(tabela(["Campo", "Informação"], linhas));
    corpo.push(espaco(240));
  }

  corpo.push(clausulaTitulo("3. DECLARAÇÃO DO RESPONSÁVEL"));
  corpo.push(
    paragrafo(
      `Declaro que as informações acima foram coletadas junto às próprias partes e conferidas contra os documentos ` +
        `apresentados e as consultas registradas no sistema, na data de ${dataExtenso(ctx.agora)}. As consultas a ` +
        "fontes públicas e a bureaus de dados ficam arquivadas e podem ser reapresentadas a qualquer tempo."
    )
  );
  corpo.push(
    paragrafo(
      "Os dados pessoais aqui tratados observam a Lei nº 13.709/2018, restringindo-se seu uso à finalidade " +
        "declarada e ao cumprimento de obrigação legal (arts. 7º, II e IX, e 9º).",
      { italico: true }
    )
  );

  return {
    titulo: "Ficha de Conheça Seu Cliente",
    subtitulo: "Know Your Customer — KYC",
    corpo,
    assinantes: [
      {
        nome: ctx.usuario.nome,
        identificacao: ctx.organizacao.nome,
        papel: "Responsável pela análise",
      },
    ],
    comTestemunhas: false,
  };
}

function rotuloCompliance(valor: string): string {
  return (
    {
      SEM_APONTAMENTO: "Sem apontamentos",
      ATENCAO: "Pontos de atenção",
      RESTRICAO: "Com restrições",
    }[valor] ?? valor
  );
}
