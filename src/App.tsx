import { useCallback, useEffect, useRef, useState } from 'react';
import type { GeneratedPdf } from './lib/pdf';
import type { AnyReport, DiagnosisReport, ReceiptReport, Report } from './types';
import { Dashboard } from './components/Dashboard';
import { Editor } from './components/Editor';
import { Portal } from './components/Portal';
import { ReceiptDashboard } from './components/ReceiptDashboard';
import { ReceiptEditor } from './components/ReceiptEditor';
import { DiagnosisDashboard } from './components/DiagnosisDashboard';
import { DiagnosisEditor } from './components/DiagnosisEditor';
import { reportStorage } from './lib/storage';
import { anyFileNameBase, newDiagnosisReport, newReceiptReport, newReport, normalizeAnyReport, normalizeDiagnosisReport, normalizeReceiptReport, normalizeReport } from './lib/helpers';
import { generatePdf } from './lib/pdf';
import { generateReceiptPdf } from './lib/receiptPdf';
import { generateDiagnosisPdf } from './lib/diagnosisPdf';
import logo from './assets/sabesp-logo.jpg';
import './styles/app.css';

type Screen = 'portal' | 'services-dashboard' | 'services-editor' | 'receipt-dashboard' | 'receipt-editor' | 'diagnosis-dashboard' | 'diagnosis-editor';
type PdfResult = GeneratedPdf;

function validateServices(report: Report): string[] {
  const errors:string[]=[];
  if(!report.responsavel.elaboradoPor.trim())errors.push('Elaborado por'); if(!report.responsavel.data)errors.push('Data'); if(!report.responsavel.cargo.trim())errors.push('Cargo/Função'); if(!report.responsavel.empresa.trim())errors.push('Empresa');
  if(!report.obra.municipio.trim())errors.push('Município'); if(!report.obra.endereco.trim())errors.push('Endereço'); if(!report.obra.tipoObra.trim())errors.push('Tipo de Serviço da obra'); if(!report.obra.aguaEsgoto.trim())errors.push('Água/Esgoto');
  report.evidencias.forEach((ev,i)=>{if(!ev.os.trim())errors.push(`OS da Evidência ${i+1}`);if(!ev.fotos.length)errors.push(`Ao menos uma foto na Evidência ${i+1}`);ev.servicos.forEach((s,j)=>{if(!s.tipo.trim())errors.push(`Tipo de Serviço da Evidência ${i+1}, linha ${j+1}`);if(!s.qtde||Number(s.qtde)<=0)errors.push(`Quantidade da Evidência ${i+1}, linha ${j+1}`);});});
  return errors;
}
function validateReceipt(r:ReceiptReport):string[]{
  const e:string[]=[];
  const req=(v:string,label:string)=>{if(!String(v||'').trim())e.push(label)};
  req(r.responsavel.elaboradoPor,'Elaborado por');req(r.responsavel.data,'Data');req(r.responsavel.matricula,'Matrícula');req(r.responsavel.cargo,'Cargo/Função');req(r.responsavel.unidade,'Unidade');
  req(r.obra.municipio,'Município');req(r.obra.endereco,'Endereço');req(r.obra.tipoObra,'Tipo de Serviço');req(r.obra.aguaEsgoto,'Água/Esgoto');req(r.obra.empresaExecutora,'Empresa Executora');req(r.obra.contrato,'Contrato');
  r.apontamentos.forEach((a,i)=>{req(a.elemento,`Elemento do Apontamento ${i+1}`);req(a.identificacaoElemento,`Identificação do Elemento do Apontamento ${i+1}`);if(!a.defeitos.length)e.push(`Ao menos um defeito no Apontamento ${i+1}`);a.defeitos.forEach((d,j)=>{req(d.tipoDefeito,`Tipo de defeito ${i+1}.${j+1}`);req(d.descricaoDefeito,`Descrição do defeito ${i+1}.${j+1}`);req(d.grau,`Grau do defeito ${i+1}.${j+1}`);});});
  return e;
}

function validateDiagnosis(r:DiagnosisReport):string[]{const e:string[]=[];const req=(v:any,l:string)=>{if(!String(v??'').trim())e.push(l)};['elaboradoPor','data','matricula','cargo','unidade'].forEach(k=>req((r.responsavel as any)[k],k));req(r.demanda.endereco,'Endereço');req(r.demanda.municipio,'Município');req(r.demanda.processo,'Processo');req(r.demanda.origem,'Origem da demanda');req(r.demanda.problema,'Problema reportado');req(r.rede.idade,'Idade da rede');req(r.rede.diametro,'Diâmetro existente');req(r.rede.material,'Material existente');req(r.rede.conservacao,'Conservação');req(r.causa.problema,'Definição do problema');req(r.causa.causaRaiz,'Causa raiz');if(!r.causa.porques.some(x=>x.pergunta.trim()&&x.resposta.trim()))e.push('Ao menos um Porquê com pergunta e resposta');['tipoObra','extensao','novasEconomias','pngs','diametro','material','necessidade'].forEach(k=>req((r.solucao as any)[k],k));r.anexos.forEach((a,i)=>{req(a.titulo,`Título do anexo ${i+1}`);req(a.descricao,`Descrição do anexo ${i+1}`)});return e;}

function downloadBlob(blob:Blob,fileName:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=fileName;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}

export default function App(){
  const [screen,setScreen]=useState<Screen>('portal');
  const [reports,setReports]=useState<AnyReport[]>([]);
  const [current,setCurrent]=useState<AnyReport|null>(null);
  const [busyPdf,setBusyPdf]=useState(false);
  const [pdfResult,setPdfResult]=useState<PdfResult|null>(null);
  const [message,setMessage]=useState('Carregando armazenamento local...');
  const saveTimer=useRef<number|null>(null);

  const refresh=useCallback(async()=>{const all=await reportStorage.all();setReports(all.sort((a,b)=>new Date(b.updatedAt).getTime()-new Date(a.updatedAt).getTime()));setMessage('Armazenamento local ativo');},[]);
  useEffect(()=>{void refresh();},[refresh]);
  useEffect(()=>{if(!current||!screen.endsWith('editor'))return;if(saveTimer.current)window.clearTimeout(saveTimer.current);saveTimer.current=window.setTimeout(()=>{void reportStorage.put(current).then(()=>setMessage('Salvo automaticamente'));},700);return()=>{if(saveTimer.current)window.clearTimeout(saveTimer.current)};},[current,screen]);

  const openReport=async(id:string)=>{const found=await reportStorage.get(id);if(!found)return setMessage('Relatório não encontrado.');const normalized=normalizeAnyReport(found);setCurrent(normalized);setScreen(normalized.kind==='diagnosis'?'diagnosis-editor':normalized.kind==='receipt'?'receipt-editor':'services-editor');};
  const saveAndBack=async()=>{if(current)await reportStorage.put(current);await refresh();setScreen(current?.kind==='diagnosis'?'diagnosis-dashboard':current?.kind==='receipt'?'receipt-dashboard':'services-dashboard');};
  const exportJson=(r:AnyReport)=>{const blob=new Blob([JSON.stringify(r,null,2)],{type:'application/json;charset=utf-8'});downloadBlob(blob,`${anyFileNameBase(r)}.json`);};
  const importJson=async(file:File,target:'services'|'receipt'|'diagnosis')=>{try{const parsed=JSON.parse(await file.text());const r=normalizeAnyReport(parsed);if(r.kind!==target){setMessage(`Este JSON pertence ao módulo de ${r.kind==='receipt'?'Recebimento de Obras':'Serviços Não Vinculados'}.`);return;}await reportStorage.put(r);await refresh();setMessage('JSON importado com sucesso.');}catch(err){console.error(err);setMessage('O arquivo JSON não pôde ser importado.');}};

  const generate=async(r:AnyReport)=>{const errors=r.kind==='diagnosis'?validateDiagnosis(r):r.kind==='receipt'?validateReceipt(r):validateServices(r);if(errors.length){setMessage(`Preencha os campos obrigatórios: ${errors.slice(0,4).join(', ')}${errors.length>4?'...':''}`);return;}setBusyPdf(true);setMessage('Gerando PDF diretamente no dispositivo...');try{const stamped={...r,generatedAt:new Date().toISOString()} as AnyReport;await reportStorage.put(stamped);if(current?.id===stamped.id)setCurrent(stamped);const result=stamped.kind==='diagnosis'?await generateDiagnosisPdf(stamped):stamped.kind==='receipt'?await generateReceiptPdf(stamped):await generatePdf(stamped);setPdfResult(old=>{if(old)URL.revokeObjectURL(old.url);return result;});setMessage('PDF gerado. Use Baixar ou Compartilhar.');await refresh();}catch(err){console.error('Erro detalhado ao gerar PDF:',err);setMessage('Não foi possível gerar o PDF. Veja o console do navegador para o erro técnico.');}finally{setBusyPdf(false);}};
  const sharePdf=async()=>{if(!pdfResult)return;try{const f=new File([pdfResult.blob],pdfResult.fileName,{type:'application/pdf'});if(navigator.canShare?.({files:[f]}))await navigator.share({files:[f],title:pdfResult.fileName});else downloadBlob(pdfResult.blob,pdfResult.fileName);}catch(err){console.warn('Compartilhamento cancelado/indisponível',err)}};
  const archive=async(id:string,value:boolean)=>{const r=await reportStorage.get(id);if(!r)return;r.archivedAt=value?new Date().toISOString():null;await reportStorage.put(r);await refresh();};
  const remove=async(id:string)=>{if(window.confirm('Excluir este relatório do armazenamento local?')){await reportStorage.remove(id);await refresh();}};

  const serviceReports=reports.filter((r):r is Report=>r.kind==='services');
  const receiptReports=reports.filter((r):r is ReceiptReport=>r.kind==='receipt');
  const diagnosisReports=reports.filter((r):r is DiagnosisReport=>r.kind==='diagnosis');
  const headerTitle=screen.startsWith('diagnosis')?'Diagnóstico e Solução de Problemas Operacionais':screen.startsWith('receipt')?'Relatórios de Recebimento de Obras':screen.startsWith('services')?'Relatórios de Serviços Não Vinculados':'Relatórios Padrão';

  return <div className="app-shell">
    <header className="app-header"><div className="header-inner"><div className="brand"><img src={logo} alt="Logo"/><div><h1>{headerTitle}</h1><small>Controle local de relatórios</small></div></div><div className="storage-status">{message}</div></div></header>

    {screen==='portal'&&<Portal onServices={()=>setScreen('services-dashboard')} onReceipt={()=>setScreen('receipt-dashboard')} onDiagnosis={()=>setScreen('diagnosis-dashboard')}/>} 
    {screen==='services-dashboard'&&<Dashboard reports={serviceReports} onBack={()=>setScreen('portal')} onNew={()=>{setCurrent(newReport());setScreen('services-editor')}} onOpen={id=>void openReport(id)} onArchive={(id,a)=>void archive(id,a)} onDelete={id=>void remove(id)} onExport={id=>{const r=serviceReports.find(x=>x.id===id);if(r)exportJson(r)}} onPdf={id=>{const r=serviceReports.find(x=>x.id===id);if(r)void generate(r)}} onImport={f=>void importJson(f,'services')}/>} 
    {screen==='receipt-dashboard'&&<ReceiptDashboard reports={receiptReports} onBack={()=>setScreen('portal')} onNew={()=>{setCurrent(newReceiptReport());setScreen('receipt-editor')}} onOpen={id=>void openReport(id)} onArchive={(id,a)=>void archive(id,a)} onDelete={id=>void remove(id)} onExport={id=>{const r=receiptReports.find(x=>x.id===id);if(r)exportJson(r)}} onPdf={id=>{const r=receiptReports.find(x=>x.id===id);if(r)void generate(r)}} onImport={f=>void importJson(f,'receipt')}/>} 
    {screen==='diagnosis-dashboard'&&<DiagnosisDashboard reports={diagnosisReports} onBack={()=>setScreen('portal')} onNew={()=>{setCurrent(newDiagnosisReport());setScreen('diagnosis-editor')}} onOpen={id=>void openReport(id)} onArchive={(id,a)=>void archive(id,a)} onDelete={id=>void remove(id)} onExport={id=>{const r=diagnosisReports.find(x=>x.id===id);if(r)exportJson(r)}} onPdf={id=>{const r=diagnosisReports.find(x=>x.id===id);if(r)void generate(r)}} onImport={f=>void importJson(f,'diagnosis')}/>} 
    {screen==='services-editor'&&current?.kind==='services'&&<Editor report={normalizeReport(current)} onChange={setCurrent} onSaveBack={()=>void saveAndBack()} onPdf={()=>void generate(current)} onExport={()=>exportJson(current)} busy={busyPdf}/>} 
    {screen==='receipt-editor'&&current?.kind==='receipt'&&<ReceiptEditor report={normalizeReceiptReport(current)} onChange={setCurrent} onSaveBack={()=>void saveAndBack()} onPdf={()=>void generate(current)} onExport={()=>exportJson(current)} busy={busyPdf}/>}    {screen==='diagnosis-editor'&&current?.kind==='diagnosis'&&<DiagnosisEditor report={normalizeDiagnosisReport(current)} onChange={setCurrent} onSaveBack={()=>void saveAndBack()} onPdf={()=>void generate(current)} onExport={()=>exportJson(current)} busy={busyPdf}/>} 
 

    <footer className="developer-footer">Desenvolvido pelo Polo de Manutenção Suzano - OLMS<br/>Eng° Eder Nunes.</footer>
    {pdfResult&&<div className="modal-backdrop" onClick={()=>setPdfResult(null)}><div className="modal" onClick={e=>e.stopPropagation()}><h3>PDF gerado</h3><p>O arquivo foi criado diretamente no navegador.</p><div className="modal-actions"><button onClick={()=>downloadBlob(pdfResult.blob,pdfResult.fileName)}>Baixar PDF</button><button className="secondary" onClick={()=>void sharePdf()}>Compartilhar</button><a className="button ghost" href={pdfResult.url} target="_blank" rel="noreferrer">Abrir</a><button className="ghost" onClick={()=>setPdfResult(null)}>Fechar</button></div></div></div>}
  </div>;
}
