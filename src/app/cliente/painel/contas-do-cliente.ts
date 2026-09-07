/**
 * Descobre em quais soluções o cliente já tem conta.
 *
 * A ligação é pelo e-mail — é a mesma que o acesso direto sempre usou. Antes
 * o hub dependia de uma tabela própria de assinaturas, criada por ele mesmo
 * no momento de assinar; como agora quem cria a conta é cada solução, o hub
 * precisa DESCOBRIR o que existe em vez de listar o que ele registrou.
 *
 * Continua sendo uma consulta por solução, na tabela daquela solução.
 */
import { prisma } from "@/lib/prisma";

export type ContaEncontrada = {
  contaId: string;
  statusAssinatura: string | null;
};

export async function contaDaSolucaoPorEmail(solucao: string, email: string): Promise<ContaEncontrada | null> {
  switch (solucao) {
    case "GESTAO_ATIVOS": {
      const u = await prisma.usuario.findFirst({ where: { email, ativo: true }, include: { organizacao: true } });
      return u ? { contaId: u.organizacaoId, statusAssinatura: u.organizacao.statusAssinatura } : null;
    }
    case "LICITACOES": {
      const u = await prisma.licitacaoUsuario.findFirst({ where: { email, ativo: true }, include: { licitacaoConta: true } });
      return u ? { contaId: u.licitacaoContaId, statusAssinatura: u.licitacaoConta.statusAssinatura } : null;
    }
    case "COMPLIANCE_EMPRESA": {
      const u = await prisma.complianceUsuario.findFirst({ where: { email, ativo: true }, include: { complianceConta: true } });
      return u ? { contaId: u.complianceContaId, statusAssinatura: u.complianceConta.statusAssinatura } : null;
    }
    case "DILIGENCIA_PESSOA": {
      const u = await prisma.diligenciaUsuario.findFirst({ where: { email, ativo: true }, include: { diligenciaConta: true } });
      return u ? { contaId: u.diligenciaContaId, statusAssinatura: u.diligenciaConta.statusAssinatura } : null;
    }
    case "VERIFICACAO_DOCUMENTOS": {
      const u = await prisma.verificacaoUsuario.findFirst({ where: { email, ativo: true }, include: { verificacaoConta: true } });
      return u ? { contaId: u.verificacaoContaId, statusAssinatura: u.verificacaoConta.statusAssinatura } : null;
    }
    case "CONSULTA_CADASTRAL_SERASA": {
      const u = await prisma.serasaUsuario.findFirst({ where: { email, ativo: true }, include: { serasaConta: true } });
      return u ? { contaId: u.serasaContaId, statusAssinatura: u.serasaConta.statusAssinatura } : null;
    }
    case "AGROJUD": {
      const u = await prisma.agroUsuario.findFirst({ where: { email, ativo: true }, include: { agroConta: true } });
      return u ? { contaId: u.agroContaId, statusAssinatura: u.agroConta.statusAssinatura } : null;
    }
    default:
      return null;
  }
}
