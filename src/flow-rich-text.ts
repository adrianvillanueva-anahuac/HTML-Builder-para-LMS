import type {FlowNode} from './flow-model';
import {flowTextLink,normalizeFlowTextRuns,type FlowTextRun} from './flow-image-text';
import {flowNodeTextBox,flowNodeTextState} from './flow-node-text';
import {borrowBuilderTextTools,builderTextToolTarget} from './builder-text-tools';
import {flowRichCSS,flowRichHTML,flowRichNeedsHTML,readFlowRichDocument,type FlowRichNode} from './flow-rich-document';
const color=(value:string)=>{if(/^#[a-f\d]{3}(?:[a-f\d]{3})?$/i.test(value))return value;const m=value.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);return m?'#'+m.slice(1).map(v=>Math.max(0,Math.min(255,Number(v))).toString(16).padStart(2,'0')).join(''):'';};
/** Legacy vector runs remain useful for plain text and existing diagrams. */
export function readFlowRichText(root:HTMLElement):FlowTextRun[]{
 const runs:Partial<FlowTextRun>[]=[];
 const walk=(node:Node,state:Partial<FlowTextRun>)=>{
  if(node.nodeType===Node.TEXT_NODE){runs.push({...state,text:node.textContent||''});return;}
  if(!(node instanceof HTMLElement)||['SCRIPT','STYLE','IFRAME','OBJECT','IMG'].includes(node.tagName))return;
  const tag=node.tagName,next={...state},s=node.style;
  if(['B','STRONG'].includes(tag)||['bold','700'].includes(s.fontWeight))next.bold=true;if(['I','EM'].includes(tag)||s.fontStyle==='italic')next.italic=true;if(tag==='U'||s.textDecoration.includes('underline'))next.underline=true;
  if(['normal','400'].includes(s.fontWeight))next.bold=false;if(s.fontStyle==='normal')next.italic=false;if(s.textDecoration==='none')next.underline=false;
  const face=(node.getAttribute('face')||s.fontFamily).replace(/["']/g,'').split(',')[0].trim();if(['Roboto','Zilla Slab','Lato'].includes(face))next.font=face as FlowTextRun['font'];
  const chosen=color(node.getAttribute('color')||s.color);if(chosen)next.color=chosen;if(tag==='A')next.href=flowTextLink(node.getAttribute('href'));
  const block=['DIV','P','LI'].includes(tag);if(block&&runs.length&&!runs.at(-1)!.text?.endsWith('\n'))runs.push({...next,text:'\n'});
  if(tag==='LI')runs.push({...next,text:node.parentElement?.tagName==='OL'?`${Array.from(node.parentElement.children).indexOf(node)+1}. `:'• '});
  if(tag==='BR')runs.push({...next,text:'\n'});else node.childNodes.forEach(child=>walk(child,next));if(block)runs.push({...next,text:'\n'});
 };
 root.childNodes.forEach(child=>walk(child,{}));while(runs.at(-1)?.text==='\n')runs.pop();return normalizeFlowTextRuns(runs);
}
type TextRect=ReturnType<typeof flowNodeTextBox>;
type Hooks={node:(id:string,boxId:string)=>FlowNode|undefined;change:(id:string,runs:FlowTextRun[],align?:'left'|'center'|'right',size?:number,rich?:FlowRichNode,height?:number,boxId?:string)=>void;layout:(id:string,boxId:string,start:TextRect,handle:string,dx:number,dy:number)=>void;add:(id:string)=>void;remove:(id:string,boxId:string)=>void;done:(before:string)=>void;surface:HTMLElement;zoom:()=>number;snapshot:()=>string;redraw:()=>void};
export function createFlowRichText(dialog:HTMLDialogElement,hooks:Hooks){
 let active:{id:string;boxId:string;before:string;box:HTMLElement;editable:HTMLElement;toolbar:HTMLElement;release:()=>void;observer:MutationObserver;dirty:boolean;initialHTML:string}|null=null;
 const ended=(event:Event)=>{if(active?.editable===(event as CustomEvent<HTMLElement>).detail)finish();};document.addEventListener('builder-text-editing-ended',ended);
 const update=()=>{if(!active)return;active.dirty=true;const {editable,id,boxId,observer}=active,doc=readFlowRichDocument(editable),align=editable.style.textAlign;if(doc.style){delete doc.style.color;delete doc.style['font-size'];delete doc.style['text-align'];}hooks.change(id,readFlowRichText(editable),align==='left'||align==='right'?align:'center',parseFloat(editable.style.fontSize)||undefined,flowRichNeedsHTML(doc)?doc:undefined,Math.ceil(editable.scrollHeight/.76+2),boxId);hooks.redraw();observer.takeRecords();};
 function finish(){if(!active)return;const session=active;if(session.dirty||session.editable.innerHTML!==session.initialHTML)update();active=null;session.observer.disconnect();session.toolbar.classList.add('hidden');document.getElementById('image-toolbar')?.classList.add('hidden');document.getElementById('icon-modal')?.classList.add('hidden');if(window.currentEditableText===session.editable){window.currentEditableText=null;window.lastKnownRange=null;}window.selectedEditorialImage=null;window.currentInlineIcon=null;window.currentIconTarget=null;session.box.remove();session.release();hooks.done(session.before);hooks.redraw();}
 function sync(){
  if(!active)return;const node=hooks.node(active.id,active.boxId);if(!node){finish();return;}
  const rect=hooks.surface.getBoundingClientRect(),outer=dialog.getBoundingClientRect(),box=flowNodeTextBox(node),zoom=hooks.zoom();
  Object.assign(active.box.style,{left:`${rect.left-outer.left+(node.x+box.x)*zoom}px`,top:`${rect.top-outer.top+(node.y+box.y)*zoom}px`,width:`${box.width}px`,height:`${box.height}px`,transform:`scale(${zoom})`,transformOrigin:'top left'});
  const width=Math.min(620,outer.width-24),tools=active.toolbar;tools.style.width=width+'px';tools.style.maxWidth='calc(100vw - 24px)';
  const h=tools.getBoundingClientRect().height,left=rect.left+(node.x+box.x+box.width/2)*zoom,above=rect.top+(node.y+box.y)*zoom-Math.max(24,34*zoom);
  tools.style.left=Math.max(width/2+12,Math.min(innerWidth-width/2-12,left))+'px';tools.style.top=Math.max(h+72,Math.min(innerHeight-12,above))+'px';
 }
 function start(node:FlowNode,boxId='primary'){
  if(active?.id===node.id&&active.boxId===boxId){active.editable.focus();return;}finish();
  const box=document.createElement('div');box.className='fde-rich-box';const editable=document.createElement('div');editable.className='fde-rich-edit editable-text flow-rich-content';editable.contentEditable='true';editable.setAttribute('role','textbox');editable.setAttribute('aria-label',node.image?'Texto sobre imagen':'Texto de la figura');editable.setAttribute('aria-multiline','true');editable.spellcheck=true;
  Object.assign(editable.style,{fontSize:node.fontSize+'px',color:node.textColor,textAlign:flowNodeTextState(node).align});
  if(node.richText){for(const [key,value]of Object.entries(node.richText.style||{}))editable.style.setProperty(key,value);editable.innerHTML=(node.richText.children||[]).map(flowRichHTML).join('');}
  else for(const run of flowNodeTextState(node).runs){const span=document.createElement('span');span.textContent=run.text;Object.assign(span.style,{fontFamily:run.font,fontWeight:run.bold?'700':'400',fontStyle:run.italic?'italic':'normal',textDecoration:run.underline?'underline':'none',color:run.color||''});if(run.href){const link=document.createElement('a');link.href=run.href;link.append(span);editable.append(link);}else editable.append(span);}
  editable.querySelectorAll<HTMLElement>('.editable-icon').forEach(icon=>icon.contentEditable='false');
  box.dataset.textBoxId=boxId;
  const css=document.createElement('style');css.textContent=flowRichCSS;box.append(css,editable);dialog.append(box);
  // Geometry controls live outside contenteditable: dragging never changes font size.
  for(const handle of ['move','nw','n','ne','e','se','s','sw','w']){
   const control=document.createElement('button');control.type='button';control.className='fde-text-handle';control.dataset.textHandle=handle;
   control.setAttribute('aria-label',handle==='move'?'Mover caja de texto':`Redimensionar caja de texto ${handle}`);control.title=handle==='move'?'Arrastra para mover la caja de texto':'Arrastra para redimensionar la caja de texto';if(handle==='move')control.innerHTML='<span class="material-symbols-outlined" aria-hidden="true">drag_indicator</span>';box.append(control);
   control.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();event.stopPropagation();const current=hooks.node(node.id,boxId);if(!current)return;const step=event.shiftKey?10:1;hooks.layout(node.id,boxId,flowNodeTextBox(current),handle,(event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0),(event.key==='ArrowDown'?step:event.key==='ArrowUp'?-step:0));hooks.redraw();});
  }
  let drag:{pointer:number;x:number;y:number;handle:string;start:TextRect;zoom:number}|null=null;
  box.addEventListener('pointerdown',event=>{event.stopPropagation();const handle=(event.target as Element).closest<HTMLElement>('[data-text-handle]')?.dataset.textHandle;if(event.button!==0||!handle)return;event.preventDefault();const current=hooks.node(node.id,boxId);if(!current)return;drag={pointer:event.pointerId,x:event.clientX,y:event.clientY,handle,start:flowNodeTextBox(current),zoom:hooks.zoom()};box.setPointerCapture(event.pointerId);});
  box.addEventListener('pointermove',event=>{if(!drag||drag.pointer!==event.pointerId)return;event.preventDefault();hooks.layout(node.id,boxId,drag.start,drag.handle,(event.clientX-drag.x)/drag.zoom,(event.clientY-drag.y)/drag.zoom);hooks.redraw();});
  const stopDrag=(event:PointerEvent)=>{if(drag?.pointer!==event.pointerId)return;drag=null;if(box.hasPointerCapture(event.pointerId))box.releasePointerCapture(event.pointerId);};box.addEventListener('pointerup',stopDrag);box.addEventListener('pointercancel',stopDrag);box.addEventListener('lostpointercapture',()=>{drag=null;});
  const release=borrowBuilderTextTools(dialog),toolbar=document.getElementById('rtf-toolbar')!;toolbar.setAttribute('role','toolbar');toolbar.setAttribute('aria-label',node.image?'Herramientas de texto de imagen':'Herramientas de texto de figura');toolbar.classList.remove('hidden');
  const actions=document.createElement('div');actions.className='fde-text-session-actions';for(const [label,symbol,fn]of [['Agregar caja de texto','add_comment',()=>{finish();hooks.add(node.id);}],['Terminar texto','done',finish],['Quitar texto','delete',()=>{if(boxId==='primary'){editable.replaceChildren();update();finish();}else{finish();hooks.remove(node.id,boxId);}}]]as const){const button=document.createElement('button');button.type='button';button.title=label;button.setAttribute('aria-label',label);button.innerHTML=`<span class="material-symbols-outlined">${symbol}</span>`;button.onclick=fn;actions.append(button);}toolbar.append(actions);
  const observer=new MutationObserver(update);const onToolbarClick=()=>queueMicrotask(()=>{if(active?.editable===editable)update();});toolbar.addEventListener('click',onToolbarClick);
  active={id:node.id,boxId,before:hooks.snapshot(),box,editable,toolbar,release:()=>{actions.remove();toolbar.removeEventListener('click',onToolbarClick);release();},observer,dirty:false,initialHTML:editable.innerHTML};observer.observe(editable,{childList:true,characterData:true,attributes:true,subtree:true});
  editable.oninput=update;editable.onpaste=event=>{event.preventDefault();event.stopPropagation();document.execCommand('insertText',false,event.clipboardData?.getData('text/plain')||'');update();};
  box.addEventListener('pointerdown',event=>event.stopPropagation());
  box.addEventListener('dblclick',event=>{event.stopPropagation();const icon=(event.target as Element).closest<HTMLElement>('.editable-icon');if(icon){window.currentIconTarget=icon;document.getElementById('icon-modal')?.classList.remove('hidden');}});
  box.addEventListener('click',event=>{const img=(event.target as Element).closest<HTMLImageElement>('.editorial-image');if(!img)return;window.selectedEditorialImage=img;const tools=document.getElementById('image-toolbar')!,r=img.getBoundingClientRect();tools.style.top=Math.max(300,r.top-10)+'px';tools.style.left=Math.max(280,r.left+r.width/2)+'px';tools.classList.remove('hidden');});
  editable.onkeydown=event=>{if(event.key==='Tab'){event.preventDefault();document.execCommand(event.shiftKey?'outdent':'indent');update();}else if(event.key==='Escape'||((event.ctrlKey||event.metaKey)&&event.key==='Enter')){event.preventDefault();event.stopPropagation();finish();}};
  window.currentEditableText=editable;sync();editable.focus({preventScroll:true});const selection=document.getSelection(),range=document.createRange();range.selectNodeContents(editable);selection?.removeAllRanges();selection?.addRange(range);window.lastKnownRange=range.cloneRange();hooks.redraw();
 }
 return{start,finish,sync,get id(){return active?.id;},get boxId(){return active?.boxId;},contains:(target:Element)=>!!active&&(active.box.contains(target)||builderTextToolTarget(target)),dispose:()=>{finish();document.removeEventListener('builder-text-editing-ended',ended);}};
}
