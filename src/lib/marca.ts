/**
 * Identidade da plataforma.
 *
 * Nada aqui esta escrito no codigo de proposito: tudo vem do arquivo .env.
 * A empresa gestora troca nome, CNPJ, logo e cores sem que ninguem precise
 * mexer no programa — e um sistema novo pode ser instalado para outra
 * empresa apenas mudando essas variaveis.
 */

const env = (chave: string, padrao = "") => (process.env[chave] ?? "").trim() || padrao;

export const marca = {
  nome: env("MARCA_NOME", "Plataforma"),
  razaoSocial: env("MARCA_RAZAO_SOCIAL"),
  cnpj: env("MARCA_CNPJ"),
  emailSuporte: env("MARCA_EMAIL_SUPORTE"),
  telefone: env("MARCA_TELEFONE"),
  site: env("MARCA_SITE"),
  /// Foro usado como padrao quando o assinante nao definiu o proprio.
  foroCidade: env("MARCA_CIDADE_FORO", "Sao Paulo"),
  foroUf: env("MARCA_UF_FORO", "SP"),
  logo: env("MARCA_LOGO"),
  cores: {
    principal: env("MARCA_COR", "#0f172a"),
    escura: env("MARCA_COR_ESCURA", "#020617"),
    clara: env("MARCA_COR_CLARA", "#e2e8f0"),
    contraste: env("MARCA_COR_CONTRASTE", "#ffffff"),
  },
};

/** Bloco de estilo que injeta as cores da marca como variaveis CSS. */
export function variaveisDeCor(): string {
  return `:root{--marca:${marca.cores.principal};--marca-escura:${marca.cores.escura};--marca-clara:${marca.cores.clara};--marca-contraste:${marca.cores.contraste};}`;
}
