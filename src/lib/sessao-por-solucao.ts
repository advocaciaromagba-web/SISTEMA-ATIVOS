/**
 * Descobre a conta logada de uma solução, a partir da chave dela.
 *
 * Cada solução confere a própria sessão, na tabela dela — isso não muda. O que
 * este arquivo faz é permitir que uma tela compartilhada (a de assinatura)
 * pergunte "quem está logado aqui?" sem precisar existir sete vezes.
 *
 * O `switch` é explícito de propósito: cada caso chama o `exigirSessaoX()` da
 * própria solução, com as regras dela. Não há atalho genérico lendo tabela de
 * sessão comum, porque não existe sessão comum.
 */
import { exigirSessao } from "@/lib/sessao";
import { exigirSessaoLicitacoes } from "@/lib/licitacoes/sessao";
import { exigirSessaoCompliance } from "@/lib/compliance/sessao";
import { exigirSessaoDiligencia } from "@/lib/diligencia/sessao";
import { exigirSessaoVerificacao } from "@/lib/verificacao/sessao";
import { exigirSessaoAgro } from "@/lib/agro/sessao";

export type ContaLogada = {
  contaId: string;
  contaNome: string;
  emailContato: string;
  usuarioId: string;
  usuarioEmail: string;
  podeEditar: boolean;
};

export async function contaLogadaDaSolucao(solucao: string): Promise<ContaLogada | null> {
  switch (solucao) {
    case "GESTAO_ATIVOS": {
      const { organizacao, usuario } = await exigirSessao();
      return {
        contaId: organizacao.id,
        contaNome: organizacao.nome,
        emailContato: organizacao.emailContato ?? usuario.email,
        usuarioId: usuario.id,
        usuarioEmail: usuario.email,
        podeEditar: usuario.papel !== "LEITOR",
      };
    }
    case "LICITACOES": {
      const { conta, usuario } = await exigirSessaoLicitacoes();
      return {
        contaId: conta.id,
        contaNome: conta.nome,
        emailContato: conta.emailContato ?? usuario.email,
        usuarioId: usuario.id,
        usuarioEmail: usuario.email,
        podeEditar: usuario.papel !== "LEITOR",
      };
    }
    case "COMPLIANCE_EMPRESA": {
      const { conta, usuario } = await exigirSessaoCompliance();
      return {
        contaId: conta.id,
        contaNome: conta.nome,
        emailContato: conta.emailContato ?? usuario.email,
        usuarioId: usuario.id,
        usuarioEmail: usuario.email,
        podeEditar: usuario.papel !== "LEITOR",
      };
    }
    case "DILIGENCIA_PESSOA": {
      const { conta, usuario } = await exigirSessaoDiligencia();
      return {
        contaId: conta.id,
        contaNome: conta.nome,
        emailContato: conta.emailContato ?? usuario.email,
        usuarioId: usuario.id,
        usuarioEmail: usuario.email,
        podeEditar: usuario.papel !== "LEITOR",
      };
    }
    case "VERIFICACAO_DOCUMENTOS": {
      const { conta, usuario } = await exigirSessaoVerificacao();
      return {
        contaId: conta.id,
        contaNome: conta.nome,
        emailContato: conta.emailContato ?? usuario.email,
        usuarioId: usuario.id,
        usuarioEmail: usuario.email,
        podeEditar: usuario.papel !== "LEITOR",
      };
    }
    case "AGROJUD": {
      const { conta, usuario } = await exigirSessaoAgro();
      return {
        contaId: conta.id,
        contaNome: conta.nome,
        emailContato: conta.emailContato ?? usuario.email,
        usuarioId: usuario.id,
        usuarioEmail: usuario.email,
        podeEditar: usuario.papel !== "LEITOR",
      };
    }
    default:
      return null;
  }
}
