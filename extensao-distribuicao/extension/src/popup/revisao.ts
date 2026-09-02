// Tela de revisão: todo campo extraído aparece aqui editável — nada segue
// para o content script sem passar por esta tela. É a aplicação concreta
// de "a IA/heurística sugere, a pessoa confirma".
import { conferirChecklist } from "../campos/obrigatorios";
import {
  parteVazia,
  RÓTULOS_TIPO_ANEXO,
  type Advogado,
  type ChecklistDistribuicao,
  type ParteProcesso,
  type TipoAnexo,
} from "../tipos";

function criarCampo(rotulo: string, valorInicial: string, aoMudar: (valor: string) => void, opcoes?: { placeholder?: string }): HTMLElement {
  const bloco = document.createElement("label");
  bloco.className = "campo";
  const rotuloEl = document.createElement("span");
  rotuloEl.textContent = rotulo;
  const entrada = document.createElement("input");
  entrada.type = "text";
  entrada.value = valorInicial;
  if (opcoes?.placeholder) entrada.placeholder = opcoes.placeholder;
  entrada.addEventListener("input", () => aoMudar(entrada.value));
  bloco.append(rotuloEl, entrada);
  return bloco;
}

function criarCaixa(rotulo: string, marcado: boolean, aoMudar: (valor: boolean) => void): HTMLElement {
  const bloco = document.createElement("label");
  bloco.className = "caixa";
  const entrada = document.createElement("input");
  entrada.type = "checkbox";
  entrada.checked = marcado;
  entrada.addEventListener("change", () => aoMudar(entrada.checked));
  const rotuloEl = document.createElement("span");
  rotuloEl.textContent = rotulo;
  bloco.append(entrada, rotuloEl);
  return bloco;
}

function renderizarParte(parte: ParteProcesso, aoMudar: () => void): HTMLElement {
  const caixa = document.createElement("fieldset");
  caixa.className = "parte";
  caixa.append(
    criarCampo("Nome", parte.nome, (v) => {
      parte.nome = v;
      aoMudar();
    }),
    criarCampo("CPF/CNPJ", parte.documento, (v) => {
      parte.documento = v;
      aoMudar();
    }),
    criarCampo("CEP", parte.endereco.cep, (v) => {
      parte.endereco.cep = v;
      aoMudar();
    }),
    criarCampo("Cidade/UF", `${parte.endereco.cidade}${parte.endereco.uf ? "/" + parte.endereco.uf : ""}`, (v) => {
      const [cidade, uf] = v.split("/");
      parte.endereco.cidade = (cidade ?? "").trim();
      parte.endereco.uf = (uf ?? "").trim();
      aoMudar();
    })
  );
  return caixa;
}

function renderizarListaPartes(titulo: string, partes: ParteProcesso[], aoMudar: () => void, raiz: HTMLElement): void {
  const secao = document.createElement("section");
  secao.className = "secao";
  const cabecalho = document.createElement("h3");
  cabecalho.textContent = titulo;
  secao.append(cabecalho);

  const lista = document.createElement("div");
  for (const parte of partes) lista.append(renderizarParte(parte, aoMudar));
  secao.append(lista);

  const botaoAdicionar = document.createElement("button");
  botaoAdicionar.type = "button";
  botaoAdicionar.textContent = "+ adicionar parte";
  botaoAdicionar.addEventListener("click", () => {
    partes.push(parteVazia());
    aoMudar();
  });
  secao.append(botaoAdicionar);
  raiz.append(secao);
}

function renderizarAdvogados(advogados: Advogado[], aoMudar: () => void, raiz: HTMLElement): void {
  const secao = document.createElement("section");
  secao.className = "secao";
  secao.append(Object.assign(document.createElement("h3"), { textContent: "Advogado(s)" }));

  for (const advogado of advogados) {
    const linha = document.createElement("div");
    linha.className = "linha";
    linha.append(
      criarCampo("Nome", advogado.nome, (v) => {
        advogado.nome = v;
        aoMudar();
      }),
      criarCampo("OAB", advogado.oab, (v) => {
        advogado.oab = v;
        aoMudar();
      }),
      criarCampo("UF", advogado.ufOab, (v) => {
        advogado.ufOab = v.toUpperCase();
        aoMudar();
      })
    );
    secao.append(linha);
  }

  const botaoAdicionar = document.createElement("button");
  botaoAdicionar.type = "button";
  botaoAdicionar.textContent = "+ adicionar advogado";
  botaoAdicionar.addEventListener("click", () => {
    advogados.push({ nome: "", oab: "", ufOab: "" });
    aoMudar();
  });
  secao.append(botaoAdicionar);
  raiz.append(secao);
}

function renderizarAnexos(checklist: ChecklistDistribuicao, aoMudar: () => void, raiz: HTMLElement): void {
  const secao = document.createElement("section");
  secao.className = "secao";
  secao.append(Object.assign(document.createElement("h3"), { textContent: "Anexos" }));

  checklist.anexos.forEach((anexo) => {
    const linha = document.createElement("div");
    linha.className = "linha";
    const nome = document.createElement("span");
    nome.className = "nome-anexo";
    nome.textContent = anexo.arquivo.name;

    const seletor = document.createElement("select");
    for (const [valor, rotulo] of Object.entries(RÓTULOS_TIPO_ANEXO)) {
      const opcao = document.createElement("option");
      opcao.value = valor;
      opcao.textContent = rotulo;
      if (valor === anexo.tipo) opcao.selected = true;
      seletor.append(opcao);
    }
    seletor.addEventListener("change", () => {
      anexo.tipo = seletor.value as TipoAnexo;
      aoMudar();
    });

    linha.append(nome, seletor);
    secao.append(linha);
  });

  raiz.append(secao);
}

export function renderizarChecklist(container: HTMLElement, checklist: ChecklistDistribuicao, aoAtualizarPendencias: (pendencias: ReturnType<typeof conferirChecklist>) => void): void {
  const notificarMudanca = () => aoAtualizarPendencias(conferirChecklist(checklist));

  container.innerHTML = "";

  const secaoPrincipal = document.createElement("section");
  secaoPrincipal.className = "secao";
  secaoPrincipal.append(
    criarCampo("Classe processual", checklist.classeProcessual.valor, (v) => {
      checklist.classeProcessual = { valor: v, confianca: "media", origem: "manual" };
      notificarMudanca();
    }),
    criarCampo("Assunto principal (CNJ)", checklist.assuntoPrincipal.valor, (v) => {
      checklist.assuntoPrincipal = { valor: v, confianca: "media", origem: "manual" };
      notificarMudanca();
    }),
    criarCaixa("Distribuição automática (não escolher comarca/vara)", checklist.competencia.valor.distribuicaoAutomatica, (v) => {
      checklist.competencia.valor.distribuicaoAutomatica = v;
      notificarMudanca();
    }),
    criarCampo("Comarca", checklist.competencia.valor.comarca, (v) => {
      checklist.competencia.valor.comarca = v;
      notificarMudanca();
    }),
    criarCampo("UF", checklist.competencia.valor.uf, (v) => {
      checklist.competencia.valor.uf = v.toUpperCase();
      notificarMudanca();
    }),
    criarCampo("Vara", checklist.competencia.valor.vara, (v) => {
      checklist.competencia.valor.vara = v;
      notificarMudanca();
    }),
    criarCampo(
      "Valor da causa (R$)",
      checklist.valorCausa.valor === null ? "" : checklist.valorCausa.valor.toFixed(2),
      (v) => {
        const numero = Number(v.replace(",", "."));
        checklist.valorCausa = { valor: Number.isFinite(numero) && v.trim() !== "" ? numero : null, confianca: "media", origem: "manual" };
        notificarMudanca();
      },
      { placeholder: "0,00" }
    ),
    criarCaixa("Gratuidade de justiça", checklist.gratuidadeJustica, (v) => {
      checklist.gratuidadeJustica = v;
      notificarMudanca();
    }),
    criarCaixa("Segredo de justiça", checklist.segredoJustica, (v) => {
      checklist.segredoJustica = v;
      notificarMudanca();
    }),
    criarCaixa("Prioridade de tramitação", checklist.prioridadeTramitacao, (v) => {
      checklist.prioridadeTramitacao = v;
      notificarMudanca();
    })
  );
  container.append(secaoPrincipal);

  renderizarListaPartes("Polo ativo", checklist.poloAtivo, () => {
    renderizarChecklist(container, checklist, aoAtualizarPendencias);
    notificarMudanca();
  }, container);
  renderizarListaPartes("Polo passivo", checklist.poloPassivo, () => {
    renderizarChecklist(container, checklist, aoAtualizarPendencias);
    notificarMudanca();
  }, container);
  renderizarAdvogados(checklist.advogados, () => {
    renderizarChecklist(container, checklist, aoAtualizarPendencias);
    notificarMudanca();
  }, container);
  renderizarAnexos(checklist, notificarMudanca, container);

  notificarMudanca();
}
