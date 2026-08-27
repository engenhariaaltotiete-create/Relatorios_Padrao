import type { DefectLine, InspectionNote, StoredFile } from '../types';
import { RECEIPT_OPTIONS } from '../data/options';
import { blankDefect, fileToStored } from '../lib/helpers';
import { EditableListInput } from './EditableListInput';
import { FileCards } from './FileCards';

type Props = {
  note: InspectionNote;
  index: number;
  onChange: (note: InspectionNote) => void;
  onRemove: () => void;
};

export function InspectionCard({ note, index, onChange, onRemove }: Props) {
  const patchDefect = (i: number, patch: Partial<DefectLine>) => onChange({ ...note, defeitos: note.defeitos.map((d,idx)=>idx===i?{...d,...patch}:d) });
  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    const converted = await Promise.all(Array.from(files).map(fileToStored));
    onChange({ ...note, fotos: [...note.fotos, ...converted] });
  };
  const updatePhoto=(i:number,patch:Partial<StoredFile>)=>onChange({...note,fotos:note.fotos.map((f,idx)=>idx===i?{...f,...patch}:f)});
  const elementOptions=[...new Set([...RECEIPT_OPTIONS.elemento,note.elemento].filter(Boolean))];
  const defectOptions=[...new Set([...RECEIPT_OPTIONS.tipoDefeito,...note.defeitos.map(d=>d.tipoDefeito)].filter(Boolean))];

  return <article className="evidence-card">
    <div className="evidence-head"><strong>Apontamento {String(index+1).padStart(2,'0')}</strong><button type="button" className="danger" onClick={onRemove}>Excluir apontamento</button></div>
    <div className="card-body">
      <EditableListInput label="Elemento" required value={note.elemento} options={elementOptions} onChange={elemento=>onChange({...note,elemento})}/>
      <label className="field"><span>Identificação do Elemento <b className="required">*</b></span><input value={note.identificacaoElemento} placeholder="Informar o nome ou identificação do elemento" onChange={e=>onChange({...note,identificacaoElemento:e.target.value})}/></label>
      <label className="field full"><span>Descrição complementar do elemento</span><textarea value={note.descricaoComplementarElemento} placeholder="Preencher se houver necessidade de mais informações sobre o elemento" onChange={e=>onChange({...note,descricaoComplementarElemento:e.target.value})}/></label>

      <div className="defect-lines full">
        {note.defeitos.map((d,i)=><div className="defect-row" key={d.id}>
          <EditableListInput label="Tipo de defeito" required value={d.tipoDefeito} options={defectOptions} onChange={tipoDefeito=>patchDefect(i,{tipoDefeito})}/>
          <label className="field"><span>Descrição do defeito <b className="required">*</b></span><textarea value={d.descricaoDefeito} placeholder="Descrever o defeito encontrado" onChange={e=>patchDefect(i,{descricaoDefeito:e.target.value})}/></label>
          <EditableListInput label="Grau do defeito" required value={d.grau} options={RECEIPT_OPTIONS.grau} allowCustom={false} onChange={grau=>patchDefect(i,{grau})}/>
          <button type="button" className="icon danger" title="Excluir defeito" onClick={()=>note.defeitos.length>1&&onChange({...note,defeitos:note.defeitos.filter((_,idx)=>idx!==i)})}>×</button>
        </div>)}
        <button type="button" className="ghost add-line" onClick={()=>onChange({...note,defeitos:[...note.defeitos,blankDefect()]})}>+ Adicionar defeito ao apontamento</button>
      </div>

      <div className="full">
        <div className="inline-actions">
          <label className="file-button">+ Adicionar fotos<input type="file" accept="image/*" multiple hidden onChange={e=>{void addPhotos(e.target.files);e.currentTarget.value='';}}/></label>
          <label className="file-button secondary">📷 Tirar foto<input type="file" accept="image/*" capture="environment" hidden onChange={e=>{void addPhotos(e.target.files);e.currentTarget.value='';}}/></label>
          <span className="badge">{note.fotos.length} foto(s)</span>
        </div>
        <FileCards files={note.fotos} onDescription={(i,text)=>updatePhoto(i,{descricao:text})} onRemove={i=>onChange({...note,fotos:note.fotos.filter((_,idx)=>idx!==i)})}/>
      </div>
    </div>
  </article>;
}
