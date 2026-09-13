/**
 * Guarda segredo de cliente cifrado — hoje, a senha do certificado digital.
 *
 * O certificado A1 e a senha dele são credenciais do CLIENTE, não da
 * plataforma: com eles se entra no gov.br em nome dele. Guardar isso em texto
 * puro no banco significaria que um vazamento de banco entrega, junto, a
 * identidade digital de cada assinante. Por isso fica cifrado, e a chave de
 * cifra mora fora do banco (variável de ambiente).
 *
 * AES-256-GCM: além de cifrar, autentica — se o conteúdo for adulterado, a
 * decifragem falha em vez de devolver lixo silenciosamente.
 *
 * Sem `COFRE_CHAVE` configurada, guardar segredo é RECUSADO. Não existe modo
 * "salva sem cifrar por enquanto": é exatamente assim que segredo acaba em
 * texto puro em produção.
 */
import crypto from "crypto";

const ALGORITMO = "aes-256-gcm";

function chave(): Buffer | null {
  const bruta = (process.env.COFRE_CHAVE ?? "").trim();
  if (!bruta) return null;

  // Aceita hex de 64 caracteres (32 bytes) ou qualquer texto, derivando daí.
  if (/^[0-9a-f]{64}$/i.test(bruta)) return Buffer.from(bruta, "hex");
  return crypto.createHash("sha256").update(bruta).digest();
}

export function cofreConfigurado(): boolean {
  return chave() != null;
}

/** Cifra um segredo. Devolve "iv:tag:conteudo", tudo em base64. */
export function cifrar(texto: string): { ok: true; valor: string } | { ok: false; erro: string } {
  const k = chave();
  if (!k) {
    return {
      ok: false,
      erro:
        "O cofre de segredos não está configurado (COFRE_CHAVE). Sem ele o sistema não guarda senha de " +
        "certificado — guardar sem cifrar seria pior do que não guardar.",
    };
  }

  const iv = crypto.randomBytes(12);
  const cifrador = crypto.createCipheriv(ALGORITMO, k, iv);
  const conteudo = Buffer.concat([cifrador.update(texto, "utf8"), cifrador.final()]);
  const tag = cifrador.getAuthTag();

  return { ok: true, valor: `${iv.toString("base64")}:${tag.toString("base64")}:${conteudo.toString("base64")}` };
}

/** Decifra o que `cifrar` gerou. */
export function decifrar(guardado: string): { ok: true; texto: string } | { ok: false; erro: string } {
  const k = chave();
  if (!k) return { ok: false, erro: "O cofre de segredos não está configurado (COFRE_CHAVE)." };

  const partes = guardado.split(":");
  if (partes.length !== 3) return { ok: false, erro: "Segredo guardado em formato que o sistema não reconhece." };

  try {
    const [iv, tag, conteudo] = partes.map((p) => Buffer.from(p, "base64"));
    const decifrador = crypto.createDecipheriv(ALGORITMO, k, iv);
    decifrador.setAuthTag(tag);
    const texto = Buffer.concat([decifrador.update(conteudo), decifrador.final()]).toString("utf8");
    return { ok: true, texto };
  } catch {
    // Chave trocada, conteúdo adulterado ou corrompido — nos três casos o
    // certo é falhar, não devolver algo que parece válido.
    return {
      ok: false,
      erro:
        "Não foi possível abrir o segredo guardado. Se a chave do cofre mudou, o certificado precisa ser " +
        "enviado de novo.",
    };
  }
}
