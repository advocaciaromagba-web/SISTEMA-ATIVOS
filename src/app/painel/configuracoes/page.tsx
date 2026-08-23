import Link from "next/link";
import { exigirSessao, situacaoAssinatura } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { formatarDocumento } from "@/lib/validacao";
import { dataCurta } from "@/lib/formato";

export const dynamic = "force-dynamic";

const PLANOS: Record<string, string> = {
  TESTE: "Período de teste",
  ESSENCIAL: "Essencial",
  PROFISSIONAL: "Profissional",
  MESA: "Mesa",
};

export default async function Configuracoes() {
  const { organizacao, usuario } = await exigirSessao();
  const assinatura = situacaoAssinatura(organizacao);

  const equipe = await prisma.usuario.findMany({
    where: { organizacaoId: organizacao.id },
    orderBy: { criadoEm: "asc" },
    select: { id: true, nome: true, email: true, papel: true, ativo: true, totpAtivado: true, ultimoAcesso: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Configurações</h1>
        <p className="text-sm text-slate-500">Dados da sua empresa, equipe e assinatura.</p>
      </div>

      <section className="cartao">
        <h2 className="mb-3 text-base font-semibold">Sua empresa</h2>
        <dl className="space-y-2.5 text-sm">
          <Linha rotulo="Nome" valor={organizacao.nome} />
          <Linha rotulo="Razão social" valor={organizacao.razaoSocial} />
          <Linha rotulo="CNPJ" valor={formatarDocumento(organizacao.cnpj)} />
          <Linha rotulo="E-mail" valor={organizacao.emailContato} />
          <Linha
            rotulo="Foro dos contratos"
            valor={
              organizacao.foroCidade
                ? `${organizacao.foroCidade}/${organizacao.foroUf ?? ""}`
                : organizacao.enderecoCidade
                  ? `${organizacao.enderecoCidade}/${organizacao.enderecoUf ?? ""} (do endereço)`
                  : null
            }
          />
        </dl>
        <p className="ajuda mt-4">
          Estes dados entram nos documentos gerados. O logo enviado aqui aparece no cabeçalho dos contratos.
        </p>
      </section>

      <section className="cartao">
        <h2 className="mb-3 text-base font-semibold">Assinatura</h2>
        <dl className="space-y-2.5 text-sm">
          <Linha rotulo="Plano" valor={PLANOS[organizacao.plano] ?? organizacao.plano} />
          <Linha
            rotulo="Situação"
            valor={assinatura.liberado ? "Ativa" : assinatura.motivo ?? "Pendente"}
          />
          <Linha rotulo="Válida até" valor={dataCurta(organizacao.assinaturaAte ?? organizacao.testeExpiraEm)} />
        </dl>

        {!assinatura.liberado && (
          <div className="aviso-atencao mt-4">
            {assinatura.motivo} Regularize para voltar a gerar documentos.
          </div>
        )}
      </section>

      <section className="cartao">
        <h2 className="mb-3 text-base font-semibold">Equipe</h2>
        <div className="overflow-x-auto">
          <table className="tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Acesso</th>
                <th>2 etapas</th>
                <th>Último acesso</th>
              </tr>
            </thead>
            <tbody>
              {equipe.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="font-medium">
                      {u.nome}
                      {u.id === usuario.id && <span className="ml-2 text-xs text-slate-400">você</span>}
                    </div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </td>
                  <td className="text-slate-600">
                    {{ DONO: "Dono", OPERADOR: "Operador", LEITOR: "Somente leitura" }[u.papel] ?? u.papel}
                    {!u.ativo && <span className="ml-2 etiqueta bg-red-100 text-red-800">inativo</span>}
                  </td>
                  <td>
                    {u.totpAtivado ? (
                      <span className="etiqueta bg-emerald-100 text-emerald-800">ativa</span>
                    ) : (
                      <span className="etiqueta bg-amber-100 text-amber-800">desligada</span>
                    )}
                  </td>
                  <td className="text-slate-600">{dataCurta(u.ultimoAcesso) || "nunca"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {equipe.some((u) => !u.totpAtivado) && (
          <div className="aviso-atencao mt-4">
            <strong className="block">Verificação em duas etapas desligada</strong>
            <span className="mt-1 block">
              Num sistema que guarda operações de terceiros, senha sozinha não basta. Ligue a verificação em duas
              etapas para todos os acessos.
            </span>
          </div>
        )}
      </section>

      <section className="cartao">
        <h2 className="mb-3 text-base font-semibold">Registros</h2>
        <p className="text-sm text-slate-600">
          Todo acesso, alteração e documento gerado fica registrado.{" "}
          <Link href="/painel/auditoria" className="underline">
            Ver auditoria
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-slate-500">{rotulo}</dt>
      <dd className="text-right font-medium text-slate-900">{valor || <span className="text-slate-400">não informado</span>}</dd>
    </div>
  );
}
