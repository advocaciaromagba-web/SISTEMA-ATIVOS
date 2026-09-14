/**
 * Relatório de compliance vendido por peça.
 *
 * A REGRA QUE ORGANIZA TUDO AQUI: as consultas caras só rodam depois que o
 * pagamento entrou. O pedido nasce aguardando pagamento, o webhook do Asaas
 * confirma, e só então o sistema gasta com certidões, processos e bureau.
 * Rodar antes seria entregar o custo e torcer para receber.
 *
 * A execução é longa de propósito — emitir certidão em tribunal leva minutos,
 * e paginar processos leva mais. Por isso ela roda solta, fora do webhook (que
 * precisa responder rápido), e o pedido guarda em que pé está. Se falhar no
 * meio, fica registrado o porquê e dá para mandar rodar de novo sem cobrar
 * outra vez.
 */
import { prisma } from "@/lib/prisma";
import { auditarEmpresaCompliance } from "./auditoria";
import { emitirCertidao, temEmissaoAutomatica, type CredencialGovBr } from "@/lib/auditoria/fontes/infosimples";
import { CERTIDAO_POR_CHAVE } from "@/lib/auditoria/certidoes";
import { decifrar } from "@/lib/seguranca/cofre";
import crypto from "crypto";

/** Certidões que entram no relatório completo, na ordem em que fazem falta. */
const CERTIDOES_DO_RELATORIO = [
  "CNDT",
  "DIVIDA_ATIVA_ESTADUAL",
  "IMPROBIDADE_CNJ",
  "CND_FEDERAL",
  "FALENCIA_RECUPERACAO",
  "DISTRIBUICAO_CIVEL",
];

const PADRAO_PRECO = 249;

/** Preço do relatório completo, definido pela administração. */
export async function precoDoRelatorio(): Promise<number> {
  const linha = await prisma.configAdmin.findUnique({ where: { chave: "compliance_preco_relatorio" } });
  const valor = Number(linha?.valor ?? PADRAO_PRECO);
  return Number.isFinite(valor) && valor > 0 ? valor : PADRAO_PRECO;
}

async function credencialDaConta(complianceContaId: string): Promise<CredencialGovBr | undefined> {
  const conta = await prisma.complianceConta.findUnique({ where: { id: complianceContaId } });
  if (!conta?.certificadoArquivo || !conta.certificadoSenha) return undefined;

  const senha = decifrar(conta.certificadoSenha);
  if (!senha.ok) return undefined;

  return {
    tipo: "certificado",
    arquivoBase64: Buffer.from(conta.certificadoArquivo).toString("base64"),
    senha: senha.texto,
  };
}

/**
 * Roda o relatório inteiro de um pedido já pago.
 *
 * Nenhuma etapa derruba as outras: certidão que o órgão recusa vira registro
 * de que não foi emitida, e o relatório final mostra isso no mesmo destaque
 * do resto. Um relatório que só sai quando tudo dá certo não sairia nunca —
 * e esconder a falha seria pior do que mostrá-la.
 */
export async function executarRelatorioPago(pedidoId: string): Promise<{ ok: boolean; erro?: string }> {
  const pedido = await prisma.complianceRelatorioPedido.findUnique({
    where: { id: pedidoId },
    include: { empresa: true },
  });

  if (!pedido) return { ok: false, erro: "Pedido não encontrado." };
  if (pedido.situacao !== "PAGO") {
    // Idempotente: reentregar ou rodar antes de pagar não pode acontecer.
    return { ok: false, erro: `Este pedido está como ${pedido.situacao}, não como PAGO.` };
  }

  await prisma.complianceRelatorioPedido.update({
    where: { id: pedidoId },
    data: { situacao: "EM_EXECUCAO", iniciadoEm: new Date(), erro: null },
  });

  const contexto = {
    solucao: "COMPLIANCE_EMPRESA",
    contaId: pedido.complianceContaId,
    referencia: `Relatório ${pedido.numero} — ${pedido.empresa.nome}`,
  };

  try {
    // ----- 1. certidões, uma a uma -----
    const credencial = await credencialDaConta(pedido.complianceContaId);

    for (const chave of CERTIDOES_DO_RELATORIO) {
      if (!temEmissaoAutomatica(chave, pedido.empresa.enderecoUf)) continue;

      const definicao = CERTIDAO_POR_CHAVE[chave];
      if (!definicao) continue;

      const emissao = await emitirCertidao({
        chaveCertidao: chave,
        parte: {
          documento: pedido.empresa.documento,
          nome: pedido.empresa.nome,
          uf: pedido.empresa.enderecoUf,
        },
        contexto,
        credencial,
      });

      if (!emissao.ok) {
        // Registra a tentativa recusada, para o relatório poder dizer o que
        // ficou de fora e por quê.
        await prisma.complianceCertidao.create({
          data: {
            complianceEmpresaId: pedido.complianceEmpresaId,
            tipo: chave,
            origem: "EMITIDA",
            orgaoEmissor: definicao.orgao,
            resultado: "PENDENTE",
            apontamento: `Não foi possível emitir nesta data: ${emissao.erro}`,
            emissaoAutomatica: true,
          },
        });
        continue;
      }

      const { certidao } = emissao;
      let arquivo: Buffer | null = null;
      let nomeArquivo: string | null = null;
      let arquivoTipo: string | null = null;
      let hash: string | null = null;
      const comprovanteUrl = certidao.comprovantes[0] ?? null;

      if (comprovanteUrl) {
        try {
          const baixado = await fetch(comprovanteUrl, { signal: AbortSignal.timeout(60_000) });
          if (baixado.ok) {
            const conteudo = Buffer.from(await baixado.arrayBuffer());
            if (conteudo.length > 0 && conteudo.length <= 10 * 1024 * 1024) {
              arquivo = conteudo;
              arquivoTipo = baixado.headers.get("content-type")?.split(";")[0] ?? "application/pdf";
              nomeArquivo = `${chave.toLowerCase().replace(/_/g, "-")}-${Date.now()}.${
                arquivoTipo.includes("pdf") ? "pdf" : "bin"
              }`;
              hash = crypto.createHash("sha256").update(conteudo).digest("hex");
            }
          }
        } catch {
          // Comprovante não baixado não invalida a certidão emitida.
        }
      }

      await prisma.complianceCertidao.create({
        data: {
          complianceEmpresaId: pedido.complianceEmpresaId,
          tipo: chave,
          origem: "EMITIDA",
          orgaoEmissor: definicao.orgao,
          numero: certidao.numero,
          resultado: certidao.resultado,
          natureza: certidao.natureza,
          apontamento: certidao.apontamento,
          nomeArquivo,
          arquivo,
          arquivoTipo,
          hashSha256: hash,
          emissaoAutomatica: true,
          comprovanteUrl,
          dadosConsulta: (certidao.bruto ?? undefined) as never,
          emitidaEm: new Date(),
          validaAte: new Date(Date.now() + definicao.validadeDias * 86400000),
        },
      });
    }

    // ----- 2. auditoria completa, já com processos judiciais -----
    const usuario = pedido.solicitadoPorId
      ? await prisma.complianceUsuario.findUnique({ where: { id: pedido.solicitadoPorId } })
      : null;

    if (!usuario) return await falhar(pedidoId, "Não foi possível identificar quem pediu o relatório.");

    await auditarEmpresaCompliance({
      empresa: pedido.empresa,
      usuario,
      complianceContaId: pedido.complianceContaId,
      referenciaDoGasto: contexto.referencia,
    });

    // ----- 3. quanto este relatório custou de verdade -----
    const gastos = await prisma.usoConsulta.findMany({
      where: { referencia: contexto.referencia },
      select: { custo: true },
    });
    const custoApurado = gastos.reduce((s, g) => s + Number(g.custo ?? 0), 0);

    await prisma.complianceRelatorioPedido.update({
      where: { id: pedidoId },
      data: {
        situacao: "ENTREGUE",
        entregueEm: new Date(),
        custoApurado: custoApurado > 0 ? custoApurado : null,
      },
    });

    return { ok: true };
  } catch (erro) {
    return await falhar(pedidoId, (erro as Error).message);
  }
}

async function falhar(pedidoId: string, mensagem: string): Promise<{ ok: false; erro: string }> {
  await prisma.complianceRelatorioPedido.update({
    where: { id: pedidoId },
    // Volta para PAGO, não para FALHOU sem saída: o cliente já pagou, e o
    // certo é poder mandar rodar de novo sem cobrar outra vez.
    data: { situacao: "PAGO", erro: mensagem.slice(0, 500) },
  });
  return { ok: false, erro: mensagem };
}
