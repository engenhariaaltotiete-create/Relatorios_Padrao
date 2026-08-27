import { useMemo, useState } from 'react';
import type { Report } from '../types';
import { searchableText } from '../lib/helpers';

type Props = {
  reports: Report[];
  onBack: () => void;
  onNew: () => void;
  onOpen: (id: string) => void;
  onArchive: (id: string, archive: boolean) => void;
  onDelete: (id: string) => void;
  onExport: (id: string) => void;
  onPdf: (id: string) => void;
  onImport: (file: File) => void;
};

function ReportRow({ report, archived, ...actions }: { report: Report; archived: boolean } & Pick<Props, 'onOpen' | 'onArchive' | 'onDelete' | 'onExport' | 'onPdf'>) {
  const title = [report.obra.municipio, report.obra.endereco].filter(Boolean).join(' - ') || 'Relatório sem identificação';
  return (
    <article className="report-row">
      <div>
        <div className="report-title">{title}</div>
        <div className="report-meta">
          <span>{report.obra.tipoObra || 'Tipo de serviço não informado'}</span>
          <span>{report.obra.aguaEsgoto || ''}</span>
          <span>Atualizado: {new Date(report.updatedAt).toLocaleString('pt-BR')}</span>
          <span className={`pill ${report.generatedAt ? 'done' : ''}`}>{report.generatedAt ? 'Gerado' : 'Rascunho'}</span>
        </div>
      </div>
      <div className="row-actions">
        <button onClick={() => actions.onOpen(report.id)}>Abrir</button>
        <button className="secondary" onClick={() => actions.onExport(report.id)}>JSON</button>
        <button className="secondary" onClick={() => actions.onPdf(report.id)}>PDF</button>
        <button className="ghost" onClick={() => actions.onArchive(report.id, !archived)}>{archived ? 'Desarquivar' : 'Arquivar'}</button>
        <button className="danger" onClick={() => actions.onDelete(report.id)}>Excluir</button>
      </div>
    </article>
  );
}

export function Dashboard(props: Props) {
  const [query, setQuery] = useState('');

  // A busca percorre TODOS os campos do relatório. Fotos/anexos são ignorados apenas no conteúdo Base64,
  // porque pesquisar dentro dos bytes da imagem seria pesado e não acrescentaria informação útil.
  const filtered = useMemo(() => {
    const q = query.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (!q) return props.reports;
    return props.reports.filter((r) => searchableText(r).includes(q));
  }, [props.reports, query]);

  const active = filtered.filter((r) => !r.archivedAt);
  const archived = filtered.filter((r) => !!r.archivedAt);

  return (
    <main className="container dashboard">
      <div className="page-heading">
        <div><h2>Relatórios</h2><p>Relatórios salvos neste navegador.</p></div>
        <div className="actions">
          <button className="secondary" onClick={props.onBack}>← Relatórios Padrão</button>
          <button onClick={props.onNew}>+ Novo relatório</button>
          <label className="file-button secondary">Importar JSON<input hidden type="file" accept="application/json,.json" onChange={(e) => { const f = e.target.files?.[0]; if (f) props.onImport(f); e.currentTarget.value = ''; }} /></label>
        </div>
      </div>

      <input className="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar em todos os campos do relatório..." />

      <section className="list-block">
        <h3>Em andamento</h3>
        <div className="reports-list">
          {active.length ? active.map((r) => <ReportRow key={r.id} report={r} archived={false} {...props} />) : <div className="empty">Nenhum relatório em andamento encontrado.</div>}
        </div>
      </section>

      <section className="list-block archived-block">
        <h3>Relatórios arquivados</h3>
        <div className="reports-list">
          {archived.length ? archived.map((r) => <ReportRow key={r.id} report={r} archived {...props} />) : <div className="empty">Nenhum relatório arquivado.</div>}
        </div>
      </section>
    </main>
  );
}
