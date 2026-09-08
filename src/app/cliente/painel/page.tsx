import { exigirSessaoCliente } from "@/lib/cliente/sessao";
import { SOLUCOES } from "@/lib/solucoes";
import { ICONE_SOLUCAO } from "@/components/icones-solucoes";
import { contaDaSolucaoPorEmail } from "./contas-do-cliente";
import { CartaoSolucao } from "./cartao-solucao";

export const dynamic = "force-dynamic";

/** Onde cada solução vende — a página de planos dela, não uma tela comum. */
const PLANOS_DA_SOLUCAO: Record<string, string> = {
  GESTAO_ATIVOS: "/planos",
  LICITACOES: "/licitacoes/planos",
  COMPLIANCE_EMPRESA: "/compliance/planos",
  DILIGENCIA_PESSOA: "/diligencia/planos",
  VERIFICACAO_DOCUMENTOS: "/verificacao/planos",
  AGROJUD: "/agrojud/planos",
  CONSULTA_CADASTRAL_SERASA: "/serasa/cadastro",
};

/**
 * Hub do cliente: uma lista do que ele já tem, com atalho para entrar.
 *
 * Não se assina daqui. Antes dava, e era o segundo caminho para a mesma
 * compra — o que fazia a assinatura de uma solução parecer um item de um
 * catálogo comum, com preço comum. Agora quem vende é cada solução, na página
 * dela, com o preço e o contrato dela.
 */
export default async function PainelCliente() {
  const cliente = await exigirSessaoCliente();

  const solucoes = await Promise.all(
    SOLUCOES.map(async (s) => ({
      ...s,
      conta: await contaDaSolucaoPorEmail(s.chave, cliente.email),
    }))
  );

  const quantasTem = solucoes.filter((s) => s.conta).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Suas soluções</h1>
        <p className="mt-1 text-sm text-slate-500">
          {quantasTem === 0
            ? "Você ainda não tem conta em nenhuma solução. Cada uma tem a própria página de planos, com o preço e o contrato dela."
            : "Entre em qualquer uma sem digitar senha de novo. Cada solução tem assinatura, preço e contrato próprios — inclusive para cancelar, que se faz dentro dela."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {solucoes.map((s) => {
          const Icone = ICONE_SOLUCAO[s.chave];
          return (
            <CartaoSolucao
              key={s.chave}
              chave={s.chave}
              nome={s.nome}
              resumo={s.resumo}
              icone={<Icone className="h-5 w-5 text-[color:var(--marca)]" />}
              temConta={Boolean(s.conta)}
              statusAssinatura={s.conta?.statusAssinatura ?? null}
              paginaDePlanos={PLANOS_DA_SOLUCAO[s.chave] ?? "/solucoes"}
            />
          );
        })}
      </div>
    </div>
  );
}
