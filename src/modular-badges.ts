import {modularPalette,modularTextColor,type ModularModel} from './modular-model';
import {alignBadges,badgeShapes,createBadge,normalizeBadge,perimeterPoint,projectToPerimeter,stepPerimeter,type PerimeterBadge,type PerimeterPosition} from './modular-badges-model';

type BadgeHost={model:(block:HTMLElement)=>ModularModel|undefined;sync:(block:HTMLElement)=>ModularModel;
  persist:(block:HTMLElement)=>void;render:(block:HTMLElement)=>void;save:()=>void};
const icon=(name:string)=>`<span class="material-symbols-outlined" aria-hidden="true">${name}</span>`;
const outlines={circle:'<circle cx="50" cy="50" r="49"/>',rounded:'<rect x="1" y="1" width="94" height="52" rx="12" ry="12"/>',hexagon:'<polygon points="25,1 75,1 99,50 75,99 25,99 1,50"/>'};
const symbols={circle:'circle',rounded:'rounded_corner',hexagon:'hexagon'};
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
  node.style.color=ink(badge.color);node.style.fontSize=14*badge.scale+'px';
  node.querySelector('svg')!.innerHTML=outlines[badge.shape];
  node.querySelector('svg')!.setAttribute('viewBox',badge.shape==='rounded'?'0 0 96 54':'0 0 100 100');
  node.querySelector('svg')!.style.fill=badge.color;
  const text=node.querySelector<HTMLElement>('.mod-badge-text')!;
  if(text.contentEditable!=='true'){
    if(badge.html!==undefined)text.innerHTML=badge.html;else text.textContent=badge.text;
    text.style.cssText=badge.textStyle||'';
  }
  const range=cell.querySelector<HTMLInputElement>('[data-badge-scale]');
  if(range){range.value=String(Math.round(badge.scale*100));range.closest('label')!.querySelector('output')!.textContent=range.value+'%';}
  const color=cell.querySelector<HTMLInputElement>('[data-badge-color-input]');if(color)color.value=badge.color;
  cell.querySelectorAll<HTMLElement>('[data-badge-shape]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.badgeShape===badge.shape)));
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
    menu.innerHTML=`<summary title="Figura en el perímetro" aria-label="Figura en el perímetro">${icon('category')}</summary><div class="mod-badge-panel"><div class="mod-badge-shapes" role="group" aria-label="Forma de la figura">${Object.entries(badgeShapes).map(([shape,label])=>`<button type="button" data-badge-shape="${shape}" title="${label}" aria-label="${label}" aria-pressed="${shape===badge?.shape}">${icon(symbols[shape as keyof typeof symbols])}</button>`).join('')}${badge?`<button type="button" data-badge-delete title="Eliminar figura del perímetro" aria-label="Eliminar figura del perímetro">${icon('delete')}</button>`:''}</div>${badge?`<label>Escala <output>${Math.round(badge.scale*100)}%</output><input data-badge-scale aria-label="Escala de la figura" type="range" min="50" max="200" value="${Math.round(badge.scale*100)}"></label><label class="mod-badge-color">Color <input data-badge-color-input type="color" aria-label="Color de la figura" value="${badge.color}"></label><div class="mod-palette">${modularPalette.map(c=>`<button type="button" data-badge-color="${c.value}" title="${c.name}" aria-label="Figura: ${c.name}" style="background:${c.value};border:1px solid #aaa"></button>`).join('')}</div>`:''}</div>`;
    cell.querySelector('.mod-cell-tools')!.append(menu);
    if(badge){
      const node=document.createElement('div');node.className='mod-badge';node.tabIndex=0;
      node.setAttribute('role','group');node.setAttribute('aria-label','Figura del perímetro; arrastra para mover, doble clic para editar texto');
      node.innerHTML='<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg><div class="mod-badge-text editable-text" title="Doble clic para editar texto"></div>';
      cell.append(node);updateBadge(cell,badge);
    }
  }
  const badges=Object.values(model.cells).flatMap(cell=>cell.badge?[cell.badge]:[]);
  if(badges.length<2)return;
  const menu=document.createElement('details');menu.className='mod-badge-align-menu';
  menu.innerHTML=`<summary aria-label="Posición de todas las figuras" title="Posición de todas las figuras"><span class="mod-badge-align-icon" aria-hidden="true"></span></summary><div class="mod-badge-align-panel"><label>Posición de todas las figuras</label><div class="mod-badge-picker" role="slider" tabindex="0" aria-label="Posición de todas las figuras en el perímetro" aria-valuemin="0" aria-valuemax="400"><span class="mod-badge-picker-dot"></span></div></div>`;
  block.querySelector('.block-toolbar .mod-tools [data-mod-action=delete]')!.before(menu);
  positionPicker(menu.querySelector('.mod-badge-picker')!,badges[0].position);
}
export function syncBadgeText(block:HTMLElement,model:ModularModel) {
  block.querySelectorAll<HTMLElement>('.mod-cell[data-cell] > .mod-badge').forEach(node=>{
    const badge=model.cells[node.parentElement!.dataset.cell!]?.badge,text=node.querySelector<HTMLElement>('.mod-badge-text');
    if(badge&&text){badge.html=text.innerHTML;badge.text=text.textContent||'';badge.textStyle=text.style.cssText;}
  });
}
function refresh(block:HTMLElement,model:ModularModel) {
  block.querySelectorAll<HTMLElement>('.mod-cell[data-cell]').forEach(cell=>{const badge=model.cells[cell.dataset.cell!]?.badge;if(badge)updateBadge(cell,badge);});
}
export function handleBadgeClick(event:MouseEvent,block:HTMLElement,host:BadgeHost) {
  const target=event.target as HTMLElement;
  const control=target.closest<HTMLElement>('[data-badge-shape],[data-badge-color],[data-badge-delete]');
  if(!control)return false;
  event.preventDefault();event.stopPropagation();
  const model=host.sync(block),cell=control.closest<HTMLElement>('.mod-cell')!,key=cell.dataset.cell!,value=model.cells[key];
  if(control.hasAttribute('data-badge-delete'))delete value.badge;
  else if(control.dataset.badgeShape){
    const shape=control.dataset.badgeShape as PerimeterBadge['shape'];
    if(!Object.hasOwn(badgeShapes,shape))return true;
    if(value.badge)value.badge.shape=shape;else value.badge=createBadge(shape);
  }else if(value.badge&&control.dataset.badgeColor){value.badge.color=control.dataset.badgeColor;}
  if(control.dataset.badgeColor){updateBadge(cell,value.badge!);host.persist(block);}
  else {
    host.render(block);
    const next=block.querySelector<HTMLElement>(`.mod-cell[data-cell="${key}"]`)!;
    next.classList.add('mod-cell-selected');block.dataset.pinnedCell=key;
    const menu=next.querySelector<HTMLDetailsElement>('.mod-badge-menu')!;menu.open=true;menu.dataset.menuPinned='true';
  }
  host.save();return true;
}
export function handleBadgeInput(target:HTMLInputElement,block:HTMLElement,host:BadgeHost) {
  if(!target.matches('[data-badge-scale],[data-badge-color-input]'))return false;
  const cell=target.closest<HTMLElement>('.mod-cell')!,badge=host.sync(block).cells[cell.dataset.cell!]?.badge;
  if(!badge)return true;
  if(target.hasAttribute('data-badge-scale'))badge.scale=Math.max(.5,Math.min(2,Number(target.value)/100));
  else badge.color=target.value;
  updateBadge(cell,badge);host.persist(block);return true;
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
