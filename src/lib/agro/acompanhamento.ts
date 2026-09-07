/**
 * Guarda o último estado conhecido da MP acompanhada e detecta quando ele muda.
 *
 * A consulta à Câmara não é feita a cada carregamento de página: fica guardada
 * por algumas horas. O que importa aqui, além de economizar chamada, é a
 * memória — sem ela dá para saber QUAL é o estado, mas não que ele MUDOU, e é
 * a mudança que o advogado precisa ver.
 *
 * Se a fonte oficial estiver fora do ar, o sistema mostra o último estado
 * conhecido com a data em que foi conferido, e diz que está desatualizado.
 * Não inventa estado, e também não apaga o que já sabia.
 */
import { prisma } from "@/lib/prisma";
import { consultarVigenciaMp, MP_ACOMPANHADA, type VigenciaMp } from "./vigencia-mp";

/** De quanto em quanto tempo vale reconsultar a fonte oficial. */
const VALIDADE_HORAS = 6;

export type Acompanhamento = {
  vigencia: VigenciaMp | null;
  conferidoEm: Date | null;
  /**
   * Esta consulta específica foi a que flagrou a virada. Serve para disparar
   * aviso ativo (e-mail) no futuro — a tela NÃO usa este campo, porque ela
   * precisa mostrar a mudança por dias, e não só no instante em que ocorreu.
   * Para isso a tela olha `alteradoEm` e `situacaoAnterior`.
   */
  mudouAgora: boolean;
  situacaoAnterior: string | null;
  alteradoEm: Date | null;
  /** Não foi possível falar com a fonte oficial nesta consulta. */
  fonteIndisponivel: boolean;
};

function estaVencido(conferidoEm: Date | null): boolean {
  if (!conferidoEm) return true;
  return Date.now() - conferidoEm.getTime() > VALIDADE_HORAS * 3_600_000;
}

export async function obterAcompanhamentoMp(opcoes?: { forcar?: boolean }): Promise<Acompanhamento> {
  const guardado = await prisma.agroVigenciaNorma.findUnique({ where: { chave: MP_ACOMPANHADA.chave } });

  const precisaConsultar = opcoes?.forcar === true || estaVencido(guardado?.conferidoEm ?? null);

  if (!precisaConsultar && guardado) {
    return {
      vigencia: (guardado.retrato as VigenciaMp | null) ?? null,
      conferidoEm: guardado.conferidoEm,
      mudouAgora: false,
      situacaoAnterior: guardado.situacaoAnterior,
      alteradoEm: guardado.alteradoEm,
      fonteIndisponivel: false,
    };
  }

  const fresco = await consultarVigenciaMp();

  // Fonte fora do ar: devolve o que já se sabia, marcado como desatualizado.
  if (!fresco) {
    return {
      vigencia: (guardado?.retrato as VigenciaMp | null) ?? null,
      conferidoEm: guardado?.conferidoEm ?? null,
      mudouAgora: false,
      situacaoAnterior: guardado?.situacaoAnterior ?? null,
      alteradoEm: guardado?.alteradoEm ?? null,
      fonteIndisponivel: true,
    };
  }

  const anterior = guardado?.situacao ?? null;
  const mudou = anterior !== null && anterior !== fresco.situacao;
  const agora = new Date();

  const salvo = await prisma.agroVigenciaNorma.upsert({
    where: { chave: MP_ACOMPANHADA.chave },
    create: {
      chave: MP_ACOMPANHADA.chave,
      idProposicao: fresco.idProposicao,
      situacao: fresco.situacao,
      retrato: fresco as unknown as object,
      conferidoEm: agora,
      alteradoEm: agora,
      situacaoAnterior: null,
    },
    update: {
      idProposicao: fresco.idProposicao,
      situacao: fresco.situacao,
      retrato: fresco as unknown as object,
      conferidoEm: agora,
      ...(mudou ? { alteradoEm: agora, situacaoAnterior: anterior } : {}),
    },
  });

  return {
    vigencia: fresco,
    conferidoEm: salvo.conferidoEm,
    mudouAgora: mudou,
    situacaoAnterior: salvo.situacaoAnterior,
    alteradoEm: salvo.alteradoEm,
    fonteIndisponivel: false,
  };
}
