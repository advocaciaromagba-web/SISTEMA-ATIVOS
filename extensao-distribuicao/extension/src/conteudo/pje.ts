// Adaptador do PJe (Processo Judicial Eletrônico, definido pela Resolução
// CNJ 185/2013). É o mais padronizado dos três, mas cada tribunal ainda
// costuma vestir o mesmo formulário com um layout próprio — os rótulos
// abaixo são o que aparece com mais frequência nas telas de "Petição
// Inicial" / "Processo Novo" do PJe de primeiro grau, mas PRECISAM ser
// conferidos contra a instância real do tribunal antes de confiar neles em
// caso de verdade (ver README do projeto).
import {
  anexarArquivoPorRotulo,
  definirValorPorRotulo,
  marcarCaixaPorRotulo,
  registrarAdaptador,
  type AdaptadorTribunal,
} from "./adaptador-base";
import { formatarNumeroProcessoCnj } from "../validadores";

const adaptador: AdaptadorTribunal = {
  id: "pje",
  nome: "PJe",
  detectar: () =>
    /\.pje\.jus\.br$/i.test(location.hostname) &&
    /peticionamento|processonovo|petição\s*inicial/i.test(document.body.innerText.slice(0, 4000)),

  etapas: [
    {
      id: "classe-e-assunto",
      rotulo: "Preenchendo classe processual e assunto",
      async executar(checklist) {
        definirValorPorRotulo(["classe judicial", "classe processual", "classe"], checklist.classeProcessual.valor);
        definirValorPorRotulo(["assunto", "assunto principal"], checklist.assuntoPrincipal.valor);
      },
    },
    {
      id: "competencia",
      rotulo: "Preenchendo comarca/foro e vara",
      aplicavel: (checklist) => !checklist.competencia.valor.distribuicaoAutomatica,
      async executar(checklist) {
        const { comarca, uf, vara } = checklist.competencia.valor;
        definirValorPorRotulo(["foro", "comarca"], comarca);
        definirValorPorRotulo(["uf", "estado"], uf);
        definirValorPorRotulo(["vara", "orgao julgador", "órgão julgador"], vara);
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
      rotulo: "Marcando gratuidade, segredo de justiça e prioridade",
      async executar(checklist) {
        marcarCaixaPorRotulo(["justica gratuita", "gratuidade da justica", "gratuidade de justica"], checklist.gratuidadeJustica);
        marcarCaixaPorRotulo(["segredo de justica", "sigilo"], checklist.segredoJustica);
        marcarCaixaPorRotulo(["prioridade de tramitacao", "prioridade na tramitacao"], checklist.prioridadeTramitacao);
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
      id: "polo-ativo",
      rotulo: "Preenchendo o polo ativo",
      async executar(checklist) {
        const parte = checklist.poloAtivo[0];
        if (!parte) return;
        definirValorPorRotulo(["nome da parte", "nome do requerente", "nome do autor"], parte.nome);
        definirValorPorRotulo(["cpf/cnpj", "cpf", "cnpj"], parte.documento);
      },
    },
    {
      id: "polo-passivo",
      rotulo: "Preenchendo o polo passivo",
      async executar(checklist) {
        const parte = checklist.poloPassivo[0];
        if (!parte) return;
        definirValorPorRotulo(["nome da parte contraria", "nome do requerido", "nome do reu"], parte.nome);
        if (parte.documento) definirValorPorRotulo(["cpf/cnpj", "cpf", "cnpj"], parte.documento);
      },
    },
    {
      id: "advogado",
      rotulo: "Conferindo OAB do advogado",
      async executar(checklist) {
        const advogado = checklist.advogados[0];
        if (!advogado) return;
        definirValorPorRotulo(["numero da oab", "oab"], advogado.oab);
        definirValorPorRotulo(["uf da oab"], advogado.ufOab);
      },
    },
    {
      id: "anexos",
      rotulo: "Anexando documentos",
      async executar(checklist) {
        for (const anexo of checklist.anexos) {
          anexarArquivoPorRotulo(["arquivo", "documento", "anexar peca", "selecionar arquivo"], anexo.arquivo);
        }
      },
    },
  ],
};

registrarAdaptador(adaptador);
