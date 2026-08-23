/**
 * Formatação de números, valores e datas para dentro dos documentos.
 *
 * O valor por extenso não é enfeite: num contrato de cessão, divergência entre
 * o algarismo e o extenso é motivo clássico de discussão. O extenso é gerado
 * aqui, em código, a partir do mesmo número que vai impresso — nunca digitado
 * à mão e nunca pedido à inteligência artificial.
 */

const UNIDADES = [
  "", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
  "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete",
  "dezoito", "dezenove",
];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = [
  "", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos",
  "seiscentos", "setecentos", "oitocentos", "novecentos",
];

/** Escreve um número inteiro de 0 a 999 por extenso. */
function trioPorExtenso(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";

  const centena = Math.floor(n / 100);
  const resto = n % 100;

  const partes: string[] = [];
  if (centena > 0) partes.push(CENTENAS[centena]);

  if (resto > 0) {
    if (resto < 20) {
      partes.push(UNIDADES[resto]);
    } else {
      const dezena = Math.floor(resto / 10);
      const unidade = resto % 10;
      partes.push(unidade > 0 ? `${DEZENAS[dezena]} e ${UNIDADES[unidade]}` : DEZENAS[dezena]);
    }
  }

  return partes.join(" e ");
}

const ESCALAS: Array<{ singular: string; plural: string }> = [
  { singular: "", plural: "" },
  { singular: "mil", plural: "mil" },
  { singular: "milhão", plural: "milhões" },
  { singular: "bilhão", plural: "bilhões" },
  { singular: "trilhão", plural: "trilhões" },
];

/** Escreve um número inteiro por extenso (até trilhões). */
export function inteiroPorExtenso(valor: number): string {
  const n = Math.floor(Math.abs(valor));
  if (n === 0) return "zero";

  // Quebra em grupos de três, do menos significativo para o mais.
  const grupos: number[] = [];
  let resto = n;
  while (resto > 0) {
    grupos.push(resto % 1000);
    resto = Math.floor(resto / 1000);
  }

  if (grupos.length > ESCALAS.length) return String(n);

  const partes: string[] = [];
  for (let i = grupos.length - 1; i >= 0; i--) {
    const grupo = grupos[i];
    if (grupo === 0) continue;

    const escala = ESCALAS[i];
    if (i === 0) {
      partes.push(trioPorExtenso(grupo));
    } else if (i === 1) {
      // "mil" não leva "um" na frente: 1.500 é "mil e quinhentos".
      partes.push(grupo === 1 ? "mil" : `${trioPorExtenso(grupo)} mil`);
    } else {
      partes.push(`${trioPorExtenso(grupo)} ${grupo === 1 ? escala.singular : escala.plural}`);
    }
  }

  // Pontuação do português: liga o último grupo com "e" quando ele é menor que
  // cem ou é centena redonda; nos demais casos, vírgula.
  let texto = partes[0];
  let escritos = 1;
  for (let i = grupos.length - 2; i >= 0; i--) {
    if (grupos[i] === 0) continue;
    const parte = partes[escritos++];
    const ultimo = escritos === partes.length;
    const ligaComE = ultimo && (grupos[i] < 100 || grupos[i] % 100 === 0);
    texto += ligaComE ? ` e ${parte}` : `, ${parte}`;
  }

  return texto;
}

/**
 * Em português, quando o número termina numa escala de milhão ou maior, a
 * unidade vem com "de": "um milhão DE reais", "quinze milhões DE reais".
 * Já "dois milhões e quinhentos mil reais" dispensa, porque não termina na
 * escala. Sem isso o contrato sai com português errado.
 */
function terminaEmEscalaGrande(extenso: string): boolean {
  return /(milhão|milhões|bilhão|bilhões|trilhão|trilhões)$/.test(extenso);
}

/**
 * Valor monetário por extenso.
 * Ex: 1234.56 em BRL -> "mil, duzentos e trinta e quatro reais e cinquenta e seis centavos"
 * Ex: 1000000  em BRL -> "um milhão de reais"
 */
export function valorPorExtenso(valor: number, moedaCodigo: "BRL" | "USD" | "EUR" = "BRL"): string {
  const nomes = {
    BRL: { inteiro: ["real", "reais"], fracao: ["centavo", "centavos"] },
    USD: { inteiro: ["dólar americano", "dólares americanos"], fracao: ["centavo", "centavos"] },
    EUR: { inteiro: ["euro", "euros"], fracao: ["centavo", "centavos"] },
  }[moedaCodigo];

  const negativo = valor < 0;
  // Arredonda em centavos antes de separar: 0.1 + 0.2 em ponto flutuante dá
  // 0.30000000000000004, e sem isto o extenso perderia um centavo.
  const centavosTotais = Math.round(Math.abs(valor) * 100);
  const inteiros = Math.floor(centavosTotais / 100);
  const centavos = centavosTotais % 100;

  const partes: string[] = [];
  if (inteiros > 0) {
    const extenso = inteiroPorExtenso(inteiros);
    const unidade = inteiros === 1 ? nomes.inteiro[0] : nomes.inteiro[1];
    partes.push(terminaEmEscalaGrande(extenso) ? `${extenso} de ${unidade}` : `${extenso} ${unidade}`);
  }
  if (centavos > 0) {
    partes.push(`${inteiroPorExtenso(centavos)} ${centavos === 1 ? nomes.fracao[0] : nomes.fracao[1]}`);
  }
  if (partes.length === 0) return `zero ${nomes.inteiro[1]}`;

  const texto = partes.join(" e ");
  return negativo ? `${texto} negativos` : texto;
}

/**
 * Percentual por extenso. As casas decimais são lidas dígito a dígito, como se
 * fala: 12,5 -> "doze vírgula cinco"; 12,05 -> "doze vírgula zero cinco".
 */
export function percentualPorExtenso(valor: number): string {
  const absoluto = Math.abs(valor);
  const inteiro = Math.floor(absoluto);

  // Usa o texto do número para não inventar casas decimais que não existem.
  const decimais = absoluto.toFixed(4).split(".")[1].replace(/0+$/, "");

  if (!decimais) return `${inteiroPorExtenso(inteiro)} por cento`;

  const digitos = decimais
    .split("")
    .map((d) => (d === "0" ? "zero" : UNIDADES[Number(d)]))
    .join(" ");

  return `${inteiroPorExtenso(inteiro)} vírgula ${digitos} por cento`;
}

// ---------------------------------------------------------------------
// Números e datas
// ---------------------------------------------------------------------

export function moeda(valor: number | null | undefined, codigo = "BRL"): string {
  if (valor == null) return "[VALOR NÃO INFORMADO]";
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: codigo });
}

/** Valor como entra no contrato: "R$ 1.000,00 (mil reais)". */
export function moedaComExtenso(valor: number | null | undefined, codigo: "BRL" | "USD" | "EUR" = "BRL"): string {
  if (valor == null) return "[VALOR NÃO INFORMADO]";
  return `${moeda(valor, codigo)} (${valorPorExtenso(Number(valor), codigo)})`;
}

export function percentualComExtenso(valor: number | null | undefined): string {
  if (valor == null) return "[PERCENTUAL NÃO INFORMADO]";
  const n = Number(valor);
  const formatado = n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 4 });
  return `${formatado}% (${percentualPorExtenso(n)})`;
}

export function numero(valor: number | null | undefined, casas = 2): string {
  if (valor == null) return "";
  return Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

export function dataExtenso(data: Date = new Date()): string {
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function dataCurta(data: Date | null | undefined): string {
  if (!data) return "";
  return new Date(data).toLocaleDateString("pt-BR");
}

export function dataHora(data: Date | null | undefined): string {
  if (!data) return "";
  return new Date(data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
