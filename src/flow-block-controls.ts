import {normalizeFlowModel,flowBackgroundHasColor,type FlowModel} from './flow-model';

type Menu='crop'|'radius'|'opacity';
type Hooks={read:(block:HTMLElement)=>FlowModel;write:(block:HTMLElement,model:FlowModel)=>void};
const menus=[['crop','crop','Recortar al contenido del diagrama'],['radius','rounded_corner','Redondeo del fondo del diagrama'],['opacity','opacity','Transparencia del fondo del diagrama']]as const;
export function flowBlockControlsHTML():string{
 return menus.map(([key,icon,label])=>`<button type="button" class="flow-block-control text-gray-400 hover:text-anahuac-purple p-1 rounded hover:bg-purple-50 flex items-center justify-center" data-flow-presentation="${key}" title="${label}" aria-label="${label}" aria-haspopup="dialog"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">${icon}</span></button>`).join('');
}
/** Presentation lives on the diagram, never on figure/connector opacity. */
export function flowPresentationChange(model:FlowModel,key:string,value:number|boolean):FlowModel{
 const patch=key==='backgroundTransparency'?{backgroundOpacity:1-Math.max(0,Math.min(100,Number(value)))/100}:['autoCrop','cropMarginX','cropMarginY','backgroundRadius'].includes(key)?{[key]:value}:{};
 return normalizeFlowModel({...model,...patch});
}
export function setupFlowBlockControls(hooks:Hooks){
 let active:{block:HTMLElement;trigger:HTMLButtonElement;menu:Menu}|null=null,panel:HTMLDivElement|null=null,changing=false,restoringFocus=false,hideTimer:ReturnType<typeof setTimeout>|undefined;
 const keep=()=>{clearTimeout(hideTimer);hideTimer=undefined;};
 const schedule=()=>{keep();hideTimer=setTimeout(()=>{if(changing)return;close();},300);};
 const finish=()=>{if(!changing)return;changing=false;window.modularResizing=false;if(active?.block.isConnected)window.saveHistoryState?.(true);};
 function close(focus=false){keep();finish();const trigger=active?.trigger;active?.trigger.setAttribute('aria-expanded','false');active=null;panel?.remove();panel=null;if(focus&&trigger?.isConnected){restoringFocus=true;try{trigger.focus();}finally{restoringFocus=false;}}}
 function position(){
  if(!active||!panel)return;
  if(!active.block.isConnected||!active.trigger.isConnected){close();return;}
  const rect=active.trigger.getBoundingClientRect();
  if(rect.bottom<0||rect.top>innerHeight||rect.right<0||rect.left>innerWidth){close();return;}
  const left=Math.max(12,Math.min(rect.left,innerWidth-panel.offsetWidth-12));
  const top=rect.bottom+8+panel.offsetHeight<=innerHeight-12?rect.bottom+8:Math.max(12,rect.top-panel.offsetHeight-8);
  panel.style.left=`${left}px`;panel.style.top=`${top}px`;
 }
 function sync(block:HTMLElement,model:FlowModel){
  if(!panel||active?.block!==block)return;
  for(const input of panel.querySelectorAll<HTMLInputElement>('[data-flow-field]')){
   const key=input.dataset.flowField!;
   if(key==='cropMarginX'||key==='cropMarginY')input.max=String(key==='cropMarginX'?model.width:model.height);
   if(key==='autoCrop')input.checked=model.autoCrop;
   else input.value=String(key==='backgroundTransparency'?Math.round((1-model.backgroundOpacity)*100):model[key as 'cropMarginX'|'cropMarginY'|'backgroundRadius']);
   input.disabled=key==='cropMarginX'||key==='cropMarginY'?!model.autoCrop:key==='backgroundRadius'||key==='backgroundTransparency'?!flowBackgroundHasColor(model.background):false;
   const output=input.closest('label')?.querySelector('output');if(output)output.textContent=input.value+(key==='backgroundTransparency'?' %':' px');
  }
  const note=panel.querySelector<HTMLElement>('[data-transparent-note]');if(note)note.hidden=flowBackgroundHasColor(model.background);
  position();
 }
 function start(){if(changing||!active)return;window.saveHistoryState?.(true);changing=true;window.modularResizing=true;}
 function apply(input:HTMLInputElement){
  if(!active||input.disabled)return;const model=hooks.read(active.block),next=flowPresentationChange(model,input.dataset.flowField!,input.type==='checkbox'?input.checked:Number(input.value));
  if(JSON.stringify(next)===JSON.stringify(model))return;
  start();hooks.write(active.block,next);sync(active.block,next);
 }
 const range=(key:string,label:string,max:number)=>`<label class="flow-block-field"><span>${label}<output></output></span><input type="range" min="0" max="${max}" step="1" data-flow-field="${key}" aria-label="${label}"></label>`;
 function open(block:HTMLElement,trigger:HTMLButtonElement,menu:Menu,focus=false){
  keep();if(active?.trigger===trigger){if(focus)panel?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus({preventScroll:true});return;}close();active={block,trigger,menu};trigger.setAttribute('aria-expanded','true');
  panel=document.createElement('div');panel.className='flow-block-popover';panel.setAttribute('role','dialog');panel.setAttribute('aria-label',trigger.getAttribute('aria-label')!);
  const title=menu==='crop'?'Recorte del diagrama':menu==='radius'?'Redondeo del fondo':'Transparencia del fondo';
  panel.innerHTML=`<div class="flow-block-panel-heading"><strong>${title}</strong></div>`+(menu==='crop'?`<label class="flow-block-check"><input type="checkbox" data-flow-field="autoCrop">Recortar al contenido del diagrama</label>${range('cropMarginX','Margen horizontal (px)',200)}${range('cropMarginY','Margen vertical (px)',200)}<p>Los márgenes se aplican a ambos lados de cada eje. Las figuras conservan su posición.</p>`:menu==='radius'?`${range('backgroundRadius','Redondeo del fondo (px)',200)}<p>Redondea solo el fondo, sin recortar las figuras.</p><p data-transparent-note>El fondo es transparente. Elige un color en el editor para aplicar redondeo.</p>`:`${range('backgroundTransparency','Transparencia del fondo (%)',100)}<p>0 %: fondo opaco. 100 %: fondo invisible. Las figuras y conexiones conservan su opacidad.</p><p data-transparent-note>El fondo ya es transparente. Elige un color en el editor para graduar su transparencia.</p>`);
  document.body.append(panel);sync(block,hooks.read(block));
  panel.addEventListener('input',event=>{const input=event.target;if(input instanceof HTMLInputElement&&input.dataset.flowField)apply(input);});
  panel.addEventListener('change',event=>{const input=event.target;if(input instanceof HTMLInputElement&&input.dataset.flowField){apply(input);finish();}});
  panel.addEventListener('pointerdown',event=>{if((event.target as Element).matches('input[type="range"]:not(:disabled)'))start();});
  panel.addEventListener('pointerup',finish);panel.addEventListener('pointercancel',finish);panel.addEventListener('focusout',finish);
  panel.addEventListener('pointerenter',keep);panel.addEventListener('pointerleave',schedule);
  panel.addEventListener('focusin',keep);panel.addEventListener('focusout',()=>{queueMicrotask(()=>{if(panel&&!panel.contains(document.activeElement)&&!active?.trigger.contains(document.activeElement))schedule();});});
  panel.addEventListener('keydown',event=>{
   if(event.key==='Escape'){event.preventDefault();close(true);}
   else if((event.ctrlKey||event.metaKey)&&['z','y'].includes(event.key.toLowerCase())){event.preventDefault();const redo=event.key.toLowerCase()==='y'||event.shiftKey;close();if(redo)window.redo?.();else window.undo?.();}
  });
  for(const type of ['click','dblclick','pointerdown','pointerup','pointermove','mousedown','mouseup','input','change','keydown'])panel.addEventListener(type,event=>event.stopPropagation());
  if(focus)panel.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus({preventScroll:true});
 }
 document.addEventListener('click',event=>{
  const trigger=(event.target as Element).closest?.<HTMLButtonElement>('[data-flow-presentation]'),block=trigger?.closest<HTMLElement>('[data-type="diagrama_flujo"]');
  if(!trigger||!block)return;event.preventDefault();open(block,trigger,trigger.dataset.flowPresentation as Menu,true);
 });
 document.addEventListener('pointerover',event=>{if(event.pointerType==='touch')return;const trigger=(event.target as Element).closest?.<HTMLButtonElement>('[data-flow-presentation]'),block=trigger?.closest<HTMLElement>('[data-type="diagrama_flujo"]');if(trigger&&block)open(block,trigger,trigger.dataset.flowPresentation as Menu);});
 document.addEventListener('pointerout',event=>{if(active?.trigger.contains(event.target as Node)&&!active.trigger.contains(event.relatedTarget as Node))schedule();});
 document.addEventListener('focusin',event=>{if(restoringFocus)return;const trigger=(event.target as Element).closest?.<HTMLButtonElement>('[data-flow-presentation]'),block=trigger?.closest<HTMLElement>('[data-type="diagrama_flujo"]');if(trigger&&block)open(block,trigger,trigger.dataset.flowPresentation as Menu);});
 document.addEventListener('focusout',event=>{if(active?.trigger.contains(event.target as Node)&&!panel?.contains(event.relatedTarget as Node))schedule();});
 document.addEventListener('pointerup',()=>{finish();if(panel&&!panel.matches(':hover')&&!active?.trigger.matches(':hover'))schedule();},true);
 const outside=(event:Event)=>{if(active&&!panel?.contains(event.target as Node)&&!active.trigger.contains(event.target as Node))close();};
 document.addEventListener('pointerdown',outside,true);document.addEventListener('click',outside,true);
 document.addEventListener('keydown',event=>{if(active&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close(true);}},true);
 document.addEventListener('scroll',position,true);window.addEventListener('resize',position);window.addEventListener('blur',()=>close());
 const observer=new MutationObserver(()=>{if(active&&!active.block.isConnected)close();});observer.observe(document.getElementById('canvas-container-outer')||document.body,{childList:true,subtree:true});
 return {close,sync};
}
