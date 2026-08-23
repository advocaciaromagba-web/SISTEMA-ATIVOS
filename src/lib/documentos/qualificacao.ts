/**
 * Qualificação das partes — o parágrafo de abertura de qualquer contrato.
 *
 * Uma qualificação incompleta é a causa mais comum de recusa de registro em
 * cartório e de discussão sobre a validade da cessão. Por isso o que falta
 * aparece marcado entre colchetes, e não some do texto.
 */
import type { Pessoa, Usuario, Organizacao } from "@prisma/client";
import { formatarCep, formatarDocumento } from "@/lib/validacao";
import { ou } from "./base";

type ComEndereco = {
  enderecoRua?: string | null;
  enderecoNumero?: string | null;
  enderecoComplemento?: string | null;
  enderecoBairro?: string | null;
  enderecoCidade?: string | null;
  enderecoUf?: string | null;
  enderecoCep?: string | null;
};

/** Endereço corrido, como se escreve em contrato. */
export function endereco(p: ComEndereco, preposicao = "com endereço na"): string {
  if (!p.enderecoRua) return "[ENDEREÇO NÃO INFORMADO]";

  const complemento = p.enderecoComplemento ? `, ${p.enderecoComplemento}` : "";
  return (
    `${preposicao} ${p.enderecoRua}, nº ${ou(p.enderecoNumero, "número")}${complemento}, ` +
    `${ou(p.enderecoBairro, "bairro")}, ${ou(p.enderecoCidade, "cidade")}/${ou(p.enderecoUf, "UF")}, ` +
    `CEP ${formatarCep(p.enderecoCep) || "[CEP NÃO INFORMADO]"}`
  );
}

/** Qualificação de pessoa física. */
function qualificarPF(p: Pessoa): string {
  const partes = [
    p.nome,
    ou(p.nacionalidade, "nacionalidade"),
    ou(p.estadoCivil, "estado civil"),
    ou(p.profissao, "profissão"),
    `portador(a) da cédula de identidade RG nº ${ou(p.rg, "RG")}${p.orgaoEmissor ? ` — ${p.orgaoEmissor}` : ""}`,
    `inscrito(a) no CPF/MF sob o nº ${formatarDocumento(p.documento) || "[CPF NÃO INFORMADO]"}`,
    endereco(p, "residente e domiciliado(a) na"),
  ];

  if (p.email) partes.push(`endereço eletrônico ${p.email}`);
  return partes.join(", ");
}

/** Qualificação de pessoa jurídica, já com o representante que assina. */
function qualificarPJ(p: Pessoa): string {
  const partes = [
    p.nome.toUpperCase(),
    "pessoa jurídica de direito privado",
    `inscrita no CNPJ/MF sob o nº ${formatarDocumento(p.documento) || "[CNPJ NÃO INFORMADO]"}`,
  ];

  if (p.inscricaoEstadual) partes.push(`inscrição estadual nº ${p.inscricaoEstadual}`);
  partes.push(endereco(p, "com sede na"));
  if (p.email) partes.push(`endereço eletrônico ${p.email}`);

  const representante =
    `neste ato representada por ${ou(p.repNome, "nome do representante")}, ` +
    `${ou(p.repNacionalidade ?? p.nacionalidade, "nacionalidade")}, ` +
    `${ou(p.repEstadoCivil, "estado civil")}, ` +
    `${ou(p.repProfissao ?? p.repCargo, "profissão/cargo")}, ` +
    `portador(a) do RG nº ${ou(p.repRg, "RG")} e inscrito(a) no CPF/MF sob o nº ` +
    `${formatarDocumento(p.repCpf) || "[CPF DO REPRESENTANTE NÃO INFORMADO]"}` +
    `${p.repCargo ? `, na qualidade de ${p.repCargo}` : ""}`;

  partes.push(representante);
  return partes.join(", ");
}

/** Qualificação completa de qualquer parte cadastrada. */
export function qualificar(p: Pessoa): string {
  return p.tipo === "PJ" ? qualificarPJ(p) : qualificarPF(p);
}

/**
 * Bloco "NOME, qualificação..., doravante denominado(a) CEDENTE".
 * O apelido em maiúsculas é o que o resto do contrato usa.
 */
export function qualificarComApelido(p: Pessoa, apelido: string, feminino = false): string {
  return `${qualificar(p)}, doravante denominad${feminino ? "a" : "o"} simplesmente **${apelido.toUpperCase()}**`;
}

const ROMANOS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

/**
 * Apelidos distintos quando o mesmo papel se repete.
 *
 * Duas partes chamadas "INTERVENIENTE ANUENTE" no mesmo contrato tornam
 * ambíguo cada trecho que se refere a elas — e ambiguidade em contrato é
 * exatamente o que se discute depois. Com mais de uma, viram "ANUENTE I",
 * "ANUENTE II".
 */
export function apelidosUnicos(base: string, quantidade: number): string[] {
  if (quantidade <= 1) return [base];
  return Array.from({ length: quantidade }, (_, i) => `${base} ${ROMANOS[i] ?? String(i + 1)}`);
}

/** Qualificação do assinante da plataforma, quando ele próprio é parte. */
export function qualificarOrganizacao(o: Organizacao): string {
  const partes = [
    (o.razaoSocial || o.nome).toUpperCase(),
    "pessoa jurídica de direito privado",
    `inscrita no CNPJ/MF sob o nº ${formatarDocumento(o.cnpj) || "[CNPJ NÃO INFORMADO]"}`,
    endereco(o, "com sede na"),
  ];
  if (o.emailContato) partes.push(`endereço eletrônico ${o.emailContato}`);
  return partes.join(", ");
}

/** Qualificação do usuário que opera o sistema, quando figura como intermediário pessoa física. */
export function qualificarUsuario(u: Usuario): string {
  const partes = [
    u.nome,
    ou(u.nacionalidade, "nacionalidade"),
    ou(u.estadoCivil, "estado civil"),
    ou(u.profissao, "profissão"),
    `portador(a) do RG nº ${ou(u.rg, "RG")}`,
    `inscrito(a) no CPF/MF sob o nº ${formatarDocumento(u.cpf) || "[CPF NÃO INFORMADO]"}`,
    endereco(u, "residente e domiciliado(a) na"),
  ];
  if (u.email) partes.push(`endereço eletrônico ${u.email}`);
  return partes.join(", ");
}

/** Nome curto para linha de assinatura e tabelas. */
export function nomeCurto(p: Pessoa): string {
  return p.tipo === "PJ" ? p.nome.toUpperCase() : p.nome;
}

/** Linha de identificação sob a assinatura. */
export function identificacao(p: Pessoa): string {
  const doc = formatarDocumento(p.documento);
  if (p.tipo === "PJ") {
    const rep = p.repNome ? ` — p.p. ${p.repNome}` : "";
    return `CNPJ ${doc || "não informado"}${rep}`;
  }
  return `CPF ${doc || "não informado"}`;
}
