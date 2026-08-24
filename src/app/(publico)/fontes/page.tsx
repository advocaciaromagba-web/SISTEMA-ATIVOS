import { marca } from "@/lib/marca";
import { FONTES_AUTOMATICAS, FONTES_CONTRATADAS, NAO_AUTOMATIZAVEL, type Fonte } from "@/lib/fontes-publicas";
import { CATALOGO_CERTIDOES } from "@/lib/auditoria/certidoes";
import { VALIDADE_AUDITORIA_DIAS } from "@/lib/auditoria/executar";

export const metadata = {
  title: `O que verificamos — ${marca.nome}`,
  description:
    "A lista completa das fontes que a plataforma consulta, das que dependem de certidão e do que não é " +
    "verificável no Brasil.",
};

export default function Fontes() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-3xl font-semibold text-slate-900">O que verificamos</h1>
      <p className="mt-3 text-lg leading-relaxed text-slate-600">
        Quem contrata uma verificação precisa saber onde ela olhou. Esta página lista tudo: o que o sistema
        consulta sozinho, o que depende de contrato, o que exige certidão da própria parte — e o que ninguém
        consegue verificar no Brasil, com o motivo.
      </p>

      {/* ---------------- automáticas ---------------- */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-slate-900">Consultado automaticamente</h2>
        <p className="mt-2 text-slate-600">
          Roda sozinho quando a parte é cadastrada, e é refeito a cada {VALIDADE_AUDITORIA_DIAS} dias, porque
          situação cadastral muda.
        </p>
        <div className="mt-6 space-y-4">
          {FONTES_AUTOMATICAS.map((f) => (
            <CartaoFonte key={f.nome} fonte={f} />
          ))}
        </div>
      </section>

      {/* ---------------- contratadas ---------------- */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-slate-900">Disponível mediante contratação</h2>
        <div className="mt-6 space-y-4">
          {FONTES_CONTRATADAS.map((f) => (
            <CartaoFonte key={f.nome} fonte={f} />
          ))}
        </div>
      </section>

      {/* ---------------- certidões ---------------- */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-slate-900">Exigido da parte, por certidão</h2>
        <p className="mt-2 text-slate-600">
          O sistema diz qual certidão é exigida de quem, leva à página exata do órgão, guarda o arquivo, controla a
          validade e lê o resultado. A certidão vale mais que qualquer consulta: ela tem código de autenticidade
          conferível no próprio órgão emissor.
        </p>

        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="tabela">
            <thead>
              <tr>
                <th>Certidão</th>
                <th>Órgão</th>
                <th>Validade</th>
              </tr>
            </thead>
            <tbody>
              {CATALOGO_CERTIDOES.map((c) => (
                <tr key={c.chave}>
                  <td>
                    <div className="font-medium text-slate-900">{c.nome}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{c.porQue}</div>
                  </td>
                  <td className="text-slate-600">{c.orgao}</td>
                  <td className="whitespace-nowrap text-slate-600">{c.validadeDias} dias</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------------- o que não dá ---------------- */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-slate-900">O que não é verificável automaticamente</h2>
        <p className="mt-2 text-slate-600">
          Esta é a parte que quase nenhuma plataforma publica, e é a mais importante. Nada aqui é limitação nossa:
          é como as bases brasileiras funcionam, e vale para qualquer sistema.
        </p>

        <div className="mt-6 space-y-5">
          {NAO_AUTOMATIZAVEL.map((n) => (
            <div key={n.assunto} className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-slate-900">{n.assunto}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                <span className="font-medium text-slate-700">Por quê: </span>
                {n.porQue}
              </p>
              <p className="mt-2 border-l-2 pl-3 text-sm leading-relaxed text-slate-700" style={{ borderColor: "var(--marca)" }}>
                <span className="font-medium">Como resolvemos: </span>
                {n.comoResolvemos}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- limites ---------------- */}
      <section className="mt-12">
        <div className="aviso-atencao">
          <strong className="block">Duas ressalvas que valem para toda verificação</strong>
          <p className="mt-2">
            <strong>Nos arquivos públicos da dívida ativa, o CPF vem mascarado.</strong> Para pessoa jurídica a
            busca é exata, pelo CNPJ completo. Para pessoa física, o cruzamento é por parte dos dígitos mais o
            nome: isso levanta suspeita, não identifica. A certidão negativa resolve a dúvida.
          </p>
          <p className="mt-2">
            <strong>Toda verificação vale para a data em que foi feita.</strong> Empresa ativa hoje pode estar
            inapta em seis meses; certidão limpa hoje pode não estar limpa amanhã. Por isso a auditoria vence em{" "}
            {VALIDADE_AUDITORIA_DIAS} dias e o sistema avisa quando passou do prazo.
          </p>
        </div>
      </section>
    </div>
  );
}

function CartaoFonte({ fonte }: { fonte: Fonte }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-slate-900">{fonte.nome}</h3>
        <span className="text-sm text-slate-500">{fonte.orgao}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{fonte.oQueMostra}</p>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
        <span>Atualização: {fonte.atualizacao}</span>
        {fonte.requer && <span>Requer: {fonte.requer}</span>}
      </div>
    </div>
  );
}
