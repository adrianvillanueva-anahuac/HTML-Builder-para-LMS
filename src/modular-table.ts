import { createModular, neighbors, removeCell, removeLastTrack, resizeColumns, clamp, modularPalette, modularTextColor, type ModularModel, type ModularConnection } from './modular-model';
import { mountModularRuntime } from './modular-runtime.js';
import runtimeSource from './modular-runtime.js?raw';
import styles from './modular.css?raw';
import './modular.css';

const icon=(name:string)=>`<span class="material-symbols-outlined" aria-hidden="true">${name}</span>`;
const button=(action:string,name:string,label:string)=>`<button type="button" data-mod-action="${action}" title="${label}" aria-label="${label}">${icon(name)}</button>`;
const escape=(value:string)=>value.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const paletteOptions=()=>`<optgroup label="Institucionales">${modularPalette.slice(0,5).map(c=>`<option value="${c.value}">${c.name}</option>`).join('')}</optgroup><optgroup label="Claros">${modularPalette.slice(5).map(c=>`<option value="${c.value}">${c.name}</option>`).join('')}</optgroup>`;
const models=new WeakMap<HTMLElement,ModularModel>();
const runtimes=new Map<HTMLElement,ReturnType<typeof mountModularRuntime>>();
let installed=false;
let activeModal:HTMLElement|null=null;
export function getModularHTML() {return '<section class="lms-element is-rendered modular-table mod-pending" data-type="tabla_modular" data-mod-pending="true"></section>';}
const save=()=>window.saveHistoryState?.(true);
function updateCellAppearance(cell:HTMLElement,value:ModularModel['cells'][string]) {
  const card=cell.querySelector<HTMLElement>('.mod-card')!;
  card.style.setProperty('--card-color',value.color);card.style.setProperty('--card-text',modularTextColor(value.color));
  card.style.setProperty('--info-color',['#5d428c','#646464','#cdd5dc','#f3eef9','#f2f3f5'].includes(value.color.toLowerCase())?'#ff5900':'#5d428c');
  card.style.setProperty('--card-radius',value.radius+'px');card.style.setProperty('--card-padding',value.padding+'px');
  card.style.setProperty('--card-align',value.verticalAlign==='center'?'center':value.verticalAlign==='end'?'flex-end':'flex-start');
}
function sync(block:HTMLElement) {
  const model=models.get(block)!;
  block.querySelectorAll<HTMLElement>('.mod-cell').forEach(cell=>{
    // During a mode switch, focusout can run before the old placeholder is replaced.
    if(model.cells[cell.dataset.cell!]?.student||cell.querySelector('.mod-card[data-student=true]'))return;
    const text=cell.querySelector<HTMLElement>('.mod-text');
    const editing=cell.querySelector<HTMLElement>('.mod-info[data-editing=true] .mod-preview-content');
    if(text&&editing&&text.innerHTML!==editing.innerHTML)text.innerHTML=editing.innerHTML;
    if(text && model.cells[cell.dataset.cell!])model.cells[cell.dataset.cell!].html=text.innerHTML;
  });
  return model;
}
function persist(block:HTMLElement) {block.dataset.modular=JSON.stringify(models.get(block));}
function layout(block:HTMLElement) {
  const m=models.get(block)!;
  const grid=block.querySelector<HTMLElement>('.mod-grid')!;
  grid.style.gridTemplateColumns=m.columns.map(n=>`minmax(40px,${n}fr)`).join(' ');
  grid.style.gridTemplateRows=m.rows.map(n=>`${n}px`).join(' ');
  block.dataset.rowHeights=JSON.stringify(m.rows);
  grid.style.minWidth=`${m.columns.length*40+(m.columns.length-1)*m.gap}px`;
  block.style.setProperty('--mod-gap',m.gap+'px');block.style.setProperty('--mod-margin',m.margin+'%');
  block.dataset.joined=String(m.gap===0);
  block.dataset.overflow=String(m.overflow);
  block.style.setProperty('--mod-stroke-width',(m.stroke?.width||0)+'px');
  block.style.setProperty('--mod-stroke-color',m.stroke?.color||'#5d428c');
  const strokeRange=block.querySelector<HTMLInputElement>('[data-mod-stroke-width]');
  if(strokeRange){strokeRange.value=String(m.stroke?.width||0);strokeRange.closest('label')!.querySelector('output')!.textContent=(m.stroke?.width||0)+' px';}
  const overflowButton=block.querySelector<HTMLElement>('[data-mod-action=overflow]');
  if(overflowButton){overflowButton.setAttribute('aria-pressed',String(m.overflow));overflowButton.innerHTML=icon(m.overflow?'wrap_text':'more_horiz');}
  runtimes.get(block)?.update();
}
function render(block:HTMLElement) {
  if(connector?.block===block)closeConnector();
  runtimes.get(block)?.destroy();
  block.removeAttribute('data-pinned-cell');
  const m=models.get(block)!;
  block.classList.remove('mod-pending'); delete block.dataset.modPending;
  block.innerHTML=`<div class="block-toolbar absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full z-50 mod-editor"><div class="mod-tools"><div class="drag-handle cursor-grab" title="Mover tabla modular">${icon('drag_indicator')}</div>${button('row','table_rows','Agregar fila')}${button('column','view_column','Agregar columna')}<details><summary title="Separación entre rectángulos" aria-label="Separación entre rectángulos">${icon('space_bar')}</summary><div><label>Separación <output>${m.gap} px</output><input aria-label="Separación" data-mod-range="gap" type="range" min="0" max="50" value="${m.gap}"></label></div></details><details><summary title="Márgenes laterales" aria-label="Márgenes laterales">${icon('format_indent_increase')}</summary><div><label>Margen por lado <output>${m.margin}%</output><input aria-label="Margen por lado" data-mod-range="margin" type="range" min="0" max="40" value="${m.margin}"></label></div></details><button type="button" data-mod-action="overflow" title="Permitir desbordamiento de texto" aria-label="Permitir desbordamiento de texto" aria-pressed="${m.overflow}">${icon(m.overflow?'wrap_text':'more_horiz')}</button>${button('delete','delete','Eliminar tabla modular')}</div></div><div class="mod-shell"><div class="mod-scroll"><div class="mod-grid"></div></div></div>`;
  const grid=block.querySelector('.mod-grid')!;
  const globalMenu=(symbol:string,label:string,content:string)=>`<details><summary title="${label}" aria-label="${label}">${icon(symbol)}</summary><div>${content}</div></details>`;
  for(const [axis,symbol,label] of [['row','table_rows','Filas'],['column','view_column','Columnas']]) {
    block.querySelector(`[data-mod-action=${axis}]`)!.outerHTML=globalMenu(symbol,label,button(axis,'add',axis==='row'?'Agregar fila':'Agregar columna')+button('remove-'+axis,'remove',axis==='row'?'Quitar última fila':'Quitar última columna'));
    block.querySelector(`[data-mod-action=${axis}]`)!.parentElement!.classList.add('mod-track-actions');
  }
  const toolbar=block.querySelector('.block-toolbar .mod-tools')!;
  toolbar.querySelector('[data-mod-action=delete]')!.insertAdjacentHTML('beforebegin',
    globalMenu('border_color','Borde de todos los rectángulos',`<label>Grosor <output>${m.stroke?.width||0} px</output><input type="range" min="0" max="8" value="${m.stroke?.width||0}" data-mod-stroke-width aria-label="Grosor del borde"></label><div class="mod-palette">${modularPalette.map(c=>`<button type="button" data-mod-stroke-color="${c.value}" title="${c.name}" aria-label="Borde ${c.name}" style="background:${c.value};border:1px solid #aaa"></button>`).join('')}</div>`)+
    globalMenu('rounded_corner','Redondeado de todos los rectángulos',[0,6,12,20].map(n=>`<button type="button" data-mod-radius="${n}" title="Redondeado general ${n} px" aria-label="Redondeado general ${n} px">${n}</button>`).join(''))+
    button('distribute','horizontal_distribute','Igualar ancho de columnas'));
  block.querySelector<HTMLButtonElement>('[data-mod-action=remove-row]')!.disabled=m.rows.length<=1;
  block.querySelector<HTMLButtonElement>('[data-mod-action=remove-column]')!.disabled=m.columns.length<=1;
  m.rows.forEach((_,r)=>m.columns.forEach((_,c)=>{
    const key=`${r}:${c}`, value=m.cells[key];
    const cell=document.createElement('div');cell.className='mod-cell';cell.dataset.cell=key;
    cell.dataset.row=String(r);
    if(value) {
      const card=document.createElement('div'); card.className='mod-card';
      card.style.setProperty('--card-color',value.color);card.style.setProperty('--card-radius',value.radius+'px');card.style.setProperty('--card-padding',value.padding+'px');
      card.style.setProperty('--card-text',modularTextColor(value.color));
      card.style.setProperty('--info-color',['#5d428c','#646464','#cdd5dc','#f3eef9','#f2f3f5'].includes(value.color.toLowerCase())?'#ff5900':'#5d428c');
      card.style.setProperty('--card-align',value.verticalAlign==='center'?'center':value.verticalAlign==='end'?'flex-end':'flex-start');
      card.dataset.student=String(!!value.student);
      const text=document.createElement('div');text.className=value.student?'mod-text mod-student-placeholder':'mod-text editable-text';text.innerHTML=value.student?'':value.html;card.append(text);
      const info=document.createElement('details');info.className='mod-info';info.innerHTML='<summary aria-label="Mostrar texto completo">+ info</summary><div class="mod-preview"><div class="mod-preview-content" tabindex="0" role="button" aria-label="Editar rectángulo"></div></div>';card.append(info);cell.append(card);
      const menu=(symbol:string,label:string,content:string)=>`<details><summary title="${label}" aria-label="${label}">${icon(symbol)}</summary><div>${content}</div></details>`;
      const choice=(field:string,v:string,label:string,symbol:string)=>`<button type="button" data-cell-field="${field}" data-value="${v}" title="${label}" aria-label="${label}">${icon(symbol)}</button>`;
      cell.insertAdjacentHTML('beforeend',`<div class="mod-cell-tools mod-tools mod-editor">${menu('format_color_fill','Color del rectángulo',`<div class="mod-palette">${modularPalette.map(c=>`<button type="button" data-cell-field="color" data-value="${c.value}" title="${c.name}" aria-label="${c.name}" style="background:${c.value};border:1px solid #aaa"></button>`).join('')}</div>`)}${menu('rounded_corner','Redondeado',[0,6,12,20].map(n=>choice('radius',String(n),`Redondeado ${n} px`,'rounded_corner').replace('</button>',`<small>${n}</small></button>`)).join(''))}${menu('padding','Margen del texto',`<label>Margen <output>${value.padding} px</output><input aria-label="Margen del texto" data-cell-padding type="range" min="0" max="50" value="${value.padding}"></label>`)}${menu('vertical_align_center','Alineación vertical',choice('verticalAlign','start','Texto arriba','vertical_align_top')+choice('verticalAlign','center','Texto centrado verticalmente','vertical_align_center')+choice('verticalAlign','end','Texto abajo','vertical_align_bottom'))}${button('remove','delete','Eliminar rectángulo')}</div>`);
      if(document.body.classList.contains('exercise-editor'))cell.querySelector('.mod-cell-tools')!.insertAdjacentHTML('afterbegin',`<button type="button" role="switch" aria-checked="${!!value.student}" data-mod-action="student" title="Texto para alumno" aria-label="Texto para alumno">${icon(value.student?'toggle_on':'toggle_off')}</button>`);
    } else cell.innerHTML=button('add','add',`Crear rectángulo ${r+1}, ${c+1}`).replace('<button ','<button class="mod-add mod-editor" ');
    if(c<m.columns.length-1)cell.insertAdjacentHTML('beforeend',`<button class="mod-editor mod-resize mod-resize-col" data-resize-col="${c}" aria-label="Ajustar columna ${c+1}" title="Arrastra para ajustar columna; flechas para ajustar con teclado"></button>`);
    cell.insertAdjacentHTML('beforeend',`<button class="mod-editor mod-resize mod-resize-row" data-resize-row="${r}" aria-label="Ajustar fila ${r+1}" title="Arrastra para ajustar fila; flechas para ajustar con teclado"></button>`);
    if(c===0)cell.insertAdjacentHTML('beforeend',`<div class="mod-row-tools mod-tools mod-editor" data-row-tools="${r}"><details><summary title="Color de fila ${r+1}" aria-label="Color de fila ${r+1}">${icon('format_color_fill')}</summary><div><div class="mod-palette">${modularPalette.map(color=>`<button type="button" data-row-color="${color.value}" data-color-row="${r}" title="${color.name}" aria-label="Fila ${r+1}: ${color.name}" style="background:${color.value};border:1px solid #aaa"></button>`).join('')}</div></div></details></div>`);
    grid.append(cell);
  }));
  neighbors(m).forEach(([from,to])=>{
    const edge=m.connections.find(e=>e.from===from&&e.to===to);
    const el=document.createElement('div');el.className='mod-edge';el.dataset.from=from;el.dataset.to=to;el.dataset.direction=edge?.direction||'none';
    el.innerHTML=(edge?`<svg xmlns="http://www.w3.org/2000/svg" aria-label="Conexión ${edge.direction}" role="img"><path fill="${escape(edge.fill)}" stroke="${escape(edge.stroke)}" stroke-width="${edge.strokeWidth??2}" ${edge.dotted?'stroke-dasharray="3 3"':''}/></svg>`:'')+button('connect','conversion_path','Configurar conexión').replace('<button ','<button class="mod-editor" ');
    grid.append(el);
  });
  block.querySelector<HTMLButtonElement>('[data-mod-action=row]')!.disabled=m.rows.length>=10;
  block.querySelector<HTMLButtonElement>('[data-mod-action=column]')!.disabled=m.columns.length>=10;
  layout(block);persist(block);runtimes.set(block,mountModularRuntime(block));
}
function modal(title:string,content:string,onConfirm:(panel:HTMLElement)=>boolean|void,onCancel=()=>{}) {
  if(activeModal)return;
  const previous=document.activeElement as HTMLElement;
  const overlay=document.createElement('div');overlay.className='mod-modal';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',title);
  overlay.innerHTML=`<section><h2>${title}</h2>${content}<footer><button type="button" data-cancel>Cancelar</button><button type="button" data-confirm>Confirmar</button></footer></section>`;
  const close=()=>{document.getElementById('rtf-toolbar')?.classList.add('hidden');window.currentEditableText=null;overlay.remove();activeModal=null;previous?.focus();};
  overlay.querySelector('[data-cancel]')!.addEventListener('click',()=>{close();onCancel();});
  overlay.querySelector('[data-confirm]')!.addEventListener('click',()=>{if(onConfirm(overlay)!==false)close();});
  overlay.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();onCancel();}
    if(e.key==='Tab') {
      const nodes=Array.from(overlay.querySelectorAll<HTMLElement>('button,input,select,[contenteditable]'));
      if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes.at(-1)?.focus();}
      if(!e.shiftKey&&document.activeElement===nodes.at(-1)){e.preventDefault();nodes[0]?.focus();}
    }
  });
  (document.getElementById('scroll-container')||document.body).append(overlay);activeModal=overlay;
  overlay.querySelector<HTMLElement>('input,button')?.focus();return overlay;
}
function chooseGrid(block:HTMLElement) {
  if(activeModal)return;
  const dialog=modal('Tabla modular: define la retícula','<label>Filas <input aria-label="Filas" type="number" min="1" max="10" value="2"></label><label>Columnas <input aria-label="Columnas" type="number" min="1" max="10" value="2"></label><div class="mod-picker"></div><p data-size>2 × 2</p>',panel=>{
    const rows=panel.querySelector<HTMLInputElement>('[aria-label=Filas]')!, cols=panel.querySelector<HTMLInputElement>('[aria-label=Columnas]')!;
    if(!rows.reportValidity()||!cols.reportValidity())return false;
    models.set(block,createModular(Number(rows.value),Number(cols.value)));render(block);window.checkEmptyState?.();save();
  },()=>{block.remove();window.checkEmptyState?.();save();});
  if(!dialog)return;
  const update=()=>{
    const r=Number(dialog.querySelector<HTMLInputElement>('[aria-label=Filas]')!.value),c=Number(dialog.querySelector<HTMLInputElement>('[aria-label=Columnas]')!.value);
    dialog.querySelector('[data-size]')!.textContent=`${r} × ${c}`;
    dialog.querySelectorAll<HTMLElement>('[data-pick]').forEach(el=>{const [y,x]=el.dataset.pick!.split(':').map(Number);el.dataset.selected=String(y<=r&&x<=c);});
  };
  for(let r=1;r<=10;r++)for(let c=1;c<=10;c++) {
    const b=document.createElement('button');b.type='button';b.dataset.pick=`${r}:${c}`;b.setAttribute('aria-label',`${r} filas por ${c} columnas`);
    b.onclick=()=>{dialog.querySelector<HTMLInputElement>('[aria-label=Filas]')!.value=String(r);dialog.querySelector<HTMLInputElement>('[aria-label=Columnas]')!.value=String(c);update();};
    dialog.querySelector('.mod-picker')!.append(b);
  }
  dialog.addEventListener('input',update);update();
}
function editPreview(block:HTMLElement,preview:HTMLElement) {
  const info=preview.closest<HTMLDetailsElement>('.mod-info')!;
  if(info.dataset.editing==='true')return;
  closeConnector();info.open=true;info.dataset.editing='true';
  const cell=preview.closest<HTMLElement>('.mod-cell')!;
  const tools=cell.querySelector<HTMLElement>(':scope > .mod-cell-tools')!.cloneNode(true) as HTMLElement;
  tools.className='mod-preview-tools mod-tools mod-editor';
  tools.querySelector('[data-mod-action=remove]')?.remove();
  tools.querySelectorAll<HTMLDetailsElement>('details').forEach(menu=>{menu.open=false;delete menu.dataset.menuPinned;menu.querySelector('div')?.removeAttribute('style');});
  tools.insertAdjacentHTML('beforeend',button('confirm-preview','check','Confirmar edición'));
  preview.before(tools);preview.classList.add('editable-text');preview.contentEditable='true';
  preview.focus();preview.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));
}
function editCell(block:HTMLElement,key:string) {
  closeConnector();
  const m=sync(block),cell=m.cells[key];if(!cell)return;
  const dialog=modal('Editar rectángulo',`<p>Doble clic en el texto para usar las herramientas de formato.</p><label>Color <select aria-label="Color del rectángulo">${paletteOptions()}</select></label><label>Redondeado <select aria-label="Redondeado">${[0,6,12,20].map(n=>`<option value="${n}" ${n===cell.radius?'selected':''}>${n} px</option>`).join('')}</select></label><label>Margen del texto <input aria-label="Margen del texto" type="range" min="0" max="50" value="${cell.padding}"><output>${cell.padding} px</output></label><div class="mod-draft editable-text" contenteditable="true" aria-label="Texto del rectángulo"></div>`,panel=>{
    cell.html=panel.querySelector('.mod-draft')!.innerHTML;
    cell.color=panel.querySelector<HTMLSelectElement>('[aria-label="Color del rectángulo"]')!.value;
    cell.radius=Number(panel.querySelector<HTMLSelectElement>('[aria-label=Redondeado]')!.value);
    cell.padding=Number(panel.querySelector<HTMLInputElement>('input[type=range]')!.value);
    render(block);save();
  });
  if(!dialog)return;
  const appearance=document.createElement('div');appearance.className='mod-tools mod-draft-tools';
  const labels=Array.from(dialog.querySelectorAll<HTMLElement>('section > label'));
  labels.forEach((label,index)=>{
    const names=['Color del rectángulo','Redondeado','Margen del texto'],symbols=['format_color_fill','rounded_corner','padding'];
    const menu=document.createElement('details');menu.innerHTML=`<summary title="${names[index]}" aria-label="${names[index]}">${icon(symbols[index])}</summary><div></div>`;
    menu.querySelector('div')!.append(label);appearance.append(menu);
    menu.addEventListener('pointerenter',()=>{appearance.querySelectorAll<HTMLDetailsElement>('details').forEach(other=>{other.open=other===menu;});});
    menu.addEventListener('pointerleave',()=>{if(menu.dataset.pinned!=='true')menu.open=false;});
    menu.querySelector('summary')!.addEventListener('click',event=>{event.preventDefault();menu.open=true;menu.dataset.pinned='true';});
  });
  dialog.querySelector('.mod-draft')!.before(appearance);
  dialog.addEventListener('click',event=>appearance.querySelectorAll<HTMLDetailsElement>('details[open]').forEach(menu=>{if(!menu.contains(event.target as Node)){menu.open=false;delete menu.dataset.pinned;}}));
  dialog.querySelector<HTMLSelectElement>('[aria-label="Color del rectángulo"]')!.value=modularPalette.some(c=>c.value===cell.color)?cell.color:'#f3eef9';
  const draft=dialog.querySelector<HTMLElement>('.mod-draft')!;draft.innerHTML=cell.html;
  const preview=()=>{const color=dialog.querySelector<HTMLSelectElement>('[aria-label="Color del rectángulo"]')!.value;draft.style.backgroundColor=color;draft.style.color=modularTextColor(color);draft.style.borderRadius=dialog.querySelector<HTMLSelectElement>('[aria-label=Redondeado]')!.value+'px';const padding=dialog.querySelector<HTMLInputElement>('input[type=range]')!.value;draft.style.padding=padding+'px';dialog.querySelector('output')!.textContent=padding+' px';};
  dialog.addEventListener('input',preview);preview();
  draft.focus();draft.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));
}
let connector:{block:HTMLElement;edge:HTMLElement;panel:HTMLElement;pinned:boolean}|null=null;
let connectorTimer:ReturnType<typeof setTimeout>;
function closeConnector(){clearTimeout(connectorTimer);connector?.panel.remove();connector?.edge.removeAttribute('data-menu-open');connector=null;}
function positionConnector(){
  if(!connector)return;
  const {edge,panel}=connector;
  if(!edge.isConnected){closeConnector();return;}
  const rect=edge.getBoundingClientRect();
  panel.style.left=Math.max(8,Math.min(rect.left+rect.width/2-140,innerWidth-292))+'px';
  panel.style.top=(rect.top>190?rect.top-52:rect.bottom+6)+'px';
}
function editConnection(block:HTMLElement,edge:HTMLElement,pinned=true) {
  if(connector?.edge===edge){connector.pinned ||= pinned;clearTimeout(connectorTimer);return;}
  if(connector?.pinned&&!pinned)return;
  closeConnector();
  const from=edge.dataset.from!,to=edge.dataset.to!;
  const panel=document.createElement('div');panel.className='mod-connector-popover mod-tools mod-editor';panel.setAttribute('role','toolbar');panel.setAttribute('aria-label','Opciones de conexión');
  const swatches=(field:string)=>modularPalette.map(c=>`<button type="button" data-edge-field="${field}" data-value="${c.value}" title="${c.name}" aria-label="${field==='fill'?'Relleno':'Contorno'} ${c.name}" style="background:${c.value};border:1px solid #aaa"></button>`).join('');
  panel.innerHTML=`${[['forward','arrow_forward','Hacia derecha o abajo'],['backward','arrow_back','Hacia izquierda o arriba'],['both','swap_horiz','Bidireccional'],['none','horizontal_rule','Sin dirección']].map(([v,i,label])=>`<button type="button" data-edge-field="direction" data-value="${v}" title="${label}" aria-label="${label}">${icon(i)}</button>`).join('')}<details><summary title="Trazo" aria-label="Trazo">${icon('line_style')}</summary><div>${[['false','horizontal_rule','Continuo'],['true','more_horiz','Punteado']].map(([v,i,l])=>`<button type="button" data-edge-field="dotted" data-value="${v}" title="${l}" aria-label="${l}">${icon(i)}</button>`).join('')}</div></details><details><summary title="Relleno de flecha" aria-label="Relleno de flecha">${icon('format_color_fill')}</summary><div class="mod-palette">${swatches('fill')}</div></details><details><summary title="Contorno de flecha" aria-label="Contorno de flecha">${icon('border_color')}</summary><div class="mod-palette">${swatches('stroke')}</div></details><button type="button" data-edge-field="remove" title="Eliminar conexión" aria-label="Eliminar conexión">${icon('delete')}</button>`;
  connector={block,edge,panel,pinned};edge.dataset.menuOpen='true';document.body.append(panel);positionConnector();
  for(const field of ['fill','stroke'])panel.querySelector(`[data-edge-field=${field}]`)!.parentElement!.insertAdjacentHTML('afterbegin',`<button type="button" data-edge-field="${field}" data-value="none" title="${field==='fill'?'Sin relleno':'Sin contorno'}" aria-label="${field==='fill'?'Sin relleno':'Sin contorno'}">${icon('block')}</button>`);
  const current=models.get(block)!.connections.find(e=>e.from===from&&e.to===to);
  panel.querySelector('[data-edge-field=dotted]')!.parentElement!.insertAdjacentHTML('beforeend',`<label>Grosor <output>${current?.strokeWidth??2} px</output><input type="range" min="1" max="10" value="${current?.strokeWidth??2}" aria-label="Grosor del conector" data-edge-width></label>`);
  panel.addEventListener('input',event=>{
    const input=event.target as HTMLInputElement;if(!input.hasAttribute('data-edge-width'))return;
    const m=sync(block);let value=m.connections.find(e=>e.from===from&&e.to===to);
    if(!value){value={from,to,direction:'forward',fill:'#5d428c',stroke:'#5d428c',dotted:false};m.connections.push(value);edge.dataset.direction=value.direction;edge.insertAdjacentHTML('afterbegin',`<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Conexión forward"><path fill="#5d428c" stroke="#5d428c"/></svg>`);}
    value.strokeWidth=clamp(Number(input.value),1,10);input.closest('label')!.querySelector('output')!.textContent=value.strokeWidth+' px';edge.querySelector('path')!.setAttribute('stroke-width',String(value.strokeWidth));persist(block);runtimes.get(block)?.update();
  });
  panel.addEventListener('change',()=>save());
  panel.addEventListener('pointerenter',()=>clearTimeout(connectorTimer));panel.addEventListener('pointerleave',deferConnectorClose);
  panel.addEventListener('click',event=>{
    const target=event.target as HTMLElement;
    if(connector)connector.pinned=true;
    panel.querySelectorAll('details[open]').forEach(menu=>{if(!menu.contains(target))menu.removeAttribute('open');});
    const choice=target.closest<HTMLElement>('[data-edge-field]');if(!choice)return;
    const m=sync(block);let value=m.connections.find(e=>e.from===from&&e.to===to);
    if(choice.dataset.edgeField==='remove'){m.connections=m.connections.filter(e=>e!==value);edge.querySelector('svg')?.remove();}
    else {
      if(!value){value={from,to,direction:'forward',fill:'#5d428c',stroke:'#5d428c',dotted:false};m.connections.push(value);}
      const field=choice.dataset.edgeField!;
      if(field==='dotted')value.dotted=choice.dataset.value==='true';
      else if(field==='direction')value.direction=choice.dataset.value as ModularConnection['direction'];
      else if(field==='fill'||field==='stroke')value[field]=choice.dataset.value!;
      edge.dataset.direction=value.direction;
      edge.querySelector('svg')?.remove();
      edge.insertAdjacentHTML('afterbegin',`<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Conexión ${value.direction}"><path fill="${value.fill}" stroke="${value.stroke}" stroke-width="${value.strokeWidth??2}" ${value.dotted?'stroke-dasharray="3 3"':''}/></svg>`);
    }
    persist(block);runtimes.get(block)?.update();save();
  });
}
function deferConnectorClose(){clearTimeout(connectorTimer);connectorTimer=setTimeout(()=>{if(connector&&!connector.pinned&&!connector.panel.matches(':hover')&&!connector.edge.matches(':hover'))closeConnector();},160);}
export function initModularTables() {
  runtimes.forEach((runtime,block)=>{if(!block.isConnected){runtime.destroy();runtimes.delete(block);}});
  document.querySelectorAll<HTMLElement>('#canvas-container-outer .modular-table').forEach(block=>{
    if(block.dataset.modPending){chooseGrid(block);return;}
    if(runtimes.has(block))return;
    try {const m=JSON.parse(block.dataset.modular||'');if(m.version!==1||!Array.isArray(m.rows)||!Array.isArray(m.columns)||m.rows.length>10||m.columns.length>10)return;models.set(block,m);render(block);} catch { /* Ignore malformed imported blocks. */ }
  });
}
function positionCellMenus() {
  document.querySelectorAll<HTMLDetailsElement>('.mod-cell-tools details[open],.mod-row-tools details[open],.mod-preview-tools details[open]').forEach(menu=>{
    const panel=menu.querySelector<HTMLElement>(':scope > div'),anchor=menu.querySelector('summary');
    if(!panel||!anchor)return;
    const rect=anchor.getBoundingClientRect();
    const bounds=document.getElementById('scroll-container')?.getBoundingClientRect();
    const minX=Math.max(8,(bounds?.left||0)+8),maxX=Math.min(window.innerWidth-8,(bounds?.right||window.innerWidth)-8);
    const minY=Math.max(8,(bounds?.top||0)+8),maxY=Math.min(window.innerHeight-8,(bounds?.bottom||window.innerHeight)-8);
    panel.style.maxWidth=Math.max(0,maxX-minX)+'px';panel.style.maxHeight=Math.max(0,maxY-minY)+'px';
    const width=panel.offsetWidth,height=panel.offsetHeight;
    const left=Math.max(minX,Math.min(rect.right-width,maxX-width));
    const top=rect.bottom+height+4<=maxY?Math.max(minY,rect.bottom+4):Math.max(minY,rect.top-height-4);
    panel.style.left=left+'px';panel.style.top=top+'px';
  });
}
export function setupModularTables() {
  if(installed)return;installed=true;
  window.addEventListener('scroll',positionConnector,true);window.addEventListener('resize',positionConnector);
  window.addEventListener('scroll',positionCellMenus,true);window.addEventListener('resize',positionCellMenus);
  document.addEventListener('toggle',event=>{if((event.target as HTMLElement).matches?.('.mod-cell-tools details,.mod-row-tools details,.mod-preview-tools details'))positionCellMenus();},true);
  document.addEventListener('pointerover',event=>{
    const target=event.target as HTMLElement,trigger=target.closest?.<HTMLElement>('[data-mod-action=connect]');
    if(target.closest?.('.mod-info'))closeConnector();
    const menu=target.closest?.<HTMLDetailsElement>('.modular-table .mod-tools details');
    if(menu){
      const toolbar=menu.closest('.mod-tools')!;
      if(!toolbar.querySelector('details[data-menu-pinned=true]')||menu.dataset.menuPinned==='true'){
        toolbar.querySelectorAll<HTMLDetailsElement>('details[open]').forEach(other=>{if(other!==menu)other.open=false;});
        menu.open=true;
      }
    }
    const cell=target.closest?.<HTMLElement>('.mod-cell');
    if(cell)cell.closest('.modular-table')!.querySelectorAll<HTMLElement>('[data-row-tools]').forEach(tool=>tool.classList.toggle('is-row-hovered',tool.dataset.rowTools===cell.dataset.row));
    if(trigger){const block=trigger.closest<HTMLElement>('.modular-table')!;if(models.has(block))editConnection(block,trigger.closest<HTMLElement>('.mod-edge')!,false);}
  });
  document.addEventListener('pointerout',event=>{
    const target=event.target as HTMLElement;
    if(target.closest?.('.mod-edge'))deferConnectorClose();
    const menu=target.closest?.<HTMLDetailsElement>('.modular-table .mod-tools details');
    if(menu)setTimeout(()=>{if(menu.isConnected&&!menu.matches(':hover')&&menu.dataset.menuPinned!=='true')menu.open=false;},160);
    const block=target.closest?.('.modular-table');
    if(block)setTimeout(()=>block.querySelectorAll<HTMLElement>('[data-row-tools]').forEach(tool=>{
      const row=tool.dataset.rowTools;
      if(!block.querySelector(`.mod-cell[data-row="${row}"]:hover`)&&!tool.querySelector('details[open]'))tool.classList.remove('is-row-hovered');
    }),160);
  });
  document.addEventListener('click',event=>{
    const target=event.target as HTMLElement;
    if(!target.closest)return;
    if(connector&&!connector.panel.contains(target)&&!connector.edge.contains(target))closeConnector();
    if(target.closest('.mod-modal,#rtf-toolbar,.mod-connector-popover'))return;
    document.querySelectorAll<HTMLElement>('.mod-tools details[open]').forEach(menu=>{if(!menu.contains(target)){menu.removeAttribute('open');delete menu.dataset.menuPinned;}});
    const summary=target.closest('summary'),menu=summary?.closest<HTMLDetailsElement>('.modular-table .mod-tools details');
    if(menu){event.preventDefault();menu.open=true;menu.dataset.menuPinned='true';}
    const cell=target.closest<HTMLElement>('.mod-cell');
    document.querySelectorAll<HTMLElement>('.modular-table[data-pinned-cell]').forEach(block=>{
      if(cell?.closest('.modular-table')!==block){block.removeAttribute('data-pinned-cell');block.querySelectorAll('.mod-cell-selected').forEach(el=>el.classList.remove('mod-cell-selected'));}
    });
    if(!cell)return;
    const block=cell.closest<HTMLElement>('.modular-table')!;
    if(target.closest('[contenteditable=true]')){block.removeAttribute('data-pinned-cell');cell.classList.remove('mod-cell-selected');return;}
    block.querySelectorAll('.mod-cell-selected').forEach(el=>el.classList.remove('mod-cell-selected'));
    cell.classList.add('mod-cell-selected');block.dataset.pinnedCell=cell.dataset.cell;
  },true);
  document.addEventListener('click',event=>{
    const target=event.target as HTMLElement;if(!target.closest)return;
    const block=target.closest<HTMLElement>('.modular-table');
    if(!block||!models.has(block))return;
    const rowColor=target.closest<HTMLElement>('[data-row-color]');
    if(rowColor){
      event.preventDefault();event.stopPropagation();const m=sync(block),row=rowColor.dataset.colorRow!;
      Object.entries(m.cells).forEach(([key,value])=>{if(key.split(':')[0]===row){value.color=rowColor.dataset.rowColor!;updateCellAppearance(block.querySelector<HTMLElement>(`.mod-cell[data-cell="${key}"]`)!,value);}});
      persist(block);save();return;
    }
    const globalChoice=target.closest<HTMLElement>('[data-mod-stroke-color],[data-mod-radius]');
    if(globalChoice){
      event.preventDefault();event.stopPropagation();const m=sync(block);
      if(globalChoice.dataset.modStrokeColor)m.stroke={width:m.stroke?.width||1,color:globalChoice.dataset.modStrokeColor};
      if(globalChoice.dataset.modRadius!==undefined){m.defaultRadius=Number(globalChoice.dataset.modRadius);Object.values(m.cells).forEach(c=>c.radius=m.defaultRadius!);block.querySelectorAll<HTMLElement>('.mod-cell').forEach(c=>{if(m.cells[c.dataset.cell!])updateCellAppearance(c,m.cells[c.dataset.cell!]);});}
      layout(block);persist(block);save();return;
    }
    const choice=target.closest<HTMLElement>('[data-cell-field]');
    if(choice){
      event.preventDefault();event.stopPropagation();
      const cell=choice.closest<HTMLElement>('.mod-cell')!,value=sync(block).cells[cell.dataset.cell!],field=choice.dataset.cellField,v=choice.dataset.value!;
      if(field==='color')value.color=v;
      if(field==='radius')value.radius=Number(v);
      if(field==='verticalAlign')value.verticalAlign=v as 'start'|'center'|'end';
      updateCellAppearance(cell,value);persist(block);runtimes.get(block)?.update();save();return;
    }
    if(target.closest('.mod-preview-content'))return;
    const action=target.closest<HTMLElement>('[data-mod-action]')?.dataset.modAction;if(!action)return;
    event.preventDefault();event.stopPropagation();
    const m=sync(block),key=target.closest<HTMLElement>('.mod-cell')?.dataset.cell;
    if(action==='confirm-preview'){
      const info=target.closest<HTMLDetailsElement>('.mod-info')!,preview=info.querySelector<HTMLElement>('.mod-preview-content')!;
      delete info.dataset.editing;preview.contentEditable='false';preview.classList.remove('editable-text');info.querySelector('.mod-preview-tools')?.remove();info.open=false;
      document.getElementById('rtf-toolbar')?.classList.add('hidden');window.currentEditableText=null;
      persist(block);runtimes.get(block)?.update();save();return;
    }
    if(action==='edit'||action==='color'){editCell(block,key!);return;}
    if(action==='connect'){editConnection(block,target.closest<HTMLElement>('.mod-edge')!);return;}
    if(action==='delete'){block.remove();window.checkEmptyState?.();save();return;}
    if(action==='add')m.cells[key!]={html:'',color:'#f3eef9',radius:m.defaultRadius??6,padding:12};
    if(action==='student'&&document.body.classList.contains('exercise-editor'))m.cells[key!].student=!m.cells[key!].student;
    if(action==='remove-row'||action==='remove-column'){
      const axis=action==='remove-row'?'row':'column',tracks=axis==='row'?m.rows:m.columns;
      if(tracks.length<=1)return;
      const occupied=Object.keys(m.cells).some(k=>Number(k.split(':')[axis==='row'?0:1])===tracks.length-1);
      if(occupied&&!window.confirm(`¿Quitar la última ${axis==='row'?'fila':'columna'} y sus rectángulos y conexiones? Puedes deshacer esta acción.`))return;
      removeLastTrack(m,axis);
    }
    if(action==='distribute')m.columns=m.columns.map(()=>1);
    if(action==='remove')removeCell(m,key!);
    if(action==='row'&&m.rows.length<10)m.rows.push(120);
    if(action==='column'&&m.columns.length<10)m.columns.push(m.columns.reduce((a,b)=>a+b,0)/m.columns.length);
    if(action==='overflow')m.overflow=!m.overflow;
    render(block);save();
  });
  document.addEventListener('dblclick',event=>{
    const target=event.target as HTMLElement,preview=target.closest?.<HTMLElement>('.mod-preview-content');
    if(!preview)return;
    const block=preview.closest<HTMLElement>('.modular-table');
    if(!block||!models.has(block))return;
    if(preview.closest<HTMLElement>('.mod-info')?.dataset.editing==='true')return;
    event.preventDefault();event.stopPropagation();editPreview(block,preview);
  });
  document.addEventListener('input',event=>{
    const target=event.target as HTMLInputElement,block=target.closest<HTMLElement>('.modular-table');if(!block||!models.has(block))return;
    const m=sync(block);
    if(target.hasAttribute('data-mod-stroke-width')){m.stroke={width:clamp(Number(target.value),0,8),color:m.stroke?.color||'#5d428c'};target.closest('label')!.querySelector('output')!.textContent=m.stroke.width+' px';layout(block);}
    if(target.hasAttribute('data-cell-padding')){const cell=target.closest<HTMLElement>('.mod-cell')!,value=m.cells[cell.dataset.cell!];value.padding=clamp(Number(target.value),0,50);target.closest('label')!.querySelector('output')!.textContent=value.padding+' px';updateCellAppearance(cell,value);runtimes.get(block)?.update();}
    if(target.dataset.modRange){const field=target.dataset.modRange as 'gap'|'margin';m[field]=clamp(Number(target.value),0,field==='gap'?50:40);target.setAttribute('value',String(m[field]));target.closest('label')!.querySelector('output')!.textContent=m[field]+(field==='gap'?' px':'%');layout(block);}
    persist(block);
  });
  document.addEventListener('change',event=>{if((event.target as HTMLElement).closest?.('.modular-table'))save();});
  document.addEventListener('focusout',event=>{const block=(event.target as HTMLElement).closest?.<HTMLElement>('.modular-table');if(block&&models.has(block)){sync(block);persist(block);}});
  document.addEventListener('keydown',event=>{
    const target=event.target as HTMLElement;
    if(event.key==='Escape'){
      closeConnector();
      document.querySelectorAll<HTMLDetailsElement>('.modular-table .mod-tools details[open]').forEach(menu=>{menu.open=false;delete menu.dataset.menuPinned;});
    }
    if(target.matches?.('.mod-preview-content')&&target.contentEditable!=='true'&&(event.key==='Enter'||event.key===' ')){event.preventDefault();const block=target.closest<HTMLElement>('.modular-table');if(block&&models.has(block))editPreview(block,target);}
    if(!target.matches?.('.mod-resize')||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();const block=target.closest<HTMLElement>('.modular-table')!,m=sync(block),delta=event.key==='ArrowLeft'||event.key==='ArrowUp'?-10:10;
    if(target.dataset.resizeCol!==undefined)m.columns=resizeColumns(m.columns,Number(target.dataset.resizeCol),delta,block.querySelector<HTMLElement>('.mod-grid')!.clientWidth-(m.columns.length-1)*m.gap);
    else {const row=Number(target.dataset.resizeRow);const height=m.overflow?target.closest<HTMLElement>('.mod-cell')!.getBoundingClientRect().height:m.rows[row];m.overflow=false;m.rows[row]=clamp(height+delta,40,800);}
    layout(block);persist(block);save();
  });
  document.addEventListener('pointerdown',event=>{
    const target=(event.target as HTMLElement).closest<HTMLElement>('.mod-resize');if(!target)return;
    event.preventDefault();event.stopPropagation();
    const block=target.closest<HTMLElement>('.modular-table')!,m=sync(block),columns=[...m.columns],rows=[...m.rows],startX=event.clientX,startY=event.clientY;
    if(target.dataset.resizeRow!==undefined&&m.overflow)rows[Number(target.dataset.resizeRow)]=target.closest<HTMLElement>('.mod-cell')!.getBoundingClientRect().height;
    save();window.modularResizing=true;target.setPointerCapture(event.pointerId);
    const move=(e:PointerEvent)=>{
      if(target.dataset.resizeCol!==undefined)m.columns=resizeColumns(columns,Number(target.dataset.resizeCol),e.clientX-startX,block.querySelector<HTMLElement>('.mod-grid')!.clientWidth-(m.columns.length-1)*m.gap);
      else {m.overflow=false;m.rows[Number(target.dataset.resizeRow)]=clamp(rows[Number(target.dataset.resizeRow)]+e.clientY-startY,40,800);}
      layout(block);
    };
    const end=()=>{target.removeEventListener('pointermove',move);target.removeEventListener('pointerup',end);target.removeEventListener('pointercancel',end);window.modularResizing=false;persist(block);save();};
    target.addEventListener('pointermove',move);target.addEventListener('pointerup',end);target.addEventListener('pointercancel',end);
  },true);
}
export function prepareModularExport(root:HTMLElement) {
  root.querySelectorAll<HTMLElement>('.modular-table').forEach(block=>{
    if(block.dataset.modPending){block.remove();return;}
    block.classList.add('mod-published');delete block.dataset.modular;
    block.querySelectorAll<HTMLElement>('.mod-card[data-student=true] .mod-text').forEach(text=>{
      text.innerHTML='';text.classList.remove('mod-student-placeholder');text.classList.add('student-rich-answer');text.setAttribute('role','textbox');text.setAttribute('aria-multiline','true');text.setAttribute('aria-label','Respuesta del alumno');
    });
    block.querySelectorAll('.mod-editor').forEach(el=>el.remove());
    block.querySelectorAll<HTMLElement>('.mod-info').forEach(el=>delete el.dataset.editing);
    block.querySelectorAll<HTMLElement>('.mod-preview-content').forEach(el=>{el.removeAttribute('contenteditable');el.classList.remove('editable-text');});
    block.querySelectorAll('.mod-preview-content').forEach(el=>{el.removeAttribute('role');el.removeAttribute('tabindex');el.removeAttribute('aria-label');});
    block.querySelectorAll('details[open]').forEach(el=>el.removeAttribute('open'));
  });
}
// Persist authored data only, not hover panels, measured paths or transient previews.
export function compactModularState(root:HTMLElement) {
  root.querySelectorAll<HTMLElement>('.modular-table').forEach(block=>{
    if(block.dataset.modPending){block.remove();return;}
    try {
      const model=JSON.parse(block.dataset.modular!);
      block.querySelectorAll<HTMLElement>('.mod-cell').forEach(cell=>{
        const text=cell.querySelector('.mod-text');
        if(text&&model.cells[cell.dataset.cell!]&&!model.cells[cell.dataset.cell!].student)model.cells[cell.dataset.cell!].html=text.innerHTML;
      });
      block.dataset.modular=JSON.stringify(model);block.innerHTML='';block.removeAttribute('data-pinned-cell');
    }catch { /* Preserve unknown imported content. */ }
  });
}
export const modularExportAssets=`<style>${styles}</style><script>${runtimeSource.replace('export function','function')}document.querySelectorAll('.modular-table').forEach(mountModularRuntime);<\/script>`;
