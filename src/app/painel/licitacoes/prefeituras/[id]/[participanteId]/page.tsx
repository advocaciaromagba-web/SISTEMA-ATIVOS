import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import { formatarDocumento } from "@/lib/validacao";
import { FormularioDocumentoParticipante } from "./documento-form";
import { BotoesAutenticidade } from "./autenticidade-botoes";
import { FormularioAssinatura } from "./assinatura-form";
import { FormularioParecer } from "./parecer-form";

export const dynamic = "force-dynamic";

const ROTULO_DOCUMENTO: Record<string, string> = {
  CONTRATO_SOCIAL: "Contrato social",
  CERTIDAO_TRIBUTOS_FEDERAIS: "Certidão de tributos federais",
  CERTIDAO_FGTS: "Certidão do FGTS",
  CNDT: "CNDT",
  CERTIDAO_FALENCIA_CONCORDATA: "Certidão de falência e concordata",
  DECLARACAO_NAO_EMPREGA_MENOR: "Declaração de não emprega menor",
  OUTRO: "Outro",
};

export default async function DetalheParticipante({
  params,
}: {
  params: { id: string; participanteId: string };
}) {
  const { organizacao } = await exigirSessao();

  const certame = await prisma.certame.findFirst({ where: { id: params.id, organizacaoId: organizacao.id } });
  if (!certame) notFound();

  const participante = await prisma.participanteCertame.findFirst({
    where: { id: params.participanteId, certameId: certame.id },
    include: { documentos: { orderBy: { enviadoEm: "desc" }, include: { assinatura: true } } },
  });
  if (!participante) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/painel/licitacoes/prefeituras/${certame.id}`} className="text-sm text-slate-500 hover:underline">
          ← {certame.modalidade} nº {certame.numeroCertame}
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{participante.nome}</h1>
        <p className="text-sm text-slate-500">{formatarDocumento(participante.documento)}</p>
      </div>

      <section className="cartao">
        <h2 className="mb-1 text-base font-semibold">Documentos apresentados</h2>
        <p className="mb-4 text-sm text-slate-500">
          Para cada um: confira se o conteúdo confere com a fonte oficial e valide a assinatura antes de decidir a
          qualificação.
        </p>

        <div className="space-y-4">
          {participante.documentos.map((d) => (
            <div key={d.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="etiqueta bg-slate-100 text-slate-700">
                    {ROTULO_DOCUMENTO[d.tipo] ?? d.tipo}
                  </span>
                  <span className="ml-2 text-sm text-slate-700">{d.nomeArquivo}</span>
                </div>
                <BotoesAutenticidade
                  documentoId={d.id}
                  certameId={certame.id}
                  participanteCertameId={participante.id}
                  atual={d.autenticidadeResultado}
                />
              </div>

              <FormularioAssinatura
                documentoId={d.id}
                certameId={certame.id}
                participanteCertameId={participante.id}
                validacao={d.assinatura}
              />
            </div>
          ))}

          {participante.documentos.length === 0 && (
            <p className="text-sm text-slate-500">Nenhum documento anexado ainda.</p>
          )}
        </div>

        <div className="mt-4">
          <FormularioDocumentoParticipante certameId={certame.id} participanteCertameId={participante.id} />
        </div>
      </section>

      <section className="cartao">
        <h2 className="mb-1 text-base font-semibold">Parecer</h2>
        <p className="mb-4 text-sm text-slate-500">
          A decisão final é sempre da comissão de licitação — este registro apoia, não substitui.
        </p>
        <FormularioParecer
          certameId={certame.id}
          participanteCertameId={participante.id}
          situacaoAtual={participante.situacao}
        />
      </section>
    </div>
  );
}
