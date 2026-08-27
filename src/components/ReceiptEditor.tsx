import { useMemo } from 'react';
import type { ReceiptReport, StoredFile } from '../types';
import { BASE_OPTIONS, RECEIPT_OPTIONS } from '../data/options';
import { blankInspectionNote, fileToStored } from '../lib/helpers';
import { EditableListInput } from './EditableListInput';
import { InspectionCard } from './InspectionCard';
import { FileCards } from './FileCards';

export const RECEIPT_OBJECTIVE = 'O presente Relatório de Recebimento de Obras tem por objetivo registrar de forma padronizada os resultados das vistorias técnicas realizadas para avaliação e recebimento de obras de infraestrutura de abastecimento de água e esgotamento sanitário, documentando os elementos inspecionados, os defeitos ou não conformidades identificados, sua classificação quanto à gravidade, os respectivos registros fotográficos e demais observações relevantes, de modo a subsidiar a aceitação dos serviços executados, a definição de eventuais ações corretivas e a formalização do recebimento da obra pela Sabesp.';

type Props={report:ReceiptReport;onChange:(r:ReceiptReport)=>void;onSaveBack:()=>void;onPdf:()=>void;onExport:()=>void;busy?:boolean};

export function ReceiptEditor({report,onChange,onSaveBack,onPdf,onExport,busy}:Props){
  const options=useMemo(()=>({
    cargo:[...new Set([...BASE_OPTIONS.cargo,report.responsavel.cargo].filter(Boolean))],
    municipio:[...new Set([...BASE_OPTIONS.municipio,report.obra.municipio].filter(Boolean))],
    tipoObra:[...new Set([...RECEIPT_OPTIONS.tipoObra,report.obra.tipoObra].filter(Boolean))],
    aguaEsgoto:[...new Set([...BASE_OPTIONS.aguaEsgoto,report.obra.aguaEsgoto].filter(Boolean))],
  }),[report]);
  const patch=(partial:Partial<ReceiptReport>)=>onChange({...report,...partial,updatedAt:new Date().toISOString()});
  const updateAttachment=(i:number,p:Partial<StoredFile>)=>patch({anexos:report.anexos.map((a,idx)=>idx===i?{...a,...p}:a)});
  const addAttachments=async(files:FileList|null)=>{if(!files)return;const accepted=Array.from(files).filter(f=>f.type.startsWith('image/')||f.type==='application/pdf'||/\.tiff?$/i.test(f.name));const stored=await Promise.all(accepted.map(fileToStored));patch({anexos:[...report.anexos,...stored]});};

  return <main className="container editor">
    <div className="page-heading"><div><h2>Relatório de Recebimento de Obras em edição</h2><p>Salvamento local automático ativo.</p></div><button className="secondary" onClick={onSaveBack}>Salvar e voltar</button></div>

    <section className="card objective-card"><h3>Objetivo</h3><div className="card-body"><p className="objective-text">{RECEIPT_OBJECTIVE}</p></div></section>

    <section className="card"><h3>1. Identificação do responsável pela elaboração do relatório</h3><div className="card-body form-grid">
      <label className="field"><span>Elaborado por <b className="required">*</b></span><input value={report.responsavel.elaboradoPor} onChange={e=>patch({responsavel:{...report.responsavel,elaboradoPor:e.target.value}})}/></label>
      <label className="field"><span>Data <b className="required">*</b></span><input type="date" value={report.responsavel.data} onChange={e=>patch({responsavel:{...report.responsavel,data:e.target.value}})}/></label>
      <label className="field"><span>Matrícula <b className="required">*</b></span><input value={report.responsavel.matricula} onChange={e=>patch({responsavel:{...report.responsavel,matricula:e.target.value}})}/></label>
      <EditableListInput label="Cargo/Função" required value={report.responsavel.cargo} options={options.cargo} onChange={cargo=>patch({responsavel:{...report.responsavel,cargo}})}/>
      <label className="field"><span>Unidade <b className="required">*</b></span><input value={report.responsavel.unidade} onChange={e=>patch({responsavel:{...report.responsavel,unidade:e.target.value}})}/></label>
    </div></section>

    <section className="card"><h3>2. Dados da Obra</h3><div className="card-body form-grid">
      <EditableListInput label="Município" required value={report.obra.municipio} options={options.municipio} onChange={municipio=>patch({obra:{...report.obra,municipio}})}/>
      <label className="field"><span>Endereço <b className="required">*</b></span><input value={report.obra.endereco} onChange={e=>patch({obra:{...report.obra,endereco:e.target.value}})}/></label>
      <EditableListInput label="Tipo de Serviço" required value={report.obra.tipoObra} options={options.tipoObra} onChange={tipoObra=>patch({obra:{...report.obra,tipoObra}})}/>
      <EditableListInput label="Água/Esgoto" required value={report.obra.aguaEsgoto} options={options.aguaEsgoto} onChange={aguaEsgoto=>patch({obra:{...report.obra,aguaEsgoto}})}/>
      <label className="field"><span>Empresa Executora <b className="required">*</b></span><input value={report.obra.empresaExecutora} onChange={e=>patch({obra:{...report.obra,empresaExecutora:e.target.value}})}/></label>
      <label className="field"><span>Contrato <b className="required">*</b></span><input value={report.obra.contrato} onChange={e=>patch({obra:{...report.obra,contrato:e.target.value}})}/></label>
      <label className="field full"><span>Descrição complementar</span><textarea value={report.obra.descricaoComplementar} onChange={e=>patch({obra:{...report.obra,descricaoComplementar:e.target.value}})}/></label>
    </div></section>

    <section className="card"><h3>3. Apontamentos</h3><div className="card-body">
      {report.apontamentos.map((n,i)=><InspectionCard key={n.id} note={n} index={i} onChange={changed=>patch({apontamentos:report.apontamentos.map((x,idx)=>idx===i?changed:x)})} onRemove={()=>report.apontamentos.length>1&&patch({apontamentos:report.apontamentos.filter((_,idx)=>idx!==i)})}/>) }
      <button type="button" className="ghost" onClick={()=>patch({apontamentos:[...report.apontamentos,blankInspectionNote()]})}>+ Adicionar novo apontamento</button>
    </div></section>

    <section className="card"><h3>4. Anexos</h3><div className="card-body">
      <label className="file-button">+ Adicionar anexos<input type="file" hidden multiple accept="image/*,application/pdf,.tif,.tiff" onChange={e=>{void addAttachments(e.target.files);e.currentTarget.value='';}}/></label>
      <p className="hint">Aceita imagens, PDF e TIF/TIFF. PDFs serão incorporados ao PDF final.</p>
      <FileCards files={report.anexos} onDescription={(i,text)=>updateAttachment(i,{descricao:text})} onRemove={i=>patch({anexos:report.anexos.filter((_,idx)=>idx!==i)})}/>
    </div></section>

    <section className="card"><h3>5. Observações gerais da vistoria</h3><div className="card-body"><label className="field"><span>Observações</span><textarea className="long-text" value={report.observacoesGerais} onChange={e=>patch({observacoesGerais:e.target.value})}/></label></div></section>

    <div className="editor-bar"><button className="secondary" onClick={onSaveBack}>Salvar e voltar</button><button className="secondary" onClick={onExport}>Exportar JSON</button><button disabled={busy} onClick={onPdf}>{busy?'Gerando PDF...':'Gerar PDF'}</button></div>
  </main>;
}
