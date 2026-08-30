"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirEdicaoLicitacoes, exigirSessaoLicitacoes } from "@/lib/licitacoes/sessao";
import { somenteAlfanumerico, somenteNumeros, validarDocumento, validarEmail } from "@/lib/validacao";
import { gerarDocumento } from "@/lib/documentos";
import type { ContextoDocumento } from "@/lib/documentos/contexto";
import { auditarLicitante } from "@/lib/licitacoes/auditoria";
import { contaComoOrganizacao, usuarioLicitacoesComoUsuario } from "@/lib/licitacoes/contexto";
import { buscarOportunidadesPncp, type OportunidadePncp } from "@/lib/licitacoes/pncp";
import { CONSULTAS_GRATIS_TESTE } from "@/lib/planos";

export type ResultadoAcao = { erro?: string; ok?: boolean };

/** Teste grátis: só a cota de consultas definida em `planos.ts`, e nada além dela. */
async function testeEsgotado(licitacaoContaId: string, statusAssinatura: string): Promise<boolean> {
  if (statusAssinatura !== "TESTE") return false;
  const total = await prisma.licitanteAuditoria.count({ where: { licitacaoContaId } });
  return total >= CONSULTAS_GRATIS_TESTE;
}

const texto = (dados: FormData, chave: string) => (dados.get(chave)?.toString() ?? "").trim() || null;

/**
 * Cria ou atualiza a empresa licitante.
 *
 * É o cadastro próprio da solução de licitações — não grava em `Pessoa`, que
 * pertence à gestão de ativos. Repete aqui a mesma conferência de CNPJ que a
 * outra solução faz, porque a regra ("documento com dígito verificador
 * correto") é da lei, não da tabela.
 */
export async function salvarLicitante(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { usuario, conta } = await exigirEdicaoLicitacoes();

  const id = texto(dados, "id");
  const nome = texto(dados, "nome");
  const documento = somenteAlfanumerico(texto(dados, "documento"));
  const email = texto(dados, "emailContato");

  if (!nome) return { erro: "Informe a razão social." };
  if (documento && !validarDocumento(documento, "PJ")) return { erro: "CNPJ inválido — confira os números." };
  if (email && !validarEmail(email)) return { erro: "E-mail inválido." };

  if (documento) {
    const jaExiste = await prisma.licitanteEmpresa.findFirst({
      where: { licitacaoContaId: conta.id, documento, ...(id ? { NOT: { id } } : {}) },
      select: { id: true, nome: true },
    });
    if (jaExiste) return { erro: `Já existe uma empresa licitante cadastrada com este CNPJ: ${jaExiste.nome}.` };
  }

  const repCpf = somenteNumeros(texto(dados, "repCpf"));
  if (repCpf && !validarDocumento(repCpf, "PF")) return { erro: "CPF do representante inválido." };

  const valores = {
    nome,
    documento: documento || "",
    inscricaoEstadual: texto(dados, "inscricaoEstadual"),
    microempresaOuEpp: dados.get("microempresaOuEpp") === "on",
    emailContato: email,
    telefone: somenteNumeros(texto(dados, "telefone")) || null,
    enderecoRua: texto(dados, "enderecoRua"),
    enderecoNumero: texto(dados, "enderecoNumero"),
    enderecoComplemento: texto(dados, "enderecoComplemento"),
    enderecoBairro: texto(dados, "enderecoBairro"),
    enderecoCidade: texto(dados, "enderecoCidade"),
    enderecoUf: texto(dados, "enderecoUf")?.toUpperCase() ?? null,
    enderecoCep: somenteNumeros(texto(dados, "enderecoCep")) || null,
    repNome: texto(dados, "repNome"),
    repCpf: repCpf || null,
    repRg: texto(dados, "repRg"),
    repCargo: texto(dados, "repCargo"),
    repNacionalidade: texto(dados, "repNacionalidade"),
    repEstadoCivil: texto(dados, "repEstadoCivil"),
    repProfissao: texto(dados, "repProfissao"),
  };

  let licitanteId: string;

  if (id) {
    const existente = await prisma.licitanteEmpresa.findFirst({ where: { id, licitacaoContaId: conta.id } });
    if (!existente) return { erro: "Empresa licitante não encontrada." };

    await prisma.licitanteEmpresa.update({ where: { id }, data: valores });
    licitanteId = id;
  } else {
    const criada = await prisma.licitanteEmpresa.create({ data: { ...valores, licitacaoContaId: conta.id } });
    licitanteId = criada.id;
  }

  // Todo cadastro passa por auditoria — aqui, e não num botão à parte, é onde
  // a regra se cumpre de verdade. A falha de uma fonte externa não pode
  // impedir o cadastro de ficar salvo, então o erro é engolido e a empresa
  // fica marcada como ainda não auditada.
  const salva = await prisma.licitanteEmpresa.findUnique({ where: { id: licitanteId } });
  if (salva?.documento && !(await testeEsgotado(conta.id, conta.statusAssinatura))) {
    try {
      await auditarLicitante({ licitante: salva, usuario, licitacaoContaId: conta.id });
    } catch (erro) {
      console.error("Auditoria automática do licitante falhou:", erro);
    }
  }

  revalidatePath("/licitacoes/painel/licitantes");
  redirect(`/licitacoes/painel/licitantes/${licitanteId}`);
}

/**
 * Libera manualmente uma empresa bloqueada por restrição — exige o papel de
 * DONO e uma justificativa mínima, no mesmo espírito da liberação de parte
 * da Gestão de Ativos, mas sem tocar em nenhuma tabela daquela solução.
 */
export async function liberarLicitante(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { usuario, conta } = await exigirEdicaoLicitacoes();

  if (usuario.papel !== "DONO") {
    return { erro: "Somente o responsável pela conta pode liberar uma empresa bloqueada." };
  }

  const licitanteEmpresaId = texto(dados, "licitanteEmpresaId");
  const justificativa = texto(dados, "justificativa") ?? "";
  if (!licitanteEmpresaId) return { erro: "Empresa não informada." };
  if (justificativa.length < 20) {
    return { erro: "Escreva a justificativa da liberação — no mínimo uma frase explicando a decisão." };
  }

  const licitante = await prisma.licitanteEmpresa.findFirst({
    where: { id: licitanteEmpresaId, licitacaoContaId: conta.id },
  });
  if (!licitante) return { erro: "Empresa licitante não encontrada." };

  await prisma.licitanteEmpresa.update({
    where: { id: licitanteEmpresaId },
    data: {
      bloqueada: false,
      liberadaPorNome: usuario.nome,
      liberadaEm: new Date(),
      justificativaLiberacao: justificativa,
    },
  });

  revalidatePath(`/licitacoes/painel/licitantes/${licitanteEmpresaId}`);
  return { ok: true };
}

export async function rebloquearLicitante(licitanteEmpresaId: string): Promise<ResultadoAcao> {
  const { usuario, conta } = await exigirEdicaoLicitacoes();
  if (usuario.papel !== "DONO") {
    return { erro: "Somente o responsável pela conta pode bloquear novamente uma empresa." };
  }

  const licitante = await prisma.licitanteEmpresa.findFirst({
    where: { id: licitanteEmpresaId, licitacaoContaId: conta.id },
  });
  if (!licitante) return { erro: "Empresa licitante não encontrada." };

  await prisma.licitanteEmpresa.update({
    where: { id: licitanteEmpresaId },
    data: { bloqueada: true, liberadaPorNome: null, liberadaEm: null, justificativaLiberacao: null },
  });

  revalidatePath(`/licitacoes/painel/licitantes/${licitanteEmpresaId}`);
  return { ok: true };
}

export async function excluirLicitante(id: string): Promise<ResultadoAcao> {
  const { conta } = await exigirEdicaoLicitacoes();

  const licitante = await prisma.licitanteEmpresa.findFirst({
    where: { id, licitacaoContaId: conta.id },
    include: { _count: { select: { envelopes: true } } },
  });
  if (!licitante) return { erro: "Empresa licitante não encontrada." };

  if (licitante._count.envelopes > 0) {
    return { erro: "Esta empresa tem envelopes gerados e não pode ser excluída." };
  }

  await prisma.licitanteEmpresa.delete({ where: { id } });

  revalidatePath("/licitacoes/painel/licitantes");
  redirect("/licitacoes/painel/licitantes");
}

// ---------------------------------------------------------------------
// Documentos pessoais
// ---------------------------------------------------------------------

const TIPOS_DOCUMENTO_PESSOAL = ["RG", "CPF", "COMPROVANTE_RESIDENCIA", "CONTRATO_SOCIAL", "OUTRO"];

export async function anexarDocumentoPessoal(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { conta } = await exigirEdicaoLicitacoes();

  const licitanteEmpresaId = texto(dados, "licitanteEmpresaId");
  const tipo = texto(dados, "tipo") ?? "OUTRO";
  const arquivo = dados.get("arquivo");

  if (!licitanteEmpresaId) return { erro: "Empresa não informada." };
  if (!TIPOS_DOCUMENTO_PESSOAL.includes(tipo)) return { erro: "Tipo de documento desconhecido." };
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Selecione um arquivo." };
  if (arquivo.size > 10 * 1024 * 1024) return { erro: "Arquivo maior que 10 MB." };

  const licitante = await prisma.licitanteEmpresa.findFirst({
    where: { id: licitanteEmpresaId, licitacaoContaId: conta.id },
  });
  if (!licitante) return { erro: "Empresa licitante não encontrada." };

  const bytes = Buffer.from(await arquivo.arrayBuffer());

  await prisma.licitanteDocumentoPessoal.create({
    data: {
      licitanteEmpresaId,
      tipo,
      nomeArquivo: arquivo.name,
      arquivo: bytes,
      arquivoTipo: arquivo.type || null,
    },
  });

  revalidatePath(`/licitacoes/painel/licitantes/${licitanteEmpresaId}`);
  return { ok: true };
}

export async function excluirDocumentoPessoal(id: string, licitanteEmpresaId: string): Promise<ResultadoAcao> {
  const { conta } = await exigirEdicaoLicitacoes();

  const doc = await prisma.licitanteDocumentoPessoal.findFirst({
    where: { id, licitanteEmpresa: { licitacaoContaId: conta.id } },
  });
  if (!doc) return { erro: "Documento não encontrado." };

  await prisma.licitanteDocumentoPessoal.delete({ where: { id } });
  revalidatePath(`/licitacoes/painel/licitantes/${licitanteEmpresaId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------
// Edital de interesse
// ---------------------------------------------------------------------

export async function salvarEditalInteresse(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { conta } = await exigirEdicaoLicitacoes();

  const orgaoLicitante = texto(dados, "orgaoLicitante");
  const modalidade = texto(dados, "modalidade");
  const numeroCertame = texto(dados, "numeroCertame");
  const objeto = texto(dados, "objeto");
  const prazoEnvio = texto(dados, "prazoEnvio");
  const arquivo = dados.get("arquivo");

  if (!orgaoLicitante || !modalidade || !numeroCertame) {
    return { erro: "Informe o órgão, a modalidade e o número do certame." };
  }

  let arquivoNome: string | null = null;
  let bytes: Buffer | null = null;
  if (arquivo instanceof File && arquivo.size > 0) {
    if (arquivo.size > 20 * 1024 * 1024) return { erro: "Edital maior que 20 MB." };
    arquivoNome = arquivo.name;
    bytes = Buffer.from(await arquivo.arrayBuffer());
  }

  await prisma.editalInteresse.create({
    data: {
      licitacaoContaId: conta.id,
      orgaoLicitante,
      modalidade,
      numeroCertame,
      objeto,
      arquivoNome,
      arquivo: bytes,
      prazoEnvio: prazoEnvio ? new Date(prazoEnvio) : null,
    },
  });

  revalidatePath("/licitacoes/painel/licitantes");
  return { ok: true };
}

/**
 * Busca ao vivo no PNCP — roda no servidor para não expor a chamada externa
 * ao navegador e para poder exigir sessão antes de qualquer requisição.
 */
export async function buscarOportunidades(params: {
  modalidade?: string;
  uf?: string;
  palavraChave?: string;
  pagina?: number;
}): Promise<{ ok: true; total: number; itens: OportunidadePncp[] } | { ok: false; erro: string }> {
  await exigirSessaoLicitacoes();
  return buscarOportunidadesPncp(params);
}

/**
 * Registra como edital de interesse uma oportunidade encontrada na busca do
 * PNCP — mesma tabela que o cadastro manual usa, só que sem arquivo (o edital
 * fica no PNCP; aqui guarda o link de volta, não uma cópia).
 */
export async function salvarEditalDoPncp(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { conta } = await exigirEdicaoLicitacoes();

  const orgaoLicitante = texto(dados, "orgaoLicitante");
  const modalidade = texto(dados, "modalidade");
  const numeroCertame = texto(dados, "numeroCertame");
  const objeto = texto(dados, "objeto");
  const numeroControlePncp = texto(dados, "numeroControlePncp");
  const linkPncp = texto(dados, "linkPncp");

  if (!orgaoLicitante || !modalidade || !numeroCertame) {
    return { erro: "Dados incompletos vindos do PNCP — tente buscar de novo." };
  }

  if (numeroControlePncp) {
    const jaExiste = await prisma.editalInteresse.findFirst({
      where: { licitacaoContaId: conta.id, numeroControlePncp },
    });
    if (jaExiste) return { erro: "Este edital já está na sua lista de interesse." };
  }

  await prisma.editalInteresse.create({
    data: { licitacaoContaId: conta.id, orgaoLicitante, modalidade, numeroCertame, objeto, numeroControlePncp, linkPncp },
  });

  revalidatePath("/licitacoes/painel/licitantes");
  return { ok: true };
}

// ---------------------------------------------------------------------
// Envelope — monta as cinco declarações e lista o que ainda falta
// ---------------------------------------------------------------------

const DECLARACOES_ENVELOPE = [
  "LICIT_CREDENCIAMENTO",
  "LICIT_FATO_SUPERVENIENTE",
  "LICIT_NAO_EMPREGA_MENOR",
  "LICIT_PLENO_ATENDIMENTO",
] as const;

/**
 * Gera o envelope: as declarações padronizadas, identificadas com o
 * certame e a empresa, mais a lista do que falta anexar manualmente.
 *
 * Não produz um PDF único porque o envelope físico de licitação é montado
 * pelo próprio licitante na hora da entrega — o que a plataforma garante é
 * que nada saia sem o número do certame e o nome da empresa nele, e que a
 * lista do que falta seja exaustiva, não uma estimativa.
 */
export async function gerarEnvelope(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { usuario, conta } = await exigirEdicaoLicitacoes();

  const licitanteEmpresaId = texto(dados, "licitanteEmpresaId");
  const editalInteresseId = texto(dados, "editalInteresseId");
  if (!licitanteEmpresaId || !editalInteresseId) return { erro: "Selecione a empresa e o edital." };

  const [licitante, edital] = await Promise.all([
    prisma.licitanteEmpresa.findFirst({ where: { id: licitanteEmpresaId, licitacaoContaId: conta.id } }),
    prisma.editalInteresse.findFirst({ where: { id: editalInteresseId, licitacaoContaId: conta.id } }),
  ]);
  if (!licitante) return { erro: "Empresa licitante não encontrada." };
  if (!edital) return { erro: "Edital não encontrado." };

  const campos = {
    orgaoLicitante: edital.orgaoLicitante,
    modalidade: edital.modalidade,
    numeroCertame: edital.numeroCertame,
  };

  const tiposParaGerar = licitante.microempresaOuEpp
    ? [...DECLARACOES_ENVELOPE, "LICIT_ME_EPP"]
    : DECLARACOES_ENVELOPE;

  const itens: Array<{ tipo: string; titulo: string; hash: string; pendencias: number }> = [];

  for (const tipo of tiposParaGerar) {
    const contexto: ContextoDocumento = {
      organizacao: contaComoOrganizacao(conta),
      operacao: null,
      usuario: usuarioLicitacoesComoUsuario(usuario),
      campos,
      agora: new Date(),
      licitante,
    };
    const gerado = await gerarDocumento(tipo, contexto);
    itens.push({
      tipo,
      titulo: gerado.titulo,
      hash: gerado.hashSha256,
      pendencias: gerado.pendencias.length,
    });
  }

  const documentosPessoais = await prisma.licitanteDocumentoPessoal.findMany({
    where: { licitanteEmpresaId },
    select: { id: true, tipo: true, nomeArquivo: true },
  });

  await prisma.envelope.create({
    data: {
      licitacaoContaId: conta.id,
      licitanteEmpresaId,
      editalInteresseId,
      status: documentosPessoais.length > 0 ? "COMPLETO" : "MONTAGEM",
      itens: { declaracoesGeradas: itens, documentosPessoais } as never,
    },
  });

  revalidatePath(`/licitacoes/painel/licitantes/${licitanteEmpresaId}`);
  redirect(`/licitacoes/painel/licitantes/${licitanteEmpresaId}`);
}
