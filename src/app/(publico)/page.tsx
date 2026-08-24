import Link from "next/link";
import { marca } from "@/lib/marca";
import { MarcaLogo } from "@/components/marca-logo";
import { DIAS_DE_TESTE } from "@/lib/planos";
import { documentosOrdenados } from "@/lib/documentos/catalogo";

export const metadata = {
  title: `${marca.nome} — intermediação de ativos com documentação e verificação`,
  description:
    "Plataforma para intermediários de precatórios, créditos e commodities: cadastro das operações, geração dos " +
    "documentos e verificação das contrapartes em fontes oficiais.",
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
          <p className="sobretitulo">Intermediação de ativos</p>

          <h1 className="titulo mt-4 max-w-3xl text-3xl font-bold leading-tight text-white sm:text-4xl">
            A operação inteira num lugar só — e nenhuma parte entra sem passar por auditoria.
          </h1>

          <p className="serif mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
            Para quem intermedeia precatórios, créditos tributários, commodities e metais: as operações
            organizadas, os {documentos.length} documentos gerados a partir do cadastro, e a contraparte
            verificada em fontes oficiais antes de qualquer assinatura.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/planos" className="botao-destaque">
              Ver planos e preços
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
