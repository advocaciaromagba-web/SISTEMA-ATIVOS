// Peças comuns a qualquer adaptador de tribunal. Importante: nenhum
// adaptador tem, e nenhum deve ganhar, uma etapa que clique no botão final
// de protocolar/assinar e enviar — quem faz isso é sempre o advogado,
// olhando a tela real do tribunal. `garantirQueNaoEBotaoFinal` é o
// cinto-de-segurança em código para essa regra.
import type { ChecklistDistribuicao, IdTribunal } from "../tipos";
import { normalizarTexto } from "../texto";
import { reconstruirChecklist, type MensagemDoConteudo, type MensagemParaConteudo } from "../mensagens";

const TERMOS_BOTAO_FINAL = [
  "protocolar",
  "assinar e enviar",
  "finalizar peticionamento",
  "confirmar peticionamento",
  "enviar peticao",
  "peticionar",
];

export function garantirQueNaoEBotaoFinal(elemento: Element): void {
  const texto = normalizarTexto(elemento.textContent ?? "");
  if (TERMOS_BOTAO_FINAL.some((termo) => texto.includes(termo))) {
    throw new Error(
      `Bloqueado por segurança: "${elemento.textContent?.trim()}" parece ser o botão final de protocolo. ` +
        "A extensão preenche até a revisão; protocolar é sempre um clique manual do advogado."
    );
  }
}

export async function aguardarElemento<T extends Element = Element>(seletor: string, tempoLimiteMs = 15000): Promise<T> {
  const existente = document.querySelector<T>(seletor);
  if (existente) return existente;
  return new Promise<T>((resolve, reject) => {
    const observador = new MutationObserver(() => {
      const elemento = document.querySelector<T>(seletor);
      if (elemento) {
        observador.disconnect();
        resolve(elemento);
      }
    });
    observador.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      observador.disconnect();
      reject(new Error(`O campo "${seletor}" não apareceu em ${tempoLimiteMs}ms — a tela do tribunal pode ter mudado.`));
    }, tempoLimiteMs);
  });
}

type CampoPreenchivel = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function ehCampoPreenchivel(elemento: Element): elemento is CampoPreenchivel {
  return elemento instanceof HTMLInputElement || elemento instanceof HTMLTextAreaElement || elemento instanceof HTMLSelectElement;
}

/** Acha o campo associado a um rótulo visível (texto de <label>, <legend>
 * ou de um elemento próximo) em vez de depender do id/nome interno do
 * formulário — muito mais estável entre instâncias diferentes do mesmo
 * sistema de tribunal, que costumam variar id gerado por framework mas
 * raramente variam o texto que o usuário lê na tela. */
export function buscarCampoPorRotulo(rotulos: string[], raiz: ParentNode = document): CampoPreenchivel | null {
  const alvo = rotulos.map(normalizarTexto);

  for (const label of Array.from(raiz.querySelectorAll("label"))) {
    const texto = normalizarTexto(label.textContent ?? "");
    if (!alvo.some((rotulo) => texto.includes(rotulo))) continue;

    const forId = label.getAttribute("for");
    if (forId) {
      const porId = document.getElementById(forId);
      if (porId && ehCampoPreenchivel(porId)) return porId;
    }
    const dentro = label.querySelector("input, textarea, select");
    if (dentro && ehCampoPreenchivel(dentro)) return dentro;

    const container = label.closest("div, fieldset, li, tr") ?? label.parentElement;
    const proximo = container?.querySelector("input, textarea, select");
    if (proximo && ehCampoPreenchivel(proximo)) return proximo;
  }

  for (const candidato of Array.from(raiz.querySelectorAll("input, textarea, select"))) {
    if (!ehCampoPreenchivel(candidato)) continue;
    const ariaLabel = candidato.getAttribute("aria-label") ?? candidato.getAttribute("placeholder") ?? "";
    const texto = normalizarTexto(ariaLabel);
    if (alvo.some((rotulo) => texto.includes(rotulo))) return candidato;
  }

  return null;
}

/** Dispara o setter nativo do elemento (não o do React/Vue, que ignora
 * atribuição direta a `.value`) e os eventos que os formulários dos
 * tribunais costumam escutar para validar/reagir ao preenchimento. */
export function definirValorCampo(elemento: CampoPreenchivel, valor: string): void {
  const prototipo = Object.getPrototypeOf(elemento);
  const definidorNativo = Object.getOwnPropertyDescriptor(prototipo, "value")?.set;
  if (definidorNativo) {
    definidorNativo.call(elemento, valor);
  } else {
    elemento.value = valor;
  }
  elemento.dispatchEvent(new Event("input", { bubbles: true }));
  elemento.dispatchEvent(new Event("change", { bubbles: true }));
  elemento.dispatchEvent(new Event("blur", { bubbles: true }));
}

export function definirValorPorRotulo(rotulos: string[], valor: string, raiz?: ParentNode): boolean {
  if (!valor) return false;
  const campo = buscarCampoPorRotulo(rotulos, raiz);
  if (!campo) return false;
  definirValorCampo(campo, valor);
  return true;
}

function buscarItemDropdownPorTexto(alvo: string): HTMLElement | null {
  const candidatos = document.querySelectorAll<HTMLElement>(
    ".ui-autocomplete-panel li, .ui-autocomplete-items li, [role='option'], [role='listbox'] li, li"
  );
  for (const candidato of Array.from(candidatos)) {
    // só considera item visível: o painel de sugestões some quando não há
    // busca ativa, mas o <li> pode continuar no DOM escondido.
    if (candidato.offsetParent === null) continue;
    if (normalizarTexto(candidato.textContent ?? "").includes(alvo)) return candidato;
  }
  return null;
}

/** Campo de autocomplete (comum no PJe/PrimeFaces: "Jurisdição", "Classe
 * judicial", "Assunto"...) — digitar sozinho não basta, porque o valor só
 * "gruda" de verdade quando você clica na opção da lista que abre. Digita
 * o texto de busca, espera a lista de sugestões aparecer e clica na opção
 * cujo texto contém `textoOpcaoDesejada`. */
export async function preencherAutocompletePorRotulo(
  rotulos: string[],
  textoBusca: string,
  textoOpcaoDesejada: string,
  raiz?: ParentNode,
  tempoLimiteMs = 8000
): Promise<boolean> {
  if (!textoBusca) return false;
  const campo = buscarCampoPorRotulo(rotulos, raiz);
  if (!campo || !(campo instanceof HTMLInputElement)) return false;

  definirValorCampo(campo, textoBusca);
  campo.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));

  const alvo = normalizarTexto(textoOpcaoDesejada);
  const opcao = await new Promise<HTMLElement | null>((resolve) => {
    const existente = buscarItemDropdownPorTexto(alvo);
    if (existente) {
      resolve(existente);
      return;
    }
    const observador = new MutationObserver(() => {
      const achado = buscarItemDropdownPorTexto(alvo);
      if (achado) {
        observador.disconnect();
        resolve(achado);
      }
    });
    observador.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      observador.disconnect();
      resolve(null);
    }, tempoLimiteMs);
  });

  if (!opcao) return false;
  opcao.click();
  return true;
}

function buscarCaixaPorRotulo(rotulos: string[], raiz: ParentNode = document): HTMLInputElement | null {
  const campo = buscarCampoPorRotulo(rotulos, raiz);
  return campo instanceof HTMLInputElement && campo.type === "checkbox" ? campo : null;
}

export function marcarCaixaPorRotulo(rotulos: string[], marcado: boolean, raiz?: ParentNode): boolean {
  const caixa = buscarCaixaPorRotulo(rotulos, raiz);
  if (!caixa) return false;
  if (caixa.checked !== marcado) caixa.click();
  return true;
}

function buscarSelectPorRotulo(rotulos: string[], raiz: ParentNode = document): HTMLSelectElement | null {
  const campo = buscarCampoPorRotulo(rotulos, raiz);
  return campo instanceof HTMLSelectElement ? campo : null;
}

/** Para campo de <select> onde a opção certa depende do TEXTO dela, não de
 * um "value" interno que muda de sistema pra sistema (ex.: "Nível de
 * Sigilo do Processo" do eproc, que vai de 0 a 5 em vez de ser uma
 * caixinha simples de sim/não). */
export function selecionarOpcaoPorTexto(rotulos: string[], textoOpcao: string, raiz?: ParentNode): boolean {
  const select = buscarSelectPorRotulo(rotulos, raiz);
  if (!select) return false;
  const alvo = normalizarTexto(textoOpcao);
  const opcao = Array.from(select.options).find((candidata) => normalizarTexto(candidata.textContent ?? "").includes(alvo));
  if (!opcao) return false;
  select.value = opcao.value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function buscarInputArquivoPorRotulo(rotulos: string[], raiz: ParentNode = document): HTMLInputElement | null {
  const alvo = rotulos.map(normalizarTexto);
  for (const label of Array.from(raiz.querySelectorAll("label"))) {
    const texto = normalizarTexto(label.textContent ?? "");
    if (!alvo.some((rotulo) => texto.includes(rotulo))) continue;
    const forId = label.getAttribute("for");
    const porId = forId ? document.getElementById(forId) : null;
    if (porId instanceof HTMLInputElement && porId.type === "file") return porId;
    const container = label.closest("div, fieldset, li, tr") ?? label.parentElement;
    const proximo = container?.querySelector('input[type="file"]');
    if (proximo instanceof HTMLInputElement) return proximo;
  }
  return null;
}

/** Anexa um arquivo a um <input type="file"> achado por rótulo, via
 * DataTransfer (a única forma de simular "usuário escolheu um arquivo"
 * respeitada pelos navegadores). */
export function anexarArquivoPorRotulo(rotulos: string[], arquivo: File, raiz?: ParentNode): boolean {
  const input = buscarInputArquivoPorRotulo(rotulos, raiz);
  if (!input) return false;
  const transferencia = new DataTransfer();
  transferencia.items.add(arquivo);
  input.files = transferencia.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

export interface EtapaPeticionamento {
  id: string;
  rotulo: string;
  aplicavel?: (checklist: ChecklistDistribuicao) => boolean;
  executar: (checklist: ChecklistDistribuicao) => Promise<void>;
}

export interface AdaptadorTribunal {
  id: IdTribunal;
  nome: string;
  /** Confirma que o content script está numa página do fluxo de
   * peticionamento inicial (não só no domínio do tribunal). */
  detectar: () => boolean;
  etapas: EtapaPeticionamento[];
}

function enviar(mensagem: MensagemDoConteudo): void {
  chrome.runtime.sendMessage(mensagem).catch(() => {
    // popup pode estar fechado; sem problema, o status também fica em
    // chrome.storage.session (ver src/armazenamento.ts) para quando reabrir.
  });
}

export async function executarAdaptador(adaptador: AdaptadorTribunal, checklist: ChecklistDistribuicao): Promise<void> {
  try {
    for (const etapa of adaptador.etapas) {
      if (etapa.aplicavel && !etapa.aplicavel(checklist)) continue;
      enviar({ tipo: "progresso-preenchimento", etapa: etapa.rotulo, nomeTribunal: adaptador.nome });
      await etapa.executar(checklist);
    }
    enviar({ tipo: "preenchimento-concluido", nomeTribunal: adaptador.nome });
  } catch (erro) {
    enviar({
      tipo: "preenchimento-erro",
      mensagem: erro instanceof Error ? erro.message : String(erro),
      nomeTribunal: adaptador.nome,
    });
  }
}

/** Liga o content script às mensagens do popup: "estou numa página que
 * você suporta?" e "preencha com este checklist". Cada adaptador só
 * precisa chamar isto uma vez, no fim do próprio arquivo. */
export function registrarAdaptador(adaptador: AdaptadorTribunal): void {
  chrome.runtime.onMessage.addListener((mensagem: MensagemParaConteudo, _remetente, responder) => {
    if (mensagem.tipo === "verificar-suporte") {
      responder({ tipo: "suporte", suportado: adaptador.detectar(), nomeTribunal: adaptador.nome } satisfies MensagemDoConteudo);
      return false;
    }
    if (mensagem.tipo === "preencher-distribuicao") {
      if (!adaptador.detectar()) {
        responder({
          tipo: "preenchimento-erro",
          mensagem: `Esta página não parece ser o peticionamento inicial do ${adaptador.nome}.`,
          nomeTribunal: adaptador.nome,
        } satisfies MensagemDoConteudo);
        return false;
      }
      executarAdaptador(adaptador, reconstruirChecklist(mensagem.checklist));
      return false;
    }
    return false;
  });
}
