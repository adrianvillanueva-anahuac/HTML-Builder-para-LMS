import type {ModularModel,ModularCell} from './modular-model';
import {normalizeFlowTextLayout,type FlowTextLayout} from './flow-model';
import {flowRichHTML,readFlowRichDocument} from './flow-rich-document';
import {builderTextToolTarget} from './builder-text-tools';
import {addModularTextBox,modularTextStyle,moveModularTextBox,normalizeModularTextBoxes} from './modular-text-model';
type Host={model:(block:HTMLElement)=>ModularModel|undefined;sync:(block:HTMLElement)=>ModularModel;persist:(block:HTMLElement)=>void;render:(block:HTMLElement)=>void;save:()=>void;update:(block:HTMLElement)=>void};
const symbol=(name:string)=>`<span class="material-symbols-outlined" aria-hidden="true">${name}</span>`;
const setStyle=(text:HTMLElement,style:Record<string,string>)=>{for(const[key,value]of Object.entries(style))text.style.setProperty(key,value);};
function applyLayout(frame:HTMLElement,layout:FlowTextLayout){Object.assign(frame.style,{left:layout.x*100+'%',top:layout.y*100+'%',width:layout.width*100+'%',height:layout.height*100+'%'});}
function frameText(card:HTMLElement,text:HTMLElement,id:string,layout:FlowTextLayout){
 const frame=document.createElement('div');frame.className='mod-text-box-frame'+(id==='primary'?' mod-primary-text-frame':'');frame.dataset.modTextId=id;applyLayout(frame,layout);text.before(frame);frame.append(text);
 if(id==='primary'){const info=card.querySelector('.mod-info');if(info)frame.append(info);}return frame;
}
export function syncModularTextBoxes(block:HTMLElement,model:ModularModel){
 for(const cell of block.querySelectorAll<HTMLElement>('.mod-cell')){
  const value=model.cells[cell.dataset.cell!];if(!value||value.student)continue;
  const primary=cell.querySelector<HTMLElement>('.mod-text');if(primary){const style=modularTextStyle(Object.fromEntries([...primary.style].map(key=>[key,primary.style.getPropertyValue(key)])));if(Object.keys(style).length)value.textStyle=style;else delete value.textStyle;}
  for(const frame of cell.querySelectorAll<HTMLElement>('.mod-text-box-frame:not(.mod-primary-text-frame)')){
   const box=value.textBoxes?.find(box=>box.id===frame.dataset.modTextId),text=frame.querySelector<HTMLElement>('.mod-extra-text');if(box&&text)box.document=readFlowRichDocument(text);
  }
 }
}
export function renderModularTextBoxes(block:HTMLElement,model:ModularModel){
 for(const cell of block.querySelectorAll<HTMLElement>('.mod-cell')){
  const value=model.cells[cell.dataset.cell!],card=cell.querySelector<HTMLElement>('.mod-card');if(!value||!card||value.student)continue;
  const primary=card.querySelector<HTMLElement>('.mod-text')!;setStyle(primary,modularTextStyle(value.textStyle));
  if(value.textLayout){value.textLayout=normalizeFlowTextLayout(value.textLayout);frameText(card,primary,'primary',value.textLayout);}
  if(value.textBoxes)value.textBoxes=normalizeModularTextBoxes(value.textBoxes);
  for(const box of value.textBoxes||[]){
   const text=document.createElement('div');text.className='mod-extra-text editable-text';text.title='Doble clic para editar esta caja de texto';text.setAttribute('aria-label','Caja de texto del rectángulo');setStyle(text,modularTextStyle(box.document.style));text.innerHTML=(box.document.children||[]).map(flowRichHTML).join('');card.append(text);
   const frame=frameText(card,text,box.id,box.layout),info=document.createElement('details');info.className='mod-text-box-info';
   info.innerHTML='<summary aria-label="Mostrar texto completo de la caja">+ info</summary><div class="mod-text-box-preview"><div class="mod-text-box-preview-content"></div><button type="button" class="mod-editor" data-mod-text-action="edit">Editar caja de texto</button></div>';frame.append(info);
  }
  const menu=document.createElement('details');menu.className='mod-text-box-menu';menu.innerHTML=`<summary title="Cajas de texto" aria-label="Cajas de texto">${symbol('text_fields')}</summary><div class="mod-text-box-menu-panel"></div>`;
  const panel=menu.querySelector('div')!;
  for(const [id,label]of [['primary','Texto principal'],...(value.textBoxes||[]).map((box,index)=>[box.id,`Caja de texto ${index+2}`])]){
   const row=document.createElement('div'),edit=document.createElement('button');edit.type='button';edit.dataset.modTextAction='edit';edit.dataset.modTextId=id;edit.textContent=label;row.append(edit);
   if(id!=='primary'){const remove=document.createElement('button');remove.type='button';remove.dataset.modTextAction='remove';remove.dataset.modTextId=id;remove.setAttribute('aria-label',`Eliminar ${label.toLowerCase()}`);remove.innerHTML=symbol('delete');row.append(remove);}panel.append(row);
  }
  const add=document.createElement('button');add.type='button';add.dataset.modTextAction='add';add.setAttribute('aria-label','Agregar caja de texto');add.innerHTML=symbol('add_comment')+'<span>Agregar caja de texto</span>';add.disabled=(value.textBoxes?.length||0)>=19;panel.prepend(add);
  cell.querySelector('.mod-cell-tools')?.insertBefore(menu,cell.querySelector('.mod-cell-tools>[data-mod-action=remove]'));
 }
}
let finishSession:((block?:HTMLElement)=>void)|undefined;
export function finishModularTextEditing(block?:HTMLElement){finishSession?.(block);}
/** Native Builder editing, with the same geometry engine as flow figure captions. */
export function setupModularTextBoxes(host:Host){
 let session:{block:HTMLElement;cell:ModularCell;id:string;text:HTMLElement;frame:HTMLElement;controls:HTMLElement;actions:HTMLElement;observer:MutationObserver;resize:ResizeObserver}|null=null;
 const commit=()=>{if(!session)return;host.sync(session.block);host.persist(session.block);host.update(session.block);};
 const position=()=>{if(!session)return;if(!session.frame.isConnected){finish();return;}const r=session.frame.getBoundingClientRect(),bar=document.getElementById('rtf-toolbar');if(bar&&!bar.classList.contains('hidden')){bar.style.left=Math.max(bar.offsetWidth/2+8,Math.min(innerWidth-bar.offsetWidth/2-8,r.left+r.width/2))+'px';bar.style.top=Math.max(bar.offsetHeight+12,r.top-34)+'px';}};
 function finish(block?:HTMLElement){
  if(!session||(block&&session.block!==block))return;
  const old=session;session=null;old.observer.disconnect();old.resize.disconnect();if(old.controls.dataset.dragging)window.modularResizing=false;host.sync(old.block);host.persist(old.block);old.controls.remove();old.actions.remove();old.frame.classList.remove('mod-text-box-active');old.text.contentEditable='false';
  if(window.currentEditableText===old.text){window.currentEditableText=null;window.lastKnownRange=null;document.getElementById('rtf-toolbar')?.classList.add('hidden');}
  host.update(old.block);if(old.block.isConnected)host.save();
 }
 finishSession=finish;
 function open(block:HTMLElement,cellNode:HTMLElement,id:string){
  const text=id==='primary'?cellNode.querySelector<HTMLElement>('.mod-text'):cellNode.querySelector<HTMLElement>(`.mod-text-box-frame[data-mod-text-id="${id}"] .mod-extra-text`);if(!text)return;
  text.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));
 }
 function add(block:HTMLElement,key:string){finish();const model=host.sync(block),cell=model.cells[key];if(!cell||cell.student)return;host.save();const box=addModularTextBox(cell);if(!box)return;host.render(block);host.persist(block);host.save();open(block,block.querySelector<HTMLElement>(`.mod-cell[data-cell="${key}"]`)!,box.id);}
 function remove(block:HTMLElement,key:string,id:string){finish();const model=host.sync(block),cell=model.cells[key];if(!cell)return;host.save();if(id==='primary')cell.html='';else cell.textBoxes=cell.textBoxes?.filter(box=>box.id!==id);host.render(block);host.persist(block);host.save();}
 function start(text:HTMLElement){
  const block=text.closest<HTMLElement>('.modular-table'),cellNode=text.closest<HTMLElement>('.mod-cell'),card=text.closest<HTMLElement>('.mod-card');if(!block||!cellNode||!card||card.dataset.student==='true'||!host.model(block))return;
  if(session?.text===text){position();return;}finish();host.save();
  const cell=host.model(block)!.cells[cellNode.dataset.cell!],id=text.closest<HTMLElement>('.mod-text-box-frame')?.dataset.modTextId||'primary';
  let frame=text.closest<HTMLElement>('.mod-text-box-frame');
  if(!frame){const a=card.getBoundingClientRect(),b=text.getBoundingClientRect();cell.textLayout=normalizeFlowTextLayout({x:(b.left-a.left)/a.width,y:(b.top-a.top)/a.height,width:b.width/a.width,height:Math.max(24,b.height)/a.height});frame=frameText(card,text,'primary',cell.textLayout);}
  const controls=document.createElement('div');controls.className='mod-text-geometry mod-editor';
  for(const handle of ['move','nw','n','ne','e','se','s','sw','w']){const button=document.createElement('button');button.type='button';button.dataset.modTextHandle=handle;button.setAttribute('aria-label',handle==='move'?'Mover caja de texto':`Redimensionar caja de texto ${handle}`);button.title=handle==='move'?'Arrastra para mover la caja de texto':'Arrastra para redimensionar la caja de texto';if(handle==='move')button.innerHTML=symbol('drag_indicator');controls.append(button);}frame.append(controls);frame.classList.add('mod-text-box-active');
  const actions=document.createElement('div');actions.className='mod-text-session-actions mod-editor';
  for(const [label,name,fn]of [['Agregar caja de texto','add_comment',()=>add(block,cellNode.dataset.cell!)],['Terminar texto','done',()=>finish()],['Quitar texto','delete',()=>remove(block,cellNode.dataset.cell!,id)]]as const){const button=document.createElement('button');button.type='button';button.title=label;button.setAttribute('aria-label',label);button.innerHTML=symbol(name);button.onclick=fn;actions.append(button);}document.getElementById('rtf-toolbar')?.append(actions);
  const observer=new MutationObserver(()=>{if(!text.isContentEditable){finish();return;}commit();position();}),resize=new ResizeObserver(position);
  session={block,cell,id,text,frame,controls,actions,observer,resize};observer.observe(text,{attributes:true,childList:true,characterData:true,subtree:true});resize.observe(card);text.contentEditable='true';window.currentEditableText=text;text.focus({preventScroll:true});host.persist(block);position();
  const layout=()=>id==='primary'?cell.textLayout!:cell.textBoxes!.find(box=>box.id===id)!.layout;
  const transform=(initial:FlowTextLayout,handle:string,dx:number,dy:number)=>{const w=card.offsetWidth,h=card.offsetHeight,next=moveModularTextBox({x:initial.x*w,y:initial.y*h,width:initial.width*w,height:initial.height*h},handle,dx,dy,w,h,cell.padding,cell.radius);if(id==='primary')cell.textLayout=next;else cell.textBoxes!.find(box=>box.id===id)!.layout=next;applyLayout(frame!,next);host.persist(block);host.update(block);position();};
  let drag:{pointer:number;x:number;y:number;scaleX:number;scaleY:number;handle:string;layout:FlowTextLayout}|null=null;
  controls.addEventListener('pointerdown',event=>{const handle=(event.target as Element).closest<HTMLElement>('[data-mod-text-handle]')?.dataset.modTextHandle;if(event.button!==0||!handle)return;event.preventDefault();event.stopPropagation();commit();host.save();window.modularResizing=true;controls.dataset.dragging='true';const r=card.getBoundingClientRect();drag={pointer:event.pointerId,x:event.clientX,y:event.clientY,scaleX:r.width/card.offsetWidth,scaleY:r.height/card.offsetHeight,handle,layout:{...layout()}};controls.setPointerCapture(event.pointerId);});
  controls.addEventListener('pointermove',event=>{if(!drag||drag.pointer!==event.pointerId)return;event.preventDefault();event.stopPropagation();transform(drag.layout,drag.handle,(event.clientX-drag.x)/drag.scaleX,(event.clientY-drag.y)/drag.scaleY);});
  const end=(event:PointerEvent)=>{if(drag?.pointer!==event.pointerId)return;drag=null;delete controls.dataset.dragging;window.modularResizing=false;if(controls.hasPointerCapture(event.pointerId))controls.releasePointerCapture(event.pointerId);commit();host.save();};for(const type of ['pointerup','pointercancel','lostpointercapture'])controls.addEventListener(type,end);
  controls.addEventListener('keydown',event=>{const handle=(event.target as HTMLElement).dataset.modTextHandle;if(!handle||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();event.stopPropagation();host.save();const step=event.shiftKey?10:1;transform({...layout()},handle,event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0,event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0);host.save();});
 }
 document.addEventListener('dblclick',event=>{const text=(event.target as Element).closest<HTMLElement>('.mod-card .mod-text,.mod-card .mod-extra-text');if(text)queueMicrotask(()=>{if(text.isConnected&&text.isContentEditable)start(text);});},true);
 document.addEventListener('pointerdown',event=>{if(session&&!session.frame.contains(event.target as Node)&&!builderTextToolTarget(event.target))finish();},true);
 document.addEventListener('click',event=>{const button=(event.target as Element).closest<HTMLElement>('[data-mod-text-action]');if(!button)return;const block=button.closest<HTMLElement>('.modular-table'),cell=button.closest<HTMLElement>('.mod-cell');if(!block||!cell||!host.model(block))return;event.preventDefault();event.stopImmediatePropagation();const id=button.dataset.modTextId||button.closest<HTMLElement>('.mod-text-box-frame')?.dataset.modTextId||'primary',action=button.dataset.modTextAction;if(action==='add')add(block,cell.dataset.cell!);else if(action==='remove')remove(block,cell.dataset.cell!,id);else open(block,cell,id);},true);
 document.addEventListener('keydown',event=>{if(session&&session.frame.contains(event.target as Node)&&(event.key==='Escape'||((event.ctrlKey||event.metaKey)&&event.key==='Enter'))){event.preventDefault();event.stopImmediatePropagation();finish();}},true);
 window.addEventListener('scroll',position,true);window.addEventListener('resize',position);
}
