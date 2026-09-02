// Adaptador do eproc (Justiça Federal em vários TRFs, e alguns TJs). Assim
// como o e-SAJ, cada tribunal roda sua própria instância; os rótulos abaixo
// cobrem o fluxo mais comum de "Processo Novo", mas precisam de calibração
// contra a instância real antes de uso em caso de verdade (ver README).
import {
  anexarArquivoPorRotulo,
  definirValorPorRotulo,
  marcarCaixaPorRotulo,
  registrarAdaptador,
  type AdaptadorTribunal,
} from "./adaptador-base";

const adaptador: AdaptadorTribunal = {
  id: "eproc",
  nome: "eproc",
  detectar: () => /eproc/i.test(location.hostname) && /processo\s*novo|peticao\s*inicial/i.test(document.body.innerText.slice(0, 4000)),

  etapas: [
    {
      id: "classe-e-assunto",
      rotulo: "Preenchendo classe e assunto",
      async executar(checklist) {
        definirValorPorRotulo(["classe"], checklist.classeProcessual.valor);
        definirValorPorRotulo(["assunto"], checklist.assuntoPrincipal.valor);
      },
    },
    {
      id: "competencia",
      rotulo: "Preenchendo localidade/vara",
      aplicavel: (checklist) => !checklist.competencia.valor.distribuicaoAutomatica,
      async executar(checklist) {
        const { comarca, vara } = checklist.competencia.valor;
        definirValorPorRotulo(["localidade", "comarca", "subsecao"], comarca);
        definirValorPorRotulo(["vara", "orgao julgador"], vara);
      },
    },
    {
      id: "valor-causa",
      rotulo: "Preenchendo valor da causa",
      async executar(checklist) {
        if (checklist.valorCausa.valor === null) return;
        definirValorPorRotulo(["valor da causa"], checklist.valorCausa.valor.toFixed(2).replace(".", ","));
      },
    },
    {
      id: "sinalizadores",
      rotulo: "Marcando gratuidade e sigilo",
      async executar(checklist) {
        marcarCaixaPorRotulo(["gratuidade", "assistencia judiciaria"], checklist.gratuidadeJustica);
        marcarCaixaPorRotulo(["sigilo", "segredo de justica"], checklist.segredoJustica);
      },
    },
    {
      id: "polo-ativo",
      rotulo: "Preenchendo o polo ativo",
      async executar(checklist) {
        const parte = checklist.poloAtivo[0];
        if (!parte) return;
        definirValorPorRotulo(["nome", "parte autora", "requerente"], parte.nome);
        definirValorPorRotulo(["cpf", "cnpj"], parte.documento);
      },
    },
    {
      id: "polo-passivo",
      rotulo: "Preenchendo o polo passivo",
      async executar(checklist) {
        const parte = checklist.poloPassivo[0];
        if (!parte) return;
        definirValorPorRotulo(["parte re", "requerido"], parte.nome);
      },
    },
    {
      id: "advogado",
      rotulo: "Conferindo OAB do advogado",
      async executar(checklist) {
        const advogado = checklist.advogados[0];
        if (!advogado) return;
        definirValorPorRotulo(["oab"], advogado.oab);
      },
    },
    {
      id: "anexos",
      rotulo: "Anexando documentos",
      async executar(checklist) {
        for (const anexo of checklist.anexos) {
          anexarArquivoPorRotulo(["arquivo", "documento"], anexo.arquivo);
        }
      },
    },
  ],
};

registrarAdaptador(adaptador);
