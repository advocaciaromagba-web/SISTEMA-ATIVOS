/**
 * Adapta a conta e o usuário de Compliance para o formato que o motor de
 * documentos espera — mesma solução usada em `src/lib/licitacoes/contexto.ts`.
 * Não lê nem grava a tabela `Organizacao`: monta em memória um objeto no
 * formato que `cabecalho()`/`foro()` já sabem ler.
 */
import type { ComplianceConta, ComplianceUsuario, Organizacao, Usuario } from "@prisma/client";

export function contaComplianceComoOrganizacao(conta: ComplianceConta): Organizacao {
  return {
    id: conta.id,
    nome: conta.nome,
    razaoSocial: conta.razaoSocial,
    cnpj: conta.tipo === "PJ" ? conta.documento : null,
    emailContato: conta.emailContato,
    telefone: conta.telefone,
    enderecoRua: conta.enderecoRua,
    enderecoNumero: conta.enderecoNumero,
    enderecoComplemento: conta.enderecoComplemento,
    enderecoBairro: conta.enderecoBairro,
    enderecoCidade: conta.enderecoCidade,
    enderecoUf: conta.enderecoUf,
    enderecoCep: conta.enderecoCep,
    logo: null,
    logoTipo: null,
    foroCidade: null,
    foroUf: null,
    plano: conta.plano,
    statusAssinatura: conta.statusAssinatura,
    testeExpiraEm: conta.testeExpiraEm,
    assinaturaAte: conta.assinaturaAte,
    asaasCustomerId: conta.asaasCustomerId,
    asaasSubscriptionId: conta.asaasSubscriptionId,
    ativa: conta.ativa,
    criadoEm: conta.criadoEm,
    atualizadoEm: conta.atualizadoEm,
  } as unknown as Organizacao;
}

export function usuarioComplianceComoUsuario(usuario: ComplianceUsuario): Usuario {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    papel: usuario.papel,
    ativo: usuario.ativo,
    criadoEm: usuario.criadoEm,
    atualizadoEm: usuario.atualizadoEm,
  } as unknown as Usuario;
}
