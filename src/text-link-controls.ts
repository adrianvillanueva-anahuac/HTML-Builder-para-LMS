import './text-link-controls.css';

const palette=[['#ff5900','Naranja'],['#5d428c','Morado'],['#ffffff','Blanco'],['#646464','Gris']];
const fonts=[['Zilla','"Zilla Slab", serif'],['Roboto','Roboto, sans-serif'],['Lato','Lato, sans-serif']];
const elementAt=(node:Node)=>node instanceof Element?node:node.parentElement;

export function normalizeTextLinkURL(value:string):string|null {
  const raw=value.trim();if(!raw)return null;
  if(raw.startsWith('#'))return raw;
  try {
    const url=new URL(/^[a-z][a-z\d+.-]*:/i.test(raw)?raw:'https://'+raw);
    return ['https:','http:','mailto:','tel:'].includes(url.protocol)?url.href:null;
  } catch {return null;}
}

export function contrastingLinkColor(node:Element):string {
  const layers:number[][]=[];
  const pixel=node.ownerDocument.createElement('canvas');pixel.width=pixel.height=1;
  const context=pixel.getContext('2d',{willReadFrequently:true});
  for(let current:Element|null=node;current;current=current.parentElement){
    const bg=getComputedStyle(current).backgroundColor;
    // The temporary orange editing aid is not the published background.
    if(current.matches('.editable-text[contenteditable="true"]')&&bg==='rgb(243, 160, 119)'&&!((current as HTMLElement).style.backgroundColor))continue;
    let values:number[]|undefined;
    if(context){context.clearRect(0,0,1,1);context.fillStyle=bg;context.fillRect(0,0,1,1);const rgba=context.getImageData(0,0,1,1).data;values=[rgba[0],rgba[1],rgba[2],rgba[3]/255];}
    else if(bg.startsWith('rgb'))values=bg.match(/[\d.]+/g)?.map(Number);
    if(!values)continue;
    const alpha=values[3]??1;if(alpha<=0)continue;
    layers.push([values[0],values[1],values[2],alpha]);if(alpha>=1)break;
  }
  let bg=[255,255,255];
  layers.reverse().forEach(([r,g,b,a])=>{bg=[r,g,b].map((channel,i)=>channel*a+bg[i]*(1-a));});
  const luminance=(rgb:number[])=>rgb.map(c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;}).reduce((v,c,i)=>v+c*[.2126,.7152,.0722][i],0);
  const base=luminance(bg);
  const ranked=palette.map(([color])=>{
    const light=luminance([1,3,5].map(i=>parseInt(color.slice(i,i+2),16)));
    return {color,contrast:(Math.max(base,light)+.05)/(Math.min(base,light)+.05)};
  });
  return ranked.find(c=>c.contrast>=4.5)?.color||ranked.sort((a,b)=>b.contrast-a.contrast)[0].color;
}

function styleLink(link:HTMLAnchorElement,color:string,font?:string){
  link.style.color=color;link.style.fontWeight='700';link.style.textDecoration='underline';
  link.style.textUnderlineOffset='2px';if(font)link.style.fontFamily=font;
  link.target='_blank';link.rel='noopener noreferrer';
  link.querySelectorAll<HTMLElement>('*').forEach(child=>{
    child.style.color='inherit';child.style.fontWeight='inherit';
    if(font)child.style.fontFamily='inherit';
  });
}

function commit(editor:HTMLElement,change:()=>void){
  window.saveHistoryState(true);change();editor.dispatchEvent(new Event('input',{bubbles:true}));window.saveHistoryState(true);
}

export function openTextLinkDialog(existing?:HTMLAnchorElement){
  if(document.querySelector('.text-link-dialog'))return;
  const selection=window.getSelection();
  const live=selection?.rangeCount?selection.getRangeAt(0):null;
  const editor:HTMLElement|null=existing?.closest<HTMLElement>('.editable-text')||window.currentEditableText;
  if(!editor?.isConnected)return;
  const inEditor=(range:Range|null|undefined)=>!!range&&editor.contains(range.startContainer)&&editor.contains(range.endContainer);
  const saved=inEditor(live)&&!live!.collapsed?live!.cloneRange():inEditor(window.lastKnownRange)?window.lastKnownRange!.cloneRange():null;
  const enclosing=saved?elementAt(saved.startContainer)?.closest<HTMLAnchorElement>('a'):null;
  if(!existing&&enclosing&&saved&&enclosing.contains(saved.endContainer))existing=enclosing;
  if(!existing&&(!saved||saved.collapsed)){
    window.showToast('Selecciona el texto al que deseas agregar un hipervínculo.');return;
  }
  // Capture the authored font and background before the dialog takes focus.
  const start=existing||elementAt(saved!.startContainer)||editor;
  const font=getComputedStyle(start).fontFamily;
  const color=contrastingLinkColor(start);
  const dialog=document.createElement('dialog');dialog.className='exercise-settings project-prompt text-link-dialog';
  dialog.setAttribute('aria-label',existing?'Reemplazar hipervínculo':'Agregar hipervínculo');
  dialog.innerHTML='<form method="dialog"><h2>'+(existing?'Reemplazar hipervínculo':'Agregar hipervínculo')+'</h2><label>Dirección del enlace<input name="url" type="text" required placeholder="https://..." aria-label="Dirección del enlace" autocomplete="off"></label><p class="text-link-error" role="alert"></p><div class="exercise-dialog-actions"><button value="cancel" formnovalidate>Cancelar</button><button value="ok">Aceptar</button></div></form>';
  const input=dialog.querySelector<HTMLInputElement>('input')!;input.value=existing?.getAttribute('href')||'';
  input.oninput=()=>input.setCustomValidity('');
  let href:string|null=null;
  dialog.querySelector('form')!.onsubmit=event=>{
    if((event as SubmitEvent).submitter?.getAttribute('value')!=='ok')return;
    href=normalizeTextLinkURL(input.value);
    if(!href){event.preventDefault();input.setCustomValidity('Pega una dirección web válida, un correo mailto: o un teléfono tel:.');input.reportValidity();}
  };
  dialog.addEventListener('close',()=>{
    dialog.remove();
    if(!editor.isConnected)return;
    editor.contentEditable='true';window.currentEditableText=editor;editor.focus();
    const restore=()=>{if(saved&&inEditor(saved)){selection?.removeAllRanges();selection?.addRange(saved);window.lastKnownRange=saved.cloneRange();}};
    if(dialog.returnValue!=='ok'||!href){restore();return;}
    if(existing){
      if(!editor.contains(existing))return;
      commit(editor,()=>{existing!.href=href!;if(!existing!.style.fontWeight)styleLink(existing!,color,font);});
    }else{
      if(!saved||!inEditor(saved))return;
      commit(editor,()=>{
        restore();
        const before=new Set(editor.querySelectorAll('a'));
        document.execCommand('createLink',false,href!);
        const result=window.getSelection();const range=result?.rangeCount?result.getRangeAt(0):saved;
        editor.querySelectorAll<HTMLAnchorElement>('a').forEach(link=>{
          if(!before.has(link)||(link.getAttribute('href')===href&&range.intersectsNode(link)))styleLink(link,color,font);
        });
        if(result?.rangeCount)window.lastKnownRange=result.getRangeAt(0).cloneRange();
      });
    }
  },{once:true});
  document.body.append(dialog);dialog.showModal();input.focus();input.select();
}

export function setupTextLinkControls(){
  const canvas=document.getElementById('canvas-container-outer');if(!canvas)return;
  const tools=document.createElement('div');tools.id='text-link-tools';tools.className='text-link-tools';tools.hidden=true;
  tools.setAttribute('role','toolbar');tools.setAttribute('aria-label','Opciones del hipervínculo');
  tools.innerHTML='<div class="text-link-actions"><button type="button" data-link-edit title="Reemplazar hipervínculo" aria-label="Reemplazar hipervínculo"><span class="material-symbols-outlined" aria-hidden="true">edit</span></button><button type="button" data-link-remove title="Quitar hipervínculo y conservar el texto" aria-label="Quitar hipervínculo"><span class="material-symbols-outlined" aria-hidden="true">link_off</span></button></div><div class="text-link-fonts" role="group" aria-label="Fuente del enlace">'+fonts.map(([label,font],i)=>'<button type="button" data-link-font="'+i+'" style="font-family:'+font.replaceAll('"',"'")+'" aria-label="Fuente '+label+'">'+label+'</button>').join('')+'</div><div class="text-link-colors" role="group" aria-label="Color del enlace">'+palette.map(([color,name])=>'<button type="button" data-link-color="'+color+'" style="background:'+color+'" title="'+name+'" aria-label="Enlace: '+name+'"></button>').join('')+'</div>';
  document.body.append(tools);
  let active:HTMLAnchorElement|null=null;let timer:ReturnType<typeof setTimeout>|undefined;
  const hide=()=>{clearTimeout(timer);tools.hidden=true;active=null;};
  const position=()=>{
    if(!active?.isConnected||!canvas.contains(active)){hide();return;}
    const r=active.getBoundingClientRect();
    if(r.bottom<0||r.top>innerHeight){hide();return;}
    const width=tools.offsetWidth,height=tools.offsetHeight;
    const left=Math.max(8,Math.min(innerWidth-width-8,r.left+r.width/2-width/2));
    let top=r.top-height-6;
    const rtf=document.getElementById('rtf-toolbar');const other=rtf&&!rtf.classList.contains('hidden')?rtf.getBoundingClientRect():null;
    if(top<8||(other&&left<other.right&&left+width>other.left&&top<other.bottom&&top+height>other.top))top=r.bottom+6;
    tools.style.left=left+'px';tools.style.top=Math.max(8,Math.min(innerHeight-height-8,top))+'px';
  };
  const show=(link:HTMLAnchorElement)=>{clearTimeout(timer);active=link;tools.hidden=false;position();};
  const scheduleHide=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(!tools.contains(document.activeElement))hide();},250);};
  const find=(target:EventTarget|null)=>{
    const link=target instanceof Element?target.closest<HTMLAnchorElement>('.editable-text a[href]'):null;
    return link&&canvas.contains(link)?link:null;
  };
  const over=(event:PointerEvent)=>{const link=find(event.target);if(link)show(link);};
  const out=(event:PointerEvent)=>{
    if(active?.contains(event.target as Node)&&!active.contains(event.relatedTarget as Node)&&!tools.contains(event.relatedTarget as Node))scheduleHide();
  };
  const focus=(event:FocusEvent)=>{const link=find(event.target);if(link)show(link);};
  const click=(event:MouseEvent)=>{
    const link=find(event.target);if(link){event.preventDefault();show(link);}
    else if(!tools.contains(event.target as Node)&&!(event.target as Element)?.closest('.text-link-dialog'))hide();
  };
  tools.onpointerenter=()=>clearTimeout(timer);tools.onpointerleave=scheduleHide;
  tools.onmousedown=event=>event.preventDefault();
  tools.onclick=event=>{
    const target=(event.target as Element).closest<HTMLButtonElement>('button');if(!target||!active?.isConnected)return;
    event.preventDefault();event.stopPropagation();const link=active,editor=link.closest<HTMLElement>('.editable-text')!;
    if(target.hasAttribute('data-link-edit')){hide();openTextLinkDialog(link);return;}
    if(target.hasAttribute('data-link-remove')){
      commit(editor,()=>{const span=document.createElement('span');if(link.style.fontFamily)span.style.fontFamily=link.style.fontFamily;span.append(...link.childNodes);link.replaceWith(span);});hide();return;
    }
    if(target.dataset.linkFont!==undefined){
      commit(editor,()=>{link.style.fontFamily=fonts[Number(target.dataset.linkFont)][1];link.querySelectorAll<HTMLElement>('*').forEach(child=>child.style.fontFamily='inherit');});
    }
    if(target.dataset.linkColor)commit(editor,()=>styleLink(link,target.dataset.linkColor!));
    position();
  };
  const key=(event:KeyboardEvent)=>{if(event.key==='Escape')hide();};
  const observer=new MutationObserver(()=>{if(active&&!active.isConnected)hide();});observer.observe(canvas,{childList:true,subtree:true});
  canvas.addEventListener('pointerover',over);canvas.addEventListener('pointerout',out);canvas.addEventListener('focusin',focus);
  document.addEventListener('click',click,true);document.addEventListener('keydown',key);
  window.addEventListener('scroll',position,true);window.addEventListener('resize',position);
  return ()=>{hide();tools.remove();observer.disconnect();canvas.removeEventListener('pointerover',over);canvas.removeEventListener('pointerout',out);canvas.removeEventListener('focusin',focus);document.removeEventListener('click',click,true);document.removeEventListener('keydown',key);window.removeEventListener('scroll',position,true);window.removeEventListener('resize',position);};
}
