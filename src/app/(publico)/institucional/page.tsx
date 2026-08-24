import Link from "next/link";
import { marca } from "@/lib/marca";

export const metadata = {
  title: "A empresa",
  description: "Quem opera a plataforma, com razão social, CNPJ e canais de contato.",
};

/** Marca o dado que ainda não foi preenchido no .env, em vez de deixar a linha sumir. */
function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-3 border-b border-slate-100 py-2.5">
      <dt className="text-slate-500">{rotulo}</dt>
      <dd className="text-right font-medium text-slate-900">
        {valor || <span className="font-normal text-amber-700">a preencher na configuração</span>}
      </dd>
    </div>
  );
}

export default function Institucional() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold text-slate-900">A empresa</h1>
      <p className="mt-3 text-lg leading-relaxed text-slate-600">
        Quem opera esta plataforma, com identificação completa. Você está confiando a nós a documentação e a
        verificação de operações suas — é justo saber exatamente com quem está tratando.
      </p>

      <section className="mt-10 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Identificação</h2>
        <dl className="mt-4 text-sm">
          <Dado rotulo="Razão social" valor={marca.razaoSocial} />
          <Dado rotulo="Nome da plataforma" valor={marca.nome} />
          <Dado rotulo="CNPJ" valor={marca.cnpj} />
          <Dado rotulo="Endereço" valor={marca.endereco} />
          <Dado rotulo="E-mail" valor={marca.emailSuporte} />
          <Dado rotulo="Telefone" valor={marca.telefone} />
          <Dado rotulo="Site" valor={marca.site} />
        </dl>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-slate-900">O que fazemos</h2>
        <p className="mt-3 leading-relaxed text-slate-600">
          {marca.nome} é uma plataforma para quem intermedeia ativos — precatórios, créditos tributários,
          direitos creditórios e commodities. Ela organiza as operações, gera a documentação a partir do cadastro
          e verifica as contrapartes em fontes oficiais antes que qualquer documento seja emitido.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-slate-900">O que não fazemos</h2>
        <div className="mt-3 space-y-3 leading-relaxed text-slate-600">
          <p>
            <strong className="text-slate-900">Não somos escritório de advocacia</strong> e não prestamos
            consultoria jurídica. Os documentos que a plataforma gera são minutas, construídas a partir de modelos
            e do cadastro que você preenche. Elas devem ser revisadas por advogado antes de qualquer assinatura.
          </p>
          <p>
            <strong className="text-slate-900">Não intermediamos as operações dos assinantes.</strong> Não somos
            parte, não recebemos comissão sobre negócios fechados e não indicamos compradores ou vendedores. Nossa
            relação é com quem assina a plataforma, e o objeto dela é o software e a verificação.
          </p>
          <p>
            <strong className="text-slate-900">Não damos recomendação de investimento.</strong> As verificações e
            relatórios são apoio à decisão. A decisão de comprar, vender, com que deságio e com que garantia é de
            quem opera.
          </p>
          <p>
            <strong className="text-slate-900">Não atestamos idoneidade.</strong> Dizemos o que as fontes
            consultadas mostravam na data da consulta, e dizemos com o mesmo destaque o que não foi possível
            verificar.{" "}
            <Link href="/fontes" className="underline">
              A lista completa está aqui
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-slate-900">Como cobramos</h2>
        <p className="mt-3 leading-relaxed text-slate-600">
          Por assinatura mensal ou anual, com os preços publicados na{" "}
          <Link href="/planos" className="underline">
            página de planos
          </Link>
          . Não há taxa de adesão, não há fidelidade e não cobramos percentual sobre as operações dos assinantes.
          O que tem custo por unidade — leitura de documento, assinatura eletrônica, consulta a bureau — é cobrado
          só quando usado, com o preço na mesma página.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-slate-900">Contato</h2>
        <p className="mt-3 leading-relaxed text-slate-600">
          Para suporte, dúvidas comerciais ou exercício de direitos sobre dados pessoais:{" "}
          {marca.emailSuporte ? (
            <a href={`mailto:${marca.emailSuporte}`} className="font-medium underline">
              {marca.emailSuporte}
            </a>
          ) : (
            <span className="text-amber-700">e-mail a preencher na configuração</span>
          )}
          {marca.telefone ? ` ou ${marca.telefone}` : ""}.
        </p>
      </section>
    </div>
  );
}
