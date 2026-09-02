import { checklistVazio, NOME_TRIBUNAL, type ChecklistDistribuicao, type IdTribunal } from "../tipos";
import { lerPeticaoInicial } from "../ocr/indice";
import { prepararDocumento } from "../organizar/preparar-pdf";
import { nomearArquivo } from "../organizar/nomear-arquivo";
import { conferirChecklist, type Pendencia } from "../campos/obrigatorios";
import { renderizarChecklist } from "./revisao";
import { lerPreferencias } from "../armazenamento";
import { arquivoParaBase64, extrairComIA } from "../ocr/extrair-com-ia";
import { serializarChecklist, type MensagemDoConteudo, type MensagemParaConteudo } from "../mensagens";

const elementoStatus = document.getElementById("status") as HTMLDivElement;
const elementoPendencias = document.getElementById("pendencias") as HTMLDivElement;
const elementoChecklist = document.getElementById("checklist") as HTMLDivElement;
const botaoPreencher = document.getElementById("botao-preencher") as HTMLButtonElement;
const seletorTribunal = document.getElementById("seletor-tribunal") as HTMLSelectElement;
const inputPeticao = document.getElementById("arquivo-peticao") as HTMLInputElement;
const inputAnexos = document.getElementById("arquivo-anexos") as HTMLInputElement;

let checklistAtual: ChecklistDistribuicao = checklistVazio();
let pendenciasAtuais: Pendencia[] = [];

function definirStatus(texto: string): void {
  elementoStatus.textContent = texto;
}

function atualizarPendencias(pendencias: Pendencia[]): void {
  pendenciasAtuais = pendencias;
  if (pendencias.length === 0) {
    elementoPendencias.classList.add("vazio");
    elementoPendencias.textContent = "";
  } else {
    elementoPendencias.classList.remove("vazio");
    elementoPendencias.textContent = `Falta revisar: ${pendencias.map((p) => `${p.rotulo} (${p.motivo})`).join("; ")}`;
  }
  botaoPreencher.disabled = pendencias.length > 0 || checklistAtual.anexos.length === 0;
}

function renderizarTudo(): void {
  renderizarChecklist(elementoChecklist, checklistAtual, atualizarPendencias);
}

async function tentarExtracaoAssistidaPorIa(arquivo: File): Promise<void> {
  const preferencias = await lerPreferencias();
  if (!preferencias.extracaoAssistidaPorIaLigada) return;

  const pendencias = conferirChecklist(checklistAtual);
  if (pendencias.length === 0) return;

  definirStatus("Consultando extração assistida por IA para os campos que faltaram...");
  try {
    const base64 = await arquivoParaBase64(arquivo);
    const resposta = await extrairComIA({
      servidorUrl: preferencias.servidorExtracaoUrl,
      arquivoBase64: base64,
      nomeArquivo: arquivo.name,
      camposFaltantes: pendencias.map((p) => p.chave),
    });
    const campos = resposta.campos as Partial<{ classeProcessual: string; assuntoPrincipal: string; valorCausa: number }>;
    if (campos.classeProcessual && !checklistAtual.classeProcessual.valor) {
      checklistAtual.classeProcessual = { valor: campos.classeProcessual, confianca: "media", origem: "ia" };
    }
    if (campos.assuntoPrincipal && !checklistAtual.assuntoPrincipal.valor) {
      checklistAtual.assuntoPrincipal = { valor: campos.assuntoPrincipal, confianca: "media", origem: "ia" };
    }
    if (typeof campos.valorCausa === "number" && checklistAtual.valorCausa.valor === null) {
      checklistAtual.valorCausa = { valor: campos.valorCausa, confianca: "media", origem: "ia" };
    }
  } catch (erro) {
    definirStatus(`Extração assistida por IA falhou (seguindo só com o que já foi lido): ${erro instanceof Error ? erro.message : erro}`);
    return;
  }
  definirStatus("Extração assistida por IA concluída — revise os campos abaixo.");
}

inputPeticao.addEventListener("change", async () => {
  const arquivo = inputPeticao.files?.[0];
  if (!arquivo) return;

  botaoPreencher.disabled = true;
  try {
    const resultado = await lerPeticaoInicial(arquivo, definirStatus);
    checklistAtual = resultado.checklist;

    definirStatus("Organizando a petição inicial em PDF...");
    const pdfOrganizado = await prepararDocumento(arquivo);
    const nomeOrganizado = nomearArquivo({
      classeProcessual: checklistAtual.classeProcessual.valor,
      parteAutora: checklistAtual.poloAtivo[0]?.nome,
      tipoAnexo: "peticao_inicial",
    });
    checklistAtual.anexos.unshift({
      arquivo: new File([pdfOrganizado.slice().buffer as ArrayBuffer], nomeOrganizado, { type: "application/pdf" }),
      nomeOrganizado,
      tipo: "peticao_inicial",
    });

    await tentarExtracaoAssistidaPorIa(arquivo);
    definirStatus("Leitura concluída. Revise os campos abaixo antes de preencher no tribunal.");
    renderizarTudo();
  } catch (erro) {
    definirStatus(`Não foi possível ler o arquivo: ${erro instanceof Error ? erro.message : erro}`);
  }
});

inputAnexos.addEventListener("change", async () => {
  const arquivos = Array.from(inputAnexos.files ?? []);
  for (const arquivo of arquivos) {
    try {
      const pdfOrganizado = await prepararDocumento(arquivo);
      const nomeOrganizado = nomearArquivo({
        classeProcessual: checklistAtual.classeProcessual.valor,
        parteAutora: checklistAtual.poloAtivo[0]?.nome,
        tipoAnexo: "outro",
      });
      checklistAtual.anexos.push({
        arquivo: new File([pdfOrganizado.slice().buffer as ArrayBuffer], nomeOrganizado, { type: "application/pdf" }),
        nomeOrganizado,
        tipo: "outro",
      });
    } catch (erro) {
      definirStatus(`Não foi possível organizar "${arquivo.name}": ${erro instanceof Error ? erro.message : erro}`);
    }
  }
  renderizarTudo();
  inputAnexos.value = "";
});

async function abaAtiva(): Promise<chrome.tabs.Tab | undefined> {
  const [aba] = await chrome.tabs.query({ active: true, currentWindow: true });
  return aba;
}

botaoPreencher.addEventListener("click", async () => {
  const aba = await abaAtiva();
  if (!aba?.id) {
    definirStatus("Não encontrei a aba ativa.");
    return;
  }

  const tribunalEscolhido = seletorTribunal.value as IdTribunal;
  botaoPreencher.disabled = true;
  try {
    const suporte = (await chrome.tabs.sendMessage(aba.id, { tipo: "verificar-suporte" } satisfies MensagemParaConteudo)) as
      | MensagemDoConteudo
      | undefined;
    if (!suporte || suporte.tipo !== "suporte" || !suporte.suportado) {
      definirStatus(
        `A aba ativa não parece ser a tela de peticionamento inicial do ${NOME_TRIBUNAL[tribunalEscolhido]}. Abra a tela correta e tente de novo.`
      );
      return;
    }

    definirStatus(`Preenchendo no ${suporte.nomeTribunal}...`);
    const checklistSerializavel = await serializarChecklist(checklistAtual);
    await chrome.tabs.sendMessage(aba.id, { tipo: "preencher-distribuicao", checklist: checklistSerializavel } satisfies MensagemParaConteudo);
  } catch (erro) {
    definirStatus(`Falha ao falar com a aba: ${erro instanceof Error ? erro.message : erro}`);
  } finally {
    botaoPreencher.disabled = pendenciasAtuais.length > 0;
  }
});

chrome.runtime.onMessage.addListener((mensagem: MensagemDoConteudo) => {
  if (mensagem.tipo === "progresso-preenchimento") {
    definirStatus(`${mensagem.nomeTribunal}: ${mensagem.etapa}`);
  } else if (mensagem.tipo === "preenchimento-concluido") {
    definirStatus(`${mensagem.nomeTribunal}: preenchido até a revisão. Confira e protocole você mesmo na aba do tribunal.`);
  } else if (mensagem.tipo === "preenchimento-erro") {
    definirStatus(`${mensagem.nomeTribunal}: ${mensagem.mensagem}`);
  }
  return false;
});

renderizarTudo();
