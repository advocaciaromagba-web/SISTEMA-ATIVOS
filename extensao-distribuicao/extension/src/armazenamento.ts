// Único lugar que fala com chrome.storage — evita espalhar `chrome.storage.local.get`
// com chaves soltas pelo código.
export interface Preferencias {
  extracaoAssistidaPorIaLigada: boolean;
  servidorExtracaoUrl: string;
}

const PADRAO: Preferencias = {
  extracaoAssistidaPorIaLigada: false,
  servidorExtracaoUrl: "http://localhost:8787",
};

const CHAVE = "preferencias";

export async function lerPreferencias(): Promise<Preferencias> {
  const armazenado = await chrome.storage.local.get(CHAVE);
  return { ...PADRAO, ...(armazenado[CHAVE] as Partial<Preferencias> | undefined) };
}

export async function salvarPreferencias(preferencias: Preferencias): Promise<void> {
  await chrome.storage.local.set({ [CHAVE]: preferencias });
}

export type StatusPreenchimento =
  | { estado: "em-andamento"; etapa: string; tribunal: string }
  | { estado: "concluido"; tribunal: string }
  | { estado: "erro"; mensagem: string; tribunal: string };

const CHAVE_STATUS = "ultimoStatusPreenchimento";

export async function lerUltimoStatus(): Promise<StatusPreenchimento | null> {
  const armazenado = await chrome.storage.session.get(CHAVE_STATUS);
  return (armazenado[CHAVE_STATUS] as StatusPreenchimento | undefined) ?? null;
}

export async function salvarUltimoStatus(status: StatusPreenchimento): Promise<void> {
  await chrome.storage.session.set({ [CHAVE_STATUS]: status });
}
