"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirEdicao } from "@/lib/sessao";
import { registrar } from "@/lib/auditoria";
import { somenteAlfanumerico, somenteNumeros, validarDocumento, validarEmail } from "@/lib/validacao";

export type ResultadoAcao = { erro?: string; ok?: boolean };

const texto = (dados: FormData, chave: string) => (dados.get(chave)?.toString() ?? "").trim() || null;

/**
 * Cria ou atualiza uma parte.
 *
 * O CPF/CNPJ é conferido em código (dígito verificador). Sem isso, o documento
 * sai bonito e com o número errado — que é o pior dos dois mundos.
 */
export async function salvarPessoa(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const { usuario, organizacao } = await exigirEdicao();

  const id = texto(dados, "id");
  const tipo = texto(dados, "tipo") === "PJ" ? "PJ" : "PF";
  const nome = texto(dados, "nome");
  const documento = somenteAlfanumerico(texto(dados, "documento"));
  const email = texto(dados, "email");

  if (!nome) return { erro: "Informe o nome ou a razão social." };

  if (documento && !validarDocumento(documento, tipo)) {
    return {
      erro: tipo === "PJ" ? "CNPJ inválido — confira os números." : "CPF inválido — confira os números.",
    };
  }

  if (email && !validarEmail(email)) return { erro: "E-mail inválido." };

  // Documento repetido dentro da mesma organização quase sempre é cadastro
  // duplicado, e duplicidade de parte gera contrato com a pessoa errada.
  if (documento) {
    const jaExiste = await prisma.pessoa.findFirst({
      where: { organizacaoId: organizacao.id, documento, ...(id ? { NOT: { id } } : {}) },
      select: { id: true, nome: true },
    });
    if (jaExiste) {
      return { erro: `Já existe uma parte cadastrada com este documento: ${jaExiste.nome}.` };
    }
  }

  const valores = {
    tipo,
    nome,
    nomeFantasia: texto(dados, "nomeFantasia"),
    documento: documento || null,
    rg: texto(dados, "rg"),
    orgaoEmissor: texto(dados, "orgaoEmissor"),
    inscricaoEstadual: texto(dados, "inscricaoEstadual"),
    nacionalidade: texto(dados, "nacionalidade"),
    estadoCivil: texto(dados, "estadoCivil"),
    profissao: texto(dados, "profissao"),
    email,
    telefone: somenteNumeros(texto(dados, "telefone")) || null,
    enderecoRua: texto(dados, "enderecoRua"),
    enderecoNumero: texto(dados, "enderecoNumero"),
    enderecoComplemento: texto(dados, "enderecoComplemento"),
    enderecoBairro: texto(dados, "enderecoBairro"),
    enderecoCidade: texto(dados, "enderecoCidade"),
    enderecoUf: texto(dados, "enderecoUf")?.toUpperCase() ?? null,
    enderecoCep: somenteNumeros(texto(dados, "enderecoCep")) || null,
    repNome: texto(dados, "repNome"),
    repCpf: somenteNumeros(texto(dados, "repCpf")) || null,
    repRg: texto(dados, "repRg"),
    repCargo: texto(dados, "repCargo"),
    repNacionalidade: texto(dados, "repNacionalidade"),
    repEstadoCivil: texto(dados, "repEstadoCivil"),
    repProfissao: texto(dados, "repProfissao"),
    repEmail: texto(dados, "repEmail"),
    pep: dados.get("pep") === "on",
    pepDetalhe: texto(dados, "pepDetalhe"),
    observacoes: texto(dados, "observacoes"),
  };

  if (valores.repCpf && !validarDocumento(valores.repCpf, "PF")) {
    return { erro: "CPF do representante inválido." };
  }

  let pessoaId: string;

  if (id) {
    const existente = await prisma.pessoa.findFirst({ where: { id, organizacaoId: organizacao.id } });
    if (!existente) return { erro: "Parte não encontrada." };

    await prisma.pessoa.update({ where: { id }, data: valores });
    pessoaId = id;
    await registrar({
      acao: "EDITAR",
      organizacaoId: organizacao.id,
      usuarioId: usuario.id,
      entidade: "Pessoa",
      entidadeId: id,
      detalhe: { nome },
    });
  } else {
    const criada = await prisma.pessoa.create({
      data: { ...valores, organizacaoId: organizacao.id },
    });
    pessoaId = criada.id;
    await registrar({
      acao: "CRIAR",
      organizacaoId: organizacao.id,
      usuarioId: usuario.id,
      entidade: "Pessoa",
      entidadeId: pessoaId,
      detalhe: { nome },
    });
  }

  revalidatePath("/painel/pessoas");
  redirect(`/painel/pessoas/${pessoaId}`);
}

export async function excluirPessoa(id: string): Promise<ResultadoAcao> {
  const { usuario, organizacao } = await exigirEdicao();

  const pessoa = await prisma.pessoa.findFirst({
    where: { id, organizacaoId: organizacao.id },
    include: { _count: { select: { partes: true } } },
  });
  if (!pessoa) return { erro: "Parte não encontrada." };

  // Apagar uma parte que já assinou documento apagaria a história da operação.
  if (pessoa._count.partes > 0) {
    return {
      erro: "Esta parte está vinculada a operações e não pode ser excluída. Remova-a das operações antes.",
    };
  }

  await prisma.pessoa.delete({ where: { id } });
  await registrar({
    acao: "EXCLUIR",
    organizacaoId: organizacao.id,
    usuarioId: usuario.id,
    entidade: "Pessoa",
    entidadeId: id,
    detalhe: { nome: pessoa.nome },
  });

  revalidatePath("/painel/pessoas");
  redirect("/painel/pessoas");
}
