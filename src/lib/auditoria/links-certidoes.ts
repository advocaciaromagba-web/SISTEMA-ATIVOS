/**
 * Onde tirar cada certidão, com o caminho mais curto possível.
 *
 * Testadas em agosto de 2026: CNDT, CENPROT, e-SAJ dos tribunais e a consulta
 * de improbidade do CNJ exigem captcha; a Polícia Federal está atrás de
 * proteção anti-robô. Ou seja, emitir automaticamente está fora de alcance
 * legítimo. O que dá para fazer — e é o que este arquivo resolve — é encurtar
 * o caminho: link para a página certa (não para a home do tribunal), o número
 * do documento pronto para colar, e a instrução do que clicar lá dentro.
 *
 * Depois é só arrastar o PDF de volta: a leitura por IA preenche resultado,
 * datas e número sozinha.
 *
 * SOBRE OS ENDEREÇOS: muitos tribunais usam o sistema e-SAJ, cujo caminho é
 * previsível. Para os que usam sistema próprio — e cujo endereço muda com
 * frequência — a busca no site do tribunal é mais confiável que um link fixo
 * que quebra sem avisar.
 */

/** Tribunais que usam o e-SAJ, onde o caminho da certidão é sempre o mesmo. */
const ESAJ: Record<string, string> = {
  SP: "esaj.tjsp.jus.br",
  SC: "esaj.tjsc.jus.br",
  BA: "esaj.tjba.jus.br",
  CE: "esaj.tjce.jus.br",
  MS: "esaj.tjms.jus.br",
  AC: "esaj.tjac.jus.br",
  AL: "www2.tjal.jus.br",
  AM: "consultasaj.tjam.jus.br",
};

/** Domínio de cada tribunal de justiça, para a busca dirigida. */
const DOMINIO_TJ: Record<string, string> = {
  AC: "tjac.jus.br", AL: "tjal.jus.br", AP: "tjap.jus.br", AM: "tjam.jus.br",
  BA: "tjba.jus.br", CE: "tjce.jus.br", DF: "tjdft.jus.br", ES: "tjes.jus.br",
  GO: "tjgo.jus.br", MA: "tjma.jus.br", MT: "tjmt.jus.br", MS: "tjms.jus.br",
  MG: "tjmg.jus.br", PA: "tjpa.jus.br", PB: "tjpb.jus.br", PR: "tjpr.jus.br",
  PE: "tjpe.jus.br", PI: "tjpi.jus.br", RJ: "tjrj.jus.br", RN: "tjrn.jus.br",
  RS: "tjrs.jus.br", RO: "tjro.jus.br", RR: "tjrr.jus.br", SC: "tjsc.jus.br",
  SP: "tjsp.jus.br", SE: "tjse.jus.br", TO: "tjto.jus.br",
};

/** Tribunal Regional Federal de cada estado. */
const TRF_POR_UF: Record<string, { numero: number; dominio: string }> = {
  AC: { numero: 1, dominio: "trf1.jus.br" }, AM: { numero: 1, dominio: "trf1.jus.br" },
  AP: { numero: 1, dominio: "trf1.jus.br" }, BA: { numero: 1, dominio: "trf1.jus.br" },
  DF: { numero: 1, dominio: "trf1.jus.br" }, GO: { numero: 1, dominio: "trf1.jus.br" },
  MA: { numero: 1, dominio: "trf1.jus.br" }, MG: { numero: 6, dominio: "trf6.jus.br" },
  MT: { numero: 1, dominio: "trf1.jus.br" }, PA: { numero: 1, dominio: "trf1.jus.br" },
  PI: { numero: 1, dominio: "trf1.jus.br" }, RO: { numero: 1, dominio: "trf1.jus.br" },
  RR: { numero: 1, dominio: "trf1.jus.br" }, TO: { numero: 1, dominio: "trf1.jus.br" },
  ES: { numero: 2, dominio: "trf2.jus.br" }, RJ: { numero: 2, dominio: "trf2.jus.br" },
  MS: { numero: 3, dominio: "trf3.jus.br" }, SP: { numero: 3, dominio: "trf3.jus.br" },
  PR: { numero: 4, dominio: "trf4.jus.br" }, RS: { numero: 4, dominio: "trf4.jus.br" },
  SC: { numero: 4, dominio: "trf4.jus.br" },
  AL: { numero: 5, dominio: "trf5.jus.br" }, CE: { numero: 5, dominio: "trf5.jus.br" },
  PB: { numero: 5, dominio: "trf5.jus.br" }, PE: { numero: 5, dominio: "trf5.jus.br" },
  RN: { numero: 5, dominio: "trf5.jus.br" }, SE: { numero: 5, dominio: "trf5.jus.br" },
};

/** Busca dirigida ao site do órgão — não quebra quando o tribunal muda o caminho. */
function buscarNoSite(dominio: string, termo: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${termo} site:${dominio}`)}`;
}

export type Acesso = {
  /** Endereço para abrir. */
  url: string;
  /** true quando é a página exata; false quando é busca dirigida ao site. */
  direto: boolean;
  /** O que fazer na página, em uma frase. */
  instrucao: string;
  /** Precisa resolver captcha? Serve para preparar quem vai clicar. */
  captcha: boolean;
};

/**
 * Devolve o caminho para tirar a certidão, considerando o estado da parte.
 *
 * `uf` vem do endereço cadastrado. Sem ela, as certidões estaduais caem no
 * portal nacional correspondente, quando existe.
 */
export function acessoDaCertidao(chave: string, uf: string | null, documento: string | null): Acesso | null {
  const estado = (uf ?? "").toUpperCase();
  const doc = documento ?? "";

  switch (chave) {
    case "ANTECEDENTES_PF":
      return {
        url: "https://servicos.pf.gov.br/epol-sinic-publico/",
        direto: true,
        instrucao:
          "Preencha nome completo, filiação, data de nascimento e CPF. A certidão sai na hora, em PDF. " +
          "Se der divergência de dados, é preciso comparecer a uma unidade da PF.",
        captcha: true,
      };

    case "BNMP_MANDADO":
      return {
        url: "https://portalbnmp.cnj.jus.br/",
        direto: true,
        instrucao:
          "Escolha 'Consulta de peças', informe o nome ou o CPF e pesquise. Imprima o resultado em PDF mesmo " +
          "quando nada constar — é ele que prova que a consulta foi feita.",
        captcha: true,
      };

    case "IMPROBIDADE_CNJ":
      return {
        url: "https://www.cnj.jus.br/improbidade_adm/consultar_requerido.php",
        direto: true,
        instrucao: `Informe o CPF/CNPJ${doc ? ` (${doc})` : ""}, resolva o captcha e emita a certidão.`,
        captcha: true,
      };

    case "CNDT":
      return {
        url: "https://cndt-certidao.tst.jus.br/inicio.faces",
        direto: true,
        instrucao: "Informe o CPF/CNPJ, resolva o captcha e clique em 'Emitir certidão'. Sai em PDF na hora.",
        captcha: true,
      };

    case "CND_FEDERAL":
      return {
        url: "https://servicos.receita.fazenda.gov.br/servicos/certidaointernet/",
        direto: true,
        instrucao:
          "Escolha pessoa física ou jurídica, informe o documento e emita. Se houver pendência, o sistema " +
          "informa qual — e ela precisa ser resolvida antes da habilitação no tribunal.",
        captcha: true,
      };

    case "PROTESTO":
      return {
        url: "https://site.cenprotnacional.org.br/consulta",
        direto: true,
        instrucao:
          "Consulta nacional por CPF/CNPJ. Alguns estados não participam da central — nesses casos, peça a " +
          "certidão diretamente aos cartórios da comarca de domicílio.",
        captcha: true,
      };

    case "DISTRIBUICAO_CRIMINAL_ESTADUAL":
    case "DISTRIBUICAO_CIVEL":
    case "FALENCIA_RECUPERACAO": {
      const tipo =
        chave === "DISTRIBUICAO_CRIMINAL_ESTADUAL"
          ? "criminal"
          : chave === "FALENCIA_RECUPERACAO"
            ? "de falência, recuperação judicial e concordata"
            : "cível e de execuções";

      if (!estado) {
        return {
          url: "https://www.cnj.jus.br/poder-judiciario/tribunais/",
          direto: false,
          instrucao:
            "Cadastre o endereço da parte para que o sistema aponte o tribunal certo. Sem a UF, é preciso " +
            "escolher o tribunal na lista do CNJ.",
          captcha: true,
        };
      }

      const esaj = ESAJ[estado];
      if (esaj) {
        return {
          url: `https://${esaj}/sco/abrirCadastro.do`,
          direto: true,
          instrucao:
            `Escolha o modelo de certidão ${tipo}, informe o documento da parte, resolva o captcha e emita. ` +
            "Guarde o PDF com o código de autenticidade.",
          captcha: true,
        };
      }

      const dominio = DOMINIO_TJ[estado];
      return {
        url: dominio
          ? buscarNoSite(dominio, `certidão de distribuição ${tipo}`)
          : "https://www.cnj.jus.br/poder-judiciario/tribunais/",
        direto: false,
        instrucao:
          `O Tribunal de Justiça de ${estado} usa sistema próprio, cujo endereço muda com frequência. ` +
          "A busca abre a página de certidões do próprio tribunal — procure por 'certidão de distribuição'.",
        captcha: true,
      };
    }

    case "DISTRIBUICAO_CRIMINAL_FEDERAL": {
      const trf = estado ? TRF_POR_UF[estado] : null;

      if (!trf) {
        return {
          url: "https://www.cjf.jus.br/cjf/tribunais-regionais-federais",
          direto: false,
          instrucao: "Cadastre a UF da parte para que o sistema aponte o TRF certo.",
          captcha: true,
        };
      }

      return {
        url: buscarNoSite(trf.dominio, "certidão de distribuição criminal"),
        direto: false,
        instrucao:
          `${estado} pertence ao TRF da ${trf.numero}ª Região. Procure por 'certidão de distribuição' e escolha ` +
          "a criminal. Algumas regiões emitem uma certidão única, cível e criminal.",
        captcha: true,
      };
    }

    case "OBJETO_E_PE":
      return {
        url: estado && DOMINIO_TJ[estado] ? buscarNoSite(DOMINIO_TJ[estado], "certidão de objeto e pé") : "",
        direto: false,
        instrucao:
          "Requerida na vara de origem, informando o número do processo. Muitos tribunais só emitem a pedido do " +
          "advogado constituído nos autos — quem tem procuração precisa solicitar.",
        captcha: false,
      };

    case "CERTIDAO_PRECATORIO":
      return {
        url: estado && DOMINIO_TJ[estado] ? buscarNoSite(DOMINIO_TJ[estado], "consulta precatório certidão") : "",
        direto: false,
        instrucao:
          "Setor de precatórios do tribunal onde o crédito está inscrito. É esta certidão que traz o ano " +
          "orçamentário (LOA), a ordem cronológica e as cessões já averbadas — informação que não existe em " +
          "nenhuma base aberta.",
        captcha: false,
      };

    default:
      return null;
  }
}
