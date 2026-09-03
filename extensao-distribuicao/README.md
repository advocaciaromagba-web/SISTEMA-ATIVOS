# Extensão de distribuição processual com OCR

Extensão de navegador (Chrome/Edge, Manifest V3), **independente** do
restante deste repositório, que:

1. Recebe a petição inicial (e anexos), organiza e nomeia os arquivos.
2. Lê a petição por OCR (sem custo por padrão: pdf.js para PDF nativo,
   tesseract.js para página escaneada) e monta o checklist de campos
   obrigatórios da distribuição processual.
3. Mostra tudo numa tela de revisão editável — nada segue para o tribunal
   sem você confirmar.
4. Preenche o formulário de peticionamento inicial do **PJe**, **e-SAJ** ou
   **eproc** na aba onde você já está logado, até a tela final de revisão.
   **Protocolar é sempre um clique seu**, na aba do tribunal — a extensão
   não faz isso por você, tanto por segurança quanto porque a assinatura por
   certificado digital dos tribunais roda fora do alcance de uma extensão.

## Estrutura

```
extension/   a extensão em si (o que você carrega no Chrome)
server/      servidor opcional, só usado se você ligar "extração assistida por IA"
```

## Como rodar

### 1. Construir a extensão

```bash
cd extension
npm install
npm run build
```

Isso gera `extension/dist/`. No Chrome, abra `chrome://extensions`, ligue o
"Modo do desenvolvedor" e clique em "Carregar sem compactação", apontando
para `extension/dist`.

### 2. (Opcional) Ligar a extração assistida por IA

Por padrão a leitura da petição não usa nenhuma IA nem tem custo — roda
inteira dentro do navegador. Se quiser uma segunda tentativa por IA nos
campos que o OCR não achou:

```bash
cd server
npm install
cp .env.example .env   # preencha ANTHROPIC_API_KEY
npm run dev
```

Depois, nas opções da extensão (clique direito no ícone → Opções), ligue
"extração assistida por IA" e confira o endereço do servidor (padrão
`http://localhost:8787`).

## Como usar

1. Abra o popup da extensão e selecione o PDF (ou imagem) da petição
   inicial. A extensão lê o texto, tenta OCR nas páginas escaneadas e
   preenche o checklist com o que encontrou.
2. Revise cada campo — nome das partes, CPF/CNPJ, classe processual,
   assunto, valor da causa, comarca/vara, advogado(s), anexos. O aviso
   amarelo lista o que ainda falta.
3. Adicione anexos extras se precisar (procuração, documentos pessoais,
   provas) e classifique cada um no menu ao lado do nome do arquivo.
4. Abra, na mesma janela, a tela de "Petição Inicial"/"Processo Novo" do
   tribunal (PJe, e-SAJ ou eproc) — logado normalmente, como você já faz
   hoje.
5. No popup, escolha o tribunal e clique em "Preencher na aba ativa". A
   extensão preenche os campos e os anexos até a tela final de revisão.
6. **Confira tudo na tela do tribunal e clique você mesmo em protocolar.**

## Limite importante: calibração dos adaptadores de tribunal

Os adaptadores de PJe, e-SAJ e eproc (`extension/src/conteudo/*.ts`) foram
escritos com base na estrutura pública conhecida de cada sistema, buscando
campos pelo **rótulo visível** (o texto que você lê na tela), não por
id interno — isso é mais estável entre instâncias diferentes do mesmo
sistema, mas ainda assim **precisa ser conferido contra a instância real do
seu tribunal antes de usar em um caso de verdade**. Cada tribunal (e cada
TJ/TRT/TRF que roda e-SAJ/eproc) costuma nomear os campos de um jeito
ligeiramente diferente.

Para calibrar: abra a tela real do tribunal, veja se `buscarCampoPorRotulo`
(em `extension/src/conteudo/adaptador-base.ts`) encontra cada campo — se
não encontrar, adicione o texto exato do rótulo à lista de sinônimos no
adaptador daquele tribunal. Não precisa reescrever a lógica, só ajustar a
lista de nomes.

### Fontes usadas para confirmar os rótulos

Os rótulos abaixo foram confirmados contra manual oficial (CNJ ou o
próprio tribunal, via busca — não foi possível abrir todos os PDFs por
completo neste ambiente, então vale conferir contra a tela real):

- **PJe**: Classe Judicial, Assunto/Assunto Principal, Valor da Causa,
  Justiça Gratuita, Segredo de Justiça, Prioridade de Tramitação/Prioridade
  de Processo — todos na aba "Características". Partes: botão "+ Parte",
  busca por CPF/CNPJ. Anexos: aba "Anexar Petição/Documentos", campo "Tipo
  de Documento" (ex.: "Petição inicial", "Procuração", "Documento de
  Identificação"). Fontes: docs.pje.jus.br (Manual do Advogado), TRF1, TRT2,
  TJRJ, TJMG, JFPB, TRF3. **Não confirmado com segurança**: o par
  foro+vara — o PJe pode resolver isso por um único campo "Órgão Julgador"
  dependendo do tribunal.
- **e-SAJ** (referência: TJSP, o mais documentado — cada TJ customiza a
  própria instância): campos "Classe", "Assunto", "Valor da Ação", "Foro" e
  "Competência" (dois campos distintos), seção "Polo Ativo"/"Polo Passivo"
  com botão "Adicionar Parte". Anexo classificado **depois** de enviar o
  arquivo, campo "Tipo de documento". Gratuidade pode estar embutida no
  campo "Despesas Processuais" (grupo de opções, não checkbox) em vez de
  uma caixinha isolada — não confirmado. Fontes: tjsp.jus.br
  (PeticionamentoInicial.pdf, PeticionamentoSigiloso.pdf, apostila Dados das
  Partes), sajajuda.esaj.softplan.com.br.
- **eproc**: fluxo de 5 etapas — (1) Classe Processual + Valor da Causa +
  Localidade, (2) Assuntos, (3) Partes (Autores), (4) Partes (Réus), (5)
  anexos. **Confirmado**: sigilo não é uma caixinha sim/não, é o campo
  "Nível de Sigilo do Processo" (0 a 5 níveis) — por isso o adaptador usa
  `selecionarOpcaoPorTexto` para ele, não `marcarCaixaPorRotulo`. Anexos:
  botão "Anexar", cada arquivo recebe um "Tipo de Documento" que geralmente
  tem o mesmo nome do evento processual ("Petição Inicial", "Procuração").
  Fontes: tjsp.jus.br (manuais eproc para advogado externo), TJPR, TJRJ,
  TJSC.

## Domínios habilitados

`extension/public/manifest.json` já habilita os domínios mais comuns
(`*.pje.jus.br`, `*.tjsp.jus.br` para e-SAJ, `*.eproc.jus.br`). Se o seu
tribunal usa um domínio diferente, adicione-o em `host_permissions` e no
`matches` do content script correspondente.

## Checklist de campos obrigatórios (padrão)

Classe processual, assunto (CNJ), competência (comarca/UF/vara, ou
distribuição automática), valor da causa, qualificação completa do polo
ativo e do polo passivo, advogado(s) com OAB/UF, classificação de cada
anexo, e as flags de gratuidade de justiça, segredo de justiça e
prioridade de tramitação. Definido em `extension/src/campos/obrigatorios.ts`
e `extension/src/tipos.ts` — dá para estender por classe/assunto sem
espalhar lógica pelo resto do código.

## Princípios seguidos

- **A extração sugere, você confirma.** Nenhum campo lido por OCR, regex ou
  IA aplica direto — tudo passa pela tela de revisão.
- **Cálculo que dá para conferir em código é feito em código.** Dígito
  verificador de CPF, CNPJ (inclusive o formato alfanumérico) e do número de
  processo do CNJ (`extension/src/validadores.ts`) nunca são "perguntados"
  a uma IA.
- **Protocolar é sempre manual.** Nenhum adaptador tem, e nenhum deve
  ganhar, uma etapa que clique no botão final de envio do tribunal
  (`garantirQueNaoEBotaoFinal` em `adaptador-base.ts` é o cinto de
  segurança em código para essa regra).
