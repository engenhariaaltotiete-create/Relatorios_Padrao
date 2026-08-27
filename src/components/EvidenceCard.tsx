import type { Evidence, ServiceLine, StoredFile } from '../types';
import { blankService, fileToStored, moneyBR } from '../lib/helpers';
import { ServiceSearch } from './ServiceSearch';
import { FileCards } from './FileCards';

type Props = {
  evidence: Evidence;
  index: number;
  onChange: (evidence: Evidence) => void;
  onRemove: () => void;
};

export function EvidenceCard({ evidence, index, onChange, onRemove }: Props) {
  const patchService = (i: number, patch: Partial<ServiceLine>) => {
    const servicos = evidence.servicos.map((s, idx) => idx === i ? { ...s, ...patch } : s);
    onChange({ ...evidence, servicos });
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    const converted = await Promise.all(Array.from(files).map(fileToStored));
    onChange({ ...evidence, fotos: [...evidence.fotos, ...converted] });
  };

  const updatePhoto = (i: number, patch: Partial<StoredFile>) => {
    onChange({ ...evidence, fotos: evidence.fotos.map((f, idx) => idx === i ? { ...f, ...patch } : f) });
  };

  return (
    <article className="evidence-card">
      <div className="evidence-head">
        <strong>Evidência {String(index + 1).padStart(2, '0')}</strong>
        <button type="button" className="danger" onClick={onRemove}>Excluir evidência</button>
      </div>
      <div className="card-body">
        <label className="field full"><span>Número de OS relacionada <b className="required">*</b></span><input type="number" inputMode="numeric" value={evidence.os} onChange={(e) => onChange({ ...evidence, os: e.target.value })} /></label>

        <div className="service-lines">
          {evidence.servicos.map((s, i) => (
            <div className="service-row" key={s.id}>
              <label className="field service-type"><span>Tipo de Serviço <b className="required">*</b></span>
                <ServiceSearch
                  value={s.tipo}
                  onQueryChange={(text) => patchService(i, { tipo: text, preco: '', unid: '', precoUnit: '' })}
                  onSelect={(item) => patchService(i, { tipo: item.descricao, preco: String(item.preco), unid: item.unid, precoUnit: String(item.precoUnit) })}
                />
              </label>
              <label className="field"><span>Nº do Preço</span><input readOnly value={s.preco} /></label>
              <label className="field"><span>Unid.</span><input readOnly value={s.unid} /></label>
              <label className="field"><span>Qtde. <b className="required">*</b></span><input type="number" inputMode="decimal" min="0" step="any" value={s.qtde} onChange={(e) => patchService(i, { qtde: e.target.value })} /></label>
              <label className="field"><span>Preço Unit.</span><input readOnly value={s.precoUnit ? moneyBR(s.precoUnit) : ''} /></label>
              <label className="field"><span>Total</span><input readOnly value={moneyBR((Number(s.precoUnit) || 0) * (Number(s.qtde) || 0))} /></label>
              <button type="button" className="icon danger" title="Excluir serviço" onClick={() => evidence.servicos.length > 1 && onChange({ ...evidence, servicos: evidence.servicos.filter((_, idx) => idx !== i) })}>×</button>
            </div>
          ))}
          <button type="button" className="ghost add-line" onClick={() => onChange({ ...evidence, servicos: [...evidence.servicos, blankService()] })}>+ Adicionar serviço à evidência</button>
        </div>

        <label className="field full"><span>Observação</span><textarea value={evidence.observacao} onChange={(e) => onChange({ ...evidence, observacao: e.target.value })} /></label>

        <div className="full">
          <div className="inline-actions">
            <label className="file-button">+ Adicionar fotos<input type="file" accept="image/*" multiple hidden onChange={(e) => { void addPhotos(e.target.files); e.currentTarget.value = ''; }} /></label>
            <span className="badge">{evidence.fotos.length} foto(s)</span>
          </div>
          <FileCards files={evidence.fotos} onDescription={(i, text) => updatePhoto(i, { descricao: text })} onRemove={(i) => onChange({ ...evidence, fotos: evidence.fotos.filter((_, idx) => idx !== i) })} />
        </div>
      </div>
    </article>
  );
}
