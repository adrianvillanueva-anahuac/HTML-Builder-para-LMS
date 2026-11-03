import {modularPalette,modularTextColor,type ModularModel} from './modular-model';
import {alignBadges,badgeShapes,createBadge,normalizeBadge,perimeterPoint,projectToPerimeter,stepPerimeter,roundedBadgeGeometry,setAllBadgesColor,setAllBadgesStroke,setAllBadgesScale,type PerimeterBadge,type PerimeterPosition} from './modular-badges-model';

type BadgeHost={model:(block:HTMLElement)=>ModularModel|undefined;sync:(block:HTMLElement)=>ModularModel;
  persist:(block:HTMLElement)=>void;render:(block:HTMLElement)=>void;save:()=>void};
const icon=(name:string)=>`<span class="material-symbols-outlined" aria-hidden="true">${name}</span>`;
const outlines={circle:'<circle cx="50" cy="50" r="49" vector-effect="non-scaling-stroke"/>',rounded:'<rect x="1" y="1" width="94" height="52" rx="12" ry="12" vector-effect="non-scaling-stroke"/>',hexagon:'<polygon points="25,1 75,1 99,50 75,99 25,99 1,50" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>',triangle:'<polygon points="50,2 98,96 2,96" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>'};
const symbols={circle:'circle',rounded:'rounded_corner',hexagon:'hexagon',triangle:'change_history'};
function ink(color:string) {
  if(modularPalette.some(entry=>entry.value===color.toLowerCase()))return modularTextColor(color);
  const channels=color.slice(1).match(/../g)!.map(v=>parseInt(v,16));
  return channels[0]*.299+channels[1]*.587+channels[2]*.114>160?'#333333':'#ffffff';
}
export function updateBadge(cell:HTMLElement,badge:PerimeterBadge) {
  const node=cell.querySelector<HTMLElement>(':scope > .mod-badge');if(!node)return;
  const point=perimeterPoint(badge.position,100,100);
  node.style.left=point.x+'%';node.style.top=point.y+'%';
  node.style.width=(badge.shape==='rounded'?96:badge.shape==='hexagon'?76:64)*badge.scale+'px';
  node.style.height=(badge.shape==='rounded'?54:64)*badge.scale+'px';
  if(badge.shape==='rounded'){
    const size=roundedBadgeGeometry(badge,cell.clientWidth);node.style.width=size.width+'px';node.style.height=size.height+'px';node.style.left=size.left/cell.clientWidth*100+'%';
    node.dataset.roundedWidth=String(badge.width??96*badge.scale);node.dataset.roundedHeight=String(badge.height??54*badge.scale);node.dataset.badgeEdge=badge.position.edge;node.dataset.badgeOffset=String(badge.position.offset);
    for(const axis of ['width','height']as const){const input=cell.querySelector<HTMLInputElement>(`[data-badge-${axis}]`);if(input){if(axis==='width')input.max=String(Math.floor(cell.clientWidth));input.value=String(Math.round(size[axis]));input.closest('label')!.querySelector('output')!.textContent=input.value+' px';}}
  }else{delete node.dataset.roundedWidth;delete node.dataset.roundedHeight;}
  node.style.color=ink(badge.color);node.style.fontSize=14*badge.scale+'px';
  // No stretched viewBox for rectangles: SVG units stay CSS pixels, so rx/ry
  // remain circular with independent dimensions, including published HTML.
  const svg=node.querySelector('svg')!;
  svg.innerHTML=badge.shape==='rounded'?`<rect width="100%" height="100%" rx="${12*badge.scale}" ry="${12*badge.scale}" vector-effect="non-scaling-stroke"/>`:outlines[badge.shape];
  if(badge.shape==='rounded')svg.removeAttribute('viewBox');else svg.setAttribute('viewBox','-4 -4 108 108');
  svg.style.fill=badge.color;
  const strokeWidth=badge.strokeWidth&&badge.strokeWidth>0?badge.strokeWidth:0;
  const strokeColor=badge.strokeColor||'#5d428c';
  svg.style.stroke=strokeWidth>0?strokeColor:'none';
  svg.style.strokeWidth=strokeWidth>0?`${strokeWidth}px`:'0px';
  svg.style.overflow='visible';
  const text=node.querySelector<HTMLElement>('.mod-badge-text')!;
  if(text.contentEditable!=='true'){
    if(badge.html!==undefined)text.innerHTML=badge.html;else text.textContent=badge.text;
    text.style.cssText=badge.textStyle||'';
  }
  const range=cell.querySelector<HTMLInputElement>('[data-badge-scale]');
  if(range){range.value=String(Math.round(badge.scale*100));range.closest('label')!.querySelector('output')!.textContent=range.value+'%';}
  const color=cell.querySelector<HTMLInputElement>('[data-badge-color-input]');if(color)color.value=badge.color;
  const strokeRange=cell.querySelector<HTMLInputElement>('[data-badge-stroke-width]');
  if(strokeRange){strokeRange.value=String(strokeWidth);strokeRange.closest('label')!.querySelector('output')!.textContent=strokeWidth+' px';}
  const strokeColorInput=cell.querySelector<HTMLInputElement>('[data-badge-stroke-color-input]');
  if(strokeColorInput)strokeColorInput.value=strokeColor;
  cell.querySelectorAll<HTMLElement>('[data-badge-shape]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.badgeShape===badge.shape)));
}
function syncGlobalBadgeControls(block:HTMLElement,model:ModularModel) {
  const menu=block.querySelector<HTMLElement>('.mod-badge-align-menu');if(!menu)return;
  const first=Object.values(model.cells).find(cell=>cell.badge)?.badge;if(!first)return;
  const scaleInput=menu.querySelector<HTMLInputElement>('[data-badge-all-scale]');
  if(scaleInput){scaleInput.value=String(Math.round(first.scale*100));scaleInput.closest('label')!.querySelector('output')!.textContent=scaleInput.value+'%';}
  const fillInput=menu.querySelector<HTMLInputElement>('[data-badge-all-color-input]');
  if(fillInput)fillInput.value=first.color;
  const strokeWidth=first.strokeWidth&&first.strokeWidth>0?first.strokeWidth:0;
  const strokeColor=first.strokeColor||'#5d428c';
  const strokeWidthInput=menu.querySelector<HTMLInputElement>('[data-badge-all-stroke-width]');
  if(strokeWidthInput){strokeWidthInput.value=String(strokeWidth);strokeWidthInput.closest('label')!.querySelector('output')!.textContent=strokeWidth+' px';}
  const strokeColorInput=menu.querySelector<HTMLInputElement>('[data-badge-all-stroke-color-input]');
  if(strokeColorInput)strokeColorInput.value=strokeColor;
}
function positionPicker(picker:HTMLElement,position:PerimeterPosition) {
  picker.dataset.edge=position.edge;picker.dataset.offset=String(position.offset);
  const point=perimeterPoint(position,100,100),marker=picker.querySelector<HTMLElement>('.mod-badge-picker-dot')!;
  marker.style.left=point.x+'%';marker.style.top=point.y+'%';
  const names={top:'Superior',right:'Derecha',bottom:'Inferior',left:'Izquierda'};
  picker.setAttribute('aria-valuetext',names[position.edge]+' '+Math.round(position.offset*100)+'%');
  picker.setAttribute('aria-valuenow',String(['top','right','bottom','left'].indexOf(position.edge)*100+Math.round(position.offset*100)));
}
export function renderBadges(block:HTMLElement,model:ModularModel) {
  for(const cell of block.querySelectorAll<HTMLElement>('.mod-cell[data-cell]')){
    const value=model.cells[cell.dataset.cell!];if(!value)continue;
    const badge=normalizeBadge(value.badge);
    if(badge)value.badge=badge;else delete value.badge;
    const menu=document.createElement('details');menu.className='mod-badge-menu';
    menu.innerHTML=`<summary title="Figura en el perímetro" aria-label="Figura en el perímetro">${icon('category')}</summary><div class="mod-badge-panel"><div class="mod-badge-shapes" role="group" aria-label="Forma de la figura">${Object.entries(badgeShapes).map(([shape,label])=>`<button type="button" data-badge-shape="${shape}" title="${label}" aria-label="${label}" aria-pressed="${shape===badge?.shape}">${icon(symbols[shape as keyof typeof symbols])}</button>`).join('')}${badge?`<button type="button" data-badge-delete title="Eliminar figura del perímetro" aria-label="Eliminar figura del perímetro">${icon('delete')}</button>`:''}</div>${badge?`<label>Escala <output>${Math.round(badge.scale*100)}%</output><input data-badge-scale aria-label="Escala de la figura" type="range" min="50" max="200" value="${Math.round(badge.scale*100)}"></label><label class="mod-badge-color">Color <input data-badge-color-input type="color" aria-label="Color de la figura" value="${badge.color}"></label><div class="mod-palette">${modularPalette.map(c=>`<button type="button" data-badge-color="${c.value}" title="${c.name}" aria-label="Figura: ${c.name}" style="background:${c.value};border:1px solid #aaa"></button>`).join('')}</div><label>Grosor de borde <output>${badge.strokeWidth??0} px</output><input data-badge-stroke-width aria-label="Grosor de borde de la figura" type="range" min="0" max="8" value="${badge.strokeWidth??0}"></label><label class="mod-badge-color">Color de borde <input data-badge-stroke-color-input type="color" aria-label="Color de borde de la figura" value="${badge.strokeColor||'#5d428c'}"></label><div class="mod-palette">${modularPalette.map(c=>`<button type="button" data-badge-stroke-color="${c.value}" title="Borde: ${c.name}" aria-label="Borde de la figura: ${c.name}" style="background:${c.value};border:1px solid #aaa"></button>`).join('')}</div>`:''}</div>`;
    cell.querySelector('.mod-cell-tools')!.append(menu);
    if(badge){
      if(badge.shape==='rounded'){const scale=menu.querySelector('[data-badge-scale]')!.closest('label')!;scale.outerHTML=(['width','height']as const).map(axis=>`<label>${axis==='width'?'Ancho':'Alto'} <output></output><input data-badge-${axis} aria-label="${axis==='width'?'Ancho':'Alto'} de la figura" type="range" min="16" max="${axis==='width'?Math.floor(cell.clientWidth):600}" value="${badge[axis]??(axis==='width'?96:54)*badge.scale}"></label>`).join('');}
      const iconButton=document.createElement('button');iconButton.type='button';iconButton.dataset.badgeIcon='true';iconButton.title='Insertar icono del catálogo';iconButton.setAttribute('aria-label','Insertar icono del catálogo');iconButton.innerHTML=icon('add_reaction');menu.querySelector('.mod-badge-shapes')!.insertBefore(iconButton,menu.querySelector('[data-badge-delete]'));
      const node=document.createElement('div');node.className='mod-badge';node.tabIndex=0;
      node.setAttribute('role','group');node.setAttribute('aria-label','Figura del perímetro; arrastra para mover, doble clic para editar texto');
      node.innerHTML='<svg viewBox="-4 -4 108 108" preserveAspectRatio="none" aria-hidden="true"></svg><div class="mod-badge-text editable-text" title="Doble clic para editar texto"></div>';
      cell.append(node);updateBadge(cell,badge);
    }
  }
  const badges=Object.values(model.cells).flatMap(cell=>cell.badge?[cell.badge]:[]);
  if(badges.length<2)return;
  const first=badges[0];
  const strokeWidth=first.strokeWidth&&first.strokeWidth>0?first.strokeWidth:0;
  const strokeColor=first.strokeColor||'#5d428c';
  const menu=document.createElement('details');menu.className='mod-badge-align-menu';
  menu.innerHTML=`<summary aria-label="Posición de todas las figuras" title="Posición de todas las figuras"><span class="mod-badge-align-icon" aria-hidden="true"></span></summary><div class="mod-badge-align-panel"><label>Posición de todas las figuras</label><div class="mod-badge-picker" role="slider" tabindex="0" aria-label="Posición de todas las figuras en el perímetro" aria-valuemin="0" aria-valuemax="400"><span class="mod-badge-picker-dot"></span></div><label>Escala <output>${Math.round(first.scale*100)}%</output><input data-badge-all-scale aria-label="Escala de todas las figuras" type="range" min="50" max="200" value="${Math.round(first.scale*100)}"></label><label class="mod-badge-color">Color de relleno <input data-badge-all-color-input type="color" aria-label="Color de relleno de todas las figuras" value="${first.color}"></label><div class="mod-palette">${modularPalette.map(c=>`<button type="button" data-badge-all-color="${c.value}" title="Relleno: ${c.name}" aria-label="Relleno de todas las figuras: ${c.name}" style="background:${c.value};border:1px solid #aaa"></button>`).join('')}</div><label>Grosor de borde <output>${strokeWidth} px</output><input data-badge-all-stroke-width aria-label="Grosor de borde de todas las figuras" type="range" min="0" max="8" value="${strokeWidth}"></label><label class="mod-badge-color">Color de borde <input data-badge-all-stroke-color-input type="color" aria-label="Color de borde de todas las figuras" value="${strokeColor}"></label><div class="mod-palette">${modularPalette.map(c=>`<button type="button" data-badge-all-stroke-color="${c.value}" title="Borde: ${c.name}" aria-label="Borde de todas las figuras: ${c.name}" style="background:${c.value};border:1px solid #aaa"></button>`).join('')}</div></div>`;
  block.querySelector('.block-toolbar .mod-tools [data-mod-action=delete]')!.before(menu);
  positionPicker(menu.querySelector('.mod-badge-picker')!,first.position);
}
export function syncBadgeText(block:HTMLElement,model:ModularModel) {
  block.querySelectorAll<HTMLElement>('.mod-cell[data-cell] > .mod-badge').forEach(node=>{
    const badge=model.cells[node.parentElement!.dataset.cell!]?.badge,text=node.querySelector<HTMLElement>('.mod-badge-text');
    if(badge&&text){badge.html=text.innerHTML;badge.text=text.textContent||'';badge.textStyle=text.style.cssText;}
  });
}
function refresh(block:HTMLElement,model:ModularModel) {
  block.querySelectorAll<HTMLElement>('.mod-cell[data-cell]').forEach(cell=>{const badge=model.cells[cell.dataset.cell!]?.badge;if(badge)updateBadge(cell,badge);});
  syncGlobalBadgeControls(block,model);
}
export function handleBadgeClick(event:MouseEvent,block:HTMLElement,host:BadgeHost) {
  const target=event.target as HTMLElement;
  const globalControl=target.closest<HTMLElement>('[data-badge-all-color],[data-badge-all-stroke-color]');
  if(globalControl){
    event.preventDefault();event.stopPropagation();
    const model=host.sync(block);
    if(globalControl.dataset.badgeAllColor)setAllBadgesColor(model,globalControl.dataset.badgeAllColor);
    if(globalControl.dataset.badgeAllStrokeColor)setAllBadgesStroke(model,{color:globalControl.dataset.badgeAllStrokeColor});
    refresh(block,model);host.persist(block);host.save();return true;
  }
  const control=target.closest<HTMLElement>('[data-badge-shape],[data-badge-color],[data-badge-stroke-color],[data-badge-delete],[data-badge-icon]');
  if(!control)return false;
  event.preventDefault();event.stopPropagation();
  const model=host.sync(block),cell=control.closest<HTMLElement>('.mod-cell')!,key=cell.dataset.cell!,value=model.cells[key];
  if(control.hasAttribute('data-badge-icon')){
    const modal=document.getElementById('icon-modal');if(!value.badge||!modal)return true;host.save();
    const text=cell.querySelector<HTMLElement>('.mod-badge-text')!,previous=window.currentIconTarget;let chosen=text.querySelector<HTMLElement>('.editable-icon');
    if(!chosen){chosen=document.createElement('span');chosen.className='material-symbols-outlined editable-icon';chosen.contentEditable='false';chosen.textContent='star';chosen.style.fontSize='1.8em';}
    // Keep a new icon detached until the native catalog confirms a selection.
    let selected=false;const select=(event:Event)=>{if((event.target as Element).closest('#icon-grid .material-symbols-outlined'))selected=true;};
    modal.addEventListener('click',select,true);window.currentIconTarget=chosen;modal.classList.remove('hidden');
    const observer=new MutationObserver(()=>{if(!modal.classList.contains('hidden'))return;observer.disconnect();modal.removeEventListener('click',select,true);window.currentIconTarget=previous;if(selected){if(!text.contains(chosen))text.replaceChildren(chosen);syncBadgeText(block,model);host.persist(block);host.save();}});observer.observe(modal,{attributes:true,attributeFilter:['class']});
    return true;
  }
  if(control.hasAttribute('data-badge-delete'))delete value.badge;
  else if(control.dataset.badgeShape){
    const shape=control.dataset.badgeShape as PerimeterBadge['shape'];
    if(!Object.hasOwn(badgeShapes,shape))return true;
    if(value.badge)value.badge.shape=shape;else value.badge=createBadge(shape);
  }else if(value.badge&&control.dataset.badgeColor){value.badge.color=control.dataset.badgeColor;}
  else if(value.badge&&control.dataset.badgeStrokeColor){
    value.badge.strokeColor=control.dataset.badgeStrokeColor;
    if(!value.badge.strokeWidth)value.badge.strokeWidth=2;
  }
  if(control.dataset.badgeColor||control.dataset.badgeStrokeColor){updateBadge(cell,value.badge!);syncGlobalBadgeControls(block,model);host.persist(block);}
  else {
    host.render(block);
    const next=block.querySelector<HTMLElement>(`.mod-cell[data-cell="${key}"]`)!;
    next.classList.add('mod-cell-selected');block.dataset.pinnedCell=key;
    const menu=next.querySelector<HTMLDetailsElement>('.mod-badge-menu')!;menu.open=true;menu.dataset.menuPinned='true';
  }
  host.save();return true;
}
export function handleBadgeInput(target:HTMLInputElement,block:HTMLElement,host:BadgeHost) {
  if(target.matches('[data-badge-all-scale],[data-badge-all-color-input],[data-badge-all-stroke-width],[data-badge-all-stroke-color-input]')){
    const model=host.sync(block);
    if(target.hasAttribute('data-badge-all-scale'))setAllBadgesScale(model,Number(target.value)/100);
    else if(target.hasAttribute('data-badge-all-color-input'))setAllBadgesColor(model,target.value);
    else if(target.hasAttribute('data-badge-all-stroke-width'))setAllBadgesStroke(model,{width:Number(target.value)});
    else if(target.hasAttribute('data-badge-all-stroke-color-input'))setAllBadgesStroke(model,{color:target.value});
    refresh(block,model);host.persist(block);return true;
  }
  if(!target.matches('[data-badge-scale],[data-badge-color-input],[data-badge-stroke-width],[data-badge-stroke-color-input],[data-badge-width],[data-badge-height]'))return false;
  const model=host.sync(block),cell=target.closest<HTMLElement>('.mod-cell')!,badge=model.cells[cell.dataset.cell!]?.badge;
  if(!badge)return true;
  if(target.hasAttribute('data-badge-scale'))badge.scale=Math.max(.5,Math.min(2,Number(target.value)/100));
  else if(target.hasAttribute('data-badge-width'))badge.width=Math.max(16,Math.min(cell.clientWidth,Number(target.value)));
  else if(target.hasAttribute('data-badge-height'))badge.height=Math.max(16,Math.min(600,Number(target.value)));
  else if(target.hasAttribute('data-badge-stroke-width')){
    const width=Math.max(0,Math.min(8,Number(target.value)));
    if(width<=0)delete badge.strokeWidth;
    else{badge.strokeWidth=width;if(!badge.strokeColor)badge.strokeColor='#5d428c';}
  }else if(target.hasAttribute('data-badge-stroke-color-input')){
    badge.strokeColor=target.value;if(!badge.strokeWidth)badge.strokeWidth=2;
  }else badge.color=target.value;
  updateBadge(cell,badge);syncGlobalBadgeControls(block,model);host.persist(block);return true;
}
export function setupBadgeDragging(host:BadgeHost) {
  let suppressClickUntil=0;
  document.addEventListener('click',event=>{
    if(performance.now()<suppressClickUntil&&(event.target as Element).closest?.('.mod-badge,.mod-badge-picker')){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  document.addEventListener('pointerdown',event=>{
    const target=event.target as HTMLElement,node=target.closest<HTMLElement>('.mod-badge,.mod-badge-picker');
    if(!node||event.button!==0||target.closest('[contenteditable=true]'))return;
    const block=node.closest<HTMLElement>('.modular-table');if(!block||!host.model(block))return;
    const model=host.sync(block),all=node.matches('.mod-badge-picker'),cell=node.closest<HTMLElement>('.mod-cell');
    const badge=cell?model.cells[cell.dataset.cell!]?.badge:undefined;if(!all&&!badge)return;
    const initial=Object.entries(model.cells).flatMap(([key,value])=>value.badge?[[key,{...value.badge.position}] as const]:[]);
    const pickerRect=all?node.getBoundingClientRect():undefined;
    const start={x:event.clientX,y:event.clientY};let moving=false;
    const apply=(e:PointerEvent)=>{
      const rect=pickerRect||cell!.querySelector('.mod-card')!.getBoundingClientRect();
      const position=projectToPerimeter(e.clientX-rect.left,e.clientY-rect.top,rect.width,rect.height);
      if(all){alignBadges(model,position);positionPicker(node,position);refresh(block,model);}
      else {badge!.position=position;updateBadge(cell!,badge!);}
    };
    const move=(e:PointerEvent)=>{
      if(e.pointerId!==event.pointerId)return;
      if(!moving&&Math.hypot(e.clientX-start.x,e.clientY-start.y)<4)return;
      if(!moving){host.save();window.modularResizing=true;moving=true;node.setPointerCapture(event.pointerId);node.dataset.dragging='true';}
      e.preventDefault();apply(e);
    };
    const end=(e:PointerEvent)=>{
      if(e.pointerId!==event.pointerId)return;
      document.removeEventListener('pointermove',move,true);document.removeEventListener('pointerup',end,true);document.removeEventListener('pointercancel',end,true);node.removeEventListener('lostpointercapture',end);
      if(moving||all){
        if(e.type==='pointercancel'||e.type==='lostpointercapture'){
          initial.forEach(([key,position])=>{if(model.cells[key]?.badge)model.cells[key].badge!.position=position;});refresh(block,model);
          if(all)positionPicker(node,initial[0][1]);
        }else apply(e);
        delete node.dataset.dragging;host.persist(block);window.modularResizing=false;
        if(e.type==='pointerup')host.save();
        suppressClickUntil=performance.now()+180;
      }
      if(node.hasPointerCapture(event.pointerId))node.releasePointerCapture(event.pointerId);
    };
    document.addEventListener('pointermove',move,true);document.addEventListener('pointerup',end,true);document.addEventListener('pointercancel',end,true);node.addEventListener('lostpointercapture',end);
    if(all)event.preventDefault();
  },true);
  document.addEventListener('keydown',event=>{
    const node=(event.target as HTMLElement).closest?.<HTMLElement>('.mod-badge,.mod-badge-picker');
    if(!node||(event.target as HTMLElement).closest('[contenteditable=true]')||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key))return;
    const block=node.closest<HTMLElement>('.modular-table');if(!block||!host.model(block))return;
    event.preventDefault();event.stopPropagation();
    const model=host.sync(block),all=node.matches('.mod-badge-picker'),cell=node.closest<HTMLElement>('.mod-cell'),badge=cell?model.cells[cell.dataset.cell!]?.badge:undefined;
    const current=all?{edge:node.dataset.edge,offset:Number(node.dataset.offset)} as PerimeterPosition:badge?.position;if(!current)return;
    const position=event.key==='Home'?{edge:'top' as const,offset:.5}:stepPerimeter(current,(['ArrowLeft','ArrowUp'].includes(event.key)?-1:1)*(event.shiftKey?.2:.05));
    if(all){alignBadges(model,position);positionPicker(node,position);refresh(block,model);}
    else{badge!.position=position;updateBadge(cell!,badge!);}
    host.persist(block);host.save();
  });
}
