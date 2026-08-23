# Sistema de intermediação de ativos

Plataforma para intermediários de precatórios, créditos tributários, commodities e
outros ativos. Reúne o cadastro das operações, a geração dos documentos e o
registro de tudo o que foi feito.

Operada por **BLACKBIRD SOLUÇÕES ESTRATÉGICAS LTDA**. O nome, o logo, as cores e o
CNPJ que aparecem nas telas e nos documentos vêm do arquivo `.env` — nada disso
está escrito dentro do programa, então dá para trocar a marca sem mexer no código.

---

## O que já funciona

**Cadastro de partes** — pessoa física e jurídica, com a qualificação completa que
entra nos contratos. CPF, CNPJ (inclusive o novo formato alfanumérico da Receita)
e número de processo do CNJ são conferidos pelos dígitos verificadores, em código.

**Operações** — precatório, crédito de ICMS, PIS/COFINS, CredAq, commodity e
outros. Cada tipo pede os campos que lhe são próprios. O deságio é calculado
sozinho a partir do valor de face e do valor negociado.

**Cadeia de intermediação** — cada parte entra com um papel (cedente, cessionário,
intermediário, anuente, testemunha), seu percentual de comissão e sua posição na
cadeia. É essa cadeia que o NCNDA protege.

**16 documentos gerados em Word**, prontos para revisar e assinar:

| | Documento | Para que serve |
|---|---|---|
| 1 | NDA | Sigilo das informações trocadas |
| 2 | NCNDA | Sigilo + proteção contra circunvenção |
| 3 | IMFPA | Comissão irrevogável, paga direto pelo pagador |
| 4 | Procuração | Poderes para tratar do ativo |
| 5 | Mandato de representação | Contrata o intermediário, com ou sem exclusividade |
| 6 | Carta de intenção (LOI) | Proposta antes do contrato |
| 7 | Cessão de crédito | Contrato principal |
| 8 | Cessão de direitos | Direitos ainda não líquidos |
| 9 | Cessão de precatório | Com as exigências do art. 100 da Constituição |
| 10 | Notificação ao devedor | Sem ela a cessão não vale contra o devedor |
| 11 | Termo de comissionamento | Quanto cada um recebe e quando |
| 12 | Termo de quitação | Encerra a operação |
| 13 | Declaração de origem lícita | Lei de lavagem de dinheiro |
| 14 | Ficha KYC | Conheça seu cliente |
| 15 | Termo aditivo | Altera contrato assinado |
| 16 | Distrato | Desfaz de comum acordo |

Cada documento sai com:

- a qualificação completa das partes, montada a partir do cadastro;
- valores por extenso conferidos contra o número (`R$ 900.000,00 (novecentos mil reais)`);
- numeração de cláusulas automática, que não pula nem repete;
- o que faltar no cadastro marcado em `[MAIÚSCULAS ENTRE COLCHETES]`, para ser visto;
- espaço para duas testemunhas quando isso torna o documento título executivo;
- uma impressão digital SHA-256 que prova depois que o arquivo não foi alterado.

**Auditoria** — quem entrou, o que alterou, que documento gerou e baixou, de que
endereço. O registro não é editado nem apagado pelo sistema.

**Segurança** — login com limite de tentativas, verificação em duas etapas por
aplicativo autenticador, e separação por assinante: nenhuma consulta ao banco roda
sem o identificador da organização, então um assinante não alcança o dado do outro.

---

## Como colocar no ar

Você precisa fazer três coisas fora do computador. O resto é copiar e colar.

### 1. Criar o banco de dados

1. Entre em [railway.app](https://railway.app) e abra (ou crie) um projeto.
2. Clique em **New** → **Database** → **PostgreSQL**.
3. Abra o banco criado, aba **Variables**, e copie o valor de `DATABASE_URL`.

### 2. Preencher o arquivo de configuração

Copie `.env.example` para `.env` e preencha. O mínimo para funcionar:

```
DATABASE_URL="cole aqui o que você copiou da Railway"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="cole aqui a chave gerada no passo abaixo"
```

Para gerar a chave secreta:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Criar as tabelas e o primeiro acesso

```bash
npm run setup
```

Ao final, o terminal mostra o e-mail e a **senha sorteada**. Ela aparece **uma vez
só** — guarde antes de fechar. Para escolher a senha em vez de sorteá-la, coloque
`ADMIN_SENHA`, `ADMIN_EMAIL` e `ADMIN_EMPRESA` no `.env` antes de rodar.

### 4. Abrir o sistema

```bash
npm run dev
```

Depois abra `http://localhost:3000`.

---

## Ver os documentos sem cadastrar nada

Para conferir a redação dos 16 contratos com dados de exemplo, sem banco e sem
login:

```bash
node --experimental-strip-types --import ./scripts/registrar.mjs scripts/gerar-exemplos.mts
```

Os arquivos ficam na pasta `exemplos/`.

---

## O que ainda falta

Estas são as próximas etapas, na ordem em que fazem diferença:

1. **Assinatura eletrônica (Autentique)** — mandar o documento gerado para
   assinatura direto da tela, com validade jurídica.
2. **Assinatura paga (Asaas)** — planos, cobrança recorrente por Pix, boleto e
   cartão, e bloqueio automático de inadimplente.
3. **Auditoria automatizada** — consulta de processos no DataJud (CNJ), certidões
   públicas e bureau de crédito, com dossiê de risco por parte.
4. **Leitura de documentos por inteligência artificial** — enviar RG, contrato
   social ou ofício do precatório e ter o cadastro preenchido para conferência.
5. **Cadastro de assinantes** — tela da empresa gestora para criar, suspender e
   acompanhar cada cliente da plataforma.

---

## Regras de arquitetura que não devem ser quebradas

1. **A inteligência artificial sugere; a pessoa confirma.** Nenhuma sugestão da IA
   vira dado oficial sem alguém aprovar na tela.
2. **Cálculo crítico é feito em código.** Dígito verificador de CPF/CNPJ, número de
   processo do CNJ, deságio, comissão e valor por extenso são calculados e
   conferidos em código — nunca pedidos à IA.
3. **Campo vazio vira marca visível.** Um contrato com lacuna gritante é conferido;
   um contrato com a lacuna silenciosamente omitida é assinado com defeito.
4. **Toda consulta filtra pela organização.** É a linha que separa os dados de um
   assinante dos do outro. Num sistema onde a informação é o ativo, isso é o
   produto.
5. **Telas novas nascem protegidas.** O middleware exige login em tudo, menos no
   que estiver explicitamente liberado.
6. **Documento gerado guarda o retrato dos dados.** Meses depois, o registro mostra
   o que foi impresso, não o cadastro de hoje.

---

## Estrutura das pastas

```
prisma/schema.prisma          o banco de dados
scripts/                      geração de exemplos e utilitários
src/lib/
  validacao.ts                CPF, CNPJ (inclusive alfanumérico), processo CNJ
  formato.ts                  moeda, percentual e valor por extenso
  marca.ts                    identidade visual, vinda do .env
  auth.ts / sessao.ts         login, duas etapas e separação por assinante
  auditoria.ts                registro de tudo
  documentos/
    catalogo.ts               os 16 tipos: para que servem, o que exigem, base legal
    qualificacao.ts           a qualificação das partes nos contratos
    base.ts                   peças de montagem do .docx
    geradores/                a redação de cada documento
src/app/painel/               as telas
modelos-recebidos/            onde entram os modelos próprios, para substituir a redação
```
