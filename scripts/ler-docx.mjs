import fs from "fs";
import zlib from "zlib";

const arquivo = process.argv[2];
const buf = fs.readFileSync(arquivo);
let i = 0, alvo = null;
while ((i = buf.indexOf(Buffer.from([0x50, 0x4b, 0x03, 0x04]), i)) >= 0) {
  const metodo = buf.readUInt16LE(i + 8);
  const compLen = buf.readUInt32LE(i + 18);
  const nameLen = buf.readUInt16LE(i + 26);
  const extraLen = buf.readUInt16LE(i + 28);
  const nome = buf.slice(i + 30, i + 30 + nameLen).toString();
  const inicio = i + 30 + nameLen + extraLen;
  if (nome === "word/document.xml") {
    const dados = buf.slice(inicio, inicio + compLen);
    alvo = metodo === 8 ? zlib.inflateRawSync(dados) : dados;
    break;
  }
  i = inicio + compLen;
}
if (!alvo) { console.error("document.xml nao encontrado"); process.exit(1); }
console.log(alvo.toString("utf8")
  .replace(/<w:p[ >]/g, "\n<w:p ")
  .replace(/<[^>]+>/g, "")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
  .split("\n").map(l => l.trim()).filter(Boolean).join("\n"));
