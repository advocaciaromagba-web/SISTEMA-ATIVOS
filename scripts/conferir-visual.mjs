/**
 * Monta uma copia autossuficiente das paginas ja compiladas, para conferencia.
 *
 * O `next build` deixa as paginas publicas prontas em .next/server/app, mas
 * elas apontam para /_next/... e para o otimizador de imagens, que so existem
 * com o servidor no ar. Este script reescreve esses caminhos para arquivos do
 * disco e embute o CSS, produzindo um .html que abre sozinho.
 *
 * Nao substitui o servidor de desenvolvimento: serve para olhar o resultado
 * do layout quando o preview nao esta disponivel.
 *
 * Uso:  node scripts/conferir-visual.mjs [destino]
 */
import fs from "fs/promises";
import path from "path";

const RAIZ = process.cwd();
const COMPILADO = path.join(RAIZ, ".next");
const PAGINAS = ["index", "login", "planos"];

const paraUrl = (arquivo) => "file:///" + arquivo.replace(/\\/g, "/");

/** "/_next/image?url=%2Fmarca%2Flogo.png&w=128&q=75" -> arquivo em public/ */
function resolverImagem(url) {
  const bruto = url.replace(/&amp;/g, "&");
  const casa = bruto.match(/[?&]url=([^&]+)/);
  if (!casa) return null;
  const caminho = decodeURIComponent(casa[1]);
  return paraUrl(path.join(RAIZ, "public", caminho));
}

/** "/_next/static/..." -> arquivo em .next/static/... */
function resolverEstatico(url) {
  const limpo = url.replace(/&amp;/g, "&").split("?")[0];
  if (!limpo.startsWith("/_next/")) return null;
  return paraUrl(path.join(COMPILADO, limpo.replace("/_next/", "")));
}

async function principal() {
  const destino = process.argv[2] ?? path.join(RAIZ, "conferencia-visual");
  await fs.mkdir(destino, { recursive: true });

  console.log("");
  for (const nome of PAGINAS) {
    const origem = path.join(COMPILADO, "server", "app", `${nome}.html`);

    let html;
    try {
      html = await fs.readFile(origem, "utf8");
    } catch {
      console.log(`  pulou ${nome}: nao foi pre-renderizada no build`);
      continue;
    }

    // ---- CSS embutido, com as fontes apontando para o disco ----
    const folhas = [...html.matchAll(/<link[^>]+href="(\/_next\/static\/css\/[^"]+)"[^>]*>/g)];
    let estilo = "";
    for (const [tag, href] of folhas) {
      let css = await fs.readFile(path.join(COMPILADO, href.replace("/_next/", "")), "utf8");
      css = css.replace(/url\((\/_next\/static\/media\/[^)]+)\)/g, (inteiro, url) => {
        const arquivo = resolverEstatico(url);
        return arquivo ? `url(${arquivo})` : inteiro;
      });
      estilo += css;
      html = html.replace(tag, "");
    }
    html = html.replace("</head>", `<style>${estilo}</style></head>`);

    // ---- imagens do next/image viram arquivo direto ----
    html = html.replace(/\/_next\/image\?[^"'\s]+/g, (url) => resolverImagem(url) ?? url);

    // O srcSet lista varios tamanhos separados por virgula; depois da troca
    // todos apontam para o mesmo arquivo, o que basta para conferir o layout.
    html = html.replace(/srcSet="[^"]*"/g, "");

    // ---- o resto do /_next (scripts) sai: aqui so se olha o desenho ----
    html = html.replace(/<script[^>]*src="\/_next\/[^"]*"[^>]*><\/script>/g, "");

    const saida = path.join(destino, `${nome}.html`);
    await fs.writeFile(saida, html);
    const { size } = await fs.stat(saida);
    console.log(`  ${nome.padEnd(12)} ${(size / 1024).toFixed(0)} kB   ${paraUrl(saida)}`);
  }

  console.log("");
}

principal().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
