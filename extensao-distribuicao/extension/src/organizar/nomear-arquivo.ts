import { RÓTULOS_TIPO_ANEXO, type TipoAnexo } from "../tipos";
import { removerDiacriticos } from "../texto";

/** "São Paulo" -> "sao-paulo"; usado para montar nome de arquivo sem
 * acento, espaço ou maiúscula. */
export function paraKebab(valor: string): string {
  return removerDiacriticos(valor)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export interface DadosNomeArquivo {
  data?: Date;
  classeProcessual?: string;
  parteAutora?: string;
  tipoAnexo: TipoAnexo;
  extensao?: string;
}

/** Convenção: AAAA-MM-DD-<classe>-<parte-autora>-<tipo-do-anexo>.pdf —
 * mesmo espírito do que já é feito manualmente hoje (nomear só depois de
 * analisar o conteúdo), agora em código. */
export function nomearArquivo(dados: DadosNomeArquivo): string {
  const data = (dados.data ?? new Date()).toISOString().slice(0, 10);
  const partes = [data];
  if (dados.classeProcessual) partes.push(paraKebab(dados.classeProcessual));
  if (dados.parteAutora) partes.push(paraKebab(dados.parteAutora));
  partes.push(paraKebab(RÓTULOS_TIPO_ANEXO[dados.tipoAnexo]));
  return `${partes.join("-")}.${dados.extensao ?? "pdf"}`;
}
