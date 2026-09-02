import { lerPreferencias, salvarPreferencias } from "../armazenamento";

const caixaIa = document.getElementById("ia-ligada") as HTMLInputElement;
const campoServidor = document.getElementById("servidor-url") as HTMLInputElement;
const botaoSalvar = document.getElementById("salvar") as HTMLButtonElement;
const confirmacao = document.getElementById("confirmacao") as HTMLParagraphElement;

async function carregar(): Promise<void> {
  const preferencias = await lerPreferencias();
  caixaIa.checked = preferencias.extracaoAssistidaPorIaLigada;
  campoServidor.value = preferencias.servidorExtracaoUrl;
}

botaoSalvar.addEventListener("click", async () => {
  await salvarPreferencias({
    extracaoAssistidaPorIaLigada: caixaIa.checked,
    servidorExtracaoUrl: campoServidor.value.trim() || "http://localhost:8787",
  });
  confirmacao.textContent = "Salvo.";
  setTimeout(() => (confirmacao.textContent = ""), 2000);
});

void carregar();
