/**
 * Mapa que permite à administração tratar as sete soluções por uma porta só.
 *
 * O isolamento entre soluções é regra da casa: cada uma tem tabela de conta e
 * de usuário próprias, e nenhuma lê a da outra. Este arquivo NÃO fura isso —
 * ele não junta os dados num lugar comum, apenas declara, para o código da
 * administração, onde cada conta mora. Quem lê continua sendo uma consulta
 * por solução, na tabela daquela solução.
 *
 * Os campos que a administração usa (nome, documento, plano, statusAssinatura,
 * testeExpiraEm, bloqueadoEm, criadoEm) existem com o mesmo nome nos sete
 * modelos — foi conferido no schema antes de escrever isto.
 */
import { prisma } from "@/lib/prisma";

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
};

export const SOLUCOES_ADMIN: DescritorSolucao[] = [
  {
    chave: "GESTAO_ATIVOS",
    rotulo: "Gestão de ativos",
    modeloConta: "organizacao",
    modeloUsuario: "usuario",
    campoContaNoUsuario: "organizacaoId",
    painel: "/painel",
    temCampoAtiva: false,
  },
  {
    chave: "LICITACOES",
    rotulo: "Licitações",
    modeloConta: "licitacaoConta",
    modeloUsuario: "licitacaoUsuario",
    campoContaNoUsuario: "licitacaoContaId",
    painel: "/licitacoes/painel",
    temCampoAtiva: true,
  },
  {
    chave: "COMPLIANCE_EMPRESA",
    rotulo: "Compliance de empresas",
    modeloConta: "complianceConta",
    modeloUsuario: "complianceUsuario",
    campoContaNoUsuario: "complianceContaId",
    painel: "/compliance/painel",
    temCampoAtiva: true,
  },
  {
    chave: "CONSULTA_CADASTRAL_SERASA",
    rotulo: "Consulta cadastral",
    modeloConta: "serasaConta",
    modeloUsuario: "serasaUsuario",
    campoContaNoUsuario: "serasaContaId",
    painel: "/serasa/painel",
    temCampoAtiva: true,
  },
  {
    chave: "DILIGENCIA_PESSOA",
    rotulo: "Due diligence de pessoas",
    modeloConta: "diligenciaConta",
    modeloUsuario: "diligenciaUsuario",
    campoContaNoUsuario: "diligenciaContaId",
    painel: "/diligencia/painel",
    temCampoAtiva: true,
  },
  {
    chave: "VERIFICACAO_DOCUMENTOS",
    rotulo: "Verificação de documentos",
    modeloConta: "verificacaoConta",
    modeloUsuario: "verificacaoUsuario",
    campoContaNoUsuario: "verificacaoContaId",
    painel: "/verificacao/painel",
    temCampoAtiva: true,
  },
  {
    chave: "AGROJUD",
    rotulo: "Agrojud",
    modeloConta: "agroConta",
    modeloUsuario: "agroUsuario",
    campoContaNoUsuario: "agroContaId",
    painel: "/agrojud/painel/contratos",
    temCampoAtiva: true,
  },
];

export function descritor(chave: string): DescritorSolucao | undefined {
  return SOLUCOES_ADMIN.find((s) => s.chave === chave);
}

/**
 * Acesso genérico a um model do Prisma pelo nome.
 *
 * O Prisma Client não é indexável por string no tipo, e escrever sete blocos
 * `if` repetidos em cada tela seria pior de manter do que este ponto único de
 * conversão. Fica isolado aqui, e só aqui.
 */
type ModeloGenerico = {
  findMany: (args?: unknown) => Promise<Record<string, unknown>[]>;
  findUnique: (args: unknown) => Promise<Record<string, unknown> | null>;
  findFirst: (args: unknown) => Promise<Record<string, unknown> | null>;
  count: (args?: unknown) => Promise<number>;
  update: (args: unknown) => Promise<Record<string, unknown>>;
  delete: (args: unknown) => Promise<Record<string, unknown>>;
};

export function modelo(nome: string): ModeloGenerico {
  const cliente = prisma as unknown as Record<string, ModeloGenerico>;
  const m = cliente[nome];
  if (!m) throw new Error(`Model desconhecido no Prisma Client: ${nome}`);
  return m;
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
