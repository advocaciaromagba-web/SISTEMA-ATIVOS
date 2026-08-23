"use server";

import { exigirEdicao } from "@/lib/sessao";
import { registrar } from "@/lib/registro";
import { iaConfigurada } from "@/lib/ia/claude";
import { lerDocumentos, type Perfil, type ResultadoLeitura } from "@/lib/ia/leitura";
import { consultarReceita } from "@/lib/auditoria/fontes/receita";

export type ResultadoLeituraAcao = {
  erro?: string;
  leitura?: ResultadoLeitura;
  /** Divergências entre o que a IA leu e o cadastro oficial da Receita. */
  conferenciaReceita?: Array<{ campo: string; lido: string; oficial: string }>;
};

/**
 * Lê os documentos enviados e devolve os campos para conferência.
 *
 * NÃO grava nada. Quem grava é o formulário, depois que a pessoa confere. Essa
 * separação é o que sustenta a regra de que a IA sugere e o humano confirma.
 */
export async function lerArquivos(
  _anterior: ResultadoLeituraAcao,
  dados: FormData
): Promise<ResultadoLeituraAcao> {
  const { usuario, organizacao } = await exigirEdicao();

  if (!iaConfigurada()) {
    return {
      erro:
        "A leitura por inteligência artificial não está configurada. Preencha ANTHROPIC_API_KEY no arquivo .env.",
    };
  }

  const perfil = (dados.get("perfil")?.toString() ?? "") as Perfil;
  if (!["PESSOA_PF", "PESSOA_PJ", "OPERACAO_PRECATORIO", "CERTIDAO"].includes(perfil)) {
    return { erro: "Tipo de leitura desconhecido." };
  }

  const enviados = dados.getAll("arquivos").filter((a): a is File => a instanceof File && a.size > 0);
  if (enviados.length === 0) return { erro: "Escolha ao menos um arquivo." };

  const arquivos = await Promise.all(
    enviados.map(async (a) => ({
      nome: a.name,
      tipo: a.type,
      conteudo: Buffer.from(await a.arrayBuffer()),
    }))
  );

  const resposta = await lerDocumentos(perfil, arquivos);
  if (!resposta.ok) return { erro: resposta.erro };

  const leitura = resposta.leitura;

  // ----- conferência cruzada com a Receita -----
  // Quando a IA lê um CNPJ, dá para confrontar o que ela extraiu com o cadastro
  // oficial. É a melhor verificação que existe aqui: um modelo de linguagem e
  // uma base pública concordando é bem mais forte que qualquer um dos dois.
  let conferenciaReceita: ResultadoLeituraAcao["conferenciaReceita"];

  if (perfil === "PESSOA_PJ" && leitura.campos.documento?.valor) {
    const receita = await consultarReceita(leitura.campos.documento.valor);

    if (receita.dados) {
      const oficial = receita.dados;
      const divergencias: NonNullable<ResultadoLeituraAcao["conferenciaReceita"]> = [];

      const comparar = (campo: string, lido: string | undefined, oficialValor: string | null) => {
        if (!lido || !oficialValor) return;
        const normalizar = (t: string) =>
          t.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
        if (normalizar(lido) !== normalizar(oficialValor)) {
          divergencias.push({ campo, lido, oficial: oficialValor });
        }
      };

      comparar("Razão social", leitura.campos.nome?.valor, oficial.razaoSocial);
      comparar("Cidade", leitura.campos.enderecoCidade?.valor, oficial.municipio);
      comparar("UF", leitura.campos.enderecoUf?.valor, oficial.uf);

      // O dado oficial vale mais que a leitura: se a Receita tem a razão social,
      // ela entra como sugestão de alta confiança.
      if (oficial.razaoSocial) {
        leitura.campos.nome = {
          valor: oficial.razaoSocial,
          confianca: "ALTA",
          origem: "Receita Federal (conferido)",
        };
      }

      if (divergencias.length > 0) conferenciaReceita = divergencias;

      leitura.avisos.push(
        `Cadastro da Receita conferido: ${oficial.razaoSocial ?? "empresa"}, situação ${oficial.situacao ?? "não informada"}.`
      );
    }
  }

  await registrar({
    acao: "CONSULTAR",
    organizacaoId: organizacao.id,
    usuarioId: usuario.id,
    entidade: "LeituraIA",
    detalhe: {
      perfil,
      arquivos: arquivos.map((a) => a.nome),
      camposLidos: Object.keys(leitura.campos).length,
      comProblema: Object.values(leitura.campos).filter((c) => c.problema).length,
    },
  });

  return { leitura, conferenciaReceita };
}
