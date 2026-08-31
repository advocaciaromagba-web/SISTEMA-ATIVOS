import { prisma } from "@/lib/prisma";
import { exigirSessaoCliente } from "@/lib/cliente/sessao";
import { SOLUCOES } from "@/lib/solucoes";
import { ICONE_SOLUCAO } from "@/components/icones-solucoes";
import { CartaoSolucao } from "./cartao-solucao";

export const dynamic = "force-dynamic";

export default async function PainelCliente() {
  const cliente = await exigirSessaoCliente();

  const assinaturas = await prisma.clienteAssinatura.findMany({
    where: { clienteId: cliente.id, status: "ATIVA" },
    select: { solucao: true },
  });
  const assinadas = new Set(assinaturas.map((a) => a.solucao));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Suas soluções</h1>
        <p className="mt-1 text-sm text-slate-500">
          Uma conta só. Assine o que precisar, cancele quando quiser, e entre em qualquer uma sem digitar senha de
          novo.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SOLUCOES.map((s) => {
          const Icone = ICONE_SOLUCAO[s.chave];
          return (
            <CartaoSolucao
              key={s.chave}
              chave={s.chave}
              nome={s.nome}
              resumo={s.resumo}
              icone={<Icone className="h-5 w-5 text-[color:var(--marca)]" />}
              assinada={assinadas.has(s.chave)}
            />
          );
        })}
      </div>
    </div>
  );
}
