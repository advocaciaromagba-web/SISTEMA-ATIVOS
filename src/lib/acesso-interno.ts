/**
 * Marca da conta interna da Blackbird dentro de cada solução.
 *
 * Fica num arquivo sozinho, sem nenhuma dependência, porque é lido tanto pelas
 * telas quanto pelo login de todas as soluções — e um arquivo com dependência
 * pesada aqui puxaria bcrypt e otplib para dentro de qualquer página que só
 * queira saber se a conta é interna.
 *
 * O valor mora no campo `statusAssinatura` que todas as sete soluções já têm.
 * Isso não é economia de campo: é o que faz as travas existentes funcionarem
 * sozinhas. Cada cota de teste pergunta `statusAssinatura === "TESTE"`, e
 * "INTERNA" não é "TESTE" — passa direto, sem precisar alterar cada trava.
 * Pelo mesmo motivo não é "ATIVA": conta interna não pode ser contada como
 * receita no financeiro nem entrar em cobrança do Asaas.
 */
export const STATUS_INTERNA = "INTERNA";

export const NOME_CONTA_INTERNA = "Blackbird — acesso interno";

export function ehAcessoInterno(statusAssinatura?: string | null): boolean {
  return statusAssinatura === STATUS_INTERNA;
}
