// Read the authored dimensions, never try to inspect a cross-origin Canva frame.
export function canvaDimensions(input:string){
  const doc=new DOMParser().parseFromString(input,'text/html'),frame=doc.querySelector('iframe');
  let ratio=0;
  const parseRatio=(value:string)=>{const parts=value.trim().split('/').map(Number);return parts.length===2?parts[0]/parts[1]:Number(value);};
  if(frame){
    for(let node:HTMLElement|null=frame;node&&node!==doc.body;node=node.parentElement){
      const aspect=node.style.aspectRatio;if(aspect){ratio=parseRatio(aspect);if(ratio>0&&Number.isFinite(ratio))break;}
      const percentage=[node.style.paddingTop,node.style.paddingBottom].find(v=>/^\d*\.?\d+%$/.test(v));
      if(percentage&&parseFloat(percentage)>0){ratio=100/parseFloat(percentage);break;}
    }
    if(!(ratio>0&&Number.isFinite(ratio))){
      const pixels=(v:string|null)=>v&&/^\d+(\.\d+)?(px)?$/.test(v)?parseFloat(v):0;
      const width=pixels(frame.getAttribute('width'))||pixels(frame.style.width),height=pixels(frame.getAttribute('height'))||pixels(frame.style.height);
      if(width&&height)ratio=width/height;
    }
  }
  return {src:frame?.getAttribute('src')||input.trim(),ratio:ratio>0&&Number.isFinite(ratio)?ratio:null};
}
function style(el:HTMLElement,key:string,value:string){if(el.style.getPropertyValue(key)!==value)el.style.setProperty(key,value);}
export function normalizeCanvaEmbeds(root:ParentNode|null){
  if(!root)return;
  root.querySelectorAll<HTMLElement>('[data-type="embed_canva"]').forEach(block=>{
    const hint=block.querySelector('.embed-placeholder p');
    const message='Pega el código completo de incrustación de Canva para conservar su proporción. Si pegas solo la URL, se usará el formato 16:9.';
    if(hint&&hint.textContent!==message)hint.textContent=message;
    const result=block.querySelector<HTMLElement>('.embed-result'),frame=result?.querySelector('iframe');if(!result||!frame)return;
    const input=block.querySelector<HTMLInputElement>('.embed-input');
    const original=canvaDimensions(input?.value||input?.getAttribute('value')||'');
    const current=canvaDimensions(result.innerHTML);
    const stored=Number(block.dataset.canvaRatio);
    const ratio=original.ratio||(stored>0&&Number.isFinite(stored)?stored:null)||current.ratio||16/9;
    if(block.dataset.canvaRatio!==String(ratio))block.dataset.canvaRatio=String(ratio);
    for(const token of ['bg-black','pt-6'])if(result.classList.contains(token))result.classList.remove(token);
    style(result,'padding','0px');style(result,'background','transparent');style(result,'width','100%');style(result,'height','auto');
    for(const token of ['aspect-[16/9]','shadow-md'])if(frame.classList.contains(token))frame.classList.remove(token);
    // Inline sizing survives LMS export without depending on generated utilities.
    const userRatio=Number(block.dataset.mediaUserRatio)>0?block.dataset.mediaUserRatio:'';
    const mediaHeight=userRatio?0:Number(block.dataset.mediaHeight||block.dataset.mediaMeasuredHeight);
    for(const [key,value] of Object.entries({width:'100%',height:mediaHeight>0?mediaHeight+'px':'auto','aspect-ratio':mediaHeight>0?'auto':userRatio||block.dataset.mediaRatio||String(ratio),display:'block',border:'0px',margin:'0px',padding:'0px',position:'relative','max-width':'100%'}))style(frame,key,value);
  });
}
export function insertCanvaEmbed(block:HTMLElement,input:string){
  const parsed=canvaDimensions(input);
  let url:URL;try{url=new URL(parsed.src);}catch{return false;}
  if(!['https:','http:'].includes(url.protocol))return false;
  url.searchParams.set('embed','');
  const frame=document.createElement('iframe');frame.src=url.href;frame.allow='fullscreen';frame.allowFullscreen=true;frame.title='Recurso de Canva';
  const result=block.querySelector<HTMLElement>('.embed-result');if(!result)return false;
  block.dataset.canvaRatio=String(parsed.ratio||16/9);
  // Persist the original responsive wrapper for later edits/reopened projects.
  const field=block.querySelector<HTMLInputElement>('.embed-input');if(field)field.setAttribute('value',input);
  result.replaceChildren(frame);block.querySelector('.embed-placeholder')?.classList.add('hidden');result.classList.remove('hidden');result.classList.add('block');
  normalizeCanvaEmbeds(block.parentElement!);return true;
}
