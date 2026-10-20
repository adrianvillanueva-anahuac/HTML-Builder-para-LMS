import {modularPalette,type ModularModel} from './modular-model';
export function updateIndividualStrokes(block:HTMLElement,model:ModularModel){
  block.querySelectorAll<HTMLElement>('.mod-cell').forEach(cell=>{
    const card=cell.querySelector<HTMLElement>('.mod-card'),value=model.cells[cell.dataset.cell!];if(!card||!value)return;
    if(value.strokeColor){card.style.setProperty('--mod-stroke-color',value.strokeColor);card.style.setProperty('--mod-stroke-width',(model.stroke?.width||1)+'px');}
    else{card.style.removeProperty('--mod-stroke-color');card.style.removeProperty('--mod-stroke-width');}
  });
}
export function addStrokeControls(block:HTMLElement){
  block.querySelectorAll<HTMLElement>('.mod-cell-tools,.mod-row-tools,.mod-column-tools').forEach(tools=>{
    const key=tools.closest<HTMLElement>('.mod-cell')!.dataset.cell!,[row,column]=key.split(':');
    const scope=tools.classList.contains('mod-row-tools')?'row':tools.classList.contains('mod-column-tools')?'column':'cell';
    if(scope==='column')tools.dataset.columnTools=column;
    const label=scope==='row'?`Borde de fila ${Number(row)+1}`:scope==='column'?`Borde de columna ${Number(column)+1}`:'Borde del rectángulo';
    const menu=document.createElement('details');
    menu.innerHTML=`<summary title="${label}" aria-label="${label}"><span class="material-symbols-outlined" aria-hidden="true">border_color</span></summary><div><div class="mod-palette">${modularPalette.map(c=>`<button type="button" data-stroke-scope="${scope}" data-stroke-key="${scope==='row'?row:scope==='column'?column:key}" data-stroke-color="${c.value}" title="${c.name}" aria-label="${label}: ${c.name}" style="background:${c.value};border:1px solid #aaa"></button>`).join('')}</div></div>`;
    tools.append(menu);
  });
}
export function applyScopedStroke(model:ModularModel,scope:string,key:string,color:string){
  Object.entries(model.cells).forEach(([id,cell])=>{if(scope==='cell'?id===key:id.split(':')[scope==='row'?0:1]===key)cell.strokeColor=color;});
}
