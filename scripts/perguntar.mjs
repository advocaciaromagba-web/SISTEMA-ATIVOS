/**
 * Perguntas no terminal, com e sem eco na tela.
 *
 * Fica separado porque mais de um script precisa pedir segredo, e leitura de
 * senha é o tipo de código que, escrito duas vezes, fica errado numa delas.
 */
import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";

export function pergunta(texto) {
  const rl = createInterface({ input: stdin, output: stdout });
  return new Promise((resolve) =>
    rl.question(texto, (resposta) => {
      rl.close();
      resolve(resposta.trim());
    })
  );
}

/**
 * Lê sem mostrar o que está sendo digitado.
 *
 * O truque é substituir a escrita do readline: o texto da pergunta sai uma
 * vez, e tudo o que o usuário digita depois é engolido. No fim, uma quebra de
 * linha, para o terminal não ficar com o cursor grudado na pergunta.
 */
export function perguntaOculta(texto) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: stdin, output: stdout, terminal: true });

    let jaMostrouAPergunta = false;
    rl._writeToOutput = (trecho) => {
      if (!jaMostrouAPergunta) {
        stdout.write(texto);
        jaMostrouAPergunta = true;
        return;
      }
      // Silêncio: nem os caracteres digitados, nem o eco do enter.
      void trecho;
    };

    rl.question(texto, (resposta) => {
      stdout.write("\n");
      rl.close();
      resolve(resposta.trim());
    });
  });
}
