/**
 * Núcleo puro da verificação de uma empresa: recebe CNPJ e nome, devolve o
 * veredito. Não grava nada — quem chama decide onde persistir.
 *
 * Fica fora de qualquer solução de propósito. As fontes (`fontes/*`) e o
 * motor de regras (`analise.ts`) já recebem só texto solto, nunca um tipo do
 * Prisma — por isso esta função pode ser chamada pela Gestão de Ativos, por
 * Licitações e por Compliance de Empresas sem que nenhuma delas acesse a
 * tabela de outra: o que se compartilha aqui é a lógica de consultar fontes
 * públicas, não o dado de nenhuma solução.
 */
import { consultarReceita } from "./fontes/receita";
import { consultarPunicoes } from "./fontes/transparencia";
import { consultarSancoes } from "./fontes/sancoes";
import { consultarDividaAtiva } from "./fontes/divida-ativa";
import { consultarBureau } from "./fontes/bureau";
import { consolidar } from "./analise";
import { somenteNumeros } from "@/lib/validacao";
import type { ResultadoAuditoria, ResultadoFonte } from "./tipos";

export async function avaliarComplianceEmpresa(params: {
  documento: string;
  nome: string;
  valorReferencia?: number | null;
}): Promise<{ resultado: ResultadoAuditoria; fontes: ResultadoFonte[] }> {
  const documento = somenteNumeros(params.documento);
  const valorReferencia = params.valorReferencia ?? null;

  const [receita, punicoes, sancoes, dividaAtiva, bureau] = await Promise.all([
    documento.length === 14 ? consultarReceita(documento) : Promise.resolve(null),
    documento ? consultarPunicoes(documento) : Promise.resolve([]),
    consultarSancoes(params.nome),
    documento
      ? consultarDividaAtiva({ documento, tipoPessoa: "PJ", nome: params.nome, valorOperacao: valorReferencia })
      : Promise.resolve(null),
    documento ? consultarBureau(documento, "PJ", valorReferencia) : Promise.resolve(null),
  ]);

  const fontes: ResultadoFonte[] = [];
  if (receita) fontes.push(receita);
  fontes.push(...punicoes);
  fontes.push(sancoes);
  if (dividaAtiva) fontes.push(dividaAtiva);
  if (bureau) fontes.push(bureau);

  if (!documento) {
    fontes.push({
      fonte: "CADASTRO",
      status: "INDISPONIVEL",
      resumo: "Empresa sem CNPJ cadastrado — quase nenhuma fonte pôde ser consultada.",
      apontamentos: [
        {
          gravidade: "GRAVE",
          eixo: "CADASTRO",
          titulo: "Empresa sem CNPJ",
          detalhe: "Sem CNPJ não há como confirmar a empresa nem consultar qualquer base. Complete o cadastro.",
          fonte: "Sistema",
        },
      ],
    });
  }

  const resultado = consolidar({
    nome: params.nome,
    tipo: "PJ",
    dadosCadastrais: receita?.dados ?? null,
    representante: null,
    pep: false,
    valorReferencia,
    fontes,
    // Quem chama este motor (Licitações, Compliance de Empresas) nunca
    // bloqueia automaticamente — só a Gestão de Ativos faz isso, e ela usa
    // `consolidar()` diretamente, não esta função.
    bloqueiaAutomaticamente: false,
  });

  return { resultado, fontes };
}
