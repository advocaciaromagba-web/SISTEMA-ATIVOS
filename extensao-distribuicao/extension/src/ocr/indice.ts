// Orquestra o pipeline completo: texto do PDF -> OCR de imagem para as
// páginas que faltar -> heurísticas de campo -> checklist inicial (sempre
// para revisão humana, nunca aplicado direto).
import { extrairCandidatos } from "../campos/heuristicas";
import {
  checklistVazio,
  parteVazia,
  type ChecklistDistribuicao,
  type ParteProcesso,
} from "../tipos";
import { somenteAlfanumerico } from "../validadores";
import { ocrPaginaImagem } from "./ocr-imagem";
import { extrairTextoPdf, type PaginaTexto } from "./texto-pdf";

export interface ResultadoLeitura {
  checklist: ChecklistDistribuicao;
  textoCompleto: string;
  paginas: PaginaTexto[];
  paginasLidasPorOcrImagem: number[];
}

export type ProgressoLeitura = (etapa: string) => void;

async function completarComOcrImagem(arquivo: File, paginas: PaginaTexto[], avisar?: ProgressoLeitura): Promise<{ texto: string; paginasComOcr: number[] }> {
  const partes: string[] = [];
  const paginasComOcr: number[] = [];
  for (const pagina of paginas) {
    if (pagina.temTexto) {
      partes.push(pagina.texto);
      continue;
    }
    avisar?.(`Lendo página ${pagina.numero} por OCR (documento parece escaneado)...`);
    const texto = await ocrPaginaImagem(arquivo, pagina.numero);
    partes.push(texto);
    paginasComOcr.push(pagina.numero);
  }
  return { texto: partes.join("\n\n"), paginasComOcr };
}

function montarPartes(nomes: string[], documentos: string[]): ParteProcesso[] {
  const quantidade = Math.max(nomes.length, documentos.length);
  const partes: ParteProcesso[] = [];
  for (let indice = 0; indice < quantidade; indice += 1) {
    const parte = parteVazia();
    parte.nome = nomes[indice] ?? "";
    const documento = documentos[indice];
    if (documento) {
      parte.documento = documento;
      parte.tipoPessoa = somenteAlfanumerico(documento).length === 14 ? "PJ" : "PF";
    }
    partes.push(parte);
  }
  return partes;
}

export async function lerPeticaoInicial(arquivo: File, avisar?: ProgressoLeitura): Promise<ResultadoLeitura> {
  avisar?.("Lendo o texto do PDF...");
  const paginas = await extrairTextoPdf(arquivo);
  const { texto: textoCompleto, paginasComOcr } = await completarComOcrImagem(arquivo, paginas, avisar);

  avisar?.("Procurando os campos obrigatórios no texto...");
  const candidatos = extrairCandidatos(textoCompleto);

  const checklist = checklistVazio();
  if (candidatos.numeroProcessoCnj) checklist.numeroProcessoCnj = candidatos.numeroProcessoCnj;
  if (candidatos.valorCausa) checklist.valorCausa = candidatos.valorCausa;
  if (candidatos.competencia) checklist.competencia = candidatos.competencia;

  const documentos = [...candidatos.cpfs, ...candidatos.cnpjs];
  const documentosPoloAtivo = documentos.slice(0, Math.max(candidatos.nomesRequerente.length, 1));
  const documentosPoloPassivo = documentos.slice(documentosPoloAtivo.length);

  checklist.poloAtivo = montarPartes(candidatos.nomesRequerente, documentosPoloAtivo);
  checklist.poloPassivo = montarPartes(candidatos.nomesRequerido, documentosPoloPassivo);

  if (candidatos.oabs.length > 0) {
    checklist.advogados = candidatos.oabs.map((oab) => ({ nome: "", oab: oab.numero, ufOab: oab.uf }));
  }

  return { checklist, textoCompleto, paginas, paginasLidasPorOcrImagem: paginasComOcr };
}
