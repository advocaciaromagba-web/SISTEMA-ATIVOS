/**
 * Leitura de documentos por inteligência artificial.
 *
 * O operador envia RG, contrato social, cartão CNPJ, comprovante de endereço,
 * ofício requisitório ou certidão, e o sistema devolve os campos preenchidos
 * para conferência.
 *
 * A REGRA VALE AQUI COM FORÇA TOTAL: **a IA sugere, a pessoa confirma**. Nada
 * do que sai daqui é gravado sozinho. Cada campo volta com o grau de confiança
 * e com a indicação de qual documento o originou, e a tela mostra os dois lado
 * a lado antes de qualquer gravação.
 *
 * E o que é conferível em código é conferido em código: dígito verificador de
 * CPF e CNPJ, número de processo do CNJ, formato de data e de CEP. Um modelo
 * de linguagem trocando um dígito de CPF é o erro mais caro que este sistema
 * pode cometer, porque ele vai parar dentro de uma escritura de cessão.
 */
import { perguntarJson, type BlocoConteudo } from "./claude";
import {
  formatarNumeroProcessoCnj,
  somenteAlfanumerico,
  somenteNumeros,
  validarCnpj,
  validarCpf,
  validarNumeroProcessoCnj,
} from "@/lib/validacao";

export const LIMITE_ARQUIVO = 10 * 1024 * 1024; // 10 MB por arquivo
export const LIMITE_TOTAL = 25 * 1024 * 1024; // folga sobre o limite da API
export const MAXIMO_ARQUIVOS = 6;

export const TIPOS_ACEITOS = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export type Confianca = "ALTA" | "MEDIA" | "BAIXA";

export type CampoLido = {
  valor: string;
  confianca: Confianca;
  /** De que documento saiu, em linguagem simples: "RG", "contrato social". */
  origem: string;
  /** Preenchido pela conferência em código, quando o valor não passa. */
  problema?: string;
};

export type ResultadoLeitura = {
  campos: Record<string, CampoLido>;
  /** O que a IA reconheceu no que foi enviado. */
  documentosReconhecidos: string[];
  /** Avisos para quem confere: documento em nome de terceiro, rasura, corte. */
  avisos: string[];
};

// ---------------------------------------------------------------------
// Perfis de leitura
// ---------------------------------------------------------------------

export type Perfil = "PESSOA_PF" | "PESSOA_PJ" | "OPERACAO_PRECATORIO" | "CERTIDAO";

type DefinicaoCampo = { chave: string; descricao: string };

const CAMPOS: Record<Perfil, DefinicaoCampo[]> = {
  PESSOA_PF: [
    { chave: "nome", descricao: "nome civil completo, sem abreviações" },
    { chave: "documento", descricao: "CPF, somente números" },
    { chave: "rg", descricao: "número do RG como impresso" },
    { chave: "orgaoEmissor", descricao: "órgão emissor do RG e UF, ex: SSP/SP" },
    { chave: "dataNascimento", descricao: "data de nascimento no formato AAAA-MM-DD" },
    { chave: "nacionalidade", descricao: "nacionalidade, ex: brasileiro(a)" },
    { chave: "estadoCivil", descricao: "estado civil por extenso" },
    { chave: "profissao", descricao: "profissão declarada" },
    { chave: "email", descricao: "endereço de e-mail" },
    { chave: "telefone", descricao: "telefone com DDD, somente números" },
    { chave: "enderecoRua", descricao: "logradouro, sem o número" },
    { chave: "enderecoNumero", descricao: "número do imóvel" },
    { chave: "enderecoComplemento", descricao: "complemento, se houver" },
    { chave: "enderecoBairro", descricao: "bairro" },
    { chave: "enderecoCidade", descricao: "cidade" },
    { chave: "enderecoUf", descricao: "sigla do estado, duas letras" },
    { chave: "enderecoCep", descricao: "CEP, somente números" },
  ],

  PESSOA_PJ: [
    { chave: "nome", descricao: "razão social completa" },
    { chave: "nomeFantasia", descricao: "nome fantasia, se houver" },
    { chave: "documento", descricao: "CNPJ, somente números e letras maiúsculas" },
    { chave: "inscricaoEstadual", descricao: "inscrição estadual, ou 'isento'" },
    { chave: "email", descricao: "e-mail da empresa" },
    { chave: "telefone", descricao: "telefone com DDD, somente números" },
    { chave: "enderecoRua", descricao: "logradouro da sede, sem o número" },
    { chave: "enderecoNumero", descricao: "número" },
    { chave: "enderecoComplemento", descricao: "complemento, se houver" },
    { chave: "enderecoBairro", descricao: "bairro" },
    { chave: "enderecoCidade", descricao: "cidade" },
    { chave: "enderecoUf", descricao: "sigla do estado" },
    { chave: "enderecoCep", descricao: "CEP, somente números" },
    { chave: "repNome", descricao: "nome completo de quem representa e assina pela empresa" },
    { chave: "repCpf", descricao: "CPF do representante, somente números" },
    { chave: "repRg", descricao: "RG do representante" },
    { chave: "repCargo", descricao: "cargo do representante, ex: sócio administrador, diretor" },
    { chave: "repNacionalidade", descricao: "nacionalidade do representante" },
    { chave: "repEstadoCivil", descricao: "estado civil do representante" },
    { chave: "repProfissao", descricao: "profissão do representante" },
  ],

  OPERACAO_PRECATORIO: [
    { chave: "numeroPrecatorio", descricao: "número do precatório ou do ofício requisitório" },
    { chave: "numeroProcesso", descricao: "número do processo de origem no padrão CNJ, somente números" },
    { chave: "tribunal", descricao: "tribunal onde o precatório está inscrito, por extenso" },
    { chave: "enteDevedor", descricao: "entidade devedora, por extenso" },
    { chave: "esferaDevedor", descricao: "FEDERAL, ESTADUAL, MUNICIPAL ou AUTARQUIA" },
    { chave: "naturezaCredito", descricao: "ALIMENTAR ou COMUM" },
    { chave: "anoOrcamentario", descricao: "ano do orçamento (LOA) em que está inscrito, quatro dígitos" },
    { chave: "valorFace", descricao: "valor total requisitado, somente números com ponto decimal" },
    { chave: "dataBaseValor", descricao: "data-base a que o valor se refere, AAAA-MM-DD" },
    { chave: "dataApresentacao", descricao: "data de apresentação do precatório ao tribunal, AAAA-MM-DD" },
    { chave: "beneficiario", descricao: "nome do credor/beneficiário do precatório" },
    { chave: "cpfBeneficiario", descricao: "CPF ou CNPJ do beneficiário, somente números" },
    {
      chave: "honorariosDestacados",
      descricao: "SIM se houve destaque de honorários em requisitório próprio, NAO se não houve",
    },
    { chave: "valorHonorarios", descricao: "valor dos honorários destacados, se constar" },
  ],

  CERTIDAO: [
    { chave: "orgaoEmissor", descricao: "órgão que emitiu a certidão, por extenso" },
    { chave: "numero", descricao: "número ou código de autenticidade da certidão" },
    { chave: "emitidaEm", descricao: "data de emissão, AAAA-MM-DD" },
    { chave: "validaAte", descricao: "data de validade, AAAA-MM-DD, se constar" },
    { chave: "nomePesquisado", descricao: "nome da pessoa ou empresa a que a certidão se refere" },
    { chave: "documentoPesquisado", descricao: "CPF ou CNPJ pesquisado, somente números" },
    { chave: "resultado", descricao: "NADA_CONSTA se nada consta; CONSTA se há apontamento" },
    {
      chave: "natureza",
      descricao:
        "quando CONSTA: PROCESSO_EM_CURSO, CONDENACAO_TRANSITADA, MANDADO_ABERTO, MEDIDA_CONSTRITIVA ou OUTRO",
    },
    { chave: "apontamento", descricao: "quando CONSTA: descrição do que consta, com números de processo" },
  ],
};

const CONTEXTO: Record<Perfil, string> = {
  PESSOA_PF:
    "Você está lendo documentos de identificação de uma pessoa física que vai figurar como parte em um contrato " +
    "de cessão de crédito. Os dados vão para a qualificação do contrato, então precisam ser exatos.",
  PESSOA_PJ:
    "Você está lendo documentos de uma empresa que vai figurar como parte em um contrato de cessão de crédito. " +
    "Preste atenção especial a quem tem poder de assinar pela empresa — é a informação que mais falta e a que " +
    "mais anula contrato.",
  OPERACAO_PRECATORIO:
    "Você está lendo um ofício requisitório, uma certidão de precatório ou documento equivalente. O ANO " +
    "ORÇAMENTÁRIO (LOA) é a informação mais importante: é ela que diz quando o precatório será pago.",
  CERTIDAO:
    "Você está lendo uma certidão (antecedentes criminais, distribuição, protesto, débitos). O que mais importa " +
    "é se ela diz que NADA CONSTA ou se traz algum apontamento, e a data de emissão e de validade.",
};

const INSTRUCAO_BASE = `Você extrai dados de documentos brasileiros para um sistema de intermediação de ativos.

REGRAS QUE NÃO PODEM SER QUEBRADAS:
1. Extraia SOMENTE o que está escrito nos documentos. Nunca deduza, nunca complete, nunca "corrija" um dado para o que parece mais provável.
2. Se um campo não aparece nos documentos, NÃO o inclua na resposta. Campo ausente é melhor que campo inventado.
3. Números — CPF, CNPJ, RG, número de processo, valores, datas — devem ser copiados dígito a dígito. Se algum estiver ilegível, borrado ou cortado, não chute: marque confiança BAIXA e escreva no aviso qual parte não deu para ler.
4. Para cada campo, informe a confiança:
   ALTA  = está impresso com clareza e você tem certeza de cada caractere
   MEDIA = está legível mas há alguma ambiguidade de formato ou interpretação
   BAIXA = está parcialmente ilegível, cortado, ou você teve que interpretar
5. Informe em "origem" de qual documento o dado saiu, em linguagem simples: "RG", "contrato social", "cartão CNPJ", "comprovante de endereço", "ofício requisitório", "certidão".
6. Avise em "avisos" tudo que quem confere precisa saber: comprovante em nome de terceiro, documento vencido, rasura, página faltando, divergência entre documentos, foto cortada.
7. Datas sempre no formato AAAA-MM-DD. Valores sempre com ponto decimal e sem separador de milhar (ex: 1500000.00).

Responda SOMENTE com um objeto JSON, sem texto antes ou depois:
{
  "campos": {
    "nomeDoCampo": { "valor": "...", "confianca": "ALTA|MEDIA|BAIXA", "origem": "..." }
  },
  "documentosReconhecidos": ["RG", "comprovante de endereço"],
  "avisos": ["..."]
}`;

function montarInstrucao(perfil: Perfil): string {
  const lista = CAMPOS[perfil].map((c) => `  - ${c.chave}: ${c.descricao}`).join("\n");
  return `${INSTRUCAO_BASE}\n\n${CONTEXTO[perfil]}\n\nCampos a extrair (inclua apenas os que encontrar):\n${lista}`;
}

// ---------------------------------------------------------------------
// Conferência em código
// ---------------------------------------------------------------------

const CAMPOS_CPF = ["documento", "repCpf", "cpfBeneficiario", "documentoPesquisado"];

/**
 * Confere o que dá para conferir sem depender da IA.
 *
 * Não descarta o campo errado: marca o problema e deixa o operador ver. Um CPF
 * que não fecha pode ser erro de leitura da IA ou erro do próprio documento —
 * quem decide é quem está olhando os dois.
 */
export function conferirCampos(perfil: Perfil, campos: Record<string, CampoLido>): Record<string, CampoLido> {
  const conferidos: Record<string, CampoLido> = {};

  for (const [chave, campo] of Object.entries(campos)) {
    const valor = (campo.valor ?? "").toString().trim();
    if (!valor) continue;

    const saida: CampoLido = { ...campo, valor };

    // ----- CPF e CNPJ -----
    if (CAMPOS_CPF.includes(chave)) {
      const limpo = somenteAlfanumerico(valor);

      if (chave === "documento" && perfil === "PESSOA_PJ") {
        saida.valor = limpo;
        if (!validarCnpj(limpo)) {
          saida.problema = "O CNPJ lido não passa na conferência dos dígitos. Confira no documento.";
          saida.confianca = "BAIXA";
        }
      } else if (limpo.length === 14) {
        saida.valor = limpo;
        if (!validarCnpj(limpo)) {
          saida.problema = "O CNPJ lido não passa na conferência dos dígitos.";
          saida.confianca = "BAIXA";
        }
      } else {
        saida.valor = somenteNumeros(valor);
        if (!validarCpf(saida.valor)) {
          saida.problema = "O CPF lido não passa na conferência dos dígitos. Confira no documento.";
          saida.confianca = "BAIXA";
        }
      }
    }

    // ----- número de processo -----
    if (chave === "numeroProcesso") {
      const limpo = somenteNumeros(valor);
      saida.valor = limpo;
      if (limpo.length === 20 && !validarNumeroProcessoCnj(limpo)) {
        saida.problema =
          "O número de processo não fecha na conferência do CNJ. Pode ser erro de leitura — ou número inválido.";
        saida.confianca = "BAIXA";
      } else if (limpo.length !== 20) {
        saida.problema = `Número com ${limpo.length} dígitos; o padrão do CNJ tem 20.`;
        saida.confianca = "BAIXA";
      } else {
        saida.valor = limpo;
      }
    }

    // ----- datas -----
    if (/^data|Em$|^emitidaEm$|^validaAte$/.test(chave) || chave === "dataNascimento") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        saida.problema = "Data em formato inesperado. Confira antes de aplicar.";
        saida.confianca = "BAIXA";
      } else {
        const d = new Date(`${valor}T12:00:00Z`);
        const ano = Number(valor.slice(0, 4));
        if (Number.isNaN(d.getTime()) || ano < 1900 || ano > new Date().getFullYear() + 30) {
          saida.problema = "Data fora de um intervalo plausível.";
          saida.confianca = "BAIXA";
        }
      }
    }

    // ----- CEP, UF, telefone -----
    if (chave === "enderecoCep") {
      saida.valor = somenteNumeros(valor);
      if (saida.valor.length !== 8) {
        saida.problema = "CEP não tem 8 dígitos.";
        saida.confianca = "BAIXA";
      }
    }

    if (chave === "enderecoUf") {
      saida.valor = valor.toUpperCase().slice(0, 2);
      if (!/^[A-Z]{2}$/.test(saida.valor)) {
        saida.problema = "UF deve ter duas letras.";
        saida.confianca = "BAIXA";
      }
    }

    if (chave === "telefone") saida.valor = somenteNumeros(valor);

    // ----- ano orçamentário -----
    if (chave === "anoOrcamentario") {
      const ano = Number(somenteNumeros(valor));
      saida.valor = String(ano);
      const atual = new Date().getFullYear();
      if (!ano || ano < 1990 || ano > atual + 15) {
        saida.problema = "Ano orçamentário fora de um intervalo plausível.";
        saida.confianca = "BAIXA";
      }
    }

    conferidos[chave] = saida;
  }

  return conferidos;
}

/** Rótulo amigável de cada campo, para a tela de conferência. */
export function rotuloDoCampo(perfil: Perfil, chave: string): string {
  const rotulos: Record<string, string> = {
    nome: "Nome / razão social",
    nomeFantasia: "Nome fantasia",
    documento: "CPF / CNPJ",
    rg: "RG",
    orgaoEmissor: "Órgão emissor",
    inscricaoEstadual: "Inscrição estadual",
    dataNascimento: "Data de nascimento",
    nacionalidade: "Nacionalidade",
    estadoCivil: "Estado civil",
    profissao: "Profissão",
    email: "E-mail",
    telefone: "Telefone",
    enderecoRua: "Logradouro",
    enderecoNumero: "Número",
    enderecoComplemento: "Complemento",
    enderecoBairro: "Bairro",
    enderecoCidade: "Cidade",
    enderecoUf: "UF",
    enderecoCep: "CEP",
    repNome: "Representante",
    repCpf: "CPF do representante",
    repRg: "RG do representante",
    repCargo: "Cargo",
    repNacionalidade: "Nacionalidade do representante",
    repEstadoCivil: "Estado civil do representante",
    repProfissao: "Profissão do representante",
    numeroPrecatorio: "Número do precatório",
    numeroProcesso: "Processo de origem",
    tribunal: "Tribunal",
    enteDevedor: "Entidade devedora",
    esferaDevedor: "Esfera",
    naturezaCredito: "Natureza do crédito",
    anoOrcamentario: "Ano orçamentário (LOA)",
    valorFace: "Valor de face",
    dataBaseValor: "Data-base do valor",
    dataApresentacao: "Apresentação do precatório",
    beneficiario: "Beneficiário",
    cpfBeneficiario: "CPF/CNPJ do beneficiário",
    honorariosDestacados: "Honorários destacados",
    valorHonorarios: "Valor dos honorários",
    numero: "Número da certidão",
    emitidaEm: "Emitida em",
    validaAte: "Válida até",
    nomePesquisado: "Nome pesquisado",
    documentoPesquisado: "Documento pesquisado",
    resultado: "Resultado",
    natureza: "Natureza do apontamento",
    apontamento: "O que consta",
  };

  void perfil;
  return rotulos[chave] ?? chave;
}

// ---------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------

export type ArquivoParaLer = { nome: string; tipo: string; conteudo: Buffer };

export async function lerDocumentos(
  perfil: Perfil,
  arquivos: ArquivoParaLer[]
): Promise<{ ok: true; leitura: ResultadoLeitura } | { ok: false; erro: string }> {
  if (arquivos.length === 0) return { ok: false, erro: "Envie ao menos um arquivo." };
  if (arquivos.length > MAXIMO_ARQUIVOS) {
    return { ok: false, erro: `Envie no máximo ${MAXIMO_ARQUIVOS} arquivos por vez.` };
  }

  const total = arquivos.reduce((soma, a) => soma + a.conteudo.length, 0);
  if (total > LIMITE_TOTAL) {
    return { ok: false, erro: "Os arquivos somam mais que o limite. Envie menos arquivos por vez." };
  }

  const blocos: BlocoConteudo[] = [];

  for (const arquivo of arquivos) {
    if (!TIPOS_ACEITOS.includes(arquivo.tipo)) {
      return { ok: false, erro: `"${arquivo.nome}": envie PDF ou imagem (JPG, PNG, WEBP).` };
    }
    if (arquivo.conteudo.length > LIMITE_ARQUIVO) {
      return { ok: false, erro: `"${arquivo.nome}" passa de 10 MB.` };
    }

    // O nome do arquivo ajuda o modelo a saber o que está olhando.
    blocos.push({ type: "text", text: `Arquivo: ${arquivo.nome}` });

    if (arquivo.tipo === "application/pdf") {
      blocos.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: arquivo.conteudo.toString("base64") },
      });
    } else {
      blocos.push({
        type: "image",
        source: { type: "base64", media_type: arquivo.tipo, data: arquivo.conteudo.toString("base64") },
      });
    }
  }

  blocos.push({
    type: "text",
    text: "Extraia os campos pedidos destes documentos, seguindo as regras.",
  });

  const resposta = await perguntarJson<{
    campos?: Record<string, { valor?: string; confianca?: string; origem?: string }>;
    documentosReconhecidos?: string[];
    avisos?: string[];
  }>({ instrucao: montarInstrucao(perfil), conteudo: blocos, maxTokens: 4000 });

  if (!resposta.ok) return { ok: false, erro: resposta.erro };

  const permitidos = new Set(CAMPOS[perfil].map((c) => c.chave));
  const brutos: Record<string, CampoLido> = {};

  for (const [chave, campo] of Object.entries(resposta.dados.campos ?? {})) {
    // Campo que não está no perfil é descartado: a IA às vezes inventa chave,
    // e chave inventada não pode chegar perto do formulário.
    if (!permitidos.has(chave)) continue;
    const valor = (campo?.valor ?? "").toString().trim();
    if (!valor) continue;

    brutos[chave] = {
      valor,
      confianca: ["ALTA", "MEDIA", "BAIXA"].includes(campo?.confianca ?? "")
        ? (campo!.confianca as Confianca)
        : "MEDIA",
      origem: (campo?.origem ?? "documento enviado").toString().trim(),
    };
  }

  return {
    ok: true,
    leitura: {
      campos: conferirCampos(perfil, brutos),
      documentosReconhecidos: Array.isArray(resposta.dados.documentosReconhecidos)
        ? resposta.dados.documentosReconhecidos.filter((d) => typeof d === "string")
        : [],
      avisos: Array.isArray(resposta.dados.avisos)
        ? resposta.dados.avisos.filter((a) => typeof a === "string")
        : [],
    },
  };
}

/** Mostra o número de processo formatado na tela de conferência. */
export function valorParaExibir(chave: string, valor: string): string {
  if (chave === "numeroProcesso" && valor.length === 20) return formatarNumeroProcessoCnj(valor);
  return valor;
}
