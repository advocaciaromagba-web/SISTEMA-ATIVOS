/**
 * Consulta ao SERASA — ainda sem contrato assinado.
 *
 * O sistema inteiro (conta, login, crédito, histórico de consultas) já está
 * pronto. O que falta é só isto aqui: a chamada de verdade à API do SERASA,
 * que só dá para escrever depois de ter o contrato e a documentação deles em
 * mãos. Enquanto isso, `serasaConfigurado()` avisa com honestidade que a
 * fonte não está ligada — o mesmo padrão já usado para `ANTHROPIC_API_KEY`,
 * `DATAJUD_API_KEY` e `TRANSPARENCIA_API_KEY`: a tela não esconde a
 * limitação, e ninguém é cobrado por uma consulta que não rodou.
 */

/** Preço por consulta, em reais. Ajustar quando o custo real do SERASA for conhecido. */
export const PRECO_CONSULTA = 19.9;

export function serasaConfigurado(): boolean {
  return Boolean((process.env.SERASA_API_KEY ?? "").trim());
}

export type ResultadoConsultaSerasa =
  | { ok: true; resultado: unknown }
  | { ok: false; erro: string };

export async function consultarSerasa(params: {
  documento: string;
  tipoPessoa: "PF" | "PJ";
}): Promise<ResultadoConsultaSerasa> {
  if (!serasaConfigurado()) {
    return {
      ok: false,
      erro: "A integração com o SERASA ainda não está configurada (falta SERASA_API_KEY). A consulta fica registrada, sem custo, para rodar assim que a chave for cadastrada.",
    };
  }

  // TODO: chamada real à API do SERASA — endpoint, autenticação e formato
  // de resposta dependem do contrato ainda não assinado. Implementar aqui
  // quando a documentação estiver disponível.
  return { ok: false, erro: "Integração com o SERASA configurada, mas a chamada ainda não foi implementada." };
}
