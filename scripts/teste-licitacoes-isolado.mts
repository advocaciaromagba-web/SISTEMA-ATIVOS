/**
 * Prova de isolamento: cria uma LicitanteEmpresa de verdade no banco, gera
 * as declaracoes e o envelope, e confirma que nada disso toca as tabelas da
 * gestao de ativos (Pessoa, Operacao, ParteOperacao).
 *
 * Usa uma organizacao de teste propria e apaga tudo ao final.
 *
 * Uso: node --experimental-strip-types --import ./scripts/registrar.mjs scripts/teste-licitacoes-isolado.mts
 */
import { prisma } from "@/lib/prisma";
import { gerarDocumento } from "@/lib/documentos";
import type { ContextoDocumento } from "@/lib/documentos/contexto";

async function principal() {
  const org = await prisma.organizacao.create({
    data: { nome: "Teste Isolamento Licitacoes", plano: "TESTE" },
  });
  const usuario = await prisma.usuario.create({
    data: { organizacaoId: org.id, nome: "Teste", email: `teste-${Date.now()}@exemplo.com`, passwordHash: "x" },
  });

  try {
    const antesPessoa = await prisma.pessoa.count();
    const antesOperacao = await prisma.operacao.count();

    const licitante = await prisma.licitanteEmpresa.create({
      data: {
        organizacaoId: org.id,
        nome: "Distribuidora Guariba de Materiais de Limpeza Ltda",
        documento: "11222333000181",
        enderecoRua: "Rua Rui Barbosa",
        enderecoNumero: "1249",
        enderecoBairro: "Jardim Progresso",
        enderecoCidade: "Guariba",
        enderecoUf: "SP",
        enderecoCep: "14842042",
        repNome: "Carlos Eduardo Ferraz",
        repCpf: "52998224725",
        repRg: "34.567.890-1",
        repCargo: "sócio administrador",
      },
    });

    const edital = await prisma.editalInteresse.create({
      data: {
        organizacaoId: org.id,
        orgaoLicitante: "Prefeitura Municipal de Icém/SP",
        modalidade: "Pregão Presencial",
        numeroCertame: "004/2021",
      },
    });

    const contexto: ContextoDocumento = {
      organizacao: org,
      operacao: null,
      usuario,
      campos: { orgaoLicitante: edital.orgaoLicitante, modalidade: edital.modalidade, numeroCertame: edital.numeroCertame },
      agora: new Date(),
      licitante,
    };

    const gerado = await gerarDocumento("LICIT_CREDENCIAMENTO", contexto);
    console.log(`Documento gerado: ${gerado.titulo} (${gerado.hashSha256.slice(0, 8).toUpperCase()})`);

    const envelope = await prisma.envelope.create({
      data: {
        organizacaoId: org.id,
        licitanteEmpresaId: licitante.id,
        editalInteresseId: edital.id,
        itens: { declaracoesGeradas: [{ tipo: "LICIT_CREDENCIAMENTO", hash: gerado.hashSha256 }] } as never,
      },
    });
    console.log(`Envelope criado: ${envelope.id}`);

    const depoisPessoa = await prisma.pessoa.count();
    const depoisOperacao = await prisma.operacao.count();

    console.log("");
    console.log(`Pessoa antes/depois:   ${antesPessoa} / ${depoisPessoa}   ${antesPessoa === depoisPessoa ? "OK — nao mudou" : "MUDOU — isolamento quebrado"}`);
    console.log(`Operacao antes/depois: ${antesOperacao} / ${depoisOperacao}   ${antesOperacao === depoisOperacao ? "OK — nao mudou" : "MUDOU — isolamento quebrado"}`);
  } finally {
    // Limpa tudo o que este teste criou.
    await prisma.envelope.deleteMany({ where: { organizacaoId: org.id } });
    await prisma.editalInteresse.deleteMany({ where: { organizacaoId: org.id } });
    await prisma.licitanteEmpresa.deleteMany({ where: { organizacaoId: org.id } });
    await prisma.usuario.deleteMany({ where: { organizacaoId: org.id } });
    await prisma.organizacao.delete({ where: { id: org.id } });
    console.log("");
    console.log("Dados de teste removidos.");
  }
}

principal().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
