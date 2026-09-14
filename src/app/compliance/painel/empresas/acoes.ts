"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CATALOGO_CERTIDOES, CERTIDAO_POR_CHAVE } from "@/lib/auditoria/certidoes";
import { emitirCertidao, temEmissaoAutomatica, type CredencialGovBr } from "@/lib/auditoria/fontes/infosimples";
import { decifrar } from "@/lib/seguranca/cofre";
import { asaasConfigurado, criarClienteAsaas, criarCobrancaAvulsaAsaas } from "@/lib/asaas/cliente";
import { precoDoRelatorio, executarRelatorioPago } from "@/lib/compliance/relatorio-pago";
import { exigirEdicaoCompliance } from "@/lib/compliance/sessao";
import { somenteAlfanumerico, somenteNumeros, validarDocumento, validarEmail } from "@/lib/validacao";
import { auditarEmpresaCompliance } from "@/lib/compliance/auditoria";
import { gerarDocumento } from "@/lib/documentos";
import type { ContextoDocumento } from "@/lib/documentos/contexto";
import { contaComplianceComoOrganizacao, usuarioComplianceComoUsuario } from "@/lib/compliance/contexto";
import type { DadosDiligencia } from "@/lib/documentos/geradores/diligencia";
import type { Apontamento } from "@/lib/auditoria/tipos";
import { configuracaoDaSolucao } from "@/lib/planos-solucao";
import { arquivoComConteudo } from "@/lib/arquivo-enviado";

export type ResultadoAcao = { erro?: string; ok?: boolean };

const texto = (dados: FormData, chave: string) => (dados.get(chave)?.toString() ?? "").trim() || null;

/**
 * Teste grátis: cota única de consultas, compartilhada entre empresas,
 * pessoas, processos e pareceres — é a mesma conta, a mesma assinatura.
 */
async function testeEsgotado(complianceContaId: string, statusAssinatura: string): Promise<boolean> {
  if (statusAssinatura !== "TESTE") return false;
  const [empresas, pessoas, processos, pareceres] = await Promise.all([
    prisma.complianceAuditoria.count({ where: { complianceContaId } }),
    prisma.diligenciaAuditoria.count({ where: { complianceContaId } }),
    prisma.complianceProcessoAnalise.count({ where: { complianceContaId } }),
    prisma.complianceParecer.count({ where: { complianceContaId } }),
  ]);
  const { consultasGratisTeste } = await configuracaoDaSolucao("COMPLIANCE_EMPRESA");
  return empresas + pessoas + processos + pareceres >= consultasGratisTeste;
}

/**
 * Cria a empresa e roda a auditoria automática, na hora — o cadastro passa
 * por compliance sempre, não num botão à parte.
 */
export async function salvarEmpresa(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { usuario, conta } = await exigirEdicaoCompliance();

  const nome = texto(dados, "nome");
  const documento = somenteAlfanumerico(texto(dados, "documento") ?? "");
  const email = texto(dados, "emailContato");

  if (!nome) return { erro: "Informe a razão social." };
  if (documento && !validarDocumento(documento, "PJ")) return { erro: "CNPJ inválido — confira os números." };
  if (email && !validarEmail(email)) return { erro: "E-mail inválido." };

  if (documento) {
    const jaExiste = await prisma.complianceEmpresa.findFirst({
      where: { complianceContaId: conta.id, documento },
      select: { id: true, nome: true },
    });
    if (jaExiste) return { erro: `Já existe uma empresa cadastrada com este CNPJ: ${jaExiste.nome}.` };
  }

  const empresa = await prisma.complianceEmpresa.create({
    data: {
      complianceContaId: conta.id,
      nome,
      documento: documento || "",
      inscricaoEstadual: texto(dados, "inscricaoEstadual"),
      emailContato: email,
      telefone: somenteNumeros(texto(dados, "telefone")) || null,
      enderecoRua: texto(dados, "enderecoRua"),
      enderecoNumero: texto(dados, "enderecoNumero"),
      enderecoComplemento: texto(dados, "enderecoComplemento"),
      enderecoBairro: texto(dados, "enderecoBairro"),
      enderecoCidade: texto(dados, "enderecoCidade"),
      enderecoUf: texto(dados, "enderecoUf")?.toUpperCase() ?? null,
      enderecoCep: somenteNumeros(texto(dados, "enderecoCep")) || null,
    },
  });

  if (empresa.documento && !(await testeEsgotado(conta.id, conta.statusAssinatura))) {
    try {
      await auditarEmpresaCompliance({ empresa, usuario, complianceContaId: conta.id });
    } catch (erro) {
      console.error("Auditoria automática da empresa falhou:", erro);
    }
  }

  revalidatePath("/compliance/painel/empresas");
  redirect(`/compliance/painel/empresas/${empresa.id}`);
}

/**
 * Libera manualmente uma empresa bloqueada por restrição — exige o papel de
 * DONO e uma justificativa mínima, mesmo padrão da Gestão de Ativos e de
 * Licitações, cada qual na sua própria tabela.
 */
export async function liberarEmpresaCompliance(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { usuario, conta } = await exigirEdicaoCompliance();

  if (usuario.papel !== "DONO") {
    return { erro: "Somente o responsável pela conta pode liberar uma empresa bloqueada." };
  }

  const complianceEmpresaId = texto(dados, "complianceEmpresaId");
  const justificativa = texto(dados, "justificativa") ?? "";
  if (!complianceEmpresaId) return { erro: "Empresa não informada." };
  if (justificativa.length < 20) {
    return { erro: "Escreva a justificativa da liberação — no mínimo uma frase explicando a decisão." };
  }

  const empresa = await prisma.complianceEmpresa.findFirst({
    where: { id: complianceEmpresaId, complianceContaId: conta.id },
  });
  if (!empresa) return { erro: "Empresa não encontrada." };

  await prisma.complianceEmpresa.update({
    where: { id: complianceEmpresaId },
    data: {
      bloqueada: false,
      liberadaPorNome: usuario.nome,
      liberadaEm: new Date(),
      justificativaLiberacao: justificativa,
    },
  });

  revalidatePath(`/compliance/painel/empresas/${complianceEmpresaId}`);
  return { ok: true };
}

export async function rebloquearEmpresaCompliance(complianceEmpresaId: string): Promise<ResultadoAcao> {
  const { usuario, conta } = await exigirEdicaoCompliance();
  if (usuario.papel !== "DONO") {
    return { erro: "Somente o responsável pela conta pode bloquear novamente uma empresa." };
  }

  const empresa = await prisma.complianceEmpresa.findFirst({
    where: { id: complianceEmpresaId, complianceContaId: conta.id },
  });
  if (!empresa) return { erro: "Empresa não encontrada." };

  await prisma.complianceEmpresa.update({
    where: { id: complianceEmpresaId },
    data: { bloqueada: true, liberadaPorNome: null, liberadaEm: null, justificativaLiberacao: null },
  });

  revalidatePath(`/compliance/painel/empresas/${complianceEmpresaId}`);
  return { ok: true };
}

export async function reauditarEmpresa(id: string): Promise<ResultadoAcao> {
  const { usuario, conta } = await exigirEdicaoCompliance();

  const empresa = await prisma.complianceEmpresa.findFirst({ where: { id, complianceContaId: conta.id } });
  if (!empresa) return { erro: "Empresa não encontrada." };

  if (await testeEsgotado(conta.id, conta.statusAssinatura)) {
    return {
      erro: `Seu teste grátis já usou as ${(await configuracaoDaSolucao("COMPLIANCE_EMPRESA")).consultasGratisTeste} consultas incluídas (empresas, pessoas, processos e pareceres somados). Assine um plano para continuar auditando.`,
    };
  }

  await auditarEmpresaCompliance({ empresa, usuario, complianceContaId: conta.id });

  revalidatePath(`/compliance/painel/empresas/${id}`);
  return { ok: true };
}

// ---------------------------------------------------------------------
// Certidões
// ---------------------------------------------------------------------

/**
 * Tipos aceitos no anexo manual.
 *
 * São as mesmas chaves do catálogo usado na emissão automática — senão a
 * mesma certidão entraria com dois nomes diferentes conforme tivesse sido
 * anexada ou emitida, e o relatório listaria as duas como coisas distintas.
 * Os quatro primeiros nomes antigos continuam aceitos por causa do que já
 * foi anexado antes desta mudança.
 */
const TIPOS_CERTIDAO = [
  ...CATALOGO_CERTIDOES.map((c) => c.chave),
  "CERTIDAO_TRIBUTOS_FEDERAIS",
  "CERTIDAO_FGTS",
  "CERTIDAO_FALENCIA_CONCORDATA",
  "OUTRO",
];

/**
 * Emite a certidão na fonte, pela Infosimples, e guarda o resultado.
 *
 * Duas coisas que não mudam em relação ao anexo manual: o arquivo do
 * comprovante é baixado e guardado (o link do provedor expira, e o que
 * sustenta a análise depois é o documento em mãos), e a leitura do resultado é
 * conservadora — qualquer registro devolvido vira CONSTA, para conferência
 * humana. Errar para o lado do alerta custa cinco minutos; errar para o lado
 * do "nada consta" é o erro que compromete quem assina o relatório.
 */
export async function emitirCertidaoCompliance(
  complianceEmpresaId: string,
  chaveCertidao: string
): Promise<ResultadoAcao> {
  const { usuario, conta } = await exigirEdicaoCompliance();

  const definicao = CERTIDAO_POR_CHAVE[chaveCertidao];
  if (!definicao) return { erro: "Tipo de certidão desconhecido." };

  const empresa = await prisma.complianceEmpresa.findFirst({
    where: { id: complianceEmpresaId, complianceContaId: conta.id },
  });
  if (!empresa) return { erro: "Empresa não encontrada." };
  if (!empresa.documento) return { erro: "Cadastre o CNPJ da empresa antes de emitir a certidão." };

  if (conta.statusAssinatura === "TESTE" && (await testeEsgotado(conta.id, conta.statusAssinatura))) {
    return { erro: "O teste grátis já usou as consultas incluídas. Assine um plano para emitir certidões." };
  }

  if (!temEmissaoAutomatica(chaveCertidao, empresa.enderecoUf)) {
    return {
      erro:
        "Esta certidão não tem emissão automática" +
        (empresa.enderecoUf ? ` para ${empresa.enderecoUf}` : "") +
        ". Emita pelo site do órgão e anexe o arquivo aqui.",
    };
  }

  // Certidão que exige gov.br sai com o certificado do PRÓPRIO cliente: é a
  // credencial dele que o órgão reconhece, e é em nome dele que a certidão é
  // emitida.
  let credencial: CredencialGovBr | undefined;
  if (conta.certificadoArquivo && conta.certificadoSenha) {
    const senha = decifrar(conta.certificadoSenha);
    if (!senha.ok) return { erro: senha.erro };
    credencial = {
      tipo: "certificado",
      arquivoBase64: Buffer.from(conta.certificadoArquivo).toString("base64"),
      senha: senha.texto,
    };
  }

  const emissao = await emitirCertidao({
    chaveCertidao,
    parte: { documento: empresa.documento, nome: empresa.nome, uf: empresa.enderecoUf },
    credencial,
    // É isto que separa o gasto desta solução do gasto das outras, mesmo a
    // conta da Infosimples sendo uma só.
    contexto: {
      solucao: "COMPLIANCE_EMPRESA",
      contaId: conta.id,
      referencia: `${definicao.nome} — ${empresa.nome}`,
    },
  });

  if (!emissao.ok) return { erro: `Não foi possível emitir: ${emissao.erro}` };

  const { certidao } = emissao;

  // Baixa o comprovante: o endereço devolvido pelo provedor expira.
  const comprovanteUrl = certidao.comprovantes[0] ?? null;
  let arquivo: Buffer | null = null;
  let nomeArquivo: string | null = null;
  let arquivoTipo: string | null = null;
  let hash: string | null = null;

  if (comprovanteUrl) {
    try {
      const baixado = await fetch(comprovanteUrl, { signal: AbortSignal.timeout(60_000) });
      if (baixado.ok) {
        const conteudo = Buffer.from(await baixado.arrayBuffer());
        if (conteudo.length > 0 && conteudo.length <= 10 * 1024 * 1024) {
          arquivo = conteudo;
          arquivoTipo = baixado.headers.get("content-type")?.split(";")[0] ?? "application/pdf";
          const extensao = arquivoTipo.includes("pdf") ? "pdf" : arquivoTipo.includes("html") ? "html" : "bin";
          nomeArquivo = `${chaveCertidao.toLowerCase().replace(/_/g, "-")}-${Date.now()}.${extensao}`;
          hash = crypto.createHash("sha256").update(conteudo).digest("hex");
        }
      }
    } catch (erro) {
      // Comprovante não baixado não invalida a consulta: o endereço e a
      // resposta completa continuam guardados.
      console.error("Comprovante da certidão não pôde ser baixado:", erro);
    }
  }

  await prisma.complianceCertidao.create({
    data: {
      complianceEmpresaId,
      tipo: chaveCertidao,
      origem: "EMITIDA",
      orgaoEmissor: definicao.orgao,
      numero: certidao.numero,
      resultado: certidao.resultado,
      natureza: certidao.natureza,
      apontamento: certidao.apontamento,
      nomeArquivo,
      arquivo,
      arquivoTipo,
      hashSha256: hash,
      emissaoAutomatica: true,
      comprovanteUrl,
      dadosConsulta: (certidao.bruto ?? undefined) as never,
      emitidaEm: new Date(),
      validaAte: new Date(Date.now() + definicao.validadeDias * 86400000),
    },
  });

  revalidatePath(`/compliance/painel/empresas/${complianceEmpresaId}`);
  return { ok: true };
}

export async function anexarCertidao(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { conta } = await exigirEdicaoCompliance();

  const complianceEmpresaId = texto(dados, "complianceEmpresaId");
  const tipo = texto(dados, "tipo") ?? "OUTRO";
  const validaAte = texto(dados, "validaAte");
  const arquivo = dados.get("arquivo");

  if (!complianceEmpresaId) return { erro: "Empresa não informada." };
  if (!TIPOS_CERTIDAO.includes(tipo)) return { erro: "Tipo de certidão desconhecido." };
  if (!arquivoComConteudo(arquivo)) return { erro: "Selecione um arquivo." };
  if (arquivo.size > 10 * 1024 * 1024) return { erro: "Arquivo maior que 10 MB." };

  const empresa = await prisma.complianceEmpresa.findFirst({
    where: { id: complianceEmpresaId, complianceContaId: conta.id },
  });
  if (!empresa) return { erro: "Empresa não encontrada." };

  const bytes = Buffer.from(await arquivo.arrayBuffer());

  await prisma.complianceCertidao.create({
    data: {
      complianceEmpresaId,
      tipo,
      origem: "APRESENTADA",
      nomeArquivo: arquivo.name,
      arquivo: bytes,
      arquivoTipo: arquivo.type || null,
      emitidaEm: new Date(),
      validaAte: validaAte ? new Date(validaAte) : null,
    },
  });

  revalidatePath(`/compliance/painel/empresas/${complianceEmpresaId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------
// Relatório assinado
// ---------------------------------------------------------------------

const ROTULO_FONTE: Record<string, string> = {
  RECEITA_CNPJ: "Receita Federal",
  DIVIDA_ATIVA_UNIAO: "PGFN — dívida ativa da União",
  SANCOES_OFAC: "OFAC",
  CEIS: "CEIS",
  CNEP: "CNEP",
  CEPIM: "CEPIM",
  BUREAU: "Bureau de crédito",
  PROCESSOS_JUDICIAIS: "Processos judiciais (tribunal da sede)",
  CADASTRO: "Cadastro interno",
};

/**
 * Gera o relatório de compliance assinado, reaproveitando o mesmo documento
 * que a Gestão de Ativos usa para due diligence (`RELATORIO_DILIGENCIA`).
 *
 * O gerador já sabe funcionar sem operação vinculada — é lógica de
 * renderização genérica, montada a partir de dados soltos (`DadosDiligencia`),
 * não uma tabela de outra solução. O que muda aqui é de onde os dados vêm:
 * da auditoria própria desta solução, não de `Auditoria`/`Pessoa`.
 */
export async function gerarRelatorio(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { usuario, conta } = await exigirEdicaoCompliance();

  // O teste grátis mostra a estrutura e o resultado das consultas, mas não
  // entrega o relatório de compliance assinado.
  if (conta.statusAssinatura === "TESTE") {
    return {
      erro:
        "O relatório de compliance assinado não é gerado durante o período de teste. Assine um plano para " +
        "emitir o relatório de verdade.",
    };
  }

  const complianceEmpresaId = texto(dados, "complianceEmpresaId");
  if (!complianceEmpresaId) return { erro: "Empresa não informada." };

  const empresa = await prisma.complianceEmpresa.findFirst({
    where: { id: complianceEmpresaId, complianceContaId: conta.id },
  });
  if (!empresa) return { erro: "Empresa não encontrada." };

  const auditoria = await prisma.complianceAuditoria.findFirst({
    where: { complianceEmpresaId, situacao: "CONCLUIDA" },
    orderBy: { criadoEm: "desc" },
    include: { consultas: true },
  });

  const certidoes = await prisma.complianceCertidao.findMany({ where: { complianceEmpresaId } });

  // Os processos vêm da consulta guardada, não de uma nova busca: o relatório
  // reflete o que foi apurado naquela auditoria, com a data dela.
  const consultaProcessos = auditoria?.consultas.find((c) => c.fonte === "PROCESSOS_JUDICIAIS");
  const { processos, avisoParcial } = extrairProcessos(consultaProcessos?.resultado);

  const diligencia: DadosDiligencia = {
    partes: [
      {
        nome: empresa.nome,
        papel: "Empresa verificada",
        documento: empresa.documento,
        qualificacao: empresa.nome,
        identificacao: `CNPJ ${empresa.documento}`,
        idoneidade: auditoria?.idoneidade ?? null,
        capacidade: auditoria?.capacidade ?? null,
        pontuacao: auditoria?.pontuacao ?? null,
        parecer: auditoria?.parecer ?? null,
        auditadaEm: auditoria?.criadoEm ?? null,
        apontamentos: ((auditoria?.apontamentos ?? []) as unknown as Apontamento[]) ?? [],
        fontes:
          auditoria?.consultas.map((c) => ({
            fonte: ROTULO_FONTE[c.fonte] ?? c.fonte,
            status: c.status,
            resumo: c.resumo,
            consultadaEm: c.concluidaEm ?? c.criadoEm,
          })) ?? [],
        // O resultado vai como está gravado. Certidão apresentada e nunca
        // conferida fica "PENDENTE" — antes daqui saía "NADA_CONSTA" fixo, o
        // que fazia o relatório assinado afirmar, sobre um arquivo que ninguém
        // leu, exatamente aquilo que ele não podia afirmar.
        certidoes: certidoes.map((c) => ({
          nome: CERTIDAO_POR_CHAVE[c.tipo]?.nome ?? c.tipo,
          orgao: c.orgaoEmissor ?? (c.origem === "EMITIDA" ? "Emitida na fonte" : "Apresentada pela empresa"),
          resultado: c.resultado,
          natureza: c.natureza,
          apontamento: c.apontamento,
          emitidaEm: c.emitidaEm,
          validaAte: c.validaAte,
          obrigatoria: false,
          estado: c.validaAte && c.validaAte < new Date() ? "VENCIDA" : "OK",
        })),
        processos,
        processosParciais: avisoParcial,
      },
    ],
    responsavel: {
      nome: texto(dados, "responsavelNome") || usuario.nome,
      cargo: texto(dados, "responsavelCargo") || "Responsável pela análise de compliance",
      registro: texto(dados, "responsavelRegistro"),
    },
    solicitante: texto(dados, "solicitante"),
    validadeDias: Number(texto(dados, "validadeDias")) > 0 ? Number(texto(dados, "validadeDias")) : 30,
  };

  const contexto: ContextoDocumento = {
    organizacao: contaComplianceComoOrganizacao(conta),
    operacao: null,
    usuario: usuarioComplianceComoUsuario(usuario),
    campos: {},
    agora: new Date(),
    diligencia,
  };

  let gerado;
  try {
    gerado = await gerarDocumento("RELATORIO_DILIGENCIA", contexto);
  } catch (erro) {
    return { erro: `Não foi possível gerar o relatório: ${(erro as Error).message}` };
  }

  await prisma.complianceDocumento.create({
    data: {
      complianceEmpresaId,
      titulo: gerado.titulo,
      arquivoNome: gerado.nomeArquivo,
      arquivo: gerado.buffer,
      hashSha256: gerado.hashSha256,
    },
  });

  revalidatePath(`/compliance/painel/empresas/${complianceEmpresaId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------
// Relatório completo vendido por peça
// ---------------------------------------------------------------------

/** Próximo número do pedido de relatório, por conta: RC-0001. */
async function proximoNumeroRelatorio(complianceContaId: string): Promise<string> {
  const ultimo = await prisma.complianceRelatorioPedido.findFirst({
    where: { complianceContaId },
    orderBy: { criadoEm: "desc" },
    select: { numero: true },
  });
  const atual = Number(ultimo?.numero?.replace(/\D/g, "") ?? 0);
  return `RC-${String(atual + 1).padStart(4, "0")}`;
}

/**
 * Pede o relatório completo de uma empresa e gera a cobrança.
 *
 * Nada é consultado agora: o pedido nasce aguardando pagamento, e as consultas
 * pagas (certidões, processos) só rodam quando o webhook do Asaas confirmar
 * que o dinheiro entrou. É o que separa vender por peça de trabalhar de graça.
 */
export async function pedirRelatorioCompleto(complianceEmpresaId: string): Promise<ResultadoAcao> {
  const { usuario, conta } = await exigirEdicaoCompliance();

  const empresa = await prisma.complianceEmpresa.findFirst({
    where: { id: complianceEmpresaId, complianceContaId: conta.id },
  });
  if (!empresa) return { erro: "Empresa não encontrada." };
  if (!empresa.documento) return { erro: "Cadastre o CNPJ da empresa antes de pedir o relatório." };

  const jaEmAndamento = await prisma.complianceRelatorioPedido.findFirst({
    where: {
      complianceEmpresaId,
      situacao: { in: ["AGUARDANDO_PAGAMENTO", "PAGO", "EM_EXECUCAO"] },
    },
  });
  if (jaEmAndamento) {
    return {
      erro:
        jaEmAndamento.situacao === "AGUARDANDO_PAGAMENTO"
          ? `Já existe o pedido ${jaEmAndamento.numero} aguardando pagamento para esta empresa.`
          : `O pedido ${jaEmAndamento.numero} desta empresa já está em andamento.`,
    };
  }

  if (!asaasConfigurado()) return { erro: "Pagamento não configurado no momento. Tente novamente mais tarde." };

  const valor = await precoDoRelatorio();

  // Cliente Asaas da conta — criado na primeira compra, reaproveitado depois.
  let asaasCustomerId = conta.asaasCustomerId;
  if (!asaasCustomerId) {
    if (!conta.documento) {
      return { erro: "Informe o CNPJ da sua empresa em Assinatura antes de comprar — ele é obrigatório na cobrança." };
    }
    const criado = await criarClienteAsaas({
      nome: conta.nome,
      email: conta.emailContato || usuario.email,
      documento: conta.documento,
      referenciaExterna: `COMPLIANCE_EMPRESA:${conta.id}`,
    });
    if (!criado.ok) return { erro: `Não foi possível cadastrar o pagamento: ${criado.erro}` };

    asaasCustomerId = criado.dados.id;
    await prisma.complianceConta.update({ where: { id: conta.id }, data: { asaasCustomerId } });
  }

  const pedido = await prisma.complianceRelatorioPedido.create({
    data: {
      complianceContaId: conta.id,
      complianceEmpresaId,
      numero: await proximoNumeroRelatorio(conta.id),
      situacao: "AGUARDANDO_PAGAMENTO",
      valor,
      solicitadoPorId: usuario.id,
    },
  });

  const vencimento = new Date();
  vencimento.setDate(vencimento.getDate() + 3);

  const cobranca = await criarCobrancaAvulsaAsaas({
    asaasCustomerId,
    valor,
    formaPagamento: "PIX",
    vencimentoEm: vencimento.toISOString().slice(0, 10),
    descricao: `${pedido.numero} — Relatório de compliance: ${empresa.nome}`,
    referenciaExterna: `RELATORIO:COMPLIANCE_EMPRESA:${pedido.id}`,
  });

  if (!cobranca.ok) {
    await prisma.complianceRelatorioPedido.delete({ where: { id: pedido.id } });
    return { erro: `Não foi possível gerar a cobrança: ${cobranca.erro}` };
  }

  await prisma.complianceRelatorioPedido.update({
    where: { id: pedido.id },
    data: { asaasCobrancaId: cobranca.dados.id, linkPagamento: cobranca.dados.invoiceUrl },
  });

  revalidatePath(`/compliance/painel/empresas/${complianceEmpresaId}`);
  return { ok: true };
}

/** Manda rodar de novo um relatório já pago que falhou no meio — sem cobrar outra vez. */
export async function reexecutarRelatorio(pedidoId: string): Promise<ResultadoAcao> {
  const { conta } = await exigirEdicaoCompliance();

  const pedido = await prisma.complianceRelatorioPedido.findFirst({
    where: { id: pedidoId, complianceContaId: conta.id },
  });
  if (!pedido) return { erro: "Pedido não encontrado." };
  if (pedido.situacao !== "PAGO") return { erro: "Só um pedido pago e parado pode ser gerado de novo." };

  const r = await executarRelatorioPago(pedidoId);
  revalidatePath(`/compliance/painel/empresas/${pedido.complianceEmpresaId}`);
  return r.ok ? { ok: true } : { erro: r.erro };
}

/**
 * Tira a lista de processos de dentro da resposta guardada da consulta.
 *
 * A resposta crua é a prova do que o tribunal devolveu, e fica salva inteira.
 * Aqui só se extrai o que vai para a tabela do relatório — e, quando a
 * listagem foi cortada pelo limite de páginas, o aviso de que o número é um
 * piso vai junto, para o documento não sugerir uma contagem fechada.
 */
function extrairProcessos(bruto: unknown): {
  processos: Array<{ numero: string | null; classe: string | null; assunto: string | null; foro: string | null; vara: string | null }>;
  avisoParcial: string | null;
} {
  const vazio = { processos: [], avisoParcial: null };
  if (!bruto || typeof bruto !== "object") return vazio;

  const dados = (bruto as { data?: unknown[] }).data;
  const registro = Array.isArray(dados) ? (dados[0] as Record<string, unknown> | undefined) : undefined;
  if (!registro) return vazio;

  const lista = Array.isArray(registro.processos) ? (registro.processos as Record<string, unknown>[]) : [];
  if (lista.length === 0) return vazio;

  const ler = (r: Record<string, unknown>, chave: string) => {
    const v = r[chave];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };

  const paginas = Number(registro.paginas ?? 1) || 1;
  // 25 processos por página é o tamanho que o TJSP devolve; se o total de
  // páginas indica mais do que veio, a leitura foi cortada.
  const parcial = paginas * 25 > lista.length + 24;

  return {
    processos: lista.map((p) => ({
      numero: ler(p, "processo"),
      classe: ler(p, "classe"),
      assunto: ler(p, "assunto"),
      foro: ler(p, "foro"),
      vara: ler(p, "vara"),
    })),
    avisoParcial: parcial
      ? `ATENÇÃO: a busca no tribunal devolveu ${paginas} páginas de resultado e a leitura parou antes do fim. ` +
        `Os ${lista.length} processos acima são um piso, não a lista completa — há outros não relacionados aqui.`
      : null,
  };
}
