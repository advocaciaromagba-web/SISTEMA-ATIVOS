/**
 * Mapa que permite à administração tratar as sete soluções por uma porta só.
 *
 * O isolamento entre soluções é regra da casa: cada uma tem tabela de conta e
 * de usuário próprias, e nenhuma lê a da outra. Este arquivo NÃO fura isso —
 * ele não junta os dados num lugar comum, apenas declara, para o código da
 * administração, onde cada conta mora. Quem lê continua sendo uma consulta
 * por solução, na tabela daquela solução.
 *
 * Os campos que a administração usa (nome, documento, emailContato,
 * statusAssinatura, testeExpiraEm, bloqueadoEm, criadoEm) existem com o mesmo
 * nome nos sete modelos. `plano` é a exceção: a Consulta cadastral não tem —
 * ela funciona por saldo pré-pago. Por isso o `temPlano` no descritor.
 */
import { modelo } from "@/lib/modelo-prisma";

export { modelo };

export type ChaveSolucaoAdmin =
  | "GESTAO_ATIVOS"
  | "LICITACOES"
  | "COMPLIANCE_EMPRESA"
  | "CONSULTA_CADASTRAL_SERASA"
  | "DILIGENCIA_PESSOA"
  | "VERIFICACAO_DOCUMENTOS"
  | "AGROJUD";

export type DescritorSolucao = {
  chave: ChaveSolucaoAdmin;
  rotulo: string;
  /** Nome do model no Prisma Client (camelCase). */
  modeloConta: string;
  modeloUsuario: string;
  /** Campo do usuário que aponta para a conta. */
  campoContaNoUsuario: string;
  /** Onde fica o painel da solução, para o acesso administrativo. */
  painel: string;
  /** Se a conta tem campo `ativa` além do bloqueio administrativo. */
  temCampoAtiva: boolean;
  /**
   * Nem toda solução vende por plano: a Consulta cadastral funciona por saldo
   * pré-pago e não tem o campo `plano`. Filtrar por plano nela quebra a consulta
   * inteira — foi assim que este campo apareceu.
   */
  temPlano: boolean;
};

export const SOLUCOES_ADMIN: DescritorSolucao[] = [
  {
    chave: "GESTAO_ATIVOS",
    rotulo: "Gestão de ativos",
    modeloConta: "organizacao",
    modeloUsuario: "usuario",
    campoContaNoUsuario: "organizacaoId",
    painel: "/painel",
    temCampoAtiva: true,
    temPlano: true,
  },
  {
    chave: "LICITACOES",
    rotulo: "Licitações",
    modeloConta: "licitacaoConta",
    modeloUsuario: "licitacaoUsuario",
    campoContaNoUsuario: "licitacaoContaId",
    painel: "/licitacoes/painel",
    temCampoAtiva: true,
    temPlano: true,
  },
  {
    chave: "COMPLIANCE_EMPRESA",
    rotulo: "Compliance de empresas",
    modeloConta: "complianceConta",
    modeloUsuario: "complianceUsuario",
    campoContaNoUsuario: "complianceContaId",
    painel: "/compliance/painel",
    temCampoAtiva: true,
    temPlano: true,
  },
  {
    chave: "CONSULTA_CADASTRAL_SERASA",
    rotulo: "Consulta cadastral",
    modeloConta: "serasaConta",
    modeloUsuario: "serasaUsuario",
    campoContaNoUsuario: "serasaContaId",
    painel: "/serasa/painel",
    temCampoAtiva: true,
    temPlano: false,
  },
  {
    chave: "DILIGENCIA_PESSOA",
    rotulo: "Due diligence de pessoas",
    modeloConta: "diligenciaConta",
    modeloUsuario: "diligenciaUsuario",
    campoContaNoUsuario: "diligenciaContaId",
    painel: "/diligencia/painel",
    temCampoAtiva: true,
    temPlano: true,
  },
  {
    chave: "VERIFICACAO_DOCUMENTOS",
    rotulo: "Verificação de documentos",
    modeloConta: "verificacaoConta",
    modeloUsuario: "verificacaoUsuario",
    campoContaNoUsuario: "verificacaoContaId",
    painel: "/verificacao/painel",
    temCampoAtiva: true,
    temPlano: true,
  },
  {
    chave: "AGROJUD",
    rotulo: "Agrojud",
    modeloConta: "agroConta",
    modeloUsuario: "agroUsuario",
    campoContaNoUsuario: "agroContaId",
    painel: "/agrojud/painel/contratos",
    temCampoAtiva: true,
    temPlano: true,
  },
];

export function descritor(chave: string): DescritorSolucao | undefined {
  return SOLUCOES_ADMIN.find((s) => s.chave === chave);
}

/** Campos que a administração lê de qualquer conta, iguais nos sete modelos. */
export type ContaAdmin = {
  id: string;
  nome: string;
  documento: string | null;
  emailContato: string | null;
  plano: string | null;
  statusAssinatura: string | null;
  testeExpiraEm: Date | null;
  bloqueadoEm: Date | null;
  bloqueadoMotivo: string | null;
  criadoEm: Date;
  solucao: ChaveSolucaoAdmin;
  solucaoRotulo: string;
};

function comoContaAdmin(linha: Record<string, unknown>, d: DescritorSolucao): ContaAdmin {
  return {
    id: String(linha.id),
    nome: String(linha.nome ?? "—"),
    documento: (linha.documento as string | null) ?? null,
    emailContato: (linha.emailContato as string | null) ?? null,
    plano: (linha.plano as string | null) ?? null,
    statusAssinatura: (linha.statusAssinatura as string | null) ?? null,
    testeExpiraEm: (linha.testeExpiraEm as Date | null) ?? null,
    bloqueadoEm: (linha.bloqueadoEm as Date | null) ?? null,
    bloqueadoMotivo: (linha.bloqueadoMotivo as string | null) ?? null,
    criadoEm: linha.criadoEm as Date,
    solucao: d.chave,
    solucaoRotulo: d.rotulo,
  };
}

/** Lê as contas de todas as soluções — uma consulta por solução, em paralelo. */
export async function listarTodasAsContas(filtro?: { busca?: string }): Promise<ContaAdmin[]> {
  const busca = (filtro?.busca ?? "").trim();

  const porSolucao = await Promise.all(
    SOLUCOES_ADMIN.map(async (d) => {
      const where = busca
        ? { OR: [{ nome: { contains: busca, mode: "insensitive" } }, { emailContato: { contains: busca, mode: "insensitive" } }] }
        : undefined;
      const linhas = await modelo(d.modeloConta).findMany({ where, orderBy: { criadoEm: "desc" }, take: 200 });
      return linhas.map((l) => comoContaAdmin(l, d));
    })
  );

  return porSolucao.flat().sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
}

export async function buscarConta(solucao: string, id: string): Promise<ContaAdmin | null> {
  const d = descritor(solucao);
  if (!d) return null;
  const linha = await modelo(d.modeloConta).findUnique({ where: { id } });
  return linha ? comoContaAdmin(linha, d) : null;
}
