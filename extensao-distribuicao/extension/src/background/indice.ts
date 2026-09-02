// Service worker: não fala diretamente com o formulário do tribunal (isso
// é trabalho do content script) nem monta a tela (isso é do popup). Só
// acompanha o status do preenchimento — útil porque o popup pode fechar no
// meio de um preenchimento de várias etapas — e mostra isso no ícone.
import type { MensagemDoConteudo } from "../mensagens";
import { salvarUltimoStatus } from "../armazenamento";

chrome.runtime.onInstalled.addListener((detalhes) => {
  if (detalhes.reason === "install") {
    chrome.runtime.openOptionsPage();
  }
});

function definirIcone(cor: "cinza" | "azul" | "verde" | "vermelho"): void {
  const texto: Record<typeof cor, string> = {
    cinza: "",
    azul: "...",
    verde: "OK",
    vermelho: "!",
  };
  const corDeFundo: Record<typeof cor, string> = {
    cinza: "#9ca3af",
    azul: "#2563eb",
    verde: "#16a34a",
    vermelho: "#dc2626",
  };
  chrome.action.setBadgeText({ text: texto[cor] });
  chrome.action.setBadgeBackgroundColor({ color: corDeFundo[cor] });
}

chrome.runtime.onMessage.addListener((mensagem: MensagemDoConteudo) => {
  if (mensagem.tipo === "progresso-preenchimento") {
    definirIcone("azul");
    void salvarUltimoStatus({ estado: "em-andamento", etapa: mensagem.etapa, tribunal: mensagem.nomeTribunal });
  } else if (mensagem.tipo === "preenchimento-concluido") {
    definirIcone("verde");
    void salvarUltimoStatus({ estado: "concluido", tribunal: mensagem.nomeTribunal });
  } else if (mensagem.tipo === "preenchimento-erro") {
    definirIcone("vermelho");
    void salvarUltimoStatus({ estado: "erro", mensagem: mensagem.mensagem, tribunal: mensagem.nomeTribunal });
  }
  return false;
});
