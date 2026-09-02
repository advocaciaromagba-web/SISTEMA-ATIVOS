import * as esbuild from "esbuild";
import { existsSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const raiz = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(raiz, "dist");
const observar = process.argv.includes("--watch");

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

// Páginas/manifesto: copiados como estão, sem processamento.
cpSync(join(raiz, "public", "manifest.json"), join(dist, "manifest.json"));
for (const arquivo of ["popup.html", "opcoes.html"]) {
  const origem = join(raiz, "public", arquivo);
  if (existsSync(origem)) cpSync(origem, join(dist, arquivo));
}
const icones = join(raiz, "public", "icones");
if (existsSync(icones)) cpSync(icones, join(dist, "icones"), { recursive: true });

/** @type {import("esbuild").BuildOptions} */
const opcoesComuns = {
  bundle: true,
  format: "iife",
  target: "chrome110",
  sourcemap: true,
  logLevel: "info",
};

const entradas = [
  { entry: "src/background/indice.ts", out: "background" },
  { entry: "src/conteudo/pje.ts", out: "conteudo/pje" },
  { entry: "src/conteudo/esaj.ts", out: "conteudo/esaj" },
  { entry: "src/conteudo/eproc.ts", out: "conteudo/eproc" },
  { entry: "src/popup/principal.ts", out: "popup" },
  { entry: "src/opcoes/principal.ts", out: "opcoes" },
];

const contextos = await Promise.all(
  entradas.map((item) =>
    esbuild.context({
      ...opcoesComuns,
      entryPoints: [join(raiz, item.entry)],
      outfile: join(dist, `${item.out}.js`),
    })
  )
);

if (observar) {
  await Promise.all(contextos.map((contexto) => contexto.watch()));
  console.log("build: observando alterações (Ctrl+C para sair)...");
} else {
  await Promise.all(contextos.map((contexto) => contexto.rebuild()));
  await Promise.all(contextos.map((contexto) => contexto.dispose()));
  execFileSync(process.execPath, [join(raiz, "scripts", "copiar-vendor.mjs")], { stdio: "inherit" });
  console.log(`build: pronto em ${dist}`);
}
