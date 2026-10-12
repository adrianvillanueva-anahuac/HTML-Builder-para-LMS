import {centerGroups,modularPalette,modularTextColor,type ModularModel,type CenterShape} from './modular-model';

export const centerShapes = {triangle:'Triángulo',circle:'Círculo',square:'Cuadrado',diamond:'Rombo',hexagon:'Hexágono'};
const shapes={triangle:'<polygon points="50,2 98,98 2,98"/>',circle:'<circle cx="50" cy="50" r="48"/>',square:'<rect x="2" y="2" width="96" height="96"/>',diamond:'<polygon points="50,2 98,50 50,98 2,50"/>',hexagon:'<polygon points="25,2 75,2 98,50 75,98 25,98 2,50"/>'};
const icon=(s:string)=>`<span class="material-symbols-outlined" aria-hidden="true">${s}</span>`;
const menu=(symbol:string,label:string,html:string)=>`<details><summary title="${label}" aria-label="${label}">${icon(symbol)}</summary><div>${html}</div></details>`;
export function updateCenter(node:HTMLElement,value:CenterShape) {
  node.dataset.size=String(value.size);
  node.dataset.front=String(value.front);
  const visual=node.querySelector<HTMLElement>('.mod-center-visual')!;
  if(!visual.querySelector('.mod-center-text'))visual.innerHTML='<svg viewBox="0 0 100 100" aria-hidden="true"></svg><div class="mod-center-text editable-text" title="Doble clic para editar texto"></div>';
  visual.querySelector('svg')!.innerHTML=shapes[value.shape]||shapes.triangle;
  visual.style.color=modularTextColor(value.color);
  visual.querySelector('svg')!.style.fill=value.color;
  const text=visual.querySelector<HTMLElement>('.mod-center-text')!;
  if(text.contentEditable!=='true'){
    if(value.html!==undefined)text.innerHTML=value.html;
    else text.textContent=value.text;
  }
}
export function syncCenterText(block:HTMLElement,model:ModularModel) {
  block.querySelectorAll<HTMLElement>('.mod-center[data-center]').forEach(node=>{
    const value=model.centers?.[node.dataset.center!],text=node.querySelector('.mod-center-text');
    if(value&&text){value.html=text.innerHTML;value.text=text.textContent||'';}
  });
}
export function renderCenters(grid:Element,model:ModularModel) {
  for(const key of centerGroups(model)) {
    const node=document.createElement('div');node.className='mod-center';node.dataset.center=key;
    const value=model.centers?.[key];
    if(!value){
      node.classList.add('mod-editor');node.dataset.size='32';
      const symbols={triangle:'change_history',circle:'circle',square:'square',diamond:'diamond',hexagon:'hexagon'};
      node.innerHTML=`<button class="mod-center-trigger" title="Insertar figura central" aria-label="Insertar figura central">${icon('change_history')}</button><div class="mod-center-tools mod-tools mod-editor" role="group" aria-label="Elegir figura central">${Object.entries(centerShapes).map(([shape,label])=>`<button type="button" data-center-create="${shape}" title="${label}" aria-label="Insertar ${label.toLowerCase()}">${icon(symbols[shape as keyof typeof symbols])}</button>`).join('')}</div>`;
    }
    else {
      node.innerHTML=`<div class="mod-center-visual"></div><div class="mod-center-tools mod-preview-tools mod-tools mod-editor">
        ${menu('category','Figura',Object.entries(centerShapes).map(([v,label])=>`<button data-center-shape="${v}" title="${label}" aria-label="${label}">${label}</button>`).join(''))}
        ${menu('format_color_fill','Color de figura',`<div class="mod-palette">${modularPalette.map(c=>`<button data-center-color="${c.value}" title="${c.name}" aria-label="${c.name}" style="background:${c.value};border:1px solid #aaa"></button>`).join('')}</div>`)}
        ${menu('layers','Posición',`<button data-center-layer="front" title="Delante" aria-label="Delante">${icon('flip_to_front')}</button><button data-center-layer="back" title="Detrás" aria-label="Detrás">${icon('flip_to_back')}</button>`)}
        ${menu('photo_size_select_small','Tamaño',`<label>Tamaño <output>${value.size} px</output><input data-center-size aria-label="Tamaño de figura" type="range" min="24" max="240" value="${value.size}"></label>`)}
        <button data-center-delete title="Eliminar figura" aria-label="Eliminar figura">${icon('delete')}</button></div>`;
      updateCenter(node,value);
    }
    grid.append(node);
  }
}
