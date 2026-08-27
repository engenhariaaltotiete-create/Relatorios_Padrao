import { jsPDF } from 'jspdf';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import UTIF from 'utif';
import type { ReceiptReport, StoredFile } from '../types';
import { dataUrlToUint8, receiptFileNameBase } from './helpers';
import logoUrl from '../assets/sabesp-logo.jpg';

// GERADOR DO RELATÓRIO DE RECEBIMENTO DE OBRAS
// Mantém o mesmo padrão visual do Relatório de Serviços Não Vinculados.
const BLUE=[7,143,190] as const, CYAN=[17,166,204] as const, TEXT_BLUE=[7,133,177] as const;
const DARK=[47,59,68] as const, LIGHT=[240,244,246] as const, BORDER=[200,208,214] as const, NAVY=[18,65,91] as const;
const PAGE_W=210,PAGE_H=297,M=10,HEADER_BOTTOM=35,CONTENT_BOTTOM=264;
const OBJECTIVE='O presente Relatório de Recebimento de Obras tem por objetivo registrar de forma padronizada os resultados das vistorias técnicas realizadas para avaliação e recebimento de obras de infraestrutura de abastecimento de água e esgotamento sanitário, documentando os elementos inspecionados, os defeitos ou não conformidades identificados, sua classificação quanto à gravidade, os respectivos registros fotográficos e demais observações relevantes, de modo a subsidiar a aceitação dos serviços executados, a definição de eventuais ações corretivas e a formalização do recebimento da obra pela Sabesp.';
let cachedLogo:string|null=null;

async function getLogoDataUrl(){if(cachedLogo)return cachedLogo;const blob=await fetch(logoUrl).then(r=>r.blob());cachedLogo=await new Promise<string>(res=>{const rd=new FileReader();rd.onload=()=>res(String(rd.result));rd.readAsDataURL(blob)});return cachedLogo;}
function now(){return new Date().toLocaleString('pt-BR')}
function wrap(doc:jsPDF,text:unknown,width:number){return doc.splitTextToSize(String(text??''),width) as string[]}

function addHeader(doc:jsPDF,r:ReceiptReport,logo:string){
  doc.setFont('helvetica','normal');doc.setFontSize(6.6);doc.setTextColor(65,75,82);doc.text(now(),M,7.2);
  doc.setFont('helvetica','bold');doc.setFontSize(6.3);doc.setTextColor(...BLUE);
  doc.text('Desenvolvido pelo Polo de Manutenção Suzano - OLMS',PAGE_W-M,7.2,{align:'right'});
  doc.text('Eng° Eder Nunes',PAGE_W-M,10.4,{align:'right'});
  doc.addImage(logo,'JPEG',11,10,18,18,undefined,'FAST');
  doc.setTextColor(...BLUE);doc.setFont('helvetica','bold');doc.setFontSize(11.2);
  doc.text('RELATÓRIO DE RECEBIMENTO DE OBRAS',PAGE_W/2,17.2,{align:'center'});
  doc.setTextColor(...DARK);doc.setFontSize(7.8);
  const sub=[r.obra.municipio,r.obra.endereco,r.obra.tipoObra,r.obra.aguaEsgoto].filter(Boolean).join('  |  ');
  doc.text((wrap(doc,sub,166)).slice(0,2),PAGE_W/2,24.4,{align:'center'});
  doc.setDrawColor(...CYAN);doc.setLineWidth(.8);doc.line(M,32,PAGE_W-M,32);
}

function section(doc:jsPDF,title:string,y:number,right=''){
  doc.setFillColor(...BLUE);
  doc.roundedRect(M,y,PAGE_W-M*2,7.2,1.6,1.6,'F');
  doc.setTextColor(255,255,255);
  doc.setFont('helvetica','bold');
  doc.setFontSize(8.7);
  doc.text(title,M+2.3,y+4.9);
  if(right)doc.text(right,PAGE_W-M-2.3,y+4.9,{align:'right'});
  doc.setTextColor(...DARK);
  return y+9;
}

function ensure(doc:jsPDF,r:ReceiptReport,logo:string,y:number,needed=15){
  if(y+needed<=CONTENT_BOTTOM)return y;
  doc.addPage();
  addHeader(doc,r,logo);
  return HEADER_BOTTOM;
}

function infoTable(doc:jsPDF,rows:Array<[string,string]>,y:number){
  doc.setLineWidth(.1);
  const widths=[8,68,PAGE_W-2*M-76],x=M;
  rows.forEach(([label,value],i)=>{
    const lines=wrap(doc,value||'-',widths[2]-4);
    const h=Math.max(7,lines.length*3.8+3);
    doc.setDrawColor(...BORDER);
    doc.setFillColor(255,255,255);
    doc.rect(x,y,widths[0],h,'FD');
    doc.setFont('helvetica','normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...DARK);
    doc.text(String(i+1),x+widths[0]/2,y+4.7,{align:'center'});
    doc.setFillColor(...LIGHT);
    doc.rect(x+widths[0],y,widths[1],h,'FD');
    doc.setFont('helvetica','bold');
    doc.setTextColor(...TEXT_BLUE);
    doc.text(label,x+widths[0]+2,y+4.7,{maxWidth:widths[1]-4});
    doc.setFillColor(255,255,255);
    doc.rect(x+widths[0]+widths[1],y,widths[2],h,'FD');
    doc.setFont('helvetica','normal');
    doc.setTextColor(...DARK);
    doc.text(lines,x+widths[0]+widths[1]+2,y+4.7,{maxWidth:widths[2]-4});
    y+=h;
  });
  return y+3;
}

function paragraph(doc:jsPDF,text:string,y:number){
  const lines=wrap(doc,text,PAGE_W-2*M-4);
  const h=lines.length*3.8+5;
  doc.setLineWidth(.1);
  doc.setDrawColor(...BORDER);
  doc.setFillColor(255,255,255);
  doc.rect(M,y,PAGE_W-2*M,h,'FD');
  doc.setFont('helvetica','normal');
  doc.setFontSize(7.6);
  doc.setTextColor(...DARK);
  doc.text(lines,M+2,y+4.5,{maxWidth:PAGE_W-2*M-4});
  return y+h+3;
}

type Summary={item:string;elemento:string;ident:string;tipo:string;descricao:string;grau:string};

function summaryRows(r:ReceiptReport){
  const rows:Summary[]=[];
  let item=1;
  r.apontamentos.forEach(a=>a.defeitos.forEach(d=>rows.push({
    item:String(item++),
    elemento:a.elemento,
    ident:a.identificacaoElemento,
    tipo:d.tipoDefeito,
    descricao:d.descricaoDefeito,
    grau:d.grau
  })));
  return rows;
}

function severityColors(grau:string){
  const g=grau.toLowerCase();
  if(g.includes('grave'))return {fill:[255,224,224] as const,text:[160,20,20] as const};
  if(g.includes('moder'))return {fill:[255,246,204] as const,text:[120,90,0] as const};
  return {fill:[225,247,229] as const,text:[22,110,47] as const};
}

function drawSummary(doc:jsPDF,r:ReceiptReport,logo:string,startY:number){
  doc.setLineWidth(.1);
  const widths=[8,23,32,42,63,22];
  const heads=['Item','Elemento','Identificação do Elemento','Tipo de defeito','Descrição do defeito','Grau do defeito'];
  let y=startY;

  const header=()=>{
    y=ensure(doc,r,logo,y,10);
    let x=M;
    doc.setFont('helvetica','bold');
    doc.setFontSize(6.6);
    heads.forEach((h,i)=>{
      doc.setFillColor(...NAVY);
      doc.setDrawColor(...BORDER);
      doc.rect(x,y,widths[i],7.5,'FD');
      doc.setTextColor(255,255,255);
      doc.text(h,x+widths[i]/2,y+4.8,{align:'center',maxWidth:widths[i]-2});
      x+=widths[i];
    });
    doc.setTextColor(...DARK);
    y+=7.5;
  };

  header();

  summaryRows(r).forEach(row=>{
    const vals=[row.item,row.elemento,row.ident,row.tipo,row.descricao,row.grau];
    const lines=vals.map((v,i)=>wrap(doc,v,widths[i]-2.4));
    const h=Math.max(7,Math.max(...lines.map(l=>l.length))*3.7+2.5);
    const old=y;

    y=ensure(doc,r,logo,y,h+2);

    if(y!==old&&y===HEADER_BOTTOM){
      y=section(doc,'Resumo dos apontamentos - continuação',y);
      header();
    }

    let x=M;

    vals.forEach((_v,i)=>{
      const sev=i===5?severityColors(row.grau):null;

      const fill=sev?.fill||([255,255,255] as const);
      doc.setFillColor(fill[0],fill[1],fill[2]);

      doc.setDrawColor(...BORDER);
      doc.rect(x,y,widths[i],h,'FD');
      doc.setFont('helvetica',i===5?'bold':'normal');
      doc.setFontSize(6.7);

      const textColor=sev?.text||DARK;
      doc.setTextColor(textColor[0],textColor[1],textColor[2]);

      doc.text(
        lines[i],
        i===0?x+widths[i]/2:x+1.2,
        y+4.2,
        {align:i===0?'center':'left',maxWidth:widths[i]-2.4}
      );

      x+=widths[i];
    });

    y+=h;
  });

  return y+3;
}

function drawLegend(doc:jsPDF,r:ReceiptReport,logo:string,y:number){
  y=ensure(doc,r,logo,y,27);
  y=section(doc,'Legenda — Grau do defeito',y);

  const items=[
    ['Leve','Defeito de baixo impacto, podendo ser corrigido no longo prazo.'],
    ['Moderado','Defeito em estágio de evolução, podendo se tornar grave, devendo ter sua resolução programada no médio prazo.'],
    ['Grave','Defeito com risco de colapso da estrutura ou de acidente, devendo ser corrigido o mais rápido possível.']
  ];

  doc.setLineWidth(.1);

  items.forEach(([g,d])=>{
    const c=severityColors(g);
    const h=Math.max(7,wrap(doc,d,150).length*3.6+3);

    doc.setFillColor(c.fill[0], c.fill[1], c.fill[2]);
    doc.setDrawColor(...BORDER);
    doc.rect(M,y,27,h,'FD');
    doc.rect(M+27,y,PAGE_W-2*M-27,h,'FD');

    doc.setFont('helvetica','bold');
    doc.setFontSize(7);
    doc.setTextColor(c.text[0], c.text[1], c.text[2]);
    doc.text(g,M+2,y+4.6);

    doc.setFont('helvetica','normal');
    doc.setTextColor(...DARK);
    doc.text(wrap(doc,d,PAGE_W-2*M-31),M+29,y+4.6);

    y+=h;
  });

  return y+3;
}

function imageDimensions(dataUrl:string):Promise<{width:number;height:number}>{
  return new Promise((res,rej)=>{
    const img=new Image();
    img.onload=()=>res({width:img.naturalWidth,height:img.naturalHeight});
    img.onerror=rej;
    img.src=dataUrl;
  });
}

function fmt(dataUrl:string):'JPEG'|'PNG'{
  return dataUrl.startsWith('data:image/png')?'PNG':'JPEG';
}

async function addImageFit(doc:jsPDF,dataUrl:string,x:number,y:number,w:number,h:number){
  const s=await imageDimensions(dataUrl);
  const scale=Math.min(w/s.width,h/s.height);
  const dw=s.width*scale;
  const dh=s.height*scale;
  doc.addImage(dataUrl,fmt(dataUrl),x+(w-dw)/2,y+(h-dh)/2,dw,dh,undefined,'FAST');
}

async function photoCard(doc:jsPDF,p:StoredFile,x:number,y:number,w:number,imageH:number){
  doc.setDrawColor(207,215,221);
  doc.setLineWidth(.1);
  doc.roundedRect(x,y,w,imageH,1.5,1.5);

  await addImageFit(doc,p.data,x+1,y+1,w-2,imageH-2);

  let descH=0;

  if(p.descricao){
    doc.setFontSize(7.1);
    doc.setTextColor(...DARK);
    doc.setFont('helvetica','bold');
    doc.text('Descrição:',x+.5,y+imageH+4.3);

    const lw=doc.getTextWidth('Descrição: ')+1;

    doc.setFont('helvetica','normal');

    const lines=wrap(doc,p.descricao,w-lw-1.5);
    doc.text(lines,x+lw,y+imageH+4.3);

    descH=Math.max(6,lines.length*3.7+2);
  }

  return imageH+descH;
}

function drawDefectHeader(doc:jsPDF,y:number){
  doc.setLineWidth(.1);

  const widths=[48,112,30];
  const heads=['Tipo de defeito','Descrição do defeito','Grau'];

  let x=M;

  doc.setFont('helvetica','bold');
  doc.setFontSize(6.8);

  heads.forEach((h,i)=>{
    doc.setFillColor(...NAVY);
    doc.setDrawColor(...BORDER);
    doc.rect(x,y,widths[i],7,'FD');
    doc.setTextColor(255,255,255);
    doc.text(h,x+widths[i]/2,y+4.6,{align:'center',maxWidth:widths[i]-2});
    x+=widths[i];
  });

  return {y:y+7,widths};
}

function drawDefects(doc:jsPDF,r:ReceiptReport,logo:string,y:number,ai:number){
  const a=r.apontamentos[ai];

  let hd=drawDefectHeader(doc,y);
  y=hd.y;

  for(const d of a.defeitos){
    const vals=[d.tipoDefeito,d.descricaoDefeito,d.grau];
    const lines=vals.map((v,i)=>wrap(doc,v,hd.widths[i]-2.4));
    const h=Math.max(7,Math.max(...lines.map(l=>l.length))*3.7+2.5);
    const old=y;

    y=ensure(doc,r,logo,y,h+2);

    if(y!==old&&y===HEADER_BOTTOM){
      y=section(doc,`Apontamento ${String(ai+1).padStart(2,'0')} - continuação`,y);
      y=infoTable(doc,[['Elemento',a.elemento],['Identificação do Elemento',a.identificacaoElemento]],y);
      hd=drawDefectHeader(doc,y);
      y=hd.y;
    }

    let x=M;

    vals.forEach((_v,i)=>{
      const sev=i===2?severityColors(d.grau):null;

      const fill=sev?.fill||([255,255,255] as const);
      doc.setFillColor(fill[0],fill[1],fill[2]);

      doc.setDrawColor(...BORDER);
      doc.rect(x,y,hd.widths[i],h,'FD');

      doc.setFont('helvetica',i===2?'bold':'normal');
      doc.setFontSize(6.8);

      const textColor=sev?.text||DARK;
      doc.setTextColor(textColor[0],textColor[1],textColor[2]);

      doc.text(lines[i],x+1.2,y+4.2,{maxWidth:hd.widths[i]-2.4});

      x+=hd.widths[i];
    });

    y+=h;
  }

  return y;
}

async function addAppointments(doc:jsPDF,r:ReceiptReport,logo:string){
  for(let ai=0;ai<r.apontamentos.length;ai++){
    const a=r.apontamentos[ai];

    doc.addPage();
    addHeader(doc,r,logo);

    let y=section(
      doc,
      `Apontamento ${String(ai+1).padStart(2,'0')}`,
      HEADER_BOTTOM,
      `${a.fotos.length} foto(s)`
    );

    const rows:Array<[string,string]>=[
      ['Elemento',a.elemento],
      ['Identificação do Elemento',a.identificacaoElemento]
    ];

    if(a.descricaoComplementarElemento){
      rows.push(['Descrição complementar do elemento',a.descricaoComplementarElemento]);
    }

    y=infoTable(doc,rows,y);
    y=drawDefects(doc,r,logo,y,ai);
    y+=5;

    const photoW=92;
    const imageH=62;
    const colGap=6;
    const rowGap=7;

    let pi=0;

    while(pi<a.fotos.length){
      if(y+imageH+12>CONTENT_BOTTOM){
        doc.addPage();
        addHeader(doc,r,logo);
        y=section(
          doc,
          `Apontamento ${String(ai+1).padStart(2,'0')} - continuação`,
          HEADER_BOTTOM,
          `${a.fotos.length} foto(s)`
        );
      }

      const pair=a.fotos.slice(pi,pi+2);
      let rh=imageH;

      for(let p=0;p<pair.length;p++){
        const used=await photoCard(
          doc,
          pair[p],
          M+p*(photoW+colGap),
          y,
          photoW,
          imageH
        );

        rh=Math.max(rh,used);
      }

      y+=rh+rowGap;
      pi+=pair.length;
    }
  }
}

async function tiffToDataUrls(file:StoredFile){
  const bytes=dataUrlToUint8(file.data);
  const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  const ifds=UTIF.decode(buffer);
  const images:string[]=[];

  for(const ifd of ifds){
    UTIF.decodeImage(buffer,ifd);
    const rgba=UTIF.toRGBA8(ifd);

    const canvas=document.createElement('canvas');
    canvas.width=ifd.width;
    canvas.height=ifd.height;

    const ctx=canvas.getContext('2d');

    if(!ctx)continue;

    ctx.putImageData(
      new ImageData(
        new Uint8ClampedArray(rgba),
        ifd.width,
        ifd.height
      ),
      0,
      0
    );

    images.push(canvas.toDataURL('image/jpeg',.92));
  }

  return images;
}

async function addImageAttachments(doc:jsPDF,r:ReceiptReport,logo:string){
  for(let i=0;i<r.anexos.length;i++){
    const a=r.anexos[i];

    const isPdf=/pdf/i.test(a.type)||/\.pdf$/i.test(a.name);

    if(isPdf)continue;

    const pages=
      /tiff?/i.test(a.type)||/\.tiff?$/i.test(a.name)
        ? await tiffToDataUrls(a)
        : [a.data];

    for(let p=0;p<pages.length;p++){
      doc.addPage();
      addHeader(doc,r,logo);

      let y=section(
        doc,
        `Anexo ${String(i+1).padStart(2,'0')}${pages.length>1?` - Página ${p+1} de ${pages.length}`:''}`,
        HEADER_BOTTOM
      );

      if(p===0&&a.descricao){
        doc.setFontSize(7.8);
        doc.setTextColor(...DARK);
        doc.setFont('helvetica','bold');
        doc.text('Descrição:',M,y+3.8);

        const lw=doc.getTextWidth('Descrição: ')+1;

        doc.setFont('helvetica','normal');

        const lines=wrap(doc,a.descricao,PAGE_W-2*M-lw);

        doc.text(lines,M+lw,y+3.8);

        y+=Math.max(7,lines.length*3.8+3);
      }

      const h=CONTENT_BOTTOM-y-2;

      doc.setDrawColor(207,215,221);
      doc.setLineWidth(.1);
      doc.roundedRect(M,y,PAGE_W-2*M,h,1.5,1.5);

      await addImageFit(doc,pages[p],M+2,y+2,PAGE_W-2*M-4,h-4);
    }
  }
}

async function buildBase(r:ReceiptReport){
  const logo=await getLogoDataUrl();

  const doc=new jsPDF({
    unit:'mm',
    format:'a4',
    orientation:'portrait',
    compress:true
  });

  addHeader(doc,r,logo);

  let y=section(doc,'Objetivo',HEADER_BOTTOM);

  y=paragraph(doc,OBJECTIVE,y);

  y=section(doc,'Identificação do responsável pela elaboração do relatório',y);

  y=infoTable(doc,[
    ['Elaborado por',r.responsavel.elaboradoPor],
    ['Data',r.responsavel.data?new Date(`${r.responsavel.data}T12:00:00`).toLocaleDateString('pt-BR'):''],
    ['Matrícula',r.responsavel.matricula],
    ['Cargo/Função',r.responsavel.cargo],
    ['Unidade',r.responsavel.unidade]
  ],y);

  y=ensure(doc,r,logo,y,48);

  y=section(doc,'Dados da Obra',y);

  const obra:Array<[string,string]>=[
    ['Município',r.obra.municipio],
    ['Endereço',r.obra.endereco],
    ['Tipo de Serviço',r.obra.tipoObra],
    ['Água/Esgoto',r.obra.aguaEsgoto],
    ['Empresa Executora',r.obra.empresaExecutora],
    ['Contrato',r.obra.contrato]
  ];

  if(r.obra.descricaoComplementar){
    obra.push(['Descrição complementar',r.obra.descricaoComplementar]);
  }

  y=infoTable(doc,obra,y);

  y=ensure(doc,r,logo,y,25);

  y=section(doc,'Resumo dos apontamentos',y);

  y=drawSummary(doc,r,logo,y);

  y=drawLegend(doc,r,logo,y);

  if(r.observacoesGerais){
    y=ensure(doc,r,logo,y,20);
    y=section(doc,'Observações gerais da vistoria',y);
    paragraph(doc,r.observacoesGerais,y);
  }

  await addAppointments(doc,r,logo);
  await addImageAttachments(doc,r,logo);

  return doc.output('arraybuffer');
}

async function mergePdfAttachments(base:ArrayBuffer,r:ReceiptReport){
  const out=await PDFDocument.load(base);

  const font=await out.embedFont(StandardFonts.Helvetica);
  const bold=await out.embedFont(StandardFonts.HelveticaBold);

  const blue=rgb(BLUE[0]/255,BLUE[1]/255,BLUE[2]/255);
  const cyan=rgb(CYAN[0]/255,CYAN[1]/255,CYAN[2]/255);
  const dark=rgb(DARK[0]/255,DARK[1]/255,DARK[2]/255);

  const mm=72/25.4;
  const A4_W=210*mm;
  const A4_H=297*mm;
  const margin=10*mm;
  const boxTop=A4_H-46*mm;
  const boxBottom=45*mm;
  const boxW=A4_W-2*margin;
  const boxH=boxTop-boxBottom;

  for(let ai=0;ai<r.anexos.length;ai++){
    const a=r.anexos[ai];

    if(!(/pdf/i.test(a.type)||/\.pdf$/i.test(a.name))||!a.data)continue;

    try{
      const extBytes=dataUrlToUint8(a.data);

      const ext=await PDFDocument.load(extBytes);

      const embeddedPages=await out.embedPdf(
        extBytes,
        ext.getPageIndices()
      );

      embeddedPages.forEach((embedded,pi)=>{
        const page=out.addPage([A4_W,A4_H]);

        page.drawText(
          'RELATÓRIO DE RECEBIMENTO DE OBRAS',
          {
            x:A4_W/2-95,
            y:A4_H-49,
            size:10.5,
            font:bold,
            color:cyan
          }
        );

        const subtitle=[
          r.obra.municipio,
          r.obra.endereco,
          r.obra.tipoObra,
          r.obra.aguaEsgoto
        ]
          .filter(Boolean)
          .join('  |  ');

        page.drawText(
          subtitle.slice(0,105),
          {
            x:margin,
            y:A4_H-66,
            size:6.5,
            font:bold,
            color:dark
          }
        );

        page.drawLine({
          start:{x:margin,y:A4_H-78},
          end:{x:A4_W-margin,y:A4_H-78},
          thickness:1.5,
          color:cyan
        });

        page.drawRectangle({
          x:margin,
          y:A4_H-105,
          width:boxW,
          height:20,
          color:blue
        });

        page.drawText(
          `Anexo ${String(ai+1).padStart(2,'0')} - Página ${pi+1} de ${embeddedPages.length}`,
          {
            x:margin+7,
            y:A4_H-99,
            size:7.5,
            font:bold,
            color:rgb(1,1,1)
          }
        );

        page.drawRectangle({
          x:margin,
          y:boxBottom,
          width:boxW,
          height:boxH,
          borderColor:rgb(
            BORDER[0]/255,
            BORDER[1]/255,
            BORDER[2]/255
          ),
          borderWidth:.4
        });

        const scale=Math.min(
          (boxW-10)/embedded.width,
          (boxH-10)/embedded.height
        );

        const dw=embedded.width*scale;
        const dh=embedded.height*scale;

        page.drawPage(
          embedded,
          {
            x:margin+(boxW-dw)/2,
            y:boxBottom+(boxH-dh)/2,
            width:dw,
            height:dh
          }
        );

        if(pi===0&&a.descricao){
          page.drawText(
            `Descrição: ${a.descricao}`.slice(0,125),
            {
              x:margin,
              y:boxBottom-12,
              size:6.2,
              font,
              color:dark
            }
          );
        }
      });
    }catch(e){
      console.warn(`Não foi possível incorporar o anexo ${a.name}`,e);
    }
  }

  return out;
}

async function stamp(pdf:PDFDocument){
  const font=await pdf.embedFont(StandardFonts.Helvetica);

  const blue=rgb(
    CYAN[0]/255,
    CYAN[1]/255,
    CYAN[2]/255
  );

  const pages=pdf.getPages();

  pages.forEach((page,i)=>{
    const {width}=page.getSize();

    page.drawLine({
      start:{x:28,y:39},
      end:{x:width-28,y:39},
      thickness:.9,
      color:blue
    });

    [
      'Companhia de Saneamento Básico do Estado de São Paulo - Sabesp',
      'Divisão de Manutenção e Serviços Operacionais Suzano - OLMS',
      'Rua Benjamin Constant 1980 - Centro | CEP 08674-179 | Suzano - SP',
      'www.sabesp.com.br'
    ].forEach((line,idx)=>{
      page.drawText(
        line,
        {
          x:28,
          y:30-idx*6.1,
          size:5.2,
          font,
          color:blue
        }
      );
    });

    page.drawText(
      `${i+1} de ${pages.length}`,
      {
        x:width-58,
        y:13,
        size:6.2,
        font,
        color:blue
      }
    );
  });
}

export type GeneratedReceiptPdf={
  blob:Blob;
  url:string;
  fileName:string
};

export async function generateReceiptPdf(
  r:ReceiptReport
):Promise<GeneratedReceiptPdf>{
  const base=await buildBase(r);

  const merged=await mergePdfAttachments(base,r);

  await stamp(merged);

  const bytes=await merged.save({
    useObjectStreams:true
  });

  const blob=new Blob(
    [bytes as unknown as BlobPart],
    {type:'application/pdf'}
  );

  return {
    blob,
    url:URL.createObjectURL(blob),
    fileName:`${receiptFileNameBase(r,new Date())}.pdf`
  };
}
