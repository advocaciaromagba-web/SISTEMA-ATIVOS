/**
 * Núcleo puro da verificação de uma pessoa física: recebe CPF e nome, devolve
 * o veredito. Não grava nada — quem chama decide onde persistir.
 *
 * Mesmo espírito de `motor-empresa.ts`: fica fora de qualquer solução de
 * propósito, para que a Due Diligence de Pessoas (e qualquer outra solução
 * que precise) possa reaproveitar a lógica de consultar fontes públicas sem
 * tocar na tabela de ninguém.
 *
 * Diferença importante para PJ: não existe fonte de "situação do CPF na
 * Receita" pronta hoje — `consultarReceita` só aceita CNPJ. O que dá para
 * verificar de uma pessoa física, sem contrato pago, é sanção, dívida ativa,
 * bureau (quando contratado) e, com Infosimples configurado, mandado de
 * prisão e improbidade — sempre exigindo nome da mãe e data de nascimento
 * para essas duas últimas, e avisando quando faltarem.
 */
import { consultarSancoes } from "./fontes/sancoes";
import { consultarDividaAtiva } from "./fontes/divida-ativa";
import { consultarBureau } from "./fontes/bureau";
import { consultarMandadosPrisao, consultarImprobidade, infosimplesConfigurado } from "./fontes/infosimples";
import { consolidar } from "./analise";
import { somenteNumeros } from "@/lib/validacao";
import type { ResultadoAuditoria, ResultadoFonte } from "./tipos";

export async function avaliarDiligenciaPessoa(params: {
  documento: string;
  nome: string;
  nomeMae?: string | null;
  dataNascimento?: Date | null;
  uf?: string | null;
  valorReferencia?: number | null;
}): Promise<{ resultado: ResultadoAuditoria; fontes: ResultadoFonte[] }> {
  const documento = somenteNumeros(params.documento);
  const valorReferencia = params.valorReferencia ?? null;
  const parte = {
    documento,
    nome: params.nome,
    nomeMae: params.nomeMae ?? null,
    dataNascimento: params.dataNascimento ?? null,
    uf: params.uf ?? null,
  };

  const [sancoes, dividaAtiva, bureau, mandados, improbidade] = await Promise.all([
    consultarSancoes(params.nome),
    documento
      ? consultarDividaAtiva({ documento, tipoPessoa: "PF", nome: params.nome, valorOperacao: valorReferencia })
      : Promise.resolve(null),
    documento ? consultarBureau(documento, "PF", valorReferencia) : Promise.resolve(null),
    infosimplesConfigurado() ? consultarMandadosPrisao(parte) : Promise.resolve(null),
    infosimplesConfigurado() ? consultarImprobidade(parte) : Promise.resolve(null),
  ]);

  const fontes: ResultadoFonte[] = [sancoes];
  if (dividaAtiva) fontes.push(dividaAtiva);
  if (bureau) fontes.push(bureau);
  if (mandados) fontes.push(mandados);
  if (improbidade) fontes.push(improbidade);

  if (!documento) {
    fontes.push({
      fonte: "CADASTRO",
      status: "INDISPONIVEL",
      resumo: "Pessoa sem CPF cadastrado — quase nenhuma fonte pôde ser consultada.",
      apontamentos: [
        {
          gravidade: "GRAVE",
          eixo: "CADASTRO",
          titulo: "Pessoa sem CPF",
          detalhe: "Sem CPF não há como confirmar a pessoa nem consultar qualquer base. Complete o cadastro.",
          fonte: "Sistema",
        },
      ],
    });
  }

  const resultado = consolidar({
    nome: params.nome,
    tipo: "PF",
    dadosCadastrais: null,
    representante: null,
    pep: false,
    valorReferencia,
    fontes,
    // Quem chama este motor nunca bloqueia automaticamente — a decisão de
    // seguir mesmo com restrição é de quem opera, com justificativa.
    bloqueiaAutomaticamente: false,
  });

  return { resultado, fontes };
}
