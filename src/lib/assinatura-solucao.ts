/**
 * Assinatura paga, DENTRO de cada solução.
 *
 * Antes isto morava no hub do cliente: uma tela só assinava qualquer solução,
 * usando uma tabela de preços comum. Era o ponto onde tudo se misturava — e
 * era também o segundo caminho para a mesma compra, já que cada solução tem o
 * próprio cadastro. Dois caminhos para comprar a mesma coisa dobram o que pode
 * dar errado.
 *
 * Agora a assinatura pertence à conta da própria solução: o identificador de
 * cobrança fica na conta dela, o preço é o dela, e cancelar ali não toca em
 * mais nada. Os campos `asaasCustomerId` e `asaasSubscriptionId` já existiam
 * em cada modelo de conta — só não estavam sendo usados.
 */
import { modelo } from "@/lib/modelo-prisma";
import { precoParaCobranca, configuracaoDaSolucao, planoDaSolucao } from "@/lib/planos-solucao";
import {
  asaasConfigurado,
  criarClienteAsaas,
  criarAssinaturaAsaas,
  cancelarAssinaturaAsaas,
  type FormaPagamento,
  type CicloCobranca,
} from "@/lib/asaas/cliente";

/** Onde mora a conta de cada solução, e como ela se chama para o cliente. */
export const CONTA_DA_SOLUCAO: Record<string, { modelo: string; nome: string }> = {
  GESTAO_ATIVOS: { modelo: "organizacao", nome: "Gestão de ativos" },
  LICITACOES: { modelo: "licitacaoConta", nome: "Análise de licitações" },
  COMPLIANCE_EMPRESA: { modelo: "complianceConta", nome: "Compliance de empresas" },
  DILIGENCIA_PESSOA: { modelo: "diligenciaConta", nome: "Due diligence de pessoas" },
  VERIFICACAO_DOCUMENTOS: { modelo: "verificacaoConta", nome: "Verificação de documentos" },
  AGROJUD: { modelo: "agroConta", nome: "Agrojud" },
};

export type ResultadoAssinatura = { erro?: string; ok?: true };

function somenteDigitos(v: string): string {
  return v.replace(/\D/g, "");
}

/** CPF ou CNPJ pelo tamanho. O Asaas confere o resto. */
function documentoValido(v: string): boolean {
  const d = somenteDigitos(v);
  return d.length === 11 || d.length === 14;
}

type ContaParaCobranca = {
  id: string;
  nome: string;
  documento: string | null;
  emailContato: string | null;
  asaasCustomerId: string | null;
  asaasSubscriptionId: string | null;
  statusAssinatura: string | null;
};

/**
 * Toda conta guarda o CPF/CNPJ num campo chamado `documento` — MENOS a
 * Organizacao (Gestão de Ativos), a solução mais antiga, que usa `cnpj` por
 * ser anterior a essa convenção. `linha.documento` sozinho voltaria sempre
 * `undefined` para ela, obrigando a pedir o documento de novo a cada
 * assinatura mesmo quando o CNPJ já estava cadastrado.
 */
function campoDocumento(modeloConta: string): "documento" | "cnpj" {
  return modeloConta === "organizacao" ? "cnpj" : "documento";
}

async function lerConta(solucao: string, contaId: string): Promise<ContaParaCobranca | null> {
  const dest = CONTA_DA_SOLUCAO[solucao];
  if (!dest) return null;
  const linha = await modelo(dest.modelo).findUnique({ where: { id: contaId } });
  if (!linha) return null;

  return {
    id: String(linha.id),
    nome: String(linha.nome ?? ""),
    documento: (linha[campoDocumento(dest.modelo)] as string | null) ?? null,
    emailContato: (linha.emailContato as string | null) ?? null,
    asaasCustomerId: (linha.asaasCustomerId as string | null) ?? null,
    asaasSubscriptionId: (linha.asaasSubscriptionId as string | null) ?? null,
    statusAssinatura: (linha.statusAssinatura as string | null) ?? null,
  };
}

/**
 * Programa a cobrança recorrente desta solução.
 *
 * Ninguém paga nada agora: a primeira cobrança é marcada para quando o teste
 * daquela solução terminar. Quem confirma o pagamento e promove a conta é o
 * webhook — aqui só se agenda.
 */
export async function assinarSolucao(params: {
  solucao: string;
  contaId: string;
  emailContato: string;
  planoChave: string;
  ciclo: CicloCobranca;
  formaPagamento: FormaPagamento;
  documentoInformado?: string | null;
}): Promise<ResultadoAssinatura> {
  const dest = CONTA_DA_SOLUCAO[params.solucao];
  if (!dest) return { erro: "Esta solução não trabalha com assinatura recorrente." };
  if (!asaasConfigurado()) return { erro: "Pagamento não configurado no momento. Tente novamente mais tarde." };

  if (params.ciclo !== "MENSAL" && params.ciclo !== "ANUAL") return { erro: "Ciclo inválido." };
  if (params.formaPagamento !== "PIX" && params.formaPagamento !== "CREDIT_CARD") {
    return { erro: "Forma de pagamento inválida." };
  }

  const conta = await lerConta(params.solucao, params.contaId);
  if (!conta) return { erro: "Conta não encontrada." };
  if (conta.asaasSubscriptionId) return { erro: "Esta conta já tem uma assinatura ativa." };

  // O preço vem da PRÓPRIA solução. Não existe caminho aqui que leia o preço
  // de outra — a função exige a solução junto da chave do plano.
  const plano = await planoDaSolucao(params.solucao, params.planoChave);
  if (!plano || !plano.ativo) return { erro: "Escolha um plano disponível." };

  const valor = await precoParaCobranca(params.solucao, params.planoChave, params.ciclo);
  if (valor === null || valor <= 0) return { erro: "Este plano está sem preço cadastrado. Fale com o suporte." };

  // O documento só é pedido aqui, na primeira vez que alguém vai ser cobrado
  // de verdade — o cadastro continua pedindo só nome, e-mail e senha.
  let documento = conta.documento;
  if (!documento) {
    const informado = (params.documentoInformado ?? "").trim();
    if (!documentoValido(informado)) return { erro: "Informe um CPF ou CNPJ válido para a cobrança." };
    documento = somenteDigitos(informado);
  }

  let asaasCustomerId = conta.asaasCustomerId;
  if (!asaasCustomerId) {
    const criado = await criarClienteAsaas({
      nome: conta.nome,
      email: params.emailContato,
      documento,
      referenciaExterna: `${params.solucao}:${conta.id}`,
    });
    if (!criado.ok) return { erro: `Não foi possível cadastrar o pagamento: ${criado.erro}` };
    asaasCustomerId = criado.dados.id;
  }

  const { diasDeTeste } = await configuracaoDaSolucao(params.solucao);
  const primeiraCobrancaEm = new Date(Date.now() + diasDeTeste * 24 * 60 * 60 * 1000);

  const assinatura = await criarAssinaturaAsaas({
    asaasCustomerId,
    valor,
    formaPagamento: params.formaPagamento,
    ciclo: params.ciclo,
    primeiraCobrancaEm: primeiraCobrancaEm.toISOString().slice(0, 10),
    descricao: `${dest.nome} — plano ${plano.nome} (${params.ciclo === "ANUAL" ? "anual" : "mensal"})`,
    referenciaExterna: `${params.solucao}:${conta.id}`,
  });
  if (!assinatura.ok) return { erro: `Não foi possível programar a cobrança: ${assinatura.erro}` };

  await modelo(dest.modelo).update({
    where: { id: conta.id },
    data: {
      [campoDocumento(dest.modelo)]: documento,
      asaasCustomerId,
      asaasSubscriptionId: assinatura.dados.id,
      plano: plano.chave,
    },
  });

  return { ok: true };
}

/**
 * Cancela a cobrança recorrente desta solução, e só desta.
 *
 * A ordem importa: primeiro o Asaas, depois o banco. Se fosse ao contrário e
 * o Asaas falhasse, o acesso seria encerrado e a cobrança continuaria
 * rodando por trás — o pior desfecho possível para o cliente.
 */
export async function cancelarAssinaturaDaSolucao(params: {
  solucao: string;
  contaId: string;
}): Promise<ResultadoAssinatura> {
  const dest = CONTA_DA_SOLUCAO[params.solucao];
  if (!dest) return { erro: "Solução desconhecida." };

  const conta = await lerConta(params.solucao, params.contaId);
  if (!conta) return { erro: "Conta não encontrada." };
  if (!conta.asaasSubscriptionId) return { erro: "Esta conta não tem cobrança recorrente ativa." };

  const resultado = await cancelarAssinaturaAsaas(conta.asaasSubscriptionId);
  if (!resultado.ok) return { erro: `Não foi possível cancelar a cobrança: ${resultado.erro}` };

  await modelo(dest.modelo).update({
    where: { id: conta.id },
    data: { asaasSubscriptionId: null, statusAssinatura: "CANCELADA" },
  });

  return { ok: true };
}

export type SituacaoAssinatura = {
  temCobranca: boolean;
  plano: string | null;
  statusAssinatura: string | null;
  asaasSubscriptionId: string | null;
};

export async function situacaoDaAssinatura(solucao: string, contaId: string): Promise<SituacaoAssinatura | null> {
  const dest = CONTA_DA_SOLUCAO[solucao];
  if (!dest) return null;

  const linha = await modelo(dest.modelo).findUnique({ where: { id: contaId } });
  if (!linha) return null;

  const asaasSubscriptionId = (linha.asaasSubscriptionId as string | null) ?? null;
  return {
    temCobranca: Boolean(asaasSubscriptionId),
    plano: (linha.plano as string | null) ?? null,
    statusAssinatura: (linha.statusAssinatura as string | null) ?? null,
    asaasSubscriptionId,
  };
}
