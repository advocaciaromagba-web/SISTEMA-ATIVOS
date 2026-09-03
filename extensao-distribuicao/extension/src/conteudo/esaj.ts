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
  type AdaptadorTribunal,
} from "./adaptador-base";

const adaptador: AdaptadorTribunal = {
  id: "esaj",
  nome: "e-SAJ",
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
      // Também: algumas classes processuais já vêm com sigilo
      // pré-configurado pelo sistema (não editável) — não é bug se não
      // marcar nesse caso. Não achei campo confirmado de "prioridade de
      // tramitação" para o e-SAJ nesta pesquisa.
      async executar(checklist) {
        marcarCaixaPorRotulo(["gratuidade", "justica gratuita"], checklist.gratuidadeJustica);
        marcarCaixaPorRotulo(["segredo de justica", "sigilo"], checklist.segredoJustica);
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
      async executar(checklist) {
        for (const anexo of checklist.anexos) {
          anexarArquivoPorRotulo(["arquivo", "documento", "anexo"], anexo.arquivo);
        }
      },
    },
  ],
};

registrarAdaptador(adaptador);
