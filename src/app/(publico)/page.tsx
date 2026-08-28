import Link from "next/link";
import { marca } from "@/lib/marca";
import { MarcaLogo } from "@/components/marca-logo";
import { DIAS_DE_TESTE } from "@/lib/planos";
import { documentosOrdenados } from "@/lib/documentos/catalogo";
import { ROTULO_ESTADO, SOLUCOES } from "@/lib/solucoes";
import { ICONE_SOLUCAO } from "@/components/icones-solucoes";
import { DiagramaOperacao } from "@/components/diagrama-operacao";

export const metadata = {
  // `absolute` desliga o sufixo do modelo: esta e a linha que aparece na
  // busca, e ela ja comeca pelo nome da marca.
  title: { absolute: `${marca.nome} — compliance, due diligence e gestão de ativos` },
  description:
    "Compliance de empresas e due diligence de pessoas para o mercado de ativos financeiros e commodities, " +
    "com verificação em fontes oficiais, conferência de documentos e gestão das operações.",
  robots: { index: true, follow: true },
};

export default function Inicio() {
  const documentos = documentosOrdenados();

  return (
    <>
      {/* ---------------- abertura ----------------
          Capa no azul da marca: é a primeira coisa que o intermediário vê, e
          numa plataforma vendida por credibilidade a primeira impressão faz
          parte do produto. O dourado entra só no filete e no botão. */}
      <section className="faixa-escura relative overflow-hidden border-b-2 border-[color:var(--marca-destaque)]">
        {/* O pássaro grande, discreto, atrás do texto. */}
        <div className="pointer-events-none absolute -right-10 top-1/2 hidden -translate-y-1/2 opacity-[0.07] lg:block">
          <MarcaLogo forma="simbolo" altura={420} />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 py-20">
          <div className="flex flex-wrap items-center gap-3">
            <p className="sobretitulo">Soluções estratégicas</p>
            <span className="etiqueta border border-white/20 bg-white/10 font-medium text-white/80">
              8 anos de mercado — antes Romacred, hoje Blackbird
            </span>
          </div>

          <h1 className="titulo mt-4 max-w-3xl text-3xl font-bold leading-tight text-white sm:text-4xl">
            Valorizando ativos e pessoas.
          </h1>

          <p className="serif mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
            Compliance de empresas e due diligence de pessoas para o mercado de ativos financeiros e commodities.
            A contraparte verificada em fontes oficiais, os documentos conferidos, e a gestão dos ativos no mesmo
            lugar — com {documentos.length} documentos gerados a partir do cadastro.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/solucoes" className="botao-destaque">
              Ver as soluções
            </Link>
            <Link
              href="/fontes"
              className="botao border border-white/30 bg-transparent text-white transition hover:bg-white/10"
            >
              O que exatamente verificamos
            </Link>
          </div>

          <p className="mt-5 text-sm text-white/55">
            {DIAS_DE_TESTE} dias para testar. Preços publicados abaixo, sem &ldquo;fale com o vendedor&rdquo;.
          </p>

          {marca.site && (
            <div className="mt-8 inline-flex flex-wrap items-center gap-2.5 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white/70">
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-none stroke-current stroke-[1.6]" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3c2.5 2.6 3.8 5.8 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.8-3.8-9S9.5 5.6 12 3Z" />
              </svg>
              <span>
                No ar em breve em{" "}
                <strong className="font-semibold text-white">{marca.site.replace(/^https?:\/\//, "")}</strong> —
                CNPJ já em nome da Blackbird na Receita Federal, domínio próprio a caminho.
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ---------------- trajetória ----------------
          A mudança de nome é fato societário, não tagline — por isso entra
          logo na abertura. Desde a alteração deferida na Receita Federal, a
          razão social já é BLACKBIRD SOLUÇÕES ESTRATÉGICAS LTDA — não há mais
          nada em trâmite aqui, só o histórico de como se chegou até ela. */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <p className="sobretitulo">Trajetória</p>
          <h2 className="titulo mt-3 text-2xl font-semibold text-slate-900">Oito anos no mercado de ativos, sob um nome novo</h2>
          <p className="serif mt-4 max-w-3xl text-lg leading-relaxed text-slate-600">
            Há 8 anos operando a intermediação de precatórios, créditos e commodities como Romacred, a empresa
            consolida essa experiência sob a marca Blackbird — organizada agora em cinco soluções que valorizam
            tanto o ativo quanto as pessoas por trás dele.
          </p>

          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            <Marco ano="8 anos" titulo="De experiência" texto="Intermediando precatórios, créditos e commodities no mercado desde então." />
            <Marco ano="Romacred → Blackbird" titulo="De nome" texto="Alteração societária deferida na Receita Federal — a razão social já é Blackbird Soluções Estratégicas Ltda." />
            <Marco ano="5" titulo="Soluções" texto="Compliance, due diligence, verificação de documentos, licitações e gestão de ativos — um produto só, cinco frentes." />
          </div>
        </div>
      </section>

      {/* ---------------- como funciona ----------------
          O diagrama que mostra que toda solução passa pelo mesmo funil, em
          vez de cinco sistemas soltos com o mesmo nome na capa. */}
      <section className="faixa-escura">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <p className="sobretitulo">Como funciona</p>
          <h2 className="titulo mt-3 text-2xl font-semibold text-white">O mesmo caminho, para qualquer operação</h2>
          <p className="serif mt-4 max-w-2xl text-white/70">
            Empresa, pessoa, edital ou ativo — tudo passa pelas mesmas quatro etapas antes de virar documento
            assinado.
          </p>

          <div className="mt-14">
            <DiagramaOperacao />
          </div>
        </div>
      </section>

      {/* ---------------- as soluções ----------------
          Vem logo depois porque é a resposta à primeira pergunta de quem
          chega: o que exatamente vocês fazem. O estado de cada uma aparece
          aqui, e não escondido numa página interna. */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="titulo regua-destaque text-2xl font-semibold text-slate-900">As soluções</h2>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SOLUCOES.map((s) => {
              const Icone = ICONE_SOLUCAO[s.chave];
              return (
                <Link
                  key={s.chave}
                  href={`/solucoes?s=${s.chave}`}
                  className="cartao flex flex-col transition hover:border-slate-400"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {Icone && (
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                          style={{ background: "var(--marca-clara)" }}
                        >
                          <Icone className="h-5 w-5 text-[color:var(--marca)]" />
                        </span>
                      )}
                      <h3 className="titulo text-base font-semibold text-slate-900">{s.nome}</h3>
                    </div>
                    {s.estado !== "DISPONIVEL" && (
                      <span
                        className={`etiqueta shrink-0 ${
                          s.estado === "PARCIAL" ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {ROTULO_ESTADO[s.estado]}
                      </span>
                    )}
                  </div>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{s.resumo}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------- para quem é cada solução ----------------
          O cartão acima é para comparar rápido; esta lista é para quem já
          quer saber se é o caso dele — uma solução por vez, com o "para
          quem" de `solucoes.ts` reaproduzido aqui (não reescrito), porque é
          o mesmo texto que a página de soluções usa para vender cada uma. */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <p className="sobretitulo">Para quem é cada solução</p>
          <h2 className="titulo mt-3 text-2xl font-semibold text-slate-900">Encontre a sua, uma por uma</h2>
          <p className="serif mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
            As cinco soluções resolvem problemas diferentes, para gente diferente. Se você se reconhecer em mais
            de uma, é porque provavelmente precisa de mais de uma.
          </p>

          <div className="mt-10 divide-y divide-slate-200">
            {SOLUCOES.map((s) => {
              const Icone = ICONE_SOLUCAO[s.chave];
              return (
                <div key={s.chave} className="flex flex-col gap-5 py-8 first:pt-0 last:pb-0 sm:flex-row sm:gap-8">
                  <div className="flex shrink-0 items-center gap-3 sm:w-64">
                    {Icone && (
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                        style={{ background: "var(--marca-clara)" }}
                      >
                        <Icone className="h-5 w-5 text-[color:var(--marca)]" />
                      </span>
                    )}
                    <h3 className="titulo text-lg font-semibold text-slate-900">{s.nome}</h3>
                  </div>

                  <div className="flex-1">
                    <p className="text-sm leading-relaxed text-slate-600">{s.paraQuem}</p>
                    <Link
                      href={`/solucoes?s=${s.chave}`}
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--marca)] hover:underline"
                    >
                      É o meu caso — ver esta solução
                      <span aria-hidden>→</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------- os três problemas ---------------- */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="titulo regua-destaque text-2xl font-semibold text-slate-900">Os três lugares onde a operação costuma quebrar</h2>

        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <Bloco
            titulo="O documento sai errado"
            texto={
              "Qualificação incompleta, valor por extenso que não bate com o número, cláusula que pula da sexta " +
              "para a oitava, duas partes com o mesmo apelido. Cartório recusa e a operação atrasa semanas."
            }
            solucao="Os documentos são montados a partir do cadastro, com o extenso conferido contra o número e a numeração das cláusulas automática. O que falta aparece marcado, não some do texto."
          />
          <Bloco
            titulo="A contraparte não era quem dizia"
            texto={
              "Empresa inapta na Receita, aberta há três meses, com capital social de mil reais para uma operação " +
              "de novecentos mil. Ou o nome cadastrado que simplesmente não é o dono daquele CNPJ."
            }
            solucao="Toda parte passa por auditoria ao ser cadastrada, e quem tem restrição fica bloqueado para operações e documentos até que alguém assuma a liberação por escrito."
          />
          <Bloco
            titulo="O ativo tinha dono ou dívida"
            texto={
              "Crédito já cedido a outro comprador, penhorado, ou de titular com dívida ativa que a Fazenda " +
              "compensa direto. O dinheiro sai e o crédito não chega."
            }
            solucao="Dívida ativa da União consultada automaticamente, processo de origem conferido no CNJ, e as certidões do ativo exigidas antes de o contrato ser gerado."
          />
        </div>
      </section>

      {/* ---------------- o que o sistema faz ---------------- */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="titulo regua-destaque text-2xl font-semibold text-slate-900">O que está dentro</h2>

          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            <Item
              titulo={`${documentos.length} documentos, prontos para assinar`}
              texto="NDA, NCNDA, IMFPA, procuração, mandato, carta de intenção, cessão de crédito, de direitos e de precatório, notificação ao devedor, termo de comissionamento, quitação, declaração de origem lícita, ficha KYC, aditivo, distrato e o relatório de due diligence."
            />
            <Item
              titulo="Auditoria automática de cada parte"
              texto="Situação na Receita, dívida ativa da União, sanções internacionais, empresas punidas, tempo de existência, e a conferência de que quem vai assinar tem mesmo poder para assinar."
            />
            <Item
              titulo="Controle de certidões com prazo"
              texto="O sistema diz qual certidão exigir de quem, leva à página exata do órgão, guarda o arquivo, controla a validade e bloqueia a operação enquanto faltar uma obrigatória."
            />
            <Item
              titulo="Leitura de documentos"
              texto="Envie o RG, o contrato social ou o ofício requisitório e o cadastro se preenche para você conferir. Do ofício sai inclusive o ano orçamentário do precatório."
            />
            <Item
              titulo="Calculadora de precatório"
              texto="Atualização pela legislação vigente, com índices oficiais do Banco Central: IPCA-E mais juros até a Emenda 113, Selic única depois dela. Deduções, deságio e quanto sobra para cada lado."
            />
            <Item
              titulo="Registro de tudo"
              texto="Quem entrou, o que alterou, qual documento gerou e baixou, de que endereço. Cada documento sai com uma impressão digital que prova depois que ele não foi alterado."
            />
          </div>
        </div>
      </section>

      {/* ---------------- honestidade ---------------- */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <h2 className="text-xl font-semibold text-slate-900">O que não prometemos</h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-slate-600">
            Nenhuma base criminal pública do Brasil permite consulta automatizada — nem para nós, nem para
            ninguém. Antecedentes, mandados de prisão e distribuições dependem de certidão emitida pela própria
            parte. O sistema encurta esse caminho ao máximo e lê o documento depois, mas não inventa o que não
            consegue ver.
          </p>
          <p className="mt-4 max-w-3xl leading-relaxed text-slate-600">
            Toda verificação nossa declara em que fontes olhou, em que data, e o que ficou de fora. Um resultado
            limpo obtido de meia fonte não pode parecer atestado.
          </p>
          <Link href="/fontes" className="mt-6 inline-block font-medium text-slate-900 underline">
            Ver a lista completa do que consultamos e do que não conseguimos consultar
          </Link>
        </div>
      </section>
    </>
  );
}

function Marco({ ano, titulo, texto }: { ano: string; titulo: string; texto: string }) {
  return (
    <div className="border-l-2 pl-4" style={{ borderColor: "var(--marca-destaque)" }}>
      <div className="titulo text-lg font-bold text-slate-900">{ano}</div>
      <div className="mt-1 text-sm font-semibold uppercase tracking-wide text-slate-500">{titulo}</div>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{texto}</p>
    </div>
  );
}

function Bloco({ titulo, texto, solucao }: { titulo: string; texto: string; solucao: string }) {
  return (
    <div>
      <h3 className="font-semibold text-slate-900">{titulo}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{texto}</p>
      <p className="mt-3 border-l-2 pl-3 text-sm leading-relaxed text-slate-700" style={{ borderColor: "var(--marca)" }}>
        {solucao}
      </p>
    </div>
  );
}

function Item({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div>
      <h3 className="font-semibold text-slate-900">{titulo}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{texto}</p>
    </div>
  );
}
