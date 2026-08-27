/**
 * Adapta a conta e o usuário da solução de Licitações para o formato que o
 * motor de documentos espera.
 *
 * `ContextoDocumento` foi desenhado para a Gestão de Ativos e pede um
 * `Organizacao` e um `Usuario` do Prisma — são esses tipos que `cabecalho()`,
 * `foro()` e outras partes do motor leem. Como as duas soluções não
 * compartilham tabela, a conta e o usuário de Licitações não SÃO um
 * `Organizacao`/`Usuario` — mas o motor de montagem do .docx (cabeçalho,
 * rodapé, local e data) é utilitário genérico, não dado de outra solução, e
 * pode ser reaproveitado com os campos remapeados.
 *
 * Isto não lê nem grava na tabela `Organizacao`: apenas monta, em memória,
 * um objeto com o formato que o motor espera.
 */
import type { LicitacaoConta, LicitacaoUsuario, Organizacao, Usuario } from "@prisma/client";

export function contaComoOrganizacao(conta: LicitacaoConta): Organizacao {
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
    // Sem timbre próprio ainda nesta solução: o rodapé sai sem logo em vez
    // de usar, por engano, a marca de outra conta.
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

export function usuarioLicitacoesComoUsuario(usuario: LicitacaoUsuario): Usuario {
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
