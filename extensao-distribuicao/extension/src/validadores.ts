// Cálculo que pode ser conferido em código é feito em código, nunca
// "perguntado" a um modelo de IA — dígito verificador de CPF, CNPJ e do
// número de processo do CNJ, aqui, são sempre calculados e conferidos.

export function somenteNumeros(valor: string | null | undefined): string {
  return (valor ?? "").replace(/\D/g, "");
}

export function somenteAlfanumerico(valor: string | null | undefined): string {
  return (valor ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "");
}

export function validarCpf(entrada: string | null | undefined): boolean {
  const cpf = somenteNumeros(entrada);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const calcularDigito = (base: string): number => {
    let soma = 0;
    let peso = base.length + 1;
    for (const caractere of base) {
      soma += Number(caractere) * peso;
      peso -= 1;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const digito1 = calcularDigito(cpf.slice(0, 9));
  const digito2 = calcularDigito(cpf.slice(0, 9) + digito1);
  return cpf.slice(9) === `${digito1}${digito2}`;
}

// Suporta o CNPJ alfanumérico (Instrução Normativa RFB 2.229/2024): cada
// caractere vale charCodeAt(0) - 48 ("0"..."9" = 0..9, "A"..."Z" = 17...42);
// os dois últimos caracteres continuam sempre numéricos (dígito verificador).
function valorCaractereCnpj(caractere: string): number {
  return caractere.charCodeAt(0) - 48;
}

function calcularDigitoCnpj(base: string, pesos: readonly number[]): number {
  let soma = 0;
  for (let indice = 0; indice < base.length; indice += 1) {
    soma += valorCaractereCnpj(base[indice] as string) * (pesos[indice] as number);
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

const PESOS_CNPJ_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;
const PESOS_CNPJ_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;

export function validarCnpj(entrada: string | null | undefined): boolean {
  const cnpj = somenteAlfanumerico(entrada);
  if (cnpj.length !== 14) return false;
  if (/^(.)\1{13}$/.test(cnpj)) return false;
  if (!/^\d{2}$/.test(cnpj.slice(12))) return false; // verificador é sempre numérico

  const digito1 = calcularDigitoCnpj(cnpj.slice(0, 12), PESOS_CNPJ_1);
  const digito2 = calcularDigitoCnpj(cnpj.slice(0, 12) + digito1, PESOS_CNPJ_2);
  return cnpj.slice(12) === `${digito1}${digito2}`;
}

export function validarDocumento(entrada: string | null | undefined, tipo?: "PF" | "PJ"): boolean {
  const limpo = somenteAlfanumerico(entrada);
  if (tipo === "PF") return validarCpf(entrada);
  if (tipo === "PJ") return validarCnpj(entrada);
  if (limpo.length === 11) return validarCpf(entrada);
  if (limpo.length === 14) return validarCnpj(entrada);
  return false;
}

export function validarCep(entrada: string | null | undefined): boolean {
  return /^\d{8}$/.test(somenteNumeros(entrada));
}

export function formatarCep(entrada: string | null | undefined): string {
  const cep = somenteNumeros(entrada);
  if (cep.length !== 8) return entrada ?? "";
  return `${cep.slice(0, 5)}-${cep.slice(5)}`;
}

export function formatarCpf(entrada: string | null | undefined): string {
  const cpf = somenteNumeros(entrada);
  if (cpf.length !== 11) return entrada ?? "";
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

export function formatarCnpj(entrada: string | null | undefined): string {
  const cnpj = somenteAlfanumerico(entrada);
  if (cnpj.length !== 14) return entrada ?? "";
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
}

export function formatarDocumento(entrada: string | null | undefined, tipo?: "PF" | "PJ"): string {
  const limpo = somenteAlfanumerico(entrada);
  if (tipo === "PJ" || limpo.length === 14) return formatarCnpj(entrada);
  return formatarCpf(entrada);
}

// Número de processo do CNJ (Resolução CNJ 65/2008): 20 dígitos no formato
// NNNNNNN-DD.AAAA.J.TR.OOOO, com dígito verificador em módulo 97 (ISO 7064)
// calculado sobre sequencial + ano + segmento + tribunal + unidade de
// origem, com o verificador zerado durante o cálculo.
export function validarNumeroProcessoCnj(entrada: string | null | undefined): boolean {
  const numero = somenteNumeros(entrada);
  if (numero.length !== 20) return false;

  const sequencial = numero.slice(0, 7);
  const verificador = numero.slice(7, 9);
  const restante = numero.slice(9); // AAAA J TR OOOO

  const base = BigInt(`${sequencial}${restante}00`);
  const modulo = base % 97n;
  const esperado = 98n - modulo;
  return Number(verificador) === Number(esperado);
}

export function formatarNumeroProcessoCnj(entrada: string | null | undefined): string {
  const numero = somenteNumeros(entrada);
  if (numero.length !== 20) return entrada ?? "";
  return `${numero.slice(0, 7)}-${numero.slice(7, 9)}.${numero.slice(9, 13)}.${numero.slice(13, 14)}.${numero.slice(14, 16)}.${numero.slice(16)}`;
}

export function validarEmail(entrada: string | null | undefined): boolean {
  const valor = (entrada ?? "").trim();
  if (!valor) return false;
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(valor);
}

export function validarOab(numero: string | null | undefined, uf: string | null | undefined): boolean {
  const numeroLimpo = somenteNumeros(numero);
  const ufLimpa = (uf ?? "").trim().toUpperCase();
  return numeroLimpo.length >= 3 && numeroLimpo.length <= 8 && /^[A-Z]{2}$/.test(ufLimpa);
}
