/**
 * Resolvedor de imports para rodar arquivos .ts do projeto direto no Node.
 *
 * O Next entende "@/lib/..." e imports sem extensão; o Node, não. Este
 * carregador faz a mesma tradução, o que permite executar um script de
 * conferência sem subir o servidor.
 *
 * Uso: node --experimental-strip-types --import ./scripts/registrar.mjs script.mts
 */
import path from "path";
import { pathToFileURL } from "url";

const RAIZ_SRC = pathToFileURL(path.resolve(process.cwd(), "src") + path.sep).href;

const EXTENSOES = [".ts", ".tsx", ".mts", ".js", "/index.ts", "/index.tsx"];

async function tentar(candidatos, context, next) {
  let ultimoErro;
  for (const candidato of candidatos) {
    try {
      return await next(candidato, context);
    } catch (erro) {
      ultimoErro = erro;
    }
  }
  throw ultimoErro;
}

/** Modulos do Next que nao existem fora do servidor dele. */
const SUBSTITUTOS = {
  "next/headers": "./stub-next-headers.mjs",
};

export async function resolve(specifier, context, next) {
  const substituto = SUBSTITUTOS[specifier];
  if (substituto) {
    return next(new URL(substituto, import.meta.url).href, context);
  }

  // "@/lib/marca" -> file:///.../src/lib/marca.ts
  if (specifier.startsWith("@/")) {
    const base = RAIZ_SRC + specifier.slice(2);
    return tentar([...EXTENSOES.map((e) => base + e), base], context, next);
  }

  // "./catalogo" -> "./catalogo.ts"
  if (specifier.startsWith(".")) {
    try {
      return await next(specifier, context);
    } catch {
      return tentar(
        EXTENSOES.map((e) => specifier + e),
        context,
        next
      );
    }
  }

  return next(specifier, context);
}
