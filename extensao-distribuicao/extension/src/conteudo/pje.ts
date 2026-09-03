// Adaptador do PJe (Processo Judicial Eletrônico, definido pela Resolução
// CNJ 185/2013), calibrado com foco em primeiro grau da Justiça do
// Trabalho (TRTs) — combinado com o usuário concentrar esforço aqui antes
// de espalhar para e-SAJ/eproc.
//
// Estrutura real confirmada por print (tela "Autuação de processo"):
// abas Dados Iniciais -> Assuntos -> Partes -> Características ->
// Prioridades -> Anexar petições e documentos -> Informações da Justiça
// do Trabalho. É uma aplicação de aba única (SPA): trocar de aba não
// navega para outra URL, só troca o conteúdo — por isso quase toda etapa
// abaixo clica na aba certa antes de procurar o campo.
import {
  adicionarParteFisicaPorCpf,
  anexarArquivoPorRotulo,
  clicarElementoPorTexto,
  definirValorPorRotulo,
  marcarCaixaPorRotulo,
  pesquisarEAdicionarPorTexto,
  preencherAutocompletePorRotulo,
  registrarAdaptador,
  type AdaptadorTribunal,
} from "./adaptador-base";
import { formatarNumeroProcessoCnj } from "../validadores";

const adaptador: AdaptadorTribunal = {
  id: "pje",
  nome: "PJe",
  detectar: () =>
    // O domínio do PJe varia por tribunal (pje.trf1.jus.br, pje1g.trf3.jus.br,
    // pje.tjba.jus.br...) — o que é fixo é o primeiro rótulo começar com
    // "pje" e terminar em .jus.br, então é isso que conferimos.
    /^pje/i.test(location.hostname.split(".")[0] ?? "") &&
    /\.jus\.br$/i.test(location.hostname) &&
    // Confirmado por print real (TRT): a tela de abertura de processo se
    // chama "Autuação de processo", aba "Dados Iniciais" — não
    // "Petição Inicial"/"Processo Novo" como eu tinha suposto antes.
    /peticionamento|processonovo|petição\s*inicial|autuação\s*de\s*processo|dados\s*iniciais/i.test(
      document.body.innerText.slice(0, 4000)
    ),

  etapas: [
    {
      id: "dados-iniciais",
      rotulo: "Preenchendo jurisdição e classe judicial",
      // Confirmado por print real: "Jurisdição" e "Classe judicial" são
      // campos de autocomplete (PrimeFaces) na aba "Dados Iniciais", a
      // primeira que abre — digitar sozinho não basta, precisa clicar na
      // opção que aparece na lista.
      async executar(checklist) {
        const { comarca } = checklist.competencia.valor;
        if (!checklist.competencia.valor.distribuicaoAutomatica) {
          const achouJurisdicao = await preencherAutocompletePorRotulo(["jurisdicao", "jurisdição"], comarca, comarca);
          if (!achouJurisdicao) definirValorPorRotulo(["foro", "comarca"], comarca);
        }
        await preencherAutocompletePorRotulo(
          ["classe judicial", "classe processual", "classe"],
          checklist.classeProcessual.valor,
          checklist.classeProcessual.valor
        );
      },
    },
    {
      id: "assuntos",
      rotulo: "Pesquisando e adicionando o assunto",
      // Confirmado por print real: aba "Assuntos" tem um padrão diferente
      // de autocomplete — campo de busca "Descrição", resultado numa
      // tabela paginada, e um botão "+" (só ícone, sem texto) em cada
      // linha para adicionar. `pesquisarEAdicionarPorTexto` dispara Enter
      // no campo de busca (mais confiável que adivinhar qual elemento é o
      // ícone de lupa) e clica no primeiro botão da linha que bater.
      async executar(checklist) {
        clicarElementoPorTexto("Assuntos");
        await pesquisarEAdicionarPorTexto(["descricao", "descrição"], checklist.assuntoPrincipal.valor, checklist.assuntoPrincipal.valor);
      },
    },
    {
      id: "partes",
      rotulo: "Adicionando as partes (polo ativo e passivo)",
      // Confirmado por print real: clicar no ícone de "+" da seção (achado
      // por texto do título — "Polo ativo"/"Polo passivo" — e ícone mais
      // próximo, já que o botão em si não tem texto), digitar o CPF,
      // Enter (o sistema busca na Receita e preenche o Nome sozinho),
      // esperar o Nome aparecer, clicar em "Confirmar" (esse tem texto).
      // Só cobre pessoa física com CPF conhecido — pessoa jurídica e
      // parte sem CPF ficam para completar à mão, ainda não calibrados.
      async executar(checklist) {
        clicarElementoPorTexto("Partes");

        const autor = checklist.poloAtivo[0];
        if (autor?.tipoPessoa === "PF" && autor.documento) {
          await adicionarParteFisicaPorCpf("Polo ativo", autor.documento);
        }

        const reu = checklist.poloPassivo[0];
        if (reu?.tipoPessoa === "PF" && reu.documento) {
          await adicionarParteFisicaPorCpf("Polo passivo", reu.documento);
        }
      },
    },
    {
      id: "caracteristicas",
      rotulo: "Preenchendo valor da causa, gratuidade e segredo de justiça",
      // Confirmado por print real: existe uma aba própria
      // "Características" (valor da causa e as caixinhas de gratuidade e
      // segredo de justiça devem morar aqui, conforme os manuais oficiais
      // do PJe usados como referência — o texto exato de cada campo
      // ainda não foi conferido nesta instância).
      async executar(checklist) {
        clicarElementoPorTexto("Características");
        if (checklist.valorCausa.valor !== null) {
          definirValorPorRotulo(["valor da causa"], checklist.valorCausa.valor.toFixed(2).replace(".", ","));
        }
        marcarCaixaPorRotulo(["justica gratuita", "gratuidade da justica", "gratuidade de justica"], checklist.gratuidadeJustica);
        marcarCaixaPorRotulo(["segredo de justica", "sigilo"], checklist.segredoJustica);
      },
    },
    {
      id: "prioridades",
      rotulo: "Marcando prioridade de tramitação",
      // Confirmado por print real: "Prioridades" é uma aba própria,
      // separada de "Características" — diferente do que os manuais de
      // outros tribunais sugeriam (lá, tudo junto). Só entra nessa aba se
      // houver prioridade a marcar, pra não mexer em nada à toa.
      aplicavel: (checklist) => checklist.prioridadeTramitacao,
      async executar() {
        clicarElementoPorTexto("Prioridades");
        marcarCaixaPorRotulo(["prioridade de tramitacao", "prioridade na tramitacao", "prioridade de processo"], true);
      },
    },
    {
      id: "numero-processo-referencia",
      rotulo: "Preenchendo número de processo de referência (se houver)",
      aplicavel: (checklist) => Boolean(checklist.numeroProcessoCnj.valor),
      async executar(checklist) {
        definirValorPorRotulo(
          ["numero do processo", "processo de referencia", "processo originario"],
          formatarNumeroProcessoCnj(checklist.numeroProcessoCnj.valor)
        );
      },
    },
    {
      id: "advogado",
      rotulo: "Conferindo OAB do advogado",
      // Não calibrado ainda nesta instância — pode ser que o advogado
      // logado já apareça vinculado automaticamente (comum no PJe) e
      // esse campo só exista ao incluir um advogado extra. Fica como
      // tentativa de reserva, sem trocar de aba.
      async executar(checklist) {
        const advogado = checklist.advogados[0];
        if (!advogado) return;
        definirValorPorRotulo(["numero da oab", "oab"], advogado.oab);
        definirValorPorRotulo(["uf da oab"], advogado.ufOab);
      },
    },
    {
      id: "anexos",
      rotulo: "Indo para anexar documentos",
      // Confirmado por print real: existe uma aba própria "Anexar
      // petições e documentos" — mas o padrão exato de anexar (um bloco
      // por arquivo? aparece um "+" depois de cada envio?) ainda não foi
      // visto nesta instância, então por enquanto só troca de aba.
      async executar(checklist) {
        clicarElementoPorTexto("Anexar petições e documentos");
        for (const anexo of checklist.anexos) {
          anexarArquivoPorRotulo(["arquivo", "documento", "anexar peca", "selecionar arquivo"], anexo.arquivo);
        }
      },
    },
  ],
};

registrarAdaptador(adaptador);
