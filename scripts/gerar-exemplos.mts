/**
 * Gera um jogo completo de documentos com dados de exemplo, para conferencia.
 *
 * Rode com:
 *   node --experimental-strip-types --import ./scripts/registrar.mjs scripts/gerar-exemplos.mts
 *
 * Nao toca no banco: monta as partes na memoria e escreve os .docx na pasta
 * exemplos/. Serve para revisar a redacao dos contratos sem cadastrar nada.
 */
import fs from "fs/promises";
import path from "path";
import type { Operacao, Organizacao, ParteOperacao, Pessoa, Usuario } from "@prisma/client";
import { gerarDocumento, documentosOrdenados } from "@/lib/documentos";
import type { ContextoDocumento } from "@/lib/documentos/contexto";
import { qualificar, identificacao } from "@/lib/documentos/qualificacao";

/**
 * Gera um jogo completo de documentos com dados de exemplo, para conferência.
 *
 * Fica atrás de uma chave no .env porque cria arquivos em disco e não exige
 * login — em produção, sem EXEMPLOS_LIBERADOS=1, responde 404 e pronto.
 */
export const dynamic = "force-dynamic";

const organizacao = {
  id: "org-exemplo",
  nome: "Mesa Norte Ativos",
  razaoSocial: "MESA NORTE INTERMEDIACAO DE ATIVOS LTDA",
  cnpj: "11222333000181",
  emailContato: "contato@mesanorte.com.br",
  telefone: "1133334444",
  enderecoRua: "Avenida Paulista",
  enderecoNumero: "1000",
  enderecoComplemento: "conjunto 142",
  enderecoBairro: "Bela Vista",
  enderecoCidade: "São Paulo",
  enderecoUf: "SP",
  enderecoCep: "01310100",
  logo: null,
  logoTipo: null,
  foroCidade: "São Paulo",
  foroUf: "SP",
  plano: "PROFISSIONAL",
  statusAssinatura: "ATIVA",
} as unknown as Organizacao;

const usuario = {
  id: "usr-exemplo",
  organizacaoId: "org-exemplo",
  nome: "Ricardo Alvares",
  email: "ricardo@mesanorte.com.br",
  papel: "DONO",
} as unknown as Usuario;

function pessoa(dados: Partial<Pessoa> & { id: string; nome: string; tipo: string }): Pessoa {
  return {
    nacionalidade: "brasileiro(a)",
    enderecoPais: "Brasil",
    pep: false,
    ...dados,
  } as unknown as Pessoa;
}

const cedente = pessoa({
  id: "p1",
  tipo: "PF",
  nome: "Antônio Carlos Ferreira Lima",
  documento: "52998224725",
  rg: "23.456.789-0",
  orgaoEmissor: "SSP/SP",
  estadoCivil: "casado(a)",
  profissao: "engenheiro civil",
  email: "antonio.lima@exemplo.com.br",
  telefone: "16999887766",
  enderecoRua: "Rua das Acácias",
  enderecoNumero: "245",
  enderecoBairro: "Centro",
  enderecoCidade: "Ribeirão Preto",
  enderecoUf: "SP",
  enderecoCep: "14010100",
});

const cessionario = pessoa({
  id: "p2",
  tipo: "PJ",
  nome: "Horizonte Capital Fundo de Investimento em Direitos Creditórios",
  documento: "12ABC34501DE35",
  inscricaoEstadual: "isento",
  email: "operacoes@horizontecapital.com.br",
  enderecoRua: "Rua Leopoldo Couto de Magalhães Júnior",
  enderecoNumero: "758",
  enderecoComplemento: "12º andar",
  enderecoBairro: "Itaim Bibi",
  enderecoCidade: "São Paulo",
  enderecoUf: "SP",
  enderecoCep: "04542000",
  repNome: "Marina Duarte Bezerra",
  repCpf: "11144477735",
  repRg: "34.567.890-1",
  repCargo: "diretora de operações",
  repNacionalidade: "brasileira",
  repEstadoCivil: "solteira",
  repProfissao: "administradora",
  repEmail: "marina.duarte@horizontecapital.com.br",
});

const intermediario1 = pessoa({
  id: "p3",
  tipo: "PJ",
  nome: "Mesa Norte Intermediação de Ativos Ltda",
  documento: "11222333000181",
  email: "contato@mesanorte.com.br",
  enderecoRua: "Avenida Paulista",
  enderecoNumero: "1000",
  enderecoBairro: "Bela Vista",
  enderecoCidade: "São Paulo",
  enderecoUf: "SP",
  enderecoCep: "01310100",
  repNome: "Ricardo Alvares",
  repCpf: "52998224725",
  repCargo: "sócio administrador",
  repNacionalidade: "brasileiro",
  repEstadoCivil: "casado",
  repProfissao: "empresário",
});

const intermediario2 = pessoa({
  id: "p4",
  tipo: "PF",
  nome: "Helena Prado Nogueira",
  documento: "11144477735",
  rg: "45.678.901-2",
  orgaoEmissor: "SSP/RJ",
  estadoCivil: "divorciada",
  profissao: "consultora financeira",
  email: "helena.prado@exemplo.com.br",
  enderecoRua: "Rua Barata Ribeiro",
  enderecoNumero: "410",
  enderecoComplemento: "apto 802",
  enderecoBairro: "Copacabana",
  enderecoCidade: "Rio de Janeiro",
  enderecoUf: "RJ",
  enderecoCep: "22040002",
});

function vinculo(
  pessoaVinculada: Pessoa,
  papel: string,
  extras: Partial<ParteOperacao> = {}
): ParteOperacao & { pessoa: Pessoa } {
  return {
    id: `parte-${pessoaVinculada.id}-${papel}`,
    operacaoId: "op-exemplo",
    pessoaId: pessoaVinculada.id,
    papel,
    comissaoPercentual: null,
    ordemCadeia: null,
    observacao: null,
    criadoEm: new Date(),
    ...extras,
    pessoa: pessoaVinculada,
  } as unknown as ParteOperacao & { pessoa: Pessoa };
}

const operacao = {
  id: "op-exemplo",
  organizacaoId: "org-exemplo",
  codigo: "OP-0001",
  titulo: "Precatório TJSP — Município de Ribeirão Preto",
  tipoAtivo: "PRECATORIO",
  descricao: null,
  moeda: "BRL",
  valorFace: 1500000,
  desagioPercentual: 40,
  valorNegociado: 900000,
  comissaoPercentual: 3,
  tribunal: "Tribunal de Justiça do Estado de São Paulo",
  numeroPrecatorio: "2019.00874-3",
  numeroProcesso: "00013276420188260158",
  enteDevedor: "Município de Ribeirão Preto",
  esferaDevedor: "MUNICIPAL",
  naturezaCredito: "COMUM",
  anoOrcamentario: 2027,
  fase: "CONTRATO",
  confidencial: true,
  partes: [
    vinculo(cedente, "CEDENTE"),
    vinculo(cessionario, "CESSIONARIO"),
    vinculo(intermediario1, "INTERMEDIARIO", { comissaoPercentual: 2 as never, ordemCadeia: 1 }),
    vinculo(intermediario2, "INTERMEDIARIO", { comissaoPercentual: 1 as never, ordemCadeia: 2 }),
  ],
} as unknown as Operacao & { partes: Array<ParteOperacao & { pessoa: Pessoa }> };

/** Campos que cada documento pede, preenchidos com valores plausíveis. */
const CAMPOS: Record<string, Record<string, string>> = {
  NDA: { prazoMeses: "24", objeto: "" },
  NCNDA: { prazoMeses: "24", comissaoPercentual: "3", multaPercentual: "10", transacoesFuturas: "sim" },
  IMFPA: {
    comissaoPercentual: "3",
    baseCalculo: "valor bruto de cada operação liquidada",
    prazoPagamentoDias: "3",
    bancoDados: "Banco 341 — agência 1234 — conta corrente 56789-0 — Mesa Norte Intermediação de Ativos Ltda",
  },
  PROCURACAO: { prazoMeses: "12", substabelecer: "sim", irrevogavel: "nao" },
  MANDATO: { exclusividade: "sim", prazoMeses: "6", comissaoPercentual: "3", despesas: "intermediario" },
  LOI: { validadeDias: "15", vinculante: "nao", exclusividadeDias: "30", condicoes: "" },
  CESSAO_CREDITO: {
    responsabilidade: "veritas",
    formaPagamento:
      "O preço será pago em duas parcelas: 30% na assinatura deste instrumento, por transferência bancária, e 70% em até 5 (cinco) dias úteis contados do protocolo da petição de habilitação no tribunal de origem.",
    multaPercentual: "10",
  },
  CESSAO_PRECATORIO: {
    formaPagamento:
      "O preço será pago em duas parcelas: 30% na assinatura deste instrumento e 70% em até 5 (cinco) dias úteis contados do protocolo da petição de habilitação perante o tribunal de origem.",
    responsavelHabilitacao: "cessionario",
    irRetido:
      "As retenções tributárias incidentes na origem permanecem a cargo do titular originário do crédito, na forma da legislação aplicável.",
    multaPercentual: "10",
  },
  CESSAO_DIREITOS: {
    direitosCedidos: "a totalidade dos direitos creditórios reconhecidos na ação indenizatória",
    litigioso: "sim",
    formaPagamento: "Pagamento à vista, por transferência bancária, na data da assinatura.",
  },
  NOTIFICACAO_DEVEDOR: {
    destinatario: "Município de Ribeirão Preto — Procuradoria-Geral do Município",
    enderecoDestinatario: "Rua Duque de Caxias, 555 — Centro — Ribeirão Preto/SP — CEP 14015-020",
    dadosPagamento: "Horizonte Capital FIDC — Banco 033 — agência 4567 — conta 12345-6",
  },
  TERMO_COMISSAO: { gatilho: "liquidacao", prazoPagamentoDias: "5" },
  TERMO_QUITACAO: { valorRecebido: "900000", dataRecebimento: "" },
  DECLARACAO_ORIGEM: {
    origemRecursos:
      "Os recursos provêm do patrimônio do fundo, integralizado por cotistas qualificados, conforme regulamento registrado na CVM.",
    pep: "nao",
  },
  FICHA_KYC: { finalidade: "Análise de contraparte em operação de cessão de precatório" },
  RELATORIO_DILIGENCIA: {
    solicitante: "Horizonte Capital FIDC",
    responsavelNome: "Ricardo Alvares",
    responsavelCargo: "Responsável pela análise de contraparte",
    responsavelRegistro: "",
    validadeDias: "30",
  },
  ADITIVO: {
    contratoOriginal: "o Instrumento Particular de Cessão de Precatório",
    dataOriginal: "10/07/2026",
    alteracoes: "Fica prorrogado em 30 (trinta) dias o prazo para protocolo da petição de habilitação.",
  },
  DISTRATO: {
    contratoOriginal: "o Instrumento Particular de Cessão de Precatório",
    dataOriginal: "10/07/2026",
    acertos: "O CESSIONÁRIO devolverá a documentação original e o CEDENTE restituirá o sinal recebido, em 5 dias.",
  },
};



// Dossie de exemplo para o relatorio de due diligence.
const DILIGENCIA = {
  solicitante: "Horizonte Capital FIDC",
  responsavel: { nome: "Ricardo Alvares", cargo: "Responsavel pela analise de contraparte", registro: null },
  validadeDias: 30,
  partes: [
    {
      nome: cedente.nome,
      papel: "Cedente",
      documento: cedente.documento,
      qualificacao: qualificar(cedente),
      identificacao: identificacao(cedente),
      idoneidade: "ATENCAO",
      capacidade: "NAO_AVALIADA",
      pontuacao: 76,
      parecer:
        "Nao foi encontrada restricao de idoneidade em " + cedente.nome + " nas fontes consultadas. A capacidade " +
        "de pagamento nao pode ser medida: pessoa fisica nao tem base publica gratuita de situacao financeira. " +
        "Nao foram consultadas: bureau de credito. O resultado vale apenas para as fontes que responderam.",
      auditadaEm: new Date(),
      apontamentos: [
        {
          gravidade: "MEDIA",
          eixo: "IDONEIDADE",
          titulo: "Processo em curso, sem transito em julgado",
          detalhe:
            "Apurado em Certidao de Distribuicao Criminal. Consta: acao penal 0001234-56.2023.8.26.0100, 2a Vara " +
            "Criminal, art. 171 do CP, em instrucao. Processo em andamento NAO e condenacao — a parte e presumida " +
            "inocente. Serve para conhecer o cenario e decidir se pede garantia adicional.",
          fonte: "Tribunal de Justica do estado de domicilio",
        },
        {
          gravidade: "MEDIA",
          eixo: "CAPACIDADE",
          titulo: "Restricoes financeiras nao verificadas",
          detalhe:
            "Sem contrato com bureau, o sistema nao enxerga protestos, pendencias financeiras nem recuperacao " +
            "judicial. Exija as certidoes de protesto e de distribuicao civel.",
          fonte: "Bureau de credito",
        },
      ],
      fontes: [
        { fonte: "DIVIDA_ATIVA_UNIAO", status: "CONCLUIDA", resumo: "Nada consta na divida ativa da Uniao.", consultadaEm: new Date() },
        { fonte: "SANCOES_OFAC", status: "CONCLUIDA", resumo: "Nenhuma coincidencia nas listas de sancoes.", consultadaEm: new Date() },
        { fonte: "BUREAU", status: "INDISPONIVEL", resumo: "Bureau nao contratado.", consultadaEm: null },
      ],
      certidoes: [
        { nome: "Certidao de Antecedentes Criminais", orgao: "Policia Federal", resultado: "NADA_CONSTA", natureza: "NENHUMA", apontamento: null, emitidaEm: new Date(), validaAte: new Date(Date.now()+90*86400000), obrigatoria: true, estado: "OK" },
        { nome: "Consulta ao Banco Nacional de Mandados de Prisao", orgao: "Conselho Nacional de Justica", resultado: "NADA_CONSTA", natureza: "NENHUMA", apontamento: null, emitidaEm: new Date(), validaAte: new Date(Date.now()+30*86400000), obrigatoria: true, estado: "OK" },
        { nome: "Certidao de Distribuicao Criminal — Justica Estadual", orgao: "Tribunal de Justica", resultado: "CONSTA", natureza: "PROCESSO_EM_CURSO", apontamento: "Acao penal 0001234-56.2023.8.26.0100, art. 171 do CP, em instrucao", emitidaEm: new Date(), validaAte: new Date(Date.now()+90*86400000), obrigatoria: true, estado: "APONTAMENTO" },
        { nome: "Certidao de Situacao do Precatorio", orgao: "Tribunal onde o precatorio esta inscrito", resultado: "PENDENTE", natureza: "NENHUMA", apontamento: null, emitidaEm: null, validaAte: null, obrigatoria: true, estado: "FALTA" },
      ],
    },
    {
      nome: cessionario.nome,
      papel: "Cessionario",
      documento: cessionario.documento,
      qualificacao: qualificar(cessionario),
      identificacao: identificacao(cessionario),
      idoneidade: "SEM_APONTAMENTO",
      capacidade: "SUFICIENTE",
      pontuacao: 88,
      parecer: "Nao foi encontrada restricao. Capacidade compativel com o valor da operacao.",
      auditadaEm: new Date(),
      apontamentos: [],
      fontes: [
        { fonte: "RECEITA_CNPJ", status: "CONCLUIDA", resumo: "Situacao ATIVA.", consultadaEm: new Date() },
        { fonte: "DIVIDA_ATIVA_UNIAO", status: "CONCLUIDA", resumo: "Nada consta.", consultadaEm: new Date() },
      ],
      certidoes: [
        { nome: "Certidao Negativa de Debitos Federais", orgao: "Receita Federal e PGFN", resultado: "NADA_CONSTA", natureza: "NENHUMA", apontamento: null, emitidaEm: new Date(), validaAte: new Date(Date.now()+180*86400000), obrigatoria: true, estado: "OK" },
      ],
    },
  ],
};

async function principal() {
  const destino = path.join(process.cwd(), "exemplos");
  await fs.mkdir(destino, { recursive: true });

  console.log("");
  for (const definicao of documentosOrdenados()) {
    const contexto: ContextoDocumento = {
      organizacao,
      operacao,
      usuario,
      campos: CAMPOS[definicao.chave] ?? {},
      agora: new Date(),
      diligencia: definicao.chave === "RELATORIO_DILIGENCIA" ? (DILIGENCIA as never) : undefined,
    };

    try {
      const documento = await gerarDocumento(definicao.chave, contexto);
      await fs.writeFile(path.join(destino, documento.nomeArquivo), documento.buffer);
      const aviso = documento.pendencias.length > 0 ? "  (" + documento.pendencias.length + " pendencia/s)" : "";
      console.log("  OK   " + documento.nomeArquivo.padEnd(44) + documento.hashSha256.slice(0, 8).toUpperCase() + aviso);
    } catch (erro) {
      console.log("  ERRO " + definicao.chave + ": " + (erro as Error).message);
    }
  }

  console.log("");
  console.log("Arquivos em: " + destino);
}

principal().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
