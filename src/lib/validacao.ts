/**
 * Conferencia de documentos e dados.
 *
 * REGRA DE ARQUITETURA: calculo critico e feito aqui, em codigo, nunca pela
 * inteligencia artificial. Um digito de CPF errado vai parar dentro de uma
 * escritura de cessao — e ali o erro custa caro.
 */

/** Deixa so numeros. */
export function somenteNumeros(valor: string | null | undefined): string {
  return (valor ?? "").replace(/\D/g, "");
}

/** Deixa numeros e letras maiusculas (CNPJ alfanumerico). */
export function somenteAlfanumerico(valor: string | null | undefined): string {
  return (valor ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "");
}

// ---------------------------------------------------------------------
// CPF
// ---------------------------------------------------------------------

export function validarCpf(entrada: string | null | undefined): boolean {
  const cpf = somenteNumeros(entrada);
  if (cpf.length !== 11) return false;
  // 111.111.111-11 e afins passam na conta, mas nao existem.
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digito = (ate: number) => {
    let soma = 0;
    let peso = ate + 1;
    for (let i = 0; i < ate; i++) soma += Number(cpf[i]) * peso--;
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10]);
}

// ---------------------------------------------------------------------
// CNPJ — aceita o formato numerico classico e o alfanumerico
// (Instrucao Normativa RFB 2.229/2024, em vigor desde julho de 2026).
// O calculo do digito e o mesmo: cada caractere vale o codigo ASCII menos 48,
// entao "0"=0, "9"=9, "A"=17, "Z"=42.
// ---------------------------------------------------------------------

export function validarCnpj(entrada: string | null | undefined): boolean {
  const cnpj = somenteAlfanumerico(entrada);
  if (cnpj.length !== 14) return false;
  // Os dois ultimos caracteres sao sempre numericos, mesmo no alfanumerico.
  if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj)) return false;
  if (/^(.)\1{13}$/.test(cnpj)) return false;

  const valor = (c: string) => c.charCodeAt(0) - 48;

  const digito = (ate: number) => {
    let peso = 2;
    let soma = 0;
    for (let i = ate - 1; i >= 0; i--) {
      soma += valor(cnpj[i]) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  return digito(12) === Number(cnpj[12]) && digito(13) === Number(cnpj[13]);
}

/** Confere CPF ou CNPJ conforme o tamanho. */
export function validarDocumento(entrada: string | null | undefined, tipo?: "PF" | "PJ"): boolean {
  const limpo = somenteAlfanumerico(entrada);
  if (tipo === "PF") return validarCpf(limpo);
  if (tipo === "PJ") return validarCnpj(limpo);
  if (limpo.length === 11) return validarCpf(limpo);
  if (limpo.length === 14) return validarCnpj(limpo);
  return false;
}

// ---------------------------------------------------------------------
// Apresentacao
// ---------------------------------------------------------------------

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

export function formatarDocumento(entrada: string | null | undefined): string {
  const limpo = somenteAlfanumerico(entrada);
  if (limpo.length === 11) return formatarCpf(limpo);
  if (limpo.length === 14) return formatarCnpj(limpo);
  return entrada ?? "";
}

export function formatarCep(entrada: string | null | undefined): string {
  const cep = somenteNumeros(entrada);
  if (cep.length !== 8) return entrada ?? "";
  return `${cep.slice(0, 5)}-${cep.slice(5)}`;
}

export function formatarTelefone(entrada: string | null | undefined): string {
  const tel = somenteNumeros(entrada);
  if (tel.length === 11) return `(${tel.slice(0, 2)}) ${tel.slice(2, 7)}-${tel.slice(7)}`;
  if (tel.length === 10) return `(${tel.slice(0, 2)}) ${tel.slice(2, 6)}-${tel.slice(6)}`;
  return entrada ?? "";
}

// ---------------------------------------------------------------------
// Numero de processo judicial (padrao CNJ, Resolucao 65/2008)
// NNNNNNN-DD.AAAA.J.TR.OOOO — o DD e conferido por modulo 97 (ISO 7064).
// Vale para precatorio de origem judicial e para due diligence.
// ---------------------------------------------------------------------

export function validarNumeroProcessoCnj(entrada: string | null | undefined): boolean {
  const numero = somenteNumeros(entrada);
  if (numero.length !== 20) return false;

  const sequencial = numero.slice(0, 7);
  const verificador = numero.slice(7, 9);
  const resto = numero.slice(9); // AAAA J TR OOOO

  // O calculo roda sobre o numero com o verificador zerado, no fim da cadeia.
  const base = `${sequencial}${resto}00`;

  // Numero de 20 digitos estoura o limite do Number: usa BigInt.
  const modulo = BigInt(base) % 97n;
  const esperado = 98n - modulo;

  return Number(verificador) === Number(esperado);
}

export function formatarNumeroProcessoCnj(entrada: string | null | undefined): string {
  const n = somenteNumeros(entrada);
  if (n.length !== 20) return entrada ?? "";
  return `${n.slice(0, 7)}-${n.slice(7, 9)}.${n.slice(9, 13)}.${n.slice(13, 14)}.${n.slice(14, 16)}.${n.slice(16)}`;
}

// ---------------------------------------------------------------------
// E-mail
// ---------------------------------------------------------------------

export function validarEmail(entrada: string | null | undefined): boolean {
  const email = (entrada ?? "").trim();
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}
