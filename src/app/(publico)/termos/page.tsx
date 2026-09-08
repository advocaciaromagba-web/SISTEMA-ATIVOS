import Link from "next/link";
import { marca } from "@/lib/marca";
import { DIAS_DE_TESTE } from "@/lib/planos";

export const metadata = {
  title: "Termos de uso",
  description: "Condições de contratação e uso da plataforma.",
};

const empresa = marca.razaoSocial || marca.nome;

export default function Termos() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold text-slate-900">Termos de uso</h1>
      <p className="mt-2 text-sm text-slate-500">
        Estes termos regem o uso da plataforma {marca.nome}, operada por {empresa}
        {marca.cnpj ? `, inscrita no CNPJ sob o nº ${marca.cnpj}` : ""}.
      </p>

      <Clausula numero="1" titulo="O que a plataforma é">
        <p>
          {marca.nome} é um sistema de gestão de operações de intermediação de ativos. Ela organiza cadastros e
          operações, gera minutas de documentos a partir do que o assinante preenche, consulta fontes públicas
          sobre as contrapartes e registra o que foi feito.
        </p>
        <p>
          <strong>A plataforma não é escritório de advocacia e não presta consultoria jurídica.</strong> Os
          documentos gerados são minutas: dependem de conferência e devem ser revisados por advogado antes da
          assinatura. A responsabilidade pelo conteúdo do que for assinado é de quem assina.
        </p>
        <p>
          A plataforma <strong>não intermedeia as operações dos assinantes</strong>, não é parte nos negócios que
          eles celebram, não recebe comissão sobre esses negócios e não indica compradores nem vendedores.
        </p>
      </Clausula>

      <Clausula numero="2" titulo="Quem pode contratar">
        <p>
          Podem contratar pessoas jurídicas regularmente constituídas e pessoas físicas maiores de dezoito anos,
          que atuem profissionalmente na intermediação, aquisição ou assessoria relativa aos ativos suportados
          pela plataforma.
        </p>
        <p>
          Ao contratar, o assinante declara que as informações que fornece são verdadeiras e que tem poderes para
          representar a empresa em nome da qual contrata.
        </p>
      </Clausula>

      <Clausula numero="3" titulo="Teste e contratação">
        <p>
          O período de teste é de {DIAS_DE_TESTE} dias, sem necessidade de cartão e sem cobrança. Terminado o
          teste sem contratação, o acesso é encerrado e os dados ficam disponíveis para exportação por trinta
          dias.
        </p>
        <p>
          Os planos, preços e limites são os publicados na{" "}
          <Link href="/planos" className="underline">
            página de planos
          </Link>
          , que integra estes termos. A contratação é mensal ou anual, sem fidelidade.
        </p>
      </Clausula>

      <Clausula numero="4" titulo="Pagamento, reajuste e inadimplência">
        <p>
          A cobrança é feita antecipadamente, no plano escolhido. O que tem custo por unidade — leitura de
          documento, assinatura eletrônica, consulta a bureau — é cobrado conforme o consumo que exceder o
          incluído no plano, pelos preços publicados.
        </p>
        <p>
          Os valores podem ser reajustados anualmente, com aviso de trinta dias. Reajuste comunicado dá ao
          assinante o direito de encerrar sem ônus antes de ele valer.
        </p>
        <p>
          Em caso de atraso, o acesso passa a somente leitura após dez dias, e é suspenso após trinta. Os dados
          permanecem preservados e disponíveis para exportação. Regularizado o pagamento, o acesso é restabelecido.
        </p>
      </Clausula>

      <Clausula numero="5" titulo="Obrigações do assinante">
        <p>Ao usar a plataforma, o assinante se compromete a:</p>
        <ul className="list-inside list-disc space-y-1.5">
          <li>não compartilhar credenciais de acesso entre pessoas, mantendo um usuário por indivíduo;</li>
          <li>desativar imediatamente o acesso de quem deixar a sua equipe;</li>
          <li>
            usar as consultas sobre contrapartes exclusivamente para as finalidades de análise de contraparte e
            prevenção à lavagem de dinheiro, jamais para discriminação, constrangimento ou fins alheios à operação;
          </li>
          <li>
            obter das partes envolvidas a ciência necessária ao tratamento dos dados que insere na plataforma;
          </li>
          <li>
            não utilizar a plataforma para operação ilícita, simulada, ou para conferir aparência de legalidade a
            recursos de origem ilícita;
          </li>
          <li>conferir toda minuta antes de assinar ou enviar para assinatura.</li>
        </ul>
        <p>
          O descumprimento destes itens autoriza a suspensão imediata do acesso, sem prejuízo das medidas legais
          cabíveis.
        </p>
      </Clausula>

      <Clausula numero="6" titulo="Limites das verificações">
        <p>
          As verificações refletem o que as fontes consultadas mostravam na data da consulta.{" "}
          <strong>Não constituem atestado de idoneidade nem garantia sobre a contraparte ou sobre o ativo.</strong>
        </p>
        <p>
          Diversas informações não são verificáveis automaticamente no Brasil — antecedentes criminais, mandados
          de prisão, distribuições judiciais e CADIN, entre outras. A relação completa do que é e do que não é
          verificado está na{" "}
          <Link href="/fontes" className="underline">
            página de fontes
          </Link>
          , que integra estes termos.
        </p>
        <p>
          Fontes públicas podem estar indisponíveis, desatualizadas ou conter erro de origem. A plataforma informa
          quando uma fonte não respondeu, mas não responde pelo conteúdo do que os órgãos publicam.
        </p>
      </Clausula>

      <Clausula numero="7" titulo="Responsabilidade">
        <p>
          A plataforma é fornecida para apoiar decisões, não para substituí-las. A decisão de contratar, o preço,
          o deságio, as garantias exigidas e o conteúdo do que é assinado são exclusivamente do assinante.
        </p>
        <p>
          {empresa} responde por falhas do próprio serviço, na forma da lei. Não responde por prejuízo decorrente
          de: decisão de negócio do assinante; informação falsa prestada por ele ou por terceiros; conteúdo de
          documento assinado sem revisão; indisponibilidade ou erro de fonte pública; nem por fato que a
          verificação declaradamente não alcançava.
        </p>
        <p>
          Ressalvados dolo e as hipóteses em que a lei não admite limitação, a responsabilidade total fica
          limitada ao valor pago pelo assinante nos doze meses anteriores ao evento.
        </p>
      </Clausula>

      <Clausula numero="8" titulo="Disponibilidade">
        <p>
          Trabalhamos para manter o serviço disponível de forma contínua, mas ele pode ser interrompido para
          manutenção, atualização ou por falha de terceiros — hospedagem, provedor de assinatura eletrônica,
          órgãos públicos. Manutenções programadas são avisadas com antecedência.
        </p>
      </Clausula>

      <Clausula numero="9" titulo="Dados e propriedade">
        <p>
          Os dados que o assinante insere são dele. A plataforma os trata para operar o serviço, na forma da{" "}
          <Link href="/privacidade" className="underline">
            política de privacidade
          </Link>
          . Não os vendemos, não os cruzamos com dados de outros assinantes e não os usamos para treinar modelos.
        </p>
        <p>
          O software, as telas, os modelos de documento e o conteúdo da plataforma pertencem a {empresa}. A
          assinatura concede direito de uso durante a vigência, não transfere propriedade e não autoriza cópia,
          revenda ou engenharia reversa.
        </p>
        <p>
          Os documentos gerados são do assinante e podem ser usados livremente nas operações dele.
        </p>
      </Clausula>

      <Clausula numero="10" titulo="Encerramento">
        <p>
          O assinante pode encerrar a qualquer momento, com efeito ao fim do período já pago, sem multa. Antes do
          encerramento, ele exporta documentos, cadastros e dossiês de auditoria.
        </p>
        <p>
          Encerrada a assinatura, os dados são mantidos por trinta dias para exportação e depois eliminados,
          ressalvado o que a lei obrigue a conservar — em especial os registros de auditoria e os documentos
          relacionados a obrigações da Lei nº 9.613/1998.
        </p>
      </Clausula>

      <Clausula numero="11" titulo="Alterações destes termos">
        <p>
          Alterações relevantes são comunicadas com trinta dias de antecedência, por e-mail e dentro da
          plataforma. Quem não concordar pode encerrar sem ônus antes de a mudança valer.
        </p>
      </Clausula>

      <Clausula numero="12" titulo="Foro">
        <p>
          Aplica-se a lei brasileira. Fica eleito o foro da comarca de {marca.foroCidade}/{marca.foroUf} para
          dirimir controvérsias, ressalvado, quando o assinante for consumidor, o foro do seu domicílio.
        </p>
      </Clausula>

      <div className="aviso-atencao mt-12">
        <strong className="block">Antes de publicar</strong>
        <p className="mt-1">
          Este texto é uma minuta de partida, escrita para cobrir as questões que este serviço realmente enfrenta.
          Ele deve ser revisado por advogado antes de entrar no ar, e ajustado ao que a operação de fato pratica —
          prazos, limites de responsabilidade e política de reembolso, principalmente.
        </p>
      </div>
    </div>
  );
}

function Clausula({ numero, titulo, children }: { numero: string; titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-9">
      <h2 className="text-xl font-semibold text-slate-900">
        {numero}. {titulo}
      </h2>
      <div className="mt-3 space-y-3 leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}
