import type { Paragraph, Table } from "docx";
import type { BlocoAssinatura } from "./base";

/**
 * O que cada gerador devolve. Quem monta o arquivo .docx é o index — assim
 * cabeçalho, rodapé, numeração e bloco de assinaturas ficam iguais em todos os
 * documentos, e um gerador novo não precisa se preocupar com isso.
 */
export type MontagemDocumento = {
  titulo: string;
  subtitulo?: string;
  corpo: (Paragraph | Table)[];
  assinantes: BlocoAssinatura[];
  comTestemunhas?: boolean;
  /** Some com a linha de local e data (usado em fichas e declarações internas). */
  semLocalEData?: boolean;
};
