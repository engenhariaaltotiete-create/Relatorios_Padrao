import { useMemo } from 'react';
import type { Report, StoredFile } from '../types';
import { BASE_OPTIONS } from '../data/options';
import { blankEvidence, fileToStored } from '../lib/helpers';
import { EditableListInput } from './EditableListInput';
import { EvidenceCard } from './EvidenceCard';
import { FileCards } from './FileCards';

type Props = {
  report: Report;
  onChange: (report: Report) => void;
  onSaveBack: () => void;
  onPdf: () => void;
  onExport: () => void;
  busy?: boolean;
};

export function Editor({ report, onChange, onSaveBack, onPdf, onExport, busy }: Props) {
  // Acrescenta aos datalists os valores já usados no relatório atual. Isso ajuda quando o usuário
  // digitou uma opção nova que não fazia parte da lista inicial.
  const options = useMemo(() => ({
    cargo: [...new Set([...BASE_OPTIONS.cargo, report.responsavel.cargo].filter(Boolean))],
    empresa: [...new Set([...BASE_OPTIONS.empresa, report.responsavel.empresa].filter(Boolean))],
    municipio: [...new Set([...BASE_OPTIONS.municipio, report.obra.municipio].filter(Boolean))],
    tipoObra: [...new Set([...BASE_OPTIONS.tipoObra, report.obra.tipoObra].filter(Boolean))],
    aguaEsgoto: [...new Set([...BASE_OPTIONS.aguaEsgoto, report.obra.aguaEsgoto].filter(Boolean))],
  }), [report]);

  const patch = (partial: Partial<Report>) => onChange({ ...report, ...partial, updatedAt: new Date().toISOString() });
  const updateAttachment = (i: number, patchData: Partial<StoredFile>) => patch({ anexos: report.anexos.map((a, idx) => idx === i ? { ...a, ...patchData } : a) });

  const addAttachments = async (files: FileList | null) => {
    if (!files) return;
    const accepted = Array.from(files).filter((f) => f.type.startsWith('image/') || f.type === 'application/pdf' || /\.tiff?$/i.test(f.name));
    const stored = await Promise.all(accepted.map(fileToStored));
    patch({ anexos: [...report.anexos, ...stored] });
  };

  return (
    <main className="container editor">
      <div className="page-heading">
        <div><h2>Relatório em edição</h2><p>Salvamento local automático ativo.</p></div>
        <button className="secondary" onClick={onSaveBack}>Salvar e voltar</button>
      </div>

      <section className="card">
        <h3>1. Identificação do responsável pela elaboração do relatório</h3>
        <div className="card-body form-grid">
          <label className="field"><span>Elaborado por <b className="required">*</b></span><input value={report.responsavel.elaboradoPor} onChange={(e) => patch({ responsavel: { ...report.responsavel, elaboradoPor: e.target.value } })} /></label>
          <label className="field"><span>Data <b className="required">*</b></span><input type="date" value={report.responsavel.data} onChange={(e) => patch({ responsavel: { ...report.responsavel, data: e.target.value } })} /></label>
          <EditableListInput label="Cargo/Função" required value={report.responsavel.cargo} options={options.cargo} onChange={(cargo) => patch({ responsavel: { ...report.responsavel, cargo } })} />
          <EditableListInput label="Empresa" required value={report.responsavel.empresa} options={options.empresa} onChange={(empresa) => patch({ responsavel: { ...report.responsavel, empresa } })} />
        </div>
      </section>

      <section className="card">
        <h3>2. Informações da obra</h3>
        <div className="card-body form-grid">
          <EditableListInput label="Município" required value={report.obra.municipio} options={options.municipio} onChange={(municipio) => patch({ obra: { ...report.obra, municipio } })} />
          <label className="field"><span>Endereço <b className="required">*</b></span><input value={report.obra.endereco} onChange={(e) => patch({ obra: { ...report.obra, endereco: e.target.value } })} /></label>
          <EditableListInput label="Tipo de Serviço" required value={report.obra.tipoObra} options={options.tipoObra} onChange={(tipoObra) => patch({ obra: { ...report.obra, tipoObra } })} />
          <EditableListInput label="Água/Esgoto" required value={report.obra.aguaEsgoto} options={options.aguaEsgoto} onChange={(aguaEsgoto) => patch({ obra: { ...report.obra, aguaEsgoto } })} />
        </div>
      </section>

      <section className="card">
        <h3>3. Evidências de execução dos serviços não vinculados</h3>
        <div className="card-body">
          {report.evidencias.map((ev, i) => (
            <EvidenceCard key={ev.id} evidence={ev} index={i}
              onChange={(changed) => patch({ evidencias: report.evidencias.map((e, idx) => idx === i ? changed : e) })}
              onRemove={() => report.evidencias.length > 1 && patch({ evidencias: report.evidencias.filter((_, idx) => idx !== i) })}
            />
          ))}
          <button type="button" className="ghost" onClick={() => patch({ evidencias: [...report.evidencias, blankEvidence()] })}>+ Adicionar nova evidência</button>
        </div>
      </section>

      <section className="card">
        <h3>4. Anexos</h3>
        <div className="card-body">
          <label className="file-button">+ Adicionar anexos<input type="file" hidden multiple accept="image/*,application/pdf,.tif,.tiff" onChange={(e) => { void addAttachments(e.target.files); e.currentTarget.value = ''; }} /></label>
          <p className="hint">Aceita imagens, PDF e TIF/TIFF. PDFs serão incorporados como páginas reais ao PDF final.</p>
          <FileCards files={report.anexos} onDescription={(i, text) => updateAttachment(i, { descricao: text })} onRemove={(i) => patch({ anexos: report.anexos.filter((_, idx) => idx !== i) })} />
        </div>
      </section>

      <div className="editor-bar">
        <button className="secondary" onClick={onSaveBack}>Salvar e voltar</button>
        <button className="secondary" onClick={onExport}>Exportar JSON</button>
        <button disabled={busy} onClick={onPdf}>{busy ? 'Gerando PDF...' : 'Gerar PDF'}</button>
      </div>
    </main>
  );
}
