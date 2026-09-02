// Etapa opcional, desligada por padrão: só roda se o advogado ligar
// "extração assistida por IA" nas opções e apontar o próprio servidor (veja
// ../../server). A extensão nunca chama uma API de IA diretamente com uma
// chave embutida no código — a chave fica só no servidor do próprio
// usuário, e é ele quem decide se aceita o custo.
export interface RespostaExtracaoIA {
  campos: Record<string, unknown>;
}

export async function extrairComIA(opcoes: {
  servidorUrl: string;
  arquivoBase64: string;
  nomeArquivo: string;
  camposFaltantes: string[];
}): Promise<RespostaExtracaoIA> {
  const base = opcoes.servidorUrl.replace(/\/$/, "");
  const resposta = await fetch(`${base}/extrair`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      arquivo: opcoes.arquivoBase64,
      nomeArquivo: opcoes.nomeArquivo,
      campos: opcoes.camposFaltantes,
    }),
  });
  if (!resposta.ok) {
    throw new Error(`O servidor de extração assistida por IA respondeu ${resposta.status}.`);
  }
  return (await resposta.json()) as RespostaExtracaoIA;
}

export function arquivoParaBase64(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(leitor.error ?? new Error("Falha ao ler o arquivo."));
    leitor.onload = () => {
      const resultado = String(leitor.result ?? "");
      const virgula = resultado.indexOf(",");
      resolve(virgula >= 0 ? resultado.slice(virgula + 1) : resultado);
    };
    leitor.readAsDataURL(arquivo);
  });
}
