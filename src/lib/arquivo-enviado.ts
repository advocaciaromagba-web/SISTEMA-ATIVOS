/**
 * Reconhecer um arquivo vindo de formulário sem depender do global `File`.
 *
 * POR QUE ISTO EXISTE: `File` só passou a ser global no Node a partir da
 * versão 20. O `package.json` aceita Node >= 18.18, e o servidor de produção
 * roda numa versão onde esse global NÃO existe. O resultado era
 * `ReferenceError: File is not defined` — e, como isso acontecia dentro de uma
 * Server Action, a tela inteira virava "Application error", sem mensagem, em
 * TODOS os envios de arquivo da plataforma. Funcionava na máquina de
 * desenvolvimento (Node 24) e quebrava em produção: o pior tipo de defeito,
 * porque passa por todo teste local.
 *
 * A checagem aqui é pelo formato do objeto, não pela classe. Vale em qualquer
 * versão do Node, e continua valendo se amanhã a plataforma mudar de runtime.
 */

export type ArquivoEnviado = {
  name: string;
  size: number;
  type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export function ehArquivoEnviado(valor: unknown): valor is ArquivoEnviado {
  if (valor === null || typeof valor !== "object") return false;

  const candidato = valor as Record<string, unknown>;
  return (
    typeof candidato.arrayBuffer === "function" &&
    typeof candidato.size === "number" &&
    typeof candidato.name === "string"
  );
}

/** Arquivo presente e com conteúdo — o caso que quase todo formulário quer. */
export function arquivoComConteudo(valor: unknown): valor is ArquivoEnviado {
  return ehArquivoEnviado(valor) && valor.size > 0;
}
