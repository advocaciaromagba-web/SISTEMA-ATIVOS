import type { ChecklistDistribuicao, ParteProcesso } from "../tipos";
import { validarCep, validarDocumento, validarOab } from "../validadores";

export interface Pendencia {
  chave: string;
  rotulo: string;
  motivo: string;
}

function parteEstaCompleta(parte: ParteProcesso, exigirDocumento: boolean): string[] {
  const problemas: string[] = [];
  if (!parte.nome.trim()) problemas.push("nome não informado");
  if (exigirDocumento && !validarDocumento(parte.documento, parte.tipoPessoa)) {
    problemas.push(parte.tipoPessoa === "PJ" ? "CNPJ inválido ou não informado" : "CPF inválido ou não informado");
  } else if (parte.documento && !validarDocumento(parte.documento, parte.tipoPessoa)) {
    problemas.push("documento informado não confere o dígito verificador");
  }
  if (parte.endereco.cep && !validarCep(parte.endereco.cep)) problemas.push("CEP inválido");
  return problemas;
}

/** Confere o checklist inteiro e devolve a lista do que falta ou está
 * inválido — nunca lança exceção: a tela de revisão mostra tudo de uma vez
 * em vez de parar no primeiro problema. */
export function conferirChecklist(checklist: ChecklistDistribuicao): Pendencia[] {
  const pendencias: Pendencia[] = [];

  if (!checklist.classeProcessual.valor.trim()) {
    pendencias.push({ chave: "classeProcessual", rotulo: "Classe processual", motivo: "não informada" });
  }
  if (!checklist.assuntoPrincipal.valor.trim()) {
    pendencias.push({ chave: "assuntoPrincipal", rotulo: "Assunto principal (CNJ)", motivo: "não informado" });
  }

  const competencia = checklist.competencia.valor;
  if (!competencia.distribuicaoAutomatica) {
    if (!competencia.comarca.trim() || !competencia.uf.trim()) {
      pendencias.push({ chave: "competencia", rotulo: "Comarca/UF", motivo: "não informada" });
    }
  }

  if (checklist.valorCausa.valor === null || checklist.valorCausa.valor <= 0) {
    pendencias.push({ chave: "valorCausa", rotulo: "Valor da causa", motivo: "não informado ou zerado" });
  }

  if (checklist.poloAtivo.length === 0) {
    pendencias.push({ chave: "poloAtivo", rotulo: "Polo ativo", motivo: "nenhuma parte informada" });
  }
  checklist.poloAtivo.forEach((parte, indice) => {
    for (const problema of parteEstaCompleta(parte, true)) {
      pendencias.push({ chave: `poloAtivo.${indice}`, rotulo: `Polo ativo — ${parte.nome || `parte ${indice + 1}`}`, motivo: problema });
    }
  });

  if (checklist.poloPassivo.length === 0) {
    pendencias.push({ chave: "poloPassivo", rotulo: "Polo passivo", motivo: "nenhuma parte informada" });
  }
  checklist.poloPassivo.forEach((parte, indice) => {
    for (const problema of parteEstaCompleta(parte, false)) {
      pendencias.push({ chave: `poloPassivo.${indice}`, rotulo: `Polo passivo — ${parte.nome || `parte ${indice + 1}`}`, motivo: problema });
    }
  });

  if (checklist.advogados.length === 0) {
    pendencias.push({ chave: "advogados", rotulo: "Advogado(s)", motivo: "nenhum advogado informado" });
  }
  checklist.advogados.forEach((advogado, indice) => {
    if (!advogado.nome.trim() || !validarOab(advogado.oab, advogado.ufOab)) {
      pendencias.push({ chave: `advogados.${indice}`, rotulo: `Advogado — ${advogado.nome || `#${indice + 1}`}`, motivo: "OAB inválida ou não informada" });
    }
  });

  if (!checklist.anexos.some((anexo) => anexo.tipo === "peticao_inicial")) {
    pendencias.push({ chave: "anexos", rotulo: "Anexos", motivo: "a petição inicial não foi classificada entre os anexos" });
  }

  return pendencias;
}

export function checklistEstaCompleto(checklist: ChecklistDistribuicao): boolean {
  return conferirChecklist(checklist).length === 0;
}
