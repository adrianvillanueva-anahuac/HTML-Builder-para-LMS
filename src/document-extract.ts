import {marked} from 'marked';
import {unzipSync} from 'fflate';
import {escapeHtml} from './html-sanitize';
import {IMPORT_LIMITS,parseCSV,type ExtractedDocument,type SourceBlock} from './document-plan';

// Rebuild an inert tree from a narrow allowlist: no imported attributes or active HTML.
export function cleanDocumentHTML(html:string,warnings:string[]):HTMLElement{
  const template=document.createElement('template');template.innerHTML=html;
  const output=document.createElement('div');let imageBytes=0;
  const allowed=new Set('p h1 h2 h3 h4 h5 h6 strong b em i u s ul ol li table thead tbody tr th td blockquote pre code br a'.split(' '));
  const copy=(node:Node,parent:Node)=>{
    if(node.nodeType===Node.TEXT_NODE){parent.appendChild(document.createTextNode(node.textContent||''));return;}
    if(!(node instanceof HTMLElement))return;
    const tag=node.tagName.toLowerCase();
    if(['script','style','iframe','object','embed','svg','math','form','input','button'].includes(tag)){warnings.push('Se omitió contenido activo o no compatible.');return;}
    if(tag==='img'){
      const src=node.getAttribute('src')||'';
      if(/^data:image\/(png|jpeg|gif);base64,[A-Za-z0-9+/=]+$/.test(src)&&src.length<=2*1024*1024&&(imageBytes+=src.length)<=6*1024*1024){
        const img=document.createElement('img');img.src=src;img.alt=node.getAttribute('alt')||'Imagen del documento';img.style.maxWidth='100%';img.style.height='auto';parent.appendChild(img);
      }else{warnings.push('Imagen externa, incompatible o demasiado grande omitida; agrega la imagen manualmente.');const p=document.createElement('p');p.textContent=`[Imagen no importada: ${node.getAttribute('alt')||'sin descripción'}]`;parent.appendChild(p);}
      return;
    }
    const target=allowed.has(tag)?document.createElement(tag):document.createElement('span');
    if(tag==='a'){
      const href=node.getAttribute('href')||'';
      if(/^(https?:\/\/|mailto:)/i.test(href)){target.setAttribute('href',href);target.setAttribute('rel','noopener noreferrer');}
    }
    if(tag==='td'||tag==='th')for(const attr of ['colspan','rowspan']){const n=Number(node.getAttribute(attr));if(n>1&&n<=30)target.setAttribute(attr,String(n));}
    for(const child of node.childNodes)copy(child,target);
    parent.appendChild(target);
  };
  for(const child of template.content.childNodes)copy(child,output);
  return output;
}

export async function extractDocument(file:File,index:number):Promise<ExtractedDocument>{
  if(!file.size||file.size>IMPORT_LIMITS.fileBytes)throw new Error(`${file.name}: archivo vacío o mayor de 5 MB.`);
  const ext=file.name.split('.').pop()?.toLowerCase();
  if(!['docx','md','markdown','txt','csv'].includes(ext||''))throw new Error(`${file.name}: formato no compatible. Usa DOCX, Markdown, TXT o CSV.`);
  const warnings:string[]=[];let html='';
  if(ext==='docx'){
    const buffer=await file.arrayBuffer();const bytes=new Uint8Array(buffer);
    if(bytes[0]!==80||bytes[1]!==75)throw new Error(`${file.name}: no es un DOCX válido.`);
    let expanded=0,entries=0,hasDocument=false;
    unzipSync(bytes,{filter(entry){expanded+=entry.originalSize;entries++;if(entry.name==='word/document.xml')hasDocument=true;if(expanded>20*1024*1024||entries>1500)throw new Error('DOCX demasiado complejo o expandido (máximo 20 MB).');return false;}});
    if(!hasDocument)throw new Error(`${file.name}: no contiene un documento Word válido.`);
    const mammoth=await import('mammoth');
    const result=await mammoth.convertToHtml({arrayBuffer:buffer},{externalFileAccess:false,convertImage:mammoth.images.imgElement(async image=>{
      if(!['image/png','image/jpeg','image/gif'].includes(image.contentType)){warnings.push('Una imagen de Word no es compatible.');return {src:'',alt:'Imagen no compatible'};}
      return {src:`data:${image.contentType};base64,${await image.read('base64')}`};
    })});
    html=result.value;
    if(result.messages.length)warnings.push(`${result.messages.length} avisos de conversión de Word; revisa el contenido extraído.`);
    warnings.push('Word: se conserva contenido semántico, no la maquetación. Revisa cuadros de texto, gráficos, encabezados y notas.');
  }else{
    let text:string;
    try{text=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());}catch{throw new Error(`${file.name}: guarda el texto con codificación UTF-8.`);}
    if(text.includes('\0'))throw new Error(`${file.name}: parece un archivo binario.`);
    if(text.length>IMPORT_LIMITS.characters)throw new Error(`${file.name}: supera 60 000 caracteres.`);
    if(ext==='md'||ext==='markdown')html=await marked.parse(text);
    else if(ext==='csv')html='<table><tbody>'+parseCSV(text).map(row=>'<tr>'+row.map(cell=>`<td>${escapeHtml(cell)}</td>`).join('')+'</tr>').join('')+'</tbody></table>';
    else html=text.split(/\r?\n\s*\r?\n/).filter(s=>s.trim()).map(p=>`<p>${escapeHtml(p).replace(/\r?\n/g,'<br>')}</p>`).join('');
  }
  const safe=cleanDocumentHTML(html,warnings);
  const blocks:SourceBlock[]=[];
  for(const node of Array.from(safe.childNodes)){
    if(!node.textContent?.trim()&&!(node instanceof Element&&node.querySelector('img'))&&!(node instanceof HTMLImageElement))continue;
    const el=node instanceof HTMLElement?node:document.createElement('p');if(el!==node)el.textContent=node.textContent;
    const kind:SourceBlock['kind']=/^H[1-6]$/.test(el.tagName)?'heading':el.tagName==='TABLE'?'table':el.tagName==='IMG'?'image':'text';
    blocks.push({id:`d${index}b${blocks.length}`,source:file.name,kind,text:el.textContent?.trim()||el.querySelector('img')?.alt||(el as HTMLImageElement).alt||'Imagen',html:el.outerHTML});
  }
  if(!blocks.length)throw new Error(`${file.name}: no se pudo extraer contenido.`);
  return {name:file.name,blocks,warnings:[...new Set(warnings)]};
}
