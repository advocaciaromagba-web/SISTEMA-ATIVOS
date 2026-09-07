/**
 * Perguntas no terminal.
 *
 * A leitura é feita tecla a tecla, e o eco é desenhado aqui — em vez de
 * confiar no eco automático do readline, que não aparece em alguns terminais
 * (foi o que aconteceu no terminal do app: nem o e-mail, que não é segredo,
 * era exibido enquanto se digitava).
 *
 * Segredo aparece como asteriscos, não como vazio absoluto. Esconder o
 * conteúdo é necessário; esconder também que a tecla foi registrada só faz a
 * pessoa duvidar se o programa travou — e digitar de novo por cima.
 *
 * Quando a entrada não é um terminal de verdade (script automatizado, teste
 * com `echo ... |`), cai no modo simples: sem raw mode, sem eco desenhado.
 */
import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";

/** Caminho simples, para entrada redirecionada (sem terminal). */
function perguntaSemTerminal(texto) {
  const rl = createInterface({ input: stdin, output: stdout });
  return new Promise((resolve) =>
    rl.question(texto, (resposta) => {
      rl.close();
      resolve(resposta.trim());
    })
  );
}

/**
 * Lê uma linha desenhando o eco.
 *
 * `eco`: "normal" mostra o que foi digitado; "mascara" mostra asteriscos.
 */
function lerLinha(texto, eco) {
  if (!stdin.isTTY) return perguntaSemTerminal(texto);

  // Se o terminal não aceitar o modo tecla a tecla, é melhor perguntar do
  // jeito simples do que quebrar no meio de um cadastro.
  const eraRaw = Boolean(stdin.isRaw);
  try {
    stdin.setRawMode(true);
  } catch {
    return perguntaSemTerminal(texto);
  }

  return new Promise((resolve) => {
    stdout.write(texto);

    stdin.resume();
    stdin.setEncoding("utf8");

    let valor = "";

    const encerrar = (resultado) => {
      stdin.removeListener("data", aoReceber);
      stdin.setRawMode(eraRaw);
      stdin.pause();
      stdout.write("\n");
      resolve(resultado);
    };

    function aoReceber(pedaco) {
      // Colagem chega como um bloco só: percorre caractere a caractere para
      // que Enter no meio de uma colagem também seja respeitado.
      for (const tecla of pedaco) {
        if (tecla === "\r" || tecla === "\n") {
          encerrar(valor.trim());
          return;
        }

        if (tecla === "\u0003") {
          // Ctrl+C: sai como o terminal espera, sem deixar o modo raw ligado.
          stdin.removeListener("data", aoReceber);
          stdin.setRawMode(eraRaw);
          stdout.write("\n");
          process.exit(130);
        }

        if (tecla === "\u007f" || tecla === "\b") {
          if (valor.length > 0) {
            valor = valor.slice(0, -1);
            // Apaga o caractere impresso: volta, cobre com espaço, volta.
            stdout.write("\b \b");
          }
          continue;
        }

        // Ignora teclas de controle e sequências de seta.
        if (tecla < " ") continue;

        valor += tecla;
        stdout.write(eco === "mascara" ? "*" : tecla);
      }
    }

    stdin.on("data", aoReceber);
  });
}

/** Pergunta comum: o que a pessoa digita aparece. */
export function pergunta(texto) {
  return lerLinha(texto, "normal");
}

/** Pergunta de segredo: aparecem asteriscos, um por caractere. */
export function perguntaOculta(texto) {
  return lerLinha(texto, "mascara");
}
