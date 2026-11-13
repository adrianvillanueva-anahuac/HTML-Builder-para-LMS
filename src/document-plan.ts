/** Provider-independent contract. Plans can reference source blocks, never supply HTML. */
export interface SourceBlock {id:string; source:string; kind:'heading'|'text'|'table'|'image'; text:string; html:string}
export interface ExtractedDocument {name:string; blocks:SourceBlock[]; warnings:string[]}
export const layouts = ['reading','tabs','accordion','cards'] as const;
export type Layout = typeof layouts[number];
export interface DocumentPlan {layout:Layout; groups:string[][]}
export const IMPORT_LIMITS = {files:5, fileBytes:5*1024*1024, totalBytes:12*1024*1024, characters:60000, blocks:180};
export const planSchema = {type:'object',properties:{proposals:{type:'array',minItems:4,maxItems:4,items:{type:'object',properties:{layout:{type:'string',enum:[...layouts]},groups:{type:'array',minItems:1,maxItems:16,items:{type:'array',minItems:1,items:{type:'string'}}}},required:['layout','groups'],additionalProperties:false}}},required:['proposals'],additionalProperties:false};

export function validatePlans(value:unknown, ids:string[]):DocumentPlan[] {
  const proposals = (value as any)?.proposals;
  if(!Array.isArray(proposals)||proposals.length!==4)throw new Error('La respuesta debe contener cuatro propuestas.');
  const expected=new Set(ids);
  if(!expected.size || expected.size!==ids.length)throw new Error('Identificadores de origen inválidos.');
  const seenLayouts=new Set<string>();
  for(const p of proposals){
    if(!p||!layouts.includes(p.layout)||seenLayouts.has(p.layout)||!Array.isArray(p.groups)||!p.groups.length||p.groups.length>16)throw new Error('Composición no compatible con el Builder.');
    seenLayouts.add(p.layout);
    const seen=new Set<string>();
    for(const group of p.groups){
      if(!Array.isArray(group)||!group.length)throw new Error('Hay una sección vacía.');
      for(const id of group){
        if(typeof id!=='string'||!expected.has(id)||seen.has(id))throw new Error('La propuesta inventa o duplica contenido.');
        seen.add(id);
      }
    }
    if(seen.size!==expected.size)throw new Error('La propuesta omite contenido. Intenta nuevamente o usa composición local.');
  }
  return proposals.map(p=>({layout:p.layout,groups:p.groups.map((g:string[])=>[...g])}));
}

export function localPlans(blocks:SourceBlock[]):DocumentPlan[]{
  const groups:string[][]=[];
  blocks.forEach((b,i)=>{
    if(!groups.length || ((b.kind==='heading'||b.source!==blocks[i-1]?.source) && groups.length<16))groups.push([]);
    groups.at(-1)!.push(b.id);
  });
  return validatePlans({proposals:layouts.map(layout=>({layout,groups}))},blocks.map(b=>b.id));
}

export function checkExtraction(documents:ExtractedDocument[]):SourceBlock[]{
  const blocks=documents.flatMap(d=>d.blocks);
  if(!blocks.length)throw new Error('No se encontró contenido extraíble.');
  if(blocks.length>IMPORT_LIMITS.blocks||blocks.reduce((n,b)=>n+b.text.length,0)>IMPORT_LIMITS.characters)throw new Error('El contenido excede 180 bloques o 60 000 caracteres. Divide los documentos; no se recortará su contenido.');
  return blocks;
}

export function duplicateCount(blocks:SourceBlock[]):number{
  const seen=new Set<string>();let count=0;
  for(const b of blocks){const key=b.text.trim().replace(/\s+/g,' ');if(key&&seen.has(key))count++;seen.add(key);}
  return count;
}

/** RFC4180-style CSV, including quoted commas, newlines and escaped quotes. */
export function parseCSV(text:string):string[][]{
  const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
  text=text.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(ch==='"'){
      if(quoted&&text[i+1]==='"'){cell+='"';i++;}
      else if(quoted)quoted=false;
      else if(!cell)quoted=true;
      else throw new Error('CSV inválido: comilla fuera de campo.');
    }else if(ch===','&&!quoted){row.push(cell);cell='';}
    else if(ch==='\n'&&!quoted){row.push(cell);rows.push(row);row=[];cell='';}
    else cell+=ch;
  }
  if(quoted)throw new Error('CSV inválido: faltan comillas de cierre.');
  if(cell||row.length){row.push(cell);rows.push(row);}
  if(rows.length>300||rows.some(r=>r.length>30))throw new Error('CSV: máximo 300 filas y 30 columnas.');
  return rows;
}
