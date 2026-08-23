/** Trechos que se repetem em todos os documentos. Escritos uma vez só. */
import { clausulaTitulo, paragrafo, type BlocoAssinatura } from "../base";
import { identificacao, nomeCurto } from "../qualificacao";
import { foro, partesPor, type ContextoDocumento } from "../contexto";
import { PAPEIS, type PapelParte } from "../catalogo";

/** Blocos de assinatura, na ordem dos papéis informada. */
export function assinantesDe(ctx: ContextoDocumento, papeis: PapelParte[]): BlocoAssinatura[] {
  const blocos: BlocoAssinatura[] = [];
  for (const papel of papeis) {
    for (const p of partesPor(ctx, papel)) {
      blocos.push({
        nome: nomeCurto(p.pessoa),
        identificacao: identificacao(p.pessoa),
        // O rótulo do catálogo traz explicação entre parênteses; na assinatura
        // fica só o papel.
        papel: PAPEIS[papel].replace(/ \(.*\)$/, ""),
      });
    }
  }
  return blocos;
}

const ORDINAIS = [
  "PRIMEIRA", "SEGUNDA", "TERCEIRA", "QUARTA", "QUINTA", "SEXTA", "SÉTIMA", "OITAVA",
  "NONA", "DÉCIMA", "DÉCIMA PRIMEIRA", "DÉCIMA SEGUNDA", "DÉCIMA TERCEIRA", "DÉCIMA QUARTA",
];

/**
 * Numeração das cláusulas.
 *
 * Existe porque cláusulas condicionais (que só aparecem em precatório, ou só
 * quando há condição suspensiva) desalinhavam a contagem escrita à mão — e um
 * contrato com "CLÁUSULA SEXTA" duas vezes é um contrato que ninguém assina.
 */
export function contadorClausulas() {
  let n = 0;
  return {
    proxima(titulo: string) {
      n += 1;
      const numero = n;
      // Os subitens têm contador próprio pelo mesmo motivo: com itens
      // condicionais, escrever "2.3." à mão produz saltos como 2.2 → 2.4.
      let sub = 0;
      return {
        cabecalho: `CLÁUSULA ${ORDINAIS[numero - 1] ?? `${numero}ª`} — ${titulo}`,
        prefixo: `${numero}.`,
        item: () => `${numero}.${(sub += 1)}.`,
      };
    },
    get atual() {
      return n;
    },
  };
}

/** Cláusula de eleição de foro. */
export function clausulaForo(ctx: ContextoDocumento, numeroClausula: string) {
  const f = foro(ctx);
  return [
    clausulaTitulo(numeroClausula.includes("—") ? numeroClausula : `${numeroClausula} — DO FORO`),
    paragrafo(
      `Fica eleito o foro da Comarca de ${f.cidade}/${f.uf} para dirimir quaisquer dúvidas ou controvérsias ` +
        "oriundas do presente instrumento, com renúncia expressa a qualquer outro, por mais privilegiado que seja."
    ),
  ];
}

/** Cláusula de assinatura eletrônica — evita discussão sobre validade. */
export function fechamentoEletronico(comTestemunhas = true) {
  return paragrafo(
    "E, por estarem assim justas e contratadas, as PARTES firmam o presente instrumento por meio eletrônico, " +
      "reconhecendo a validade da assinatura eletrônica nos termos do art. 10, § 2º, da Medida Provisória nº " +
      "2.200-2/2001 e do art. 4º da Lei nº 14.063/2020" +
      (comTestemunhas ? ", na presença das testemunhas abaixo." : "."),
    { espacoDepois: 240 }
  );
}
