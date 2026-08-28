/**
 * Ícones de traço para a home pública — cinco soluções mais as quatro etapas
 * do diagrama de operação. Desenhados à mão em SVG (sem depender de nenhuma
 * biblioteca) para não trazer mais uma dependência só para isto.
 */
type Props = { className?: string };

const base = "h-6 w-6 stroke-current fill-none stroke-[1.6]";

export function IconePredio({ className = "" }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 21V6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v15" />
      <path d="M12 10h6a1 1 0 0 1 1 1v10" />
      <path d="M4 21h16" />
      <path d="M7 8h1M7 11h1M7 14h1M7 17h1M10 8h1M10 11h1M10 14h1M10 17h1M15 13h1M15 16h1" />
    </svg>
  );
}

export function IconePessoa({ className = "" }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 21c0-3.9 3.13-7 7-7s7 3.1 7 7" />
    </svg>
  );
}

export function IconeDocumentoCheck({ className = "" }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M14 3.5V8h4" />
      <path d="M9 13.5l2 2 4-4.2" />
    </svg>
  );
}

export function IconeMartelo({ className = "" }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 21h6" />
      <path d="M7 21V11" />
      <path d="M3 11h8L7 4 3 11Z" />
      <path d="M13 11h8l-4-7-4 7Z" />
      <path d="M17 11v3" />
    </svg>
  );
}

export function IconeAtivos({ className = "" }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="4.2" />
      <circle cx="15" cy="15" r="4.2" />
      <path d="M8.3 11.6 12 15.3" />
    </svg>
  );
}

export function IconeCadastro({ className = "" }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3.5" width="16" height="17" rx="1.4" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}

export function IconeLupa({ className = "" }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20l-4.8-4.8" />
    </svg>
  );
}

export function IconeSelo({ className = "" }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="9.5" r="5.5" />
      <path d="M9 14l-1.6 6.5L12 18l4.6 2.5L15 14" />
      <path d="M9.7 9.5l1.6 1.6 3-3.2" />
    </svg>
  );
}

export function IconeFichaCadastral({ className = "" }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="14" rx="1.4" />
      <circle cx="8.5" cy="10.3" r="1.8" />
      <path d="M5.8 15.5c.5-1.7 1.7-2.6 2.7-2.6s2.2.9 2.7 2.6" />
      <path d="M14 9.5h4M14 12.5h4M14 15.5h2.5" />
    </svg>
  );
}

export const ICONE_SOLUCAO: Record<string, (props: Props) => JSX.Element> = {
  COMPLIANCE_EMPRESA: IconePredio,
  DILIGENCIA_PESSOA: IconePessoa,
  VERIFICACAO_DOCUMENTOS: IconeDocumentoCheck,
  LICITACOES: IconeMartelo,
  GESTAO_ATIVOS: IconeAtivos,
  CONSULTA_CADASTRAL_SERASA: IconeFichaCadastral,
};
