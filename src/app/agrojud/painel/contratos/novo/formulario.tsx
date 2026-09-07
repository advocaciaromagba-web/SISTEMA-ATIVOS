"use client";

import { useState, useTransition } from "react";
import { useFormState } from "react-dom";
import { criarEAnalisarContrato, sugerirLeituraContrato, type ResultadoAcao } from "../acoes";
import type { RascunhoContrato } from "@/lib/agro/leitura-contrato";

const inicial: ResultadoAcao = {};

type Avalista = { nome: string; documento: string; patrimonioDescrito: string };

const SIM_NAO = [
  { valor: "", rotulo: "Não informado" },
  { valor: "sim", rotulo: "Sim" },
  { valor: "nao", rotulo: "Não" },
];

function CampoSimNao({ nome, rotulo, valor, onChange }: { nome: string; rotulo: string; valor: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="rotulo">{rotulo}</label>
      <select name={nome} className="campo" value={valor} onChange={(e) => onChange(e.target.value)}>
        {SIM_NAO.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </div>
  );
}

export function FormularioNovoContrato({ iaDisponivel }: { iaDisponivel: boolean }) {
  const [estado, acao] = useFormState(criarEAnalisarContrato, inicial);
  const [rodandoIa, iniciarIa] = useTransition();
  const [erroIa, setErroIa] = useState("");

  const [titulo, setTitulo] = useState("");
  const [mutuarioNome, setMutuarioNome] = useState("");
  const [mutuarioDocumento, setMutuarioDocumento] = useState("");
  const [instituicaoFinanceira, setInstituicaoFinanceira] = useState("");
  const [numeroContrato, setNumeroContrato] = useState("");
  const [dataContratacao, setDataContratacao] = useState("");

  const [categoriaOperacao, setCategoriaOperacao] = useState("");
  const [fonteRecursos, setFonteRecursos] = useState("");
  const [mutuarioEProdutorOuCooperativa, setMutuarioEProdutorOuCooperativa] = useState("");
  const [finalidadeERural, setFinalidadeERural] = useState("");

  const [categoriaBeneficiario, setCategoriaBeneficiario] = useState("");
  const [valorOperacao, setValorOperacao] = useState("");
  const [situacaoAdimplencia, setSituacaoAdimplencia] = useState("");
  const [dataInicioInadimplencia, setDataInicioInadimplencia] = useState("");
  const [foiRenegociadoOuProrrogado, setFoiRenegociadoOuProrrogado] = useState("");
  const [dataRenegociacaoOuProrrogacao, setDataRenegociacaoOuProrrogacao] = useState("");
  const [permaneceInadimplenteEm31Mai2026, setPermaneceInadimplenteEm31Mai2026] = useState("");

  const [numeroSafrasComPerda, setNumeroSafrasComPerda] = useState("");
  const [anosSafrasComPerda, setAnosSafrasComPerda] = useState("");
  const [percentualReducaoRenda, setPercentualReducaoRenda] = useState("");
  const [causaPerda, setCausaPerda] = useState("");
  const [eventosClimaticos, setEventosClimaticos] = useState("");
  const [temLaudoTecnico, setTemLaudoTecnico] = useState("");
  const [profissionalHabilitadoNome, setProfissionalHabilitadoNome] = useState("");
  const [profissionalHabilitadoRegistro, setProfissionalHabilitadoRegistro] = useState("");

  const [origemFundoSocial, setOrigemFundoSocial] = useState("");
  const [origemMP1314_2025, setOrigemMP1314] = useState("");
  const [encaminhadoDividaAtivaUniao, setEncaminhadoDividaAtiva] = useState("");

  const [dataVencimento, setDataVencimento] = useState("");
  const [dataPedidoAlongamento, setDataPedidoAlongamento] = useState("");
  const [hipotesesMcr, setHipotesesMcr] = useState<string[]>([]);
  const [laudoUnilateral, setLaudoUnilateral] = useState("");
  const [bancoConvidadoParaLaudo, setBancoConvidadoParaLaudo] = useState("");
  const [houvePedidoAdministrativo, setHouvePedidoAdministrativo] = useState("");
  const [respostaBanco, setRespostaBanco] = useState("");
  const [recusaFundamentadaPorEscrito, setRecusaFundamentadaPorEscrito] = useState("");

  const [advogadoNome, setAdvogadoNome] = useState("");
  const [advogadoOab, setAdvogadoOab] = useState("");
  const [enderecoBancoReu, setEnderecoBancoReu] = useState("");
  const [comarcaForo, setComarcaForo] = useState("");
  const [varaForo, setVaraForo] = useState("");
  const [valorCausa, setValorCausa] = useState("");

  const [taxaJurosContratual, setTaxaJurosContratual] = useState("");
  const [indexador, setIndexador] = useState("");
  const [encargosMoratorios, setEncargosMoratorios] = useState("");

  const [tiposGarantia, setTiposGarantia] = useState("");
  const [garantiasDescricao, setGarantiasDescricao] = useState("");
  const [valorGarantia, setValorGarantia] = useState("");
  const [avalistas, setAvalistas] = useState<Avalista[]>([]);

  const [temSeguroRural, setTemSeguroRural] = useState("");
  const [seguradora, setSeguradora] = useState("");
  const [apoliceNumero, setApoliceNumero] = useState("");
  const [coberturas, setCoberturas] = useState("");
  const [vigenciaInicio, setVigenciaInicio] = useState("");
  const [vigenciaFim, setVigenciaFim] = useState("");
  const [temProagro, setTemProagro] = useState("");
  const [indenizacaoRecebida, setIndenizacaoRecebida] = useState("");

  const [riscosIdentificados, setRiscosIdentificados] = useState("");
  const [desequilibrioContratual, setDesequilibrioContratual] = useState("");

  function aplicarSugestao(r: RascunhoContrato) {
    if (r.mutuarioNome) setMutuarioNome(r.mutuarioNome);
    if (r.mutuarioDocumento) setMutuarioDocumento(r.mutuarioDocumento);
    if (r.instituicaoFinanceira) setInstituicaoFinanceira(r.instituicaoFinanceira);
    if (r.numeroContrato) setNumeroContrato(r.numeroContrato);
    if (r.dataContratacao) setDataContratacao(r.dataContratacao);
    if (r.categoriaOperacao) setCategoriaOperacao(r.categoriaOperacao);
    if (r.valorOperacao !== undefined) setValorOperacao(String(r.valorOperacao));
    if (r.taxaJurosContratual !== undefined) setTaxaJurosContratual(String(r.taxaJurosContratual));
    if (r.indexador) setIndexador(r.indexador);
    if (r.encargosMoratorios) setEncargosMoratorios(r.encargosMoratorios);
    if (r.tiposGarantia?.length) setTiposGarantia(r.tiposGarantia.join(", "));
    if (r.garantiasDescricao) setGarantiasDescricao(r.garantiasDescricao);
    if (r.avalistas?.length) {
      setAvalistas(r.avalistas.map((a) => ({ nome: a.nome ?? "", documento: a.documento ?? "", patrimonioDescrito: a.patrimonioDescrito ?? "" })));
    }
    if (r.temSeguroRural !== undefined) setTemSeguroRural(r.temSeguroRural ? "sim" : "nao");
    if (r.seguradora) setSeguradora(r.seguradora);
    if (r.apoliceNumero) setApoliceNumero(r.apoliceNumero);
    if (r.coberturas?.length) setCoberturas(r.coberturas.join(", "));
    if (r.riscosIdentificados?.length) setRiscosIdentificados(r.riscosIdentificados.join(", "));
  }

  function preencherComIa(arquivoInput: HTMLInputElement | null) {
    setErroIa("");
    const arquivo = arquivoInput?.files?.[0];
    if (!arquivo) {
      setErroIa("Selecione um arquivo primeiro.");
      return;
    }
    const fd = new FormData();
    fd.set("arquivo", arquivo);
    iniciarIa(async () => {
      const r = await sugerirLeituraContrato(fd);
      if (!r.ok) {
        setErroIa(r.erro);
        return;
      }
      aplicarSugestao(r.dados);
    });
  }

  return (
    <form action={acao} className="space-y-8">
      {estado.erro && <div className="aviso-erro">{estado.erro}</div>}

      <div className="cartao space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Arquivo do contrato</h2>
        <input id="arquivo" name="arquivo" type="file" accept="application/pdf,image/*" className="campo" />
        {iaDisponivel ? (
          <button
            type="button"
            disabled={rodandoIa}
            onClick={() => preencherComIa(document.getElementById("arquivo") as HTMLInputElement)}
            className="botao-secundario text-sm"
          >
            {rodandoIa ? "Lendo com IA..." : "Preencher com IA (revise depois)"}
          </button>
        ) : (
          <p className="ajuda">Leitura por IA não configurada — preencha os campos manualmente.</p>
        )}
        {erroIa && <div className="aviso-erro text-xs">{erroIa}</div>}
      </div>

      <div className="cartao space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Identificação</h2>
        <div>
          <label className="rotulo" htmlFor="titulo">
            Título do contrato (uso interno)
          </label>
          <input id="titulo" name="titulo" className="campo" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="rotulo" htmlFor="mutuarioNome">
              Nome do mutuário
            </label>
            <input id="mutuarioNome" name="mutuarioNome" className="campo" value={mutuarioNome} onChange={(e) => setMutuarioNome(e.target.value)} />
          </div>
          <div>
            <label className="rotulo" htmlFor="mutuarioDocumento">
              CPF/CNPJ do mutuário
            </label>
            <input id="mutuarioDocumento" name="mutuarioDocumento" className="campo" value={mutuarioDocumento} onChange={(e) => setMutuarioDocumento(e.target.value)} />
          </div>
          <div>
            <label className="rotulo" htmlFor="instituicaoFinanceira">
              Instituição financeira
            </label>
            <input id="instituicaoFinanceira" name="instituicaoFinanceira" className="campo" value={instituicaoFinanceira} onChange={(e) => setInstituicaoFinanceira(e.target.value)} />
          </div>
          <div>
            <label className="rotulo" htmlFor="numeroContrato">
              Número do contrato
            </label>
            <input id="numeroContrato" name="numeroContrato" className="campo" value={numeroContrato} onChange={(e) => setNumeroContrato(e.target.value)} />
          </div>
          <div>
            <label className="rotulo" htmlFor="dataContratacao">
              Data de contratação original
            </label>
            <input id="dataContratacao" name="dataContratacao" type="date" className="campo" value={dataContratacao} onChange={(e) => setDataContratacao(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="cartao space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Enquadramento como crédito rural (Lei 4.829/65)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="rotulo" htmlFor="categoriaOperacao">
              Categoria da operação
            </label>
            <select id="categoriaOperacao" name="categoriaOperacao" className="campo" value={categoriaOperacao} onChange={(e) => setCategoriaOperacao(e.target.value)}>
              <option value="">Não identificado</option>
              <option value="CUSTEIO">Custeio</option>
              <option value="COMERCIALIZACAO">Comercialização</option>
              <option value="INDUSTRIALIZACAO">Industrialização</option>
              <option value="INVESTIMENTO">Investimento</option>
            </select>
          </div>
          <div>
            <label className="rotulo" htmlFor="fonteRecursos">
              Fonte dos recursos
            </label>
            <input id="fonteRecursos" name="fonteRecursos" className="campo" placeholder="ex.: recursos controlados, FCO..." value={fonteRecursos} onChange={(e) => setFonteRecursos(e.target.value)} />
          </div>
          <CampoSimNao nome="mutuarioEProdutorOuCooperativa" rotulo="Mutuário é produtor rural ou cooperativa?" valor={mutuarioEProdutorOuCooperativa} onChange={setMutuarioEProdutorOuCooperativa} />
          <CampoSimNao nome="finalidadeERural" rotulo="Finalidade declarada é agropecuária?" valor={finalidadeERural} onChange={setFinalidadeERural} />
        </div>
      </div>

      <div className="cartao space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Porte do beneficiário e situação da dívida</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="rotulo" htmlFor="categoriaBeneficiario">
              Categoria do beneficiário
            </label>
            <select id="categoriaBeneficiario" name="categoriaBeneficiario" className="campo" value={categoriaBeneficiario} onChange={(e) => setCategoriaBeneficiario(e.target.value)}>
              <option value="">Não identificado</option>
              <option value="PRONAF">Pronaf</option>
              <option value="PRONAMP">Pronamp</option>
              <option value="DEMAIS">Demais produtores</option>
            </select>
          </div>
          <div>
            <label className="rotulo" htmlFor="valorOperacao">
              Valor da operação (R$)
            </label>
            <input id="valorOperacao" name="valorOperacao" className="campo" value={valorOperacao} onChange={(e) => setValorOperacao(e.target.value)} />
          </div>
          <div>
            <label className="rotulo" htmlFor="situacaoAdimplencia">
              Situação na contratação da nova linha
            </label>
            <select id="situacaoAdimplencia" name="situacaoAdimplencia" className="campo" value={situacaoAdimplencia} onChange={(e) => setSituacaoAdimplencia(e.target.value)}>
              <option value="">Não informado</option>
              <option value="ADIMPLENTE">Adimplente</option>
              <option value="INADIMPLENTE">Inadimplente</option>
            </select>
          </div>
          <CampoSimNao nome="foiRenegociadoOuProrrogado" rotulo="Foi renegociado ou prorrogado?" valor={foiRenegociadoOuProrrogado} onChange={setFoiRenegociadoOuProrrogado} />
          {foiRenegociadoOuProrrogado === "sim" && (
            <div>
              <label className="rotulo" htmlFor="dataRenegociacaoOuProrrogacao">
                Data da renegociação/prorrogação
              </label>
              <input
                id="dataRenegociacaoOuProrrogacao"
                name="dataRenegociacaoOuProrrogacao"
                type="date"
                className="campo"
                value={dataRenegociacaoOuProrrogacao}
                onChange={(e) => setDataRenegociacaoOuProrrogacao(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="rotulo" htmlFor="dataInicioInadimplencia">
              Data de início da inadimplência (se houver)
            </label>
            <input id="dataInicioInadimplencia" name="dataInicioInadimplencia" type="date" className="campo" value={dataInicioInadimplencia} onChange={(e) => setDataInicioInadimplencia(e.target.value)} />
          </div>
          <CampoSimNao nome="permaneceInadimplenteEm31Mai2026" rotulo="Permanecia inadimplente em 31/05/2026?" valor={permaneceInadimplenteEm31Mai2026} onChange={setPermaneceInadimplenteEm31Mai2026} />
        </div>
      </div>

      <div className="cartao space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Perdas de safra (Art. 1º, § 1º e § 7º da MP 1.376)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="rotulo" htmlFor="numeroSafrasComPerda">
              Número de safras com perda (2019–2025)
            </label>
            <input id="numeroSafrasComPerda" name="numeroSafrasComPerda" className="campo" value={numeroSafrasComPerda} onChange={(e) => setNumeroSafrasComPerda(e.target.value)} />
          </div>
          <div>
            <label className="rotulo" htmlFor="anosSafrasComPerda">
              Anos das safras (separe por vírgula)
            </label>
            <input id="anosSafrasComPerda" name="anosSafrasComPerda" className="campo" placeholder="2021, 2022, 2023" value={anosSafrasComPerda} onChange={(e) => setAnosSafrasComPerda(e.target.value)} />
          </div>
          <div>
            <label className="rotulo" htmlFor="percentualReducaoRenda">
              % de redução da renda bruta esperada
            </label>
            <input id="percentualReducaoRenda" name="percentualReducaoRenda" className="campo" value={percentualReducaoRenda} onChange={(e) => setPercentualReducaoRenda(e.target.value)} />
          </div>
          <div>
            <label className="rotulo" htmlFor="causaPerda">
              Causa da perda
            </label>
            <select id="causaPerda" name="causaPerda" className="campo" value={causaPerda} onChange={(e) => setCausaPerda(e.target.value)}>
              <option value="">Não informado</option>
              <option value="CLIMATICO">Evento climático extremo</option>
              <option value="PRECO">Redução de preço de comercialização</option>
              <option value="AMBOS">Ambos</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="rotulo" htmlFor="eventosClimaticos">
              Eventos climáticos (separe por vírgula)
            </label>
            <input
              id="eventosClimaticos"
              name="eventosClimaticos"
              className="campo"
              placeholder="seca, geada, granizo..."
              value={eventosClimaticos}
              onChange={(e) => setEventosClimaticos(e.target.value)}
            />
          </div>
          <CampoSimNao nome="temLaudoTecnico" rotulo="Há laudo de profissional habilitado?" valor={temLaudoTecnico} onChange={setTemLaudoTecnico} />
          <div>
            <label className="rotulo" htmlFor="profissionalHabilitadoNome">
              Nome do profissional habilitado
            </label>
            <input id="profissionalHabilitadoNome" name="profissionalHabilitadoNome" className="campo" value={profissionalHabilitadoNome} onChange={(e) => setProfissionalHabilitadoNome(e.target.value)} />
          </div>
          <div>
            <label className="rotulo" htmlFor="profissionalHabilitadoRegistro">
              Registro profissional (CREA, CRMV etc.)
            </label>
            <input
              id="profissionalHabilitadoRegistro"
              name="profissionalHabilitadoRegistro"
              className="campo"
              value={profissionalHabilitadoRegistro}
              onChange={(e) => setProfissionalHabilitadoRegistro(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="cartao space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Exclusões (Art. 1º, § 8º e § 9º)</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <CampoSimNao nome="origemFundoSocial" rotulo="Recursos do Fundo Social?" valor={origemFundoSocial} onChange={setOrigemFundoSocial} />
          <CampoSimNao nome="origemMP1314_2025" rotulo="Contratada sob a MP 1.314/2025?" valor={origemMP1314_2025} onChange={setOrigemMP1314} />
          <CampoSimNao nome="encaminhadoDividaAtivaUniao" rotulo="Encaminhada à Dívida Ativa da União?" valor={encaminhadoDividaAtivaUniao} onChange={setEncaminhadoDividaAtiva} />
        </div>
      </div>

      <div className="cartao space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Taxas</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="rotulo" htmlFor="taxaJurosContratual">
              Taxa de juros contratual (% a.a.)
            </label>
            <input id="taxaJurosContratual" name="taxaJurosContratual" className="campo" value={taxaJurosContratual} onChange={(e) => setTaxaJurosContratual(e.target.value)} />
          </div>
          <div>
            <label className="rotulo" htmlFor="indexador">
              Indexador
            </label>
            <input id="indexador" name="indexador" className="campo" value={indexador} onChange={(e) => setIndexador(e.target.value)} />
          </div>
          <div>
            <label className="rotulo" htmlFor="encargosMoratorios">
              Encargos moratórios
            </label>
            <input id="encargosMoratorios" name="encargosMoratorios" className="campo" value={encargosMoratorios} onChange={(e) => setEncargosMoratorios(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="cartao space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Garantias e avalistas</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="rotulo" htmlFor="tiposGarantia">
              Tipos de garantia (separe por vírgula)
            </label>
            <input id="tiposGarantia" name="tiposGarantia" className="campo" placeholder="HIPOTECA, AVAL, CPR..." value={tiposGarantia} onChange={(e) => setTiposGarantia(e.target.value)} />
          </div>
          <div>
            <label className="rotulo" htmlFor="valorGarantia">
              Valor total das garantias (R$)
            </label>
            <input id="valorGarantia" name="valorGarantia" className="campo" value={valorGarantia} onChange={(e) => setValorGarantia(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="rotulo" htmlFor="garantiasDescricao">
              Descrição das garantias
            </label>
            <textarea id="garantiasDescricao" name="garantiasDescricao" className="campo" rows={3} value={garantiasDescricao} onChange={(e) => setGarantiasDescricao(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <label className="rotulo">Avalistas</label>
          {avalistas.map((a, i) => (
            <div key={i} className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-3">
              <input
                className="campo"
                placeholder="Nome"
                value={a.nome}
                onChange={(e) => setAvalistas(avalistas.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))}
              />
              <input
                className="campo"
                placeholder="CPF/CNPJ"
                value={a.documento}
                onChange={(e) => setAvalistas(avalistas.map((x, j) => (j === i ? { ...x, documento: e.target.value } : x)))}
              />
              <div className="flex gap-2">
                <input
                  className="campo"
                  placeholder="Patrimônio descrito"
                  value={a.patrimonioDescrito}
                  onChange={(e) => setAvalistas(avalistas.map((x, j) => (j === i ? { ...x, patrimonioDescrito: e.target.value } : x)))}
                />
                <button type="button" onClick={() => setAvalistas(avalistas.filter((_, j) => j !== i))} className="text-xs text-red-600 hover:underline">
                  remover
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setAvalistas([...avalistas, { nome: "", documento: "", patrimonioDescrito: "" }])}
            className="botao-secundario text-sm"
          >
            Adicionar avalista
          </button>
          <input type="hidden" name="avalistasJson" value={JSON.stringify(avalistas)} />
        </div>
      </div>

      <div className="cartao space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Seguro rural</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSimNao nome="temSeguroRural" rotulo="Contrato tem seguro rural?" valor={temSeguroRural} onChange={setTemSeguroRural} />
          <CampoSimNao nome="temProagro" rotulo="Coberto pelo Proagro?" valor={temProagro} onChange={setTemProagro} />
          <div>
            <label className="rotulo" htmlFor="seguradora">
              Seguradora
            </label>
            <input id="seguradora" name="seguradora" className="campo" value={seguradora} onChange={(e) => setSeguradora(e.target.value)} />
          </div>
          <div>
            <label className="rotulo" htmlFor="apoliceNumero">
              Número da apólice
            </label>
            <input id="apoliceNumero" name="apoliceNumero" className="campo" value={apoliceNumero} onChange={(e) => setApoliceNumero(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="rotulo" htmlFor="coberturas">
              Coberturas (separe por vírgula)
            </label>
            <input id="coberturas" name="coberturas" className="campo" placeholder="granizo, seca, geada..." value={coberturas} onChange={(e) => setCoberturas(e.target.value)} />
          </div>
          <div>
            <label className="rotulo" htmlFor="vigenciaInicio">
              Vigência — início
            </label>
            <input id="vigenciaInicio" name="vigenciaInicio" type="date" className="campo" value={vigenciaInicio} onChange={(e) => setVigenciaInicio(e.target.value)} />
          </div>
          <div>
            <label className="rotulo" htmlFor="vigenciaFim">
              Vigência — fim
            </label>
            <input id="vigenciaFim" name="vigenciaFim" type="date" className="campo" value={vigenciaFim} onChange={(e) => setVigenciaFim(e.target.value)} />
          </div>
          <div>
            <label className="rotulo" htmlFor="indenizacaoRecebida">
              Indenização já recebida (R$)
            </label>
            <input id="indenizacaoRecebida" name="indenizacaoRecebida" className="campo" value={indenizacaoRecebida} onChange={(e) => setIndenizacaoRecebida(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="cartao space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Riscos e desequilíbrio contratual</h2>
        <div>
          <label className="rotulo" htmlFor="riscosIdentificados">
            Riscos identificados (separe por vírgula)
          </label>
          <input id="riscosIdentificados" name="riscosIdentificados" className="campo" value={riscosIdentificados} onChange={(e) => setRiscosIdentificados(e.target.value)} />
        </div>
        <div>
          <label className="rotulo" htmlFor="desequilibrioContratual">
            Análise de desequilíbrio / potencial de revisão ou anulação
          </label>
          <textarea
            id="desequilibrioContratual"
            name="desequilibrioContratual"
            className="campo"
            rows={4}
            value={desequilibrioContratual}
            onChange={(e) => setDesequilibrioContratual(e.target.value)}
            placeholder="Ex.: onerosidade excessiva, cláusula de capitalização de juros, garantia desproporcional ao valor financiado..."
          />
        </div>
      </div>

      <div className="cartao space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Alongamento da dívida (regime geral — MCR 2-6-4)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="rotulo" htmlFor="dataVencimento">
              Data de vencimento da dívida
            </label>
            <input id="dataVencimento" name="dataVencimento" type="date" className="campo" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} />
          </div>
          <div>
            <label className="rotulo" htmlFor="dataPedidoAlongamento">
              Data do pedido de prorrogação (se já protocolado)
            </label>
            <input id="dataPedidoAlongamento" name="dataPedidoAlongamento" type="date" className="campo" value={dataPedidoAlongamento} onChange={(e) => setDataPedidoAlongamento(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="rotulo mb-2 block">Hipóteses do MCR 2-6-4 aplicáveis</label>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { valor: "COMERCIALIZACAO", rotulo: "Dificuldade de comercialização" },
              { valor: "FRUSTRACAO_SAFRA", rotulo: "Frustração de safra por fatores adversos" },
              { valor: "OCORRENCIA_PREJUDICIAL", rotulo: "Ocorrência prejudicial ao desenvolvimento da operação" },
              { valor: "FLUXO_CAIXA_ACUMULADO", rotulo: "Fluxo de caixa por perdas acumuladas de safras anteriores" },
            ].map((h) => (
              <label key={h.valor} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={hipotesesMcr.includes(h.valor)}
                  onChange={(e) =>
                    setHipotesesMcr(e.target.checked ? [...hipotesesMcr, h.valor] : hipotesesMcr.filter((x) => x !== h.valor))
                  }
                />
                {h.rotulo}
              </label>
            ))}
          </div>
          <input type="hidden" name="hipotesesMcr" value={hipotesesMcr.join(",")} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSimNao nome="laudoUnilateral" rotulo="O laudo foi produzido só pelo profissional do produtor?" valor={laudoUnilateral} onChange={setLaudoUnilateral} />
          <CampoSimNao nome="bancoConvidadoParaLaudo" rotulo="O banco foi convidado a acompanhar a vistoria?" valor={bancoConvidadoParaLaudo} onChange={setBancoConvidadoParaLaudo} />
          <CampoSimNao nome="houvePedidoAdministrativo" rotulo="Já houve pedido administrativo ao banco?" valor={houvePedidoAdministrativo} onChange={setHouvePedidoAdministrativo} />
          <div>
            <label className="rotulo" htmlFor="respostaBanco">
              Resposta do banco
            </label>
            <select id="respostaBanco" name="respostaBanco" className="campo" value={respostaBanco} onChange={(e) => setRespostaBanco(e.target.value)}>
              <option value="">Não informado</option>
              <option value="DEFERIDO">Deferido</option>
              <option value="INDEFERIDO">Indeferido</option>
              <option value="SEM_RESPOSTA">Sem resposta</option>
            </select>
          </div>
          {respostaBanco === "INDEFERIDO" && (
            <CampoSimNao
              nome="recusaFundamentadaPorEscrito"
              rotulo="A recusa veio por escrito e fundamentada?"
              valor={recusaFundamentadaPorEscrito}
              onChange={setRecusaFundamentadaPorEscrito}
            />
          )}
        </div>
      </div>

      <div className="cartao space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Dados para o requerimento e a petição</h2>
        <p className="ajuda">Preenchidos aqui já saem prontos nas minutas geradas — mas podem ser ajustados depois, direto no Word.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="rotulo" htmlFor="advogadoNome">
              Nome do(a) advogado(a)
            </label>
            <input id="advogadoNome" name="advogadoNome" className="campo" value={advogadoNome} onChange={(e) => setAdvogadoNome(e.target.value)} />
          </div>
          <div>
            <label className="rotulo" htmlFor="advogadoOab">
              OAB
            </label>
            <input id="advogadoOab" name="advogadoOab" className="campo" value={advogadoOab} onChange={(e) => setAdvogadoOab(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="rotulo" htmlFor="enderecoBancoReu">
              Endereço da instituição financeira (para o requerimento)
            </label>
            <input id="enderecoBancoReu" name="enderecoBancoReu" className="campo" value={enderecoBancoReu} onChange={(e) => setEnderecoBancoReu(e.target.value)} />
          </div>
          <div>
            <label className="rotulo" htmlFor="comarcaForo">
              Comarca
            </label>
            <input id="comarcaForo" name="comarcaForo" className="campo" value={comarcaForo} onChange={(e) => setComarcaForo(e.target.value)} />
          </div>
          <div>
            <label className="rotulo" htmlFor="varaForo">
              Vara
            </label>
            <input id="varaForo" name="varaForo" className="campo" placeholder="ex.: 2ª Vara Cível" value={varaForo} onChange={(e) => setVaraForo(e.target.value)} />
          </div>
          <div>
            <label className="rotulo" htmlFor="valorCausa">
              Valor da causa (R$)
            </label>
            <input id="valorCausa" name="valorCausa" className="campo" value={valorCausa} onChange={(e) => setValorCausa(e.target.value)} />
          </div>
        </div>
      </div>

      <button type="submit" className="botao-principal w-full">
        Salvar e gerar parecer
      </button>
    </form>
  );
}
