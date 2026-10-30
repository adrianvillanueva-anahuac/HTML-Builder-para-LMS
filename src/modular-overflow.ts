import {modularPalette,type ModularModel} from './modular-model';
import {defaultOverflowPanel,moveOverflowButton,normalizeModularOverflow,type ModularOverflowPanel} from './modular-overflow-model';
import {flowRichHTML,readFlowRichDocument,type FlowRichNode} from './flow-rich-document';
import {modularTextStyle,modularTextEntries} from './modular-text-model';
import {normalizeFlowTextLayout,type FlowTextLayout} from './flow-model';
import {mountModularTextGeometry} from './modular-text-geometry';
import {finishModularTextEditing} from './modular-text-boxes';
import {borrowBuilderTextTools,builderTextToolTarget} from './builder-text-tools';
type Host={model:(block:HTMLElement)=>ModularModel|undefined;sync:(block:HTMLElement)=>ModularModel;persist:(block:HTMLElement)=>void;render:(block:HTMLElement)=>void;save:()=>void;update:(block:HTMLElement)=>void};
const icon=(name:string)=>`<span class="material-symbols-outlined" aria-hidden="true">${name}</span>`;
const ids=(cell:ModularModel['cells'][string])=>modularTextEntries(cell).map(box=>box.id);
const label=(index:number)=>`Caja de texto ${index+1}`;
export function renderModularOverflow(block:HTMLElement,model:ModularModel){
 for(const node of block.querySelectorAll<HTMLElement>('.mod-cell')){
  const cell=model.cells[node.dataset.cell!],card=node.querySelector<HTMLElement>('.mod-card');if(!cell||!card||cell.student)continue;
  cell.textOverflow=normalizeModularOverflow(cell.textOverflow,ids(cell));card.dataset.textOverflow=JSON.stringify(cell.textOverflow);
  card.querySelectorAll('.mod-info,.mod-text-box-info,.mod-overflow-info').forEach(info=>info.remove());
  const textMenu=node.querySelector<HTMLElement>('.mod-text-box-menu-panel');
  if(textMenu){
   textMenu.querySelectorAll('[data-overflow-control],[data-overflow-box]').forEach(control=>control.remove());
   const toggleLabel=document.createElement('label');toggleLabel.dataset.overflowControl='true';toggleLabel.className='mod-text-overflow-toggle';toggleLabel.innerHTML='<input type="checkbox" data-overflow-enabled aria-label="Activar desbordamiento de este rectángulo"> <span>Activar desbordamiento (+ info)</span>';
   toggleLabel.querySelector<HTMLInputElement>('input')!.checked=cell.textOverflow.enabled;textMenu.prepend(toggleLabel);
   for(const {id,label:boxLabel}of modularTextEntries(cell)){const row=textMenu.querySelector<HTMLElement>(`[data-mod-text-row="${id}"]`);if(!row)continue;const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.dataset.overflowBox=id;checkbox.checked=cell.textOverflow.boxIds.includes(id);checkbox.disabled=!cell.textOverflow.enabled;checkbox.setAttribute('aria-label',`Mostrar ${boxLabel.toLowerCase()} en + info`);row.prepend(checkbox);}
  }
  for(const frame of card.querySelectorAll<HTMLElement>('.mod-text-box-frame')){const layout=frame.dataset.modTextId==='primary'?cell.textLayout:cell.textBoxes?.find(box=>box.id===frame.dataset.modTextId)?.layout;if(layout)frame.dataset.textLayout=JSON.stringify(layout);}
  const info=document.createElement('details');info.className='mod-overflow-info';info.dataset.hasContent='false';
  info.innerHTML='<summary aria-label="Mostrar texto completo" title="+ info: doble clic para diseñar; mantén pulsado para mover">+ info<span class="mod-overflow-hover-tools mod-editor"><button type="button" data-overflow-preview aria-label="Mostrar previo" title="Mostrar previo">'+icon('visibility')+'</button></span></summary><div class="mod-overflow-panel"><div class="mod-overflow-backdrop"></div><div class="mod-overflow-surface"><div class="mod-overflow-background"></div><div class="mod-overflow-content"></div></div></div>';
  card.append(info);
 }
 // Appearance, text/layout, ornaments, then the destructive action. Existing
 // grips stay first; nothing with a delete action is stranded in the middle.
 for(const tools of block.querySelectorAll<HTMLElement>('.mod-cell-tools')){
  const rank=(el:Element)=>{const name=el.querySelector('summary')?.getAttribute('aria-label')||el.getAttribute('aria-label')||'';if(el.matches('.drag-handle'))return 0;if(name.includes('Color del'))return 10;if(name.includes('Borde del'))return 11;if(name==='Redondeado')return 12;if(name.includes('Margen del'))return 20;if(name.includes('Alineación'))return 21;if(name==='Cajas de texto')return 22;if(name==='Figura en el perímetro')return 30;if(el.matches('[data-mod-action=remove]'))return 100;return 40;};
  [...tools.children].sort((a,b)=>rank(a)-rank(b)).forEach(child=>tools.append(child));
 }
}
let cancelEditor:(()=>void)|undefined;
export function closeModularOverflowEditor(){cancelEditor?.();}
export function setupModularOverflow(host:Host){
 function edit(block:HTMLElement,key:string,preferredId?:string){
  cancelEditor?.();finishModularTextEditing();const cell=host.sync(block).cells[key];if(!cell||cell.student)return;
  const config=normalizeModularOverflow(cell.textOverflow,ids(cell));if(!config.enabled)return;
  const previous=document.activeElement as HTMLElement;
  document.querySelectorAll<HTMLDetailsElement>('.mod-overflow-info[open]').forEach(info=>{info.open=false;delete info.dataset.pinned;});
  const drafts=new Map<string,FlowRichNode>();
  const primary=block.querySelector<HTMLElement>(`.mod-cell[data-cell="${key}"] .mod-text`);
  for(const id of config.boxIds){const doc=id==='primary'?(primary?readFlowRichDocument(primary):{tag:'div'}):cell.textBoxes?.find(box=>box.id===id)?.document;if(doc)drafts.set(id,structuredClone(doc));}
  const page=block.closest<HTMLElement>('.lms-dropzone.bg-white')||document.getElementById('canvas-container-outer')||document.getElementById('canvas')!;
  const overlay=document.createElement('div');overlay.className='mod-overflow-editor mod-modal mod-editor';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','false');overlay.setAttribute('aria-label','Diseñar contenedor de + info');
  overlay.innerHTML='<div class="mod-overflow-backdrop"></div><div class="mod-overflow-edit-surface"><div class="mod-overflow-background"></div><div class="mod-overflow-editor-bar" role="toolbar" aria-label="Diseño del contenedor"><button type="button" data-panel-move aria-label="Mover contenedor" title="Arrastra o usa las flechas para mover">'+icon('drag_indicator')+'</button><label>Estilo<select data-panel-field="style"><option value="normal">Normal</option><option value="dialogue">Cuadro de diálogo</option><option value="thought">Nube de pensamiento</option><option value="hologram">Holograma futurista</option></select></label><label>Redondeado<input data-panel-field="radius" type="number" min="0" max="100" step="1"></label><label>Relleno<input data-panel-field="fill" type="color"></label><label>Opacidad del fondo<input data-panel-field="opacity" type="number" min="0" max="100" step="5"></label><label>Desenfoque detrás<input data-panel-field="blur" type="number" min="0" max="24"></label><label>Oscurecer detrás<input data-panel-field="dim" type="number" min="0" max="85" step="5"></label><button type="button" data-panel-reset title="Restablecer diseño inicial" aria-label="Restablecer diseño inicial">'+icon('restart_alt')+'</button><button type="button" data-panel-cancel>Cancelar</button><button type="button" data-panel-accept>Aceptar</button></div><div class="mod-overflow-drafts"></div><button type="button" data-panel-resize aria-label="Redimensionar contenedor" title="Arrastra o usa las flechas para redimensionar">'+icon('open_in_full')+'</button></div>';
  const surface=overlay.querySelector<HTMLElement>('.mod-overflow-edit-surface')!,content=overlay.querySelector<HTMLElement>('.mod-overflow-drafts')!;
  const designBar=overlay.querySelector<HTMLElement>('.mod-overflow-editor-bar')!;designBar.classList.add('mod-tools');
  const menuIcons:Record<string,string>={style:'category',radius:'rounded_corner',fill:'format_color_fill',opacity:'opacity',blur:'blur_on',dim:'brightness_6'};
  for(const label of designBar.querySelectorAll<HTMLLabelElement>('label')){
   const input=label.querySelector<HTMLInputElement|HTMLSelectElement>('input,select')!,key=input.dataset.panelField!,title=label.firstChild?.textContent||key;
   const menu=document.createElement('details');menu.className='mod-overflow-design-menu';menu.innerHTML=`<summary title="${title}" aria-label="${title}">${icon(menuIcons[key])}</summary><div></div>`;label.before(menu);menu.querySelector('div')!.append(label);
   if(input instanceof HTMLInputElement&&input.type==='number'){
    input.type='range';const output=document.createElement('output');label.insertBefore(output,input);const unit=key==='opacity'||key==='dim'?'%':' px';
    const updateOutput=()=>output.textContent=input.value+unit;input.addEventListener('input',updateOutput);input.addEventListener('overflow-control-refresh',updateOutput);input.setAttribute('aria-label',title);input.step='1';
   }
   if(key==='fill'){
    const palette=document.createElement('div');palette.className='mod-palette';for(const entry of modularPalette){const swatch=document.createElement('button');swatch.type='button';swatch.title=entry.name;swatch.setAttribute('aria-label',`Relleno ${entry.name}`);swatch.style.background=entry.value;swatch.onclick=()=>{input.value=entry.value;input.dispatchEvent(new Event('input',{bubbles:true}));};palette.append(swatch);}label.before(palette);
   }
   let hide:ReturnType<typeof setTimeout>;
   menu.addEventListener('pointerenter',()=>{clearTimeout(hide);designBar.querySelectorAll<HTMLDetailsElement>('details').forEach(other=>{if(other!==menu){other.open=false;delete other.dataset.menuPinned;}});menu.open=true;});
   menu.addEventListener('pointerleave',()=>{hide=setTimeout(()=>{if(!menu.matches(':hover,:focus-within')&&menu.dataset.menuPinned!=='true')menu.open=false;},450);});
   menu.querySelector('summary')!.addEventListener('click',event=>{event.preventDefault();menu.open=true;menu.dataset.menuPinned='true';});
  }
  overlay.addEventListener('click',event=>designBar.querySelectorAll<HTMLDetailsElement>('details[open]').forEach(menu=>{if(!menu.contains(event.target as Node)){menu.open=false;delete menu.dataset.menuPinned;}}));
  for(const [id,doc]of drafts){const frame=document.createElement('div');frame.className='mod-overflow-text-frame';frame.dataset.overflowFrame=id;const text=document.createElement('div');text.className='mod-overflow-draft-text editable-text';text.dataset.overflowDraft=id;text.setAttribute('aria-label',label(ids(cell).indexOf(id)));text.title='Doble clic para editar con las herramientas de texto';for(const [name,value]of Object.entries(modularTextStyle(doc.style)))text.style.setProperty(name,value);text.innerHTML=(doc.children||[]).map(flowRichHTML).join('');frame.append(text);content.append(frame);}
  let panel={...config.panel},textLayouts:Record<string,FlowTextLayout>=structuredClone(config.textLayouts||{}),closed=false,activeText:HTMLElement|null=null,releaseGeometry:(()=>void)|undefined;
  function paintTextLayouts(){for(const frame of content.querySelectorAll<HTMLElement>('[data-overflow-frame]')){const layout=textLayouts[frame.dataset.overflowFrame!];if(layout){frame.dataset.textLayout=JSON.stringify(layout);Object.assign(frame.style,{position:'absolute',left:layout.x*100+'%',top:layout.y*100+'%',width:layout.width*100+'%',height:layout.height*100+'%'});}else{delete frame.dataset.textLayout;frame.removeAttribute('style');}}}
  function ensureTextLayouts(){const bounds=content.getBoundingClientRect();for(const frame of content.querySelectorAll<HTMLElement>('[data-overflow-frame]')){const id=frame.dataset.overflowFrame!;if(textLayouts[id])continue;const r=frame.getBoundingClientRect();textLayouts[id]=normalizeFlowTextLayout({x:(r.left-bounds.left+content.scrollLeft)/bounds.width,y:(r.top-bounds.top+content.scrollTop)/bounds.height,width:r.width/bounds.width,height:r.height/bounds.height});}paintTextLayouts();}
  const finishText=()=>{
   const text=window.currentEditableText;
   if(text&&overlay.contains(text)){text.contentEditable='false';window.currentEditableText=null;window.lastKnownRange=null;}
   content.querySelectorAll<HTMLElement>('[contenteditable=true]').forEach(text=>text.contentEditable='false');
   for(const id of ['rtf-toolbar','image-toolbar','icon-modal'])document.getElementById(id)?.classList.add('hidden');
   const inline=document.getElementById('inline-icon-toolbar');if(inline){inline.style.opacity='0';inline.style.pointerEvents='none';}
   const links=document.getElementById('text-link-tools');if(links)links.hidden=true;
   window.selectedEditorialImage=null;window.currentInlineIcon=null;window.currentIconTarget=null;
   releaseGeometry?.();releaseGeometry=undefined;activeText=null;overlay.dataset.editingText='false';overlay.querySelector('[data-overflow-text-actions]')?.remove();paint();
  };
  // Borrow the actual Builder tools so their complete menus remain usable while
  // the rest of the page is inert (including keyboard focus and hover menus).
  let releaseTools=()=>{};
  const wasInert=page.inert;
  const allowed=(target:EventTarget|null)=>target instanceof Node&&(overlay.contains(target)||builderTextToolTarget(target));
  const isolate=(event:Event)=>{
   if(!allowed(event.target)){if(event.target instanceof Node&&page.contains(event.target)){event.preventDefault();event.stopImmediatePropagation();if(event.type==='focusin')surface.focus({preventScroll:true});}return;}
   // Undo/redo belongs to the draft, never the inert page behind this editor.
   if(event instanceof KeyboardEvent&&(event.ctrlKey||event.metaKey)&&['z','y'].includes(event.key.toLowerCase())){event.stopImmediatePropagation();const target=event.target as HTMLElement;if(!target.isContentEditable&&!target.matches('input,textarea'))event.preventDefault();}
  };
  const guardedEvents=['pointerdown','pointerover','click','dblclick','contextmenu','focusin','keydown','dragstart','drop'];
  const textObserver=new MutationObserver(()=>{if(activeText&&!activeText.isContentEditable)finishText();});
  const pageObserver=new MutationObserver(()=>{if(!block.isConnected||!page.isConnected)close();});
  const close=()=>{if(closed)return;closed=true;stopDrag();pageObserver.disconnect();textObserver.disconnect();finishText();guardedEvents.forEach(type=>window.removeEventListener(type,isolate,true));page.inert=wasInert;delete page.dataset.modOverflowWasInert;page.classList.remove('mod-overflow-page-locked');document.body.classList.remove('mod-overflow-isolating');releaseTools();window.removeEventListener('resize',paint);window.removeEventListener('scroll',paint,true);window.removeEventListener('pointerup',endPointer,true);window.removeEventListener('pointercancel',endPointer,true);window.removeEventListener('blur',stopDrag);overlay.remove();host.update(block);cancelEditor=undefined;previous?.isConnected&&previous.focus({preventScroll:true});};cancelEditor=close;
  function paint(){
   const area=block.closest('#scroll-container')?.getBoundingClientRect(),limit=Math.max(8,(area?.left||0)+8),right=Math.min(innerWidth-8,(area?.right||innerWidth)-8),w=Math.min(panel.width,right-limit),h=Math.min(panel.height,Math.max(1,innerHeight-100)),left=Math.max(limit,Math.min(right-w,panel.x*innerWidth-w/2)),top=Math.max(8,Math.min(innerHeight-h-8,panel.y*innerHeight));
   Object.assign(surface.style,{left:left+'px',top:top+'px',width:w+'px',height:h+'px'});surface.dataset.panelStyle=panel.style;
   surface.style.setProperty('--overflow-fill',panel.fill);surface.style.setProperty('--overflow-opacity',String(panel.opacity));surface.style.setProperty('--overflow-radius',panel.radius+'px');
   const pageRect=page.getBoundingClientRect(),scrollArea=document.getElementById('scroll-container')?.getBoundingClientRect(),bx=Math.max(0,pageRect.left,scrollArea?.left||0),by=Math.max(0,pageRect.top,scrollArea?.top||0),br=Math.min(innerWidth,pageRect.right,scrollArea?.right||innerWidth),bb=Math.min(innerHeight,pageRect.bottom,scrollArea?.bottom||innerHeight);
   const backdrop=overlay.querySelector<HTMLElement>('.mod-overflow-backdrop')!;Object.assign(backdrop.style,{inset:'auto',left:bx+'px',top:by+'px',width:Math.max(0,br-bx)+'px',height:Math.max(0,bb-by)+'px',background:`rgb(0 0 0 / ${panel.dim})`,backdropFilter:`blur(${panel.blur}px)`});
   const tools=document.getElementById('rtf-toolbar');if(tools&&activeText){const rect=activeText.parentElement!.getBoundingClientRect();tools.style.left=Math.max(tools.offsetWidth/2+8,Math.min(innerWidth-tools.offsetWidth/2-8,rect.left+rect.width/2))+'px';tools.style.top=Math.max(tools.offsetHeight+8,rect.top-34)+'px';}
   Object.assign(designBar.style,{position:'fixed',left:Math.max(8,Math.min(innerWidth-designBar.offsetWidth-8,left))+'px',top:(top>=designBar.offsetHeight+16?top-designBar.offsetHeight-8:Math.min(innerHeight-designBar.offsetHeight-8,top+h+8))+'px',bottom:'auto'});
   designBar.querySelectorAll<HTMLDetailsElement>('details[open]').forEach(menu=>{const rect=menu.querySelector('summary')!.getBoundingClientRect(),popup=menu.querySelector<HTMLElement>(':scope>div')!,above=rect.top-popup.offsetHeight-6;Object.assign(popup.style,{left:Math.max(12,Math.min(innerWidth-popup.offsetWidth-12,rect.left))+'px',top:Math.max(12,Math.min(innerHeight-popup.offsetHeight-12,above>=12?above:rect.bottom+6))+'px'});});
  }
  function fill(){overlay.querySelectorAll<HTMLInputElement|HTMLSelectElement>('[data-panel-field]').forEach(input=>{const key=input.dataset.panelField as keyof ModularOverflowPanel,value=panel[key];input.value=String(key==='opacity'||key==='dim'?Math.round(Number(value)*100):value);input.dispatchEvent(new Event('overflow-control-refresh'));});paint();}
  overlay.addEventListener('input',event=>{const input=(event.target as Element).closest<HTMLInputElement|HTMLSelectElement>('[data-panel-field]');if(!input)return;const key=input.dataset.panelField!,value=input.value;panel=normalizeModularOverflow({panel:{...panel,[key]:['fill','style'].includes(key)?value:Number(value)/(['opacity','dim'].includes(key)?100:1)}}).panel;paint();});
  overlay.querySelector('[data-panel-reset]')!.addEventListener('click',()=>{panel=defaultOverflowPanel();textLayouts={};paintTextLayouts();fill();});
  overlay.querySelector('[data-panel-cancel]')!.addEventListener('click',close);
  overlay.querySelector('[data-panel-accept]')!.addEventListener('click',()=>{
   // Capture only on accept: neither live typing nor Cancel mutates the model.
   host.save();for(const text of content.querySelectorAll<HTMLElement>('[data-overflow-draft]')){const doc=readFlowRichDocument(text),id=text.dataset.overflowDraft!;if(id==='primary'){cell.html=(doc.children||[]).map(flowRichHTML).join('');cell.textStyle=modularTextStyle(doc.style);}else{const box=cell.textBoxes?.find(box=>box.id===id);if(box)box.document=doc;}}
   cell.textOverflow=normalizeModularOverflow({...config,panel,textLayouts},ids(cell));close();host.render(block);host.persist(block);host.save();
  });
  let drag:{pointer:number;x:number;y:number;start:ModularOverflowPanel;resize:boolean;active:boolean;timer?:ReturnType<typeof setTimeout>}|null=null;
  function stopDrag(){const old=drag;drag=null;if(old){clearTimeout(old.timer);if(surface.hasPointerCapture(old.pointer))surface.releasePointerCapture(old.pointer);}surface.removeAttribute('data-dragging');}
  surface.addEventListener('pointerdown',event=>{
   const target=event.target as Element,handle=target.closest('[data-panel-move],[data-panel-resize]');
   if(event.button!==0||activeText||(!handle&&target.closest('button,input,select,a,.mod-overflow-editor-bar')))return;
   stopDrag();const rect=surface.getBoundingClientRect();
   const start={...panel,x:(rect.left+rect.width/2)/innerWidth,y:rect.top/innerHeight};
   const pending=drag={pointer:event.pointerId,x:event.clientX,y:event.clientY,start,resize:!!handle?.hasAttribute('data-panel-resize'),active:!!handle} as NonNullable<typeof drag>;
   const activate=()=>{if(drag!==pending||activeText)return;pending.active=true;surface.dataset.dragging='true';surface.setPointerCapture(event.pointerId);window.getSelection()?.removeAllRanges();};
   if(handle){event.preventDefault();activate();}else pending.timer=setTimeout(activate,250);
  });
  const transform=(start:ModularOverflowPanel,resize:boolean,dx:number,dy:number)=>{const rect=surface.getBoundingClientRect(),area=block.closest('#scroll-container')?.getBoundingClientRect(),limit=Math.max(8,(area?.left||0)+8),right=Math.min(innerWidth-8,(area?.right||innerWidth)-8);panel=normalizeModularOverflow({panel:resize?{...start,width:start.width+dx,height:start.height+dy}:{...start,x:Math.max(limit+rect.width/2,Math.min(right-rect.width/2,start.x*innerWidth+dx))/innerWidth,y:Math.max(8,Math.min(innerHeight-rect.height-8,start.y*innerHeight+dy))/innerHeight}}).panel;paint();};
  surface.addEventListener('pointermove',event=>{if(drag?.pointer===event.pointerId&&drag.active){event.preventDefault();transform(drag.start,drag.resize,event.clientX-drag.x,event.clientY-drag.y);}});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])surface.addEventListener(name,(event:PointerEvent)=>{if(drag?.pointer===event.pointerId)stopDrag();});
  const endPointer=(event:PointerEvent)=>{if(drag?.pointer===event.pointerId)stopDrag();};
  window.addEventListener('pointerup',endPointer,true);window.addEventListener('pointercancel',endPointer,true);window.addEventListener('blur',stopDrag);
  overlay.addEventListener('keydown',event=>{const handle=(event.target as Element).closest('[data-panel-move],[data-panel-resize]');if(handle&&!activeText&&event.key.startsWith('Arrow')){event.preventDefault();const n=event.shiftKey?10:1;transform({...panel},handle.hasAttribute('data-panel-resize'),event.key==='ArrowLeft'?-n:event.key==='ArrowRight'?n:0,event.key==='ArrowUp'?-n:event.key==='ArrowDown'?n:0);}else if(event.key==='Escape'&&!builderTextToolTarget(event.target)){event.preventDefault();event.stopPropagation();if(activeText){finishText();overlay.querySelector<HTMLElement>('[data-panel-move]')!.focus();}else close();}});
  // All formatting, links, icons and images use the original Builder toolbar.
  overlay.addEventListener('dblclick',event=>{
   const text=(event.target as Element).closest<HTMLElement>('[data-overflow-draft]');if(!text)return;
   stopDrag();if(activeText&&activeText!==text)finishText();activeText=text;overlay.dataset.editingText='true';
   if(!releaseGeometry){const frame=text.parentElement!,id=text.dataset.overflowDraft!;releaseGeometry=mountModularTextGeometry(frame,{bounds:()=>content,layout:()=>textLayouts[id],start:ensureTextLayouts,change:layout=>{textLayouts[id]=layout;paintTextLayouts();paint();}});}
   designBar.querySelectorAll<HTMLDetailsElement>('details[open]').forEach(menu=>{menu.open=false;delete menu.dataset.menuPinned;});
   queueMicrotask(()=>{if(closed||activeText!==text)return;const tools=document.getElementById('rtf-toolbar');if(tools&&!tools.querySelector('[data-overflow-text-actions]')){const actions=document.createElement('span');actions.dataset.overflowTextActions='true';actions.className='mod-text-actions';actions.innerHTML='<button type="button" aria-label="Confirmar texto" title="Confirmar texto">'+icon('done')+'</button>';actions.querySelector('button')!.onclick=()=>{finishText();overlay.querySelector<HTMLElement>('[data-panel-move]')!.focus();};tools.append(actions);}paint();});
   requestAnimationFrame(()=>{if(!closed)paint();});
  },true);
  overlay.addEventListener('toggle',paint,true);
  (document.getElementById('scroll-container')||document.body).append(overlay);releaseTools=borrowBuilderTextTools(overlay);
  surface.tabIndex=-1;document.body.classList.add('mod-overflow-isolating');page.classList.add('mod-overflow-page-locked');page.dataset.modOverflowWasInert=String(wasInert);page.inert=true;
  guardedEvents.forEach(type=>window.addEventListener(type,isolate,true));textObserver.observe(content,{attributes:true,attributeFilter:['contenteditable'],subtree:true});pageObserver.observe(document.getElementById('scroll-container')||page.parentElement!,{childList:true,subtree:true});window.addEventListener('resize',paint);window.addEventListener('scroll',paint,true);fill();paintTextLayouts();
  // + info enters appearance mode. An explicit "Editar caja" action can still
  // target its selected text directly, without an extra intermediate gesture.
  const first=preferredId?content.querySelector<HTMLElement>(`[data-overflow-draft="${preferredId}"]`):null;
  if(first)queueMicrotask(()=>{if(!closed&&first.isConnected)first.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));});else overlay.querySelector<HTMLElement>('[data-panel-move]')!.focus();
 }
 document.addEventListener('modular-text-boxes-changed',event=>{const block=(event as CustomEvent<HTMLElement>).detail,model=host.model(block);if(model)renderModularOverflow(block,model);});
 document.addEventListener('modular-overflow-edit',event=>{const {block,key,id}=(event as CustomEvent<{block:HTMLElement;key:string;id?:string}>).detail;if(host.model(block))edit(block,key,id);});
 document.addEventListener('change',event=>{
  const input=(event.target as Element).closest<HTMLInputElement>('[data-overflow-enabled],[data-overflow-box]'),block=input?.closest<HTMLElement>('.modular-table'),node=input?.closest<HTMLElement>('.mod-cell');if(!input||!block||!node||!host.model(block))return;
  event.stopImmediatePropagation();finishModularTextEditing();host.save();const cell=host.sync(block).cells[node.dataset.cell!],config=normalizeModularOverflow(cell.textOverflow,ids(cell));
  if(input.hasAttribute('data-overflow-enabled')){config.enabled=input.checked;if(config.enabled&&!config.boxIds.length)config.boxIds=ids(cell);}else config.boxIds=input.checked?[...new Set([...config.boxIds,input.dataset.overflowBox!])]:config.boxIds.filter(id=>id!==input.dataset.overflowBox);
  cell.textOverflow=config;const card=node.querySelector<HTMLElement>('.mod-card')!;card.dataset.textOverflow=JSON.stringify(config);node.querySelectorAll<HTMLInputElement>('[data-overflow-enabled]').forEach(toggle=>toggle.checked=config.enabled);node.querySelectorAll<HTMLInputElement>('[data-overflow-box]').forEach(box=>{box.disabled=!config.enabled;box.checked=config.boxIds.includes(box.dataset.overflowBox!);});host.persist(block);host.update(block);host.save();
 },true);
 document.addEventListener('dblclick',event=>{const target=(event.target as Element).closest('.mod-overflow-info>summary');if(!target||(event.target as Element).closest('[data-overflow-preview]'))return;const block=target.closest<HTMLElement>('.modular-table')!;if(!host.model(block))return;event.preventDefault();event.stopImmediatePropagation();edit(block,target.closest<HTMLElement>('.mod-cell')!.dataset.cell!);},true);
 document.addEventListener('click',event=>{const button=(event.target as Element).closest('[data-overflow-preview]');if(!button)return;const info=button.closest<HTMLDetailsElement>('.mod-overflow-info')!,block=info.closest<HTMLElement>('.modular-table')!;if(!host.model(block))return;event.preventDefault();event.stopImmediatePropagation();document.querySelectorAll<HTMLDetailsElement>('.mod-overflow-info[open]').forEach(other=>{if(other!==info){other.open=false;delete other.dataset.pinned;}});info.open=!info.open;info.dataset.pinned=String(info.open);host.update(block);},true);
 document.addEventListener('keydown',event=>{if(event.key!=='Escape'||document.querySelector('.mod-overflow-editor'))return;document.querySelectorAll<HTMLDetailsElement>('.modular-table:not(.mod-published) .mod-overflow-info[open]').forEach(info=>{info.open=false;delete info.dataset.pinned;});});
 let moving:{summary:HTMLElement;block:HTMLElement;key:string;pointer:number;startX:number;startY:number;x:number;y:number;active:boolean;timer:ReturnType<typeof setTimeout>}|null=null;
 document.addEventListener('pointerdown',event=>{const summary=(event.target as Element).closest<HTMLElement>('.mod-overflow-info>summary'),block=summary?.closest<HTMLElement>('.modular-table');if(!summary||!block||!host.model(block)||event.button!==0||(event.target as Element).closest('[data-overflow-preview]'))return;const key=summary.closest<HTMLElement>('.mod-cell')!.dataset.cell!,config=normalizeModularOverflow(host.model(block)!.cells[key].textOverflow,ids(host.model(block)!.cells[key]));moving={summary,block,key,pointer:event.pointerId,startX:event.clientX,startY:event.clientY,...config.button,active:false,timer:setTimeout(()=>{if(moving){moving.active=true;host.save();summary.setPointerCapture(event.pointerId);}},250)};},true);
 document.addEventListener('pointermove',event=>{if(!moving||moving.pointer!==event.pointerId||!moving.active)return;event.preventDefault();const card=moving.summary.closest<HTMLElement>('.mod-card')!,r=card.getBoundingClientRect(),b=moving.summary.getBoundingClientRect(),cell=host.model(moving.block)!.cells[moving.key],config=normalizeModularOverflow(cell.textOverflow,ids(cell));config.button=moveOverflowButton(moving.x+(event.clientX-moving.startX)/r.width,moving.y+(event.clientY-moving.startY)/r.height,r.width,r.height,b.width,b.height);cell.textOverflow=config;card.dataset.textOverflow=JSON.stringify(config);host.persist(moving.block);host.update(moving.block);},true);
 const stop=(event:PointerEvent)=>{if(!moving||moving.pointer!==event.pointerId)return;const old=moving;moving=null;clearTimeout(old.timer);if(old.summary.hasPointerCapture(event.pointerId))old.summary.releasePointerCapture(event.pointerId);if(old.active){old.summary.dataset.suppressClick='true';host.save();setTimeout(()=>delete old.summary.dataset.suppressClick,0);}};
 for(const type of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(type,stop,true);
 document.addEventListener('click',event=>{if((event.target as Element).closest('[data-suppress-click]')){event.preventDefault();event.stopImmediatePropagation();}},true);
}
