type Props = { onServices: () => void; onReceipt: () => void; onDiagnosis: () => void };

export function Portal({ onServices, onReceipt, onDiagnosis }: Props) {
  return (
    <main className="container portal">
      <div className="page-heading"><div><h2>Relatórios Padrão</h2><p>Selecione o modelo de relatório que deseja utilizar.</p></div></div>
      <div className="portal-grid">
        <button className="portal-card" onClick={onServices}>
          <strong>Relatórios de Serviços Não Vinculados</strong>
          <span>Registro de serviços não vinculados, evidências, preços, fotos e anexos.</span>
        </button>
        <button className="portal-card" onClick={onReceipt}>
          <strong>Relatório de Recebimento de Obras</strong>
          <span>Vistoria técnica, apontamentos, defeitos, classificação de gravidade, fotos e anexos.</span>
        </button>
              <button className="portal-card" onClick={onDiagnosis}><strong>Diagnóstico e Solução de Problemas Operacionais</strong><span>Análise técnica, 5 Porquês, parecer, orçamento e anexos.</span></button>
      </div>
    </main>
  );
}
