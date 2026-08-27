/**
 * Prova de ponta a ponta da solucao de Compliance de Empresas contra o
 * banco real: cria conta e usuario isolados, cadastra uma empresa com CNPJ
 * real, confirma que a auditoria roda e grava nas tabelas proprias, gera o
 * relatorio assinado (reaproveitando RELATORIO_DILIGENCIA), e confirma
 * isolamento total de Organizacao/Usuario/Pessoa/LicitacaoConta.
 *
 * Uso: node --experimental-strip-types --import ./scripts/registrar.mjs scripts/teste-compliance-empresas.mts
 */
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auditarEmpresaCompliance } from "@/lib/compliance/auditoria";
import { gerarDocumento } from "@/lib/documentos";
import type { ContextoDocumento } from "@/lib/documentos/contexto";
import { contaComplianceComoOrganizacao, usuarioComplianceComoUsuario } from "@/lib/compliance/contexto";
import type { DadosDiligencia } from "@/lib/documentos/geradores/diligencia";
import type { Apontamento } from "@/lib/auditoria/tipos";

const CNPJ_TESTE = "11444777000161"; // MA Guilherme Consultoria — ja usado em outros testes deste projeto

async function principal() {
  const antes = {
    organizacao: await prisma.organizacao.count(),
    usuario: await prisma.usuario.count(),
    pessoa: await prisma.pessoa.count(),
    licitacaoConta: await prisma.licitacaoConta.count(),
  };

  const conta = await prisma.complianceConta.create({
    data: {
      tipo: "PJ",
      nome: "Escritorio Teste Compliance Ltda",
      documento: "22333444000199",
      formaCobranca: "ASSINATURA",
      usuarios: {
        create: {
          nome: "Analista Teste",
          email: `teste-${Date.now()}@exemplo.com`,
          passwordHash: await bcrypt.hash("senhaForte123", 10),
          papel: "DONO",
        },
      },
    },
    include: { usuarios: true },
  });
  const usuario = conta.usuarios[0];

  try {
    console.log("=== Cadastrando empresa e auditando ===");
    const empresa = await prisma.complianceEmpresa.create({
      data: { complianceContaId: conta.id, nome: "MA Guilherme Consultoria Ltda", documento: CNPJ_TESTE },
    });

    const { resultado } = await auditarEmpresaCompliance({ empresa, usuario, complianceContaId: conta.id });
    console.log(`idoneidade: ${resultado.idoneidade}   pontuacao: ${resultado.pontuacao}`);

    const empresaAtualizada = await prisma.complianceEmpresa.findUniqueOrThrow({ where: { id: empresa.id } });
    console.log(`cache na ComplianceEmpresa: situacaoCompliance=${empresaAtualizada.situacaoCompliance}`);

    const consultas = await prisma.complianceConsulta.count({ where: { complianceEmpresaId: empresa.id } });
    console.log(`ComplianceConsulta gravadas: ${consultas}`);

    console.log("");
    console.log("=== Gerando relatorio assinado ===");
    const auditoria = await prisma.complianceAuditoria.findFirstOrThrow({
      where: { complianceEmpresaId: empresa.id },
      include: { consultas: true },
    });

    const diligencia: DadosDiligencia = {
      partes: [
        {
          nome: empresa.nome,
          papel: "Empresa verificada",
          documento: empresa.documento,
          qualificacao: empresa.nome,
          identificacao: `CNPJ ${empresa.documento}`,
          idoneidade: auditoria.idoneidade,
          capacidade: auditoria.capacidade,
          pontuacao: auditoria.pontuacao,
          parecer: auditoria.parecer,
          auditadaEm: auditoria.criadoEm,
          apontamentos: (auditoria.apontamentos as unknown as Apontamento[]) ?? [],
          fontes: auditoria.consultas.map((c) => ({
            fonte: c.fonte,
            status: c.status,
            resumo: c.resumo,
            consultadaEm: c.concluidaEm ?? c.criadoEm,
          })),
          certidoes: [],
        },
      ],
      responsavel: { nome: usuario.nome, cargo: "Responsável pela análise de compliance", registro: null },
      solicitante: null,
      validadeDias: 30,
    };

    const contexto: ContextoDocumento = {
      organizacao: contaComplianceComoOrganizacao(conta),
      operacao: null,
      usuario: usuarioComplianceComoUsuario(usuario),
      campos: {},
      agora: new Date(),
      diligencia,
    };

    const gerado = await gerarDocumento("RELATORIO_DILIGENCIA", contexto);
    console.log(`relatorio gerado: ${gerado.titulo}   ${gerado.hashSha256.slice(0, 8).toUpperCase()}   pendencias=${gerado.pendencias.length}`);

    await prisma.complianceDocumento.create({
      data: {
        complianceEmpresaId: empresa.id,
        titulo: gerado.titulo,
        arquivoNome: gerado.nomeArquivo,
        arquivo: gerado.buffer,
        hashSha256: gerado.hashSha256,
      },
    });

    const fs = await import("fs/promises");
    const path = await import("path");
    const destino = path.join(process.cwd(), "exemplos", "compliance");
    await fs.mkdir(destino, { recursive: true });
    await fs.writeFile(path.join(destino, gerado.nomeArquivo), gerado.buffer);
    console.log(`salvo em exemplos/compliance/${gerado.nomeArquivo}`);

    console.log("");
    console.log("=== Isolamento ===");
    const depois = {
      organizacao: await prisma.organizacao.count(),
      usuario: await prisma.usuario.count(),
      pessoa: await prisma.pessoa.count(),
      licitacaoConta: await prisma.licitacaoConta.count(),
    };
    for (const chave of Object.keys(antes) as Array<keyof typeof antes>) {
      const ok = antes[chave] === depois[chave];
      console.log(`${chave.padEnd(15)} antes/depois: ${antes[chave]} / ${depois[chave]}   ${ok ? "OK" : "ISOLAMENTO QUEBRADO"}`);
    }
  } finally {
    const empresas = await prisma.complianceEmpresa.findMany({ where: { complianceContaId: conta.id }, select: { id: true } });
    const empresaIds = empresas.map((e) => e.id);
    await prisma.complianceDocumento.deleteMany({ where: { complianceEmpresaId: { in: empresaIds } } });
    await prisma.complianceCertidao.deleteMany({ where: { complianceEmpresaId: { in: empresaIds } } });
    await prisma.complianceConsulta.deleteMany({ where: { complianceEmpresaId: { in: empresaIds } } });
    await prisma.complianceAuditoria.deleteMany({ where: { complianceEmpresaId: { in: empresaIds } } });
    await prisma.complianceEmpresa.deleteMany({ where: { id: { in: empresaIds } } });
    await prisma.complianceUsuario.deleteMany({ where: { complianceContaId: conta.id } });
    await prisma.complianceConta.delete({ where: { id: conta.id } });
    console.log("");
    console.log("Dados de teste removidos (arquivo .docx gerado permanece em exemplos/).");
  }
}

principal().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
