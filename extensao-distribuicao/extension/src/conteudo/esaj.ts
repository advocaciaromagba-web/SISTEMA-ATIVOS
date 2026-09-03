// Adaptador do e-SAJ (usado por vários TJs, ex.: TJSP). É o que mais varia
// de um estado para outro — cada Tribunal de Justiça customiza a própria
// instância — então esse adaptador nasce mais conservador: cobre os
// rótulos mais comuns do peticionamento de "Nova Petição Inicial", mas
// precisa de calibração contra a instância real do tribunal do usuário
// antes de qualquer uso em caso de verdade (ver README).
import {
  anexarArquivoPorRotulo,
  definirValorPorRotulo,
  marcarCaixaPorRotulo,
  registrarAdaptador,
  selecionarOpcaoPorTexto,
  type AdaptadorTribunal,
} from "./adaptador-base";
import { RÓTULOS_TIPO_ANEXO } from "../tipos";

const adaptador: AdaptadorTribunal = {
  id: "esaj",
  nome: "e-SAJ",
  // Confirmado por print real (TJSP): o título da tela é "Peticionamento
  // Eletrônico", com passos "Informações do processo >> Assuntos >> Partes
  // Autoras >> Informações Adicionais".
  detectar: () =>
    /\.tjsp\.jus\.br$/i.test(location.hostname) &&
    /peticionamento|peticao\s*inicial|nova\s*peticao/i.test(document.body.innerText.slice(0, 4000)),

  etapas: [
    {
      id: "classe-e-assunto",
      rotulo: "Preenchendo classe e assunto",
      async executar(checklist) {
        definirValorPorRotulo(["classe", "classe do processo"], checklist.classeProcessual.valor);
        definirValorPorRotulo(["assunto", "assunto principal"], checklist.assuntoPrincipal.valor);
      },
    },
    {
      id: "foro",
      rotulo: "Preenchendo o foro",
      aplicavel: (checklist) => !checklist.competencia.valor.distribuicaoAutomatica,
      // Confirmado (manual oficial TJSP): "Foro" e "Competência" são dois
      // campos distintos na seção "Dados para o processo" — "competencia"
      // era o rótulo que faltava aqui (só tentava "vara"/"unidade").
      async executar(checklist) {
        const { comarca, vara } = checklist.competencia.valor;
        definirValorPorRotulo(["foro"], comarca);
        definirValorPorRotulo(["competencia", "vara", "unidade"], vara);
      },
    },
    {
      id: "valor-causa",
      rotulo: "Preenchendo valor da causa",
      async executar(checklist) {
        if (checklist.valorCausa.valor === null) return;
        definirValorPorRotulo(["valor da acao", "valor da causa"], checklist.valorCausa.valor.toFixed(2).replace(".", ","));
      },
    },
    {
      id: "sinalizadores",
      rotulo: "Marcando gratuidade e sigilo",
      // Confirmado (manual TJSP): gratuidade pode não ser uma caixinha
      // isolada — às vezes está embutida no campo "Despesas Processuais"
      // (opções "Não há recolhimento/Dispensa legal" | "Há pedido de
      // Justiça gratuita" | "Guia de custas emitida"), que é um grupo de
      // opções, não um checkbox. Se a tentativa abaixo não encontrar nada,
      // é sinal de calibrar contra esse campo em vez de "gratuidade".
      // Confirmado por print real: "Sigilo" é um menu (nível 0 a N, ex.:
      // "Sem Sigilo (Nível 0)"), igual ao eproc — não uma caixinha. Não
      // achei campo confirmado de "prioridade de tramitação" para o
      // e-SAJ.
      async executar(checklist) {
        marcarCaixaPorRotulo(["gratuidade", "justica gratuita"], checklist.gratuidadeJustica);
        if (checklist.segredoJustica) {
          const selecionou = selecionarOpcaoPorTexto(["sigilo"], "sigiloso");
          if (!selecionou) marcarCaixaPorRotulo(["segredo de justica", "sigilo"], true);
        }
      },
    },
    {
      id: "polo-ativo",
      rotulo: "Preenchendo o polo ativo",
      async executar(checklist) {
        const parte = checklist.poloAtivo[0];
        if (!parte) return;
        definirValorPorRotulo(["nome da parte", "requerente", "autor"], parte.nome);
        definirValorPorRotulo(["cpf", "cnpj", "cpf/cnpj"], parte.documento);
      },
    },
    {
      id: "polo-passivo",
      rotulo: "Preenchendo o polo passivo",
      async executar(checklist) {
        const parte = checklist.poloPassivo[0];
        if (!parte) return;
        definirValorPorRotulo(["parte contraria", "requerido", "reu"], parte.nome);
      },
    },
    {
      id: "advogado",
      rotulo: "Conferindo OAB do advogado",
      async executar(checklist) {
        const advogado = checklist.advogados[0];
        if (!advogado) return;
        definirValorPorRotulo(["oab", "numero oab"], advogado.oab);
      },
    },
    {
      id: "anexos",
      rotulo: "Anexando documentos",
      // Confirmado por print real: o primeiro documento já vem com um
      // bloco pronto ("Documento 1"), com campos "Arquivo", "Tipo" e
      // "Sigilo". Documentos extras exigem clicar em "Adicionar mais
      // Documentos" antes de aparecer um bloco novo — esse fluxo ainda não
      // foi calibrado (falta ver como o bloco novo aparece no DOM), então
      // por enquanto só o primeiro anexo é enviado automaticamente; os
      // demais precisam ser adicionados à mão nesta tela.
      async executar(checklist) {
        const primeiro = checklist.anexos[0];
        if (!primeiro) return;
        anexarArquivoPorRotulo(["arquivo", "documento", "anexo"], primeiro.arquivo);
        definirValorPorRotulo(["tipo"], RÓTULOS_TIPO_ANEXO[primeiro.tipo]);
      },
    },
  ],
};

registrarAdaptador(adaptador);
