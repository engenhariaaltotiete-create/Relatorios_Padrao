import type { StoredFile } from '../types';

type Props = {
  files: StoredFile[];
  onDescription: (index: number, text: string) => void;
  onRemove: (index: number) => void;
};

export function FileCards({ files, onDescription, onRemove }: Props) {
  if (!files.length) return <div className="empty">Nenhum arquivo adicionado.</div>;
  return (
    <div className="file-grid">
      {files.map((f, i) => {
        const canPreview = f.type.startsWith('image/') && !/tiff?/i.test(f.type);
        return (
          <article className="file-card" key={f.id}>
            {canPreview ? <img src={f.data} alt={f.name} /> : <div className="file-placeholder">{f.name}<small>{f.type || 'arquivo'}</small></div>}
            <div className="file-name">{f.name}</div>
            <label className="field"><span>Descrição</span><input value={f.descricao} onChange={(e) => onDescription(i, e.target.value)} /></label>
            <button type="button" className="ghost danger-text" onClick={() => onRemove(i)}>Remover</button>
          </article>
        );
      })}
    </div>
  );
}
