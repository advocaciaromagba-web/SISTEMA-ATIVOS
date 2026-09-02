// Contrato de mensagens entre popup, background e content scripts. Um
// File não atravessa bem o limite entre a página do popup e o content
// script (o popup pode fechar no meio do processo), então todo anexo vira
// bytes (ArrayBuffer) antes de sair do popup, e volta a ser um File dentro
// do content script.
import type { AnexoProcesso, ChecklistDistribuicao, TipoAnexo } from "./tipos";

export interface AnexoSerializavel {
  nome: string;
  tipo: string; // MIME
  tipoAnexo: TipoAnexo;
  bytes: ArrayBuffer;
}

export type ChecklistSerializavel = Omit<ChecklistDistribuicao, "anexos"> & { anexos: AnexoSerializavel[] };

export async function serializarChecklist(checklist: ChecklistDistribuicao): Promise<ChecklistSerializavel> {
  const anexos = await Promise.all(
    checklist.anexos.map(
      async (anexo): Promise<AnexoSerializavel> => ({
        nome: anexo.arquivo.name,
        tipo: anexo.arquivo.type,
        tipoAnexo: anexo.tipo,
        bytes: await anexo.arquivo.arrayBuffer(),
      })
    )
  );
  return { ...checklist, anexos };
}

export function reconstruirChecklist(checklist: ChecklistSerializavel): ChecklistDistribuicao {
  const anexos: AnexoProcesso[] = checklist.anexos.map((anexo) => ({
    arquivo: new File([anexo.bytes], anexo.nome, { type: anexo.tipo }),
    nomeOrganizado: anexo.nome,
    tipo: anexo.tipoAnexo,
  }));
  return { ...checklist, anexos };
}

export type MensagemParaConteudo =
  | { tipo: "verificar-suporte" }
  | { tipo: "preencher-distribuicao"; checklist: ChecklistSerializavel };

export type MensagemDoConteudo =
  | { tipo: "suporte"; suportado: boolean; nomeTribunal: string }
  | { tipo: "progresso-preenchimento"; etapa: string; nomeTribunal: string }
  | { tipo: "preenchimento-concluido"; nomeTribunal: string }
  | { tipo: "preenchimento-erro"; mensagem: string; nomeTribunal: string };
