/**
 * Preenchimento do cadastro a partir do CPF ou do CNPJ.
 *
 * É o caminho mais curto que existe: cola-se o documento e o cadastro se monta
 * sozinho, com dado oficial. Vale mais que a leitura de documento por imagem —
 * aqui não há interpretação, é o que consta na base da Receita.
 *
 * A saída usa o MESMO formato da leitura por inteligência artificial
 * (`CampoLido`), de propósito: a tela de conferência é a mesma, o operador
 * confere do mesmo jeito, e nada é gravado sem ele aprovar.
 *
 * DIFERENÇA ENTRE OS DOIS DOCUMENTOS:
 *  - CNPJ: a base é aberta. Vem razão social, endereço completo, situação,
 *    porte, atividade e o quadro societário inteiro.
 *  - CPF: a base NÃO é aberta. A Receita só responde com CPF mais data de
 *    nascimento, e por consulta paga. Sem a data, não há o que buscar.
 */
import { consultarReceita } from "@/lib/auditoria/fontes/receita";
import { chamar, infosimplesConfigurado } from "@/lib/auditoria/fontes/infosimples";
import { formatarCep, somenteAlfanumerico, somenteNumeros, validarCnpj, validarCpf } from "@/lib/validacao";
import type { CampoLido, ResultadoLeitura } from "@/lib/ia/leitura";

/** Monta um campo já no formato da tela de conferência. */
function campo(valor: string | null | undefined, origem: string, confianca: CampoLido["confianca"] = "ALTA"): CampoLido | null {
  const v = (valor ?? "").toString().trim();
  if (!v) return null;
  return { valor: v, confianca, origem };
}

// ---------------------------------------------------------------------
// Pessoa jurídica
// ---------------------------------------------------------------------

/**
 * Escolhe, no quadro societário, quem provavelmente assina pela empresa.
 *
 * A Receita não diz quem tem poder de assinar — diz quem é sócio e com que
 * qualificação. Administrador é o palpite mais defensável; sócio único também.
 * Vem como sugestão de confiança média, porque só o contrato social confirma.
 */
function sugerirRepresentante(
  socios: Array<{ nome: string; qualificacao: string | null }>
): { nome: string; cargo: string } | null {
  if (socios.length === 0) return null;

  const administrador = socios.find((s) => /administrador/i.test(s.qualificacao ?? ""));
  if (administrador) {
    return { nome: administrador.nome, cargo: administrador.qualificacao ?? "administrador" };
  }

  if (socios.length === 1) {
    return { nome: socios[0].nome, cargo: socios[0].qualificacao ?? "sócio" };
  }

  return null;
}

async function porCnpj(cnpj: string): Promise<{ ok: true; leitura: ResultadoLeitura } | { ok: false; erro: string }> {
  const consulta = await consultarReceita(cnpj);

  if (consulta.status === "CONCLUIDA" && !consulta.dados) {
    return { ok: false, erro: "CNPJ não encontrado na base da Receita Federal. Confira o número." };
  }

  if (!consulta.dados) {
    return { ok: false, erro: consulta.erro ?? "A Receita Federal não respondeu. Tente de novo em alguns instantes." };
  }

  const d = consulta.dados;
  const bruto = (consulta.resultado as { bruto?: Record<string, unknown> } | undefined)?.bruto ?? {};
  const texto = (chave: string) => {
    const v = bruto[chave];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };

  const campos: Record<string, CampoLido> = {};
  const juntar = (chave: string, valor: CampoLido | null) => {
    if (valor) campos[chave] = valor;
  };

  const origem = "Receita Federal";

  juntar("nome", campo(d.razaoSocial, origem));
  juntar("nomeFantasia", campo(d.nomeFantasia, origem));
  juntar("documento", campo(somenteAlfanumerico(cnpj), origem));
  juntar("email", campo(texto("email"), origem, "MEDIA"));

  // O telefone vem como DDD + número colados num campo só.
  juntar("telefone", campo(somenteNumeros(texto("ddd_telefone_1")), origem, "MEDIA"));

  juntar("enderecoRua", campo([texto("descricao_tipo_de_logradouro"), texto("logradouro")].filter(Boolean).join(" "), origem));
  juntar("enderecoNumero", campo(texto("numero"), origem));
  juntar("enderecoComplemento", campo(texto("complemento"), origem));
  juntar("enderecoBairro", campo(texto("bairro"), origem));
  juntar("enderecoCidade", campo(d.municipio, origem));
  juntar("enderecoUf", campo(d.uf, origem));
  juntar("enderecoCep", campo(somenteNumeros(texto("cep")), origem));

  const representante = sugerirRepresentante(d.socios);
  if (representante) {
    juntar("repNome", campo(representante.nome, `${origem} — quadro societário`, "MEDIA"));
    juntar("repCargo", campo(representante.cargo, `${origem} — quadro societário`, "MEDIA"));
  }

  // ----- avisos que mudam a decisão de quem cadastra -----
  const avisos: string[] = [];

  if (d.situacao && d.situacao.toUpperCase() !== "ATIVA") {
    avisos.push(
      `ATENÇÃO: esta empresa está com situação cadastral ${d.situacao}` +
        (d.motivoSituacao && d.motivoSituacao !== "SEM MOTIVO" ? ` (${d.motivoSituacao})` : "") +
        ". Empresa que não está ativa não contrata nem cede crédito com segurança."
    );
  }

  if (d.socios.length > 1 && !representante) {
    avisos.push(
      `A empresa tem ${d.socios.length} sócios e nenhum identificado como administrador. ` +
        "O representante precisa ser preenchido à mão, conforme o contrato social."
    );
  }

  if (d.capitalSocial != null && d.capitalSocial < 10000) {
    avisos.push(
      `Capital social declarado de R$ ${d.capitalSocial.toLocaleString("pt-BR")}. ` +
        "Guarde isso para a análise de capacidade de pagamento."
    );
  }

  if (d.dataAbertura) {
    const meses = (Date.now() - new Date(d.dataAbertura).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    if (meses < 24) {
      avisos.push(`Empresa constituída há menos de dois anos (${new Date(d.dataAbertura).toLocaleDateString("pt-BR")}).`);
    }
  }

  // Empresa grande tem dezenas de sócios; a lista inteira não cabe num aviso.
  const LIMITE_SOCIOS = 6;
  const nomes = d.socios.map((s) => s.nome);
  const socios =
    nomes.length === 0
      ? ""
      : nomes.length <= LIMITE_SOCIOS
        ? ` Quadro societário: ${nomes.join(", ")}.`
        : ` Quadro societário: ${nomes.slice(0, LIMITE_SOCIOS).join(", ")} e mais ${nomes.length - LIMITE_SOCIOS}.`;

  return {
    ok: true,
    leitura: {
      campos,
      documentosReconhecidos: [`Cadastro da Receita Federal — ${d.situacao ?? "situação não informada"}`],
      avisos: [...avisos, `Consulta feita direto na base oficial, sem interpretação.${socios}`],
    },
  };
}

// ---------------------------------------------------------------------
// Pessoa física
// ---------------------------------------------------------------------

async function porCpf(
  cpf: string,
  dataNascimento: string | null
): Promise<{ ok: true; leitura: ResultadoLeitura } | { ok: false; erro: string }> {
  if (!infosimplesConfigurado()) {
    return {
      ok: false,
      erro:
        "A base de CPF da Receita não é aberta: a consulta depende do serviço contratado. " +
        "Sem ele, envie os documentos da pessoa para leitura, ou preencha à mão.",
    };
  }

  if (!dataNascimento) {
    return {
      ok: false,
      erro:
        "A Receita só responde a consulta de CPF quando acompanhada da data de nascimento. " +
        "Informe a data e tente de novo.",
    };
  }

  // A Receita espera a data no formato brasileiro.
  const [ano, mes, dia] = dataNascimento.split("-");
  if (!ano || !mes || !dia) return { ok: false, erro: "Data de nascimento em formato inesperado." };

  const consulta = await chamar("receita-federal/cpf", {
    cpf: somenteNumeros(cpf),
    birthdate: `${dia}/${mes}/${ano}`,
  });

  if (!consulta.ok) {
    return { ok: false, erro: `A Receita não respondeu: ${consulta.erro}` };
  }

  const registro = (consulta.resposta.data ?? [])[0] as Record<string, unknown> | undefined;
  if (!registro) {
    return { ok: false, erro: "A consulta não devolveu dados para este CPF e data de nascimento." };
  }

  const texto = (...chaves: string[]) => {
    for (const c of chaves) {
      const v = registro[c];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return null;
  };

  const campos: Record<string, CampoLido> = {};
  const juntar = (chave: string, valor: CampoLido | null) => {
    if (valor) campos[chave] = valor;
  };

  const origem = "Receita Federal";

  juntar("nome", campo(texto("nome", "nome_completo"), origem));
  juntar("documento", campo(somenteNumeros(cpf), origem));
  juntar("dataNascimento", campo(dataNascimento, origem));

  const situacao = texto("situacao_cadastral", "situacao");
  const avisos: string[] = ["Consulta feita direto na base oficial, sem interpretação."];

  if (situacao && !/regular/i.test(situacao)) {
    avisos.push(
      `ATENÇÃO: o CPF está com situação "${situacao}". CPF irregular impede a habilitação em tribunal e a ` +
        "emissão de várias certidões."
    );
  }

  avisos.push(
    "A Receita não fornece endereço, estado civil nem profissão de pessoa física. Complete esses campos com os " +
      "documentos da pessoa — pode enviá-los para leitura logo acima."
  );

  return {
    ok: true,
    leitura: {
      campos,
      documentosReconhecidos: [`Cadastro de pessoa física — ${situacao ?? "situação não informada"}`],
      avisos,
    },
  };
}

// ---------------------------------------------------------------------
// Entrada
// ---------------------------------------------------------------------

export async function preencherPorDocumento(params: {
  documento: string;
  dataNascimento?: string | null;
}): Promise<{ ok: true; leitura: ResultadoLeitura; tipo: "PF" | "PJ" } | { ok: false; erro: string }> {
  const limpo = somenteAlfanumerico(params.documento);

  if (!limpo) return { ok: false, erro: "Informe o CPF ou o CNPJ." };

  if (limpo.length === 14) {
    if (!validarCnpj(limpo)) {
      return { ok: false, erro: "CNPJ inválido — os dígitos verificadores não fecham. Confira o número." };
    }
    const resultado = await porCnpj(limpo);
    return resultado.ok ? { ...resultado, tipo: "PJ" } : resultado;
  }

  if (limpo.length === 11) {
    if (!validarCpf(limpo)) {
      return { ok: false, erro: "CPF inválido — os dígitos verificadores não fecham. Confira o número." };
    }
    const resultado = await porCpf(limpo, params.dataNascimento ?? null);
    return resultado.ok ? { ...resultado, tipo: "PF" } : resultado;
  }

  return {
    ok: false,
    erro: `O documento informado tem ${limpo.length} caracteres. CPF tem 11 e CNPJ tem 14.`,
  };
}

/** Só para a tela saber se deve pedir a data de nascimento. */
export function ehCpf(documento: string): boolean {
  return somenteAlfanumerico(documento).length === 11;
}

export { formatarCep };
