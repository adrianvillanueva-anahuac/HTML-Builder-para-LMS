import {tableStyles,tableStyle,tableRadius,tableCellPositions} from './table-style-model';
import './table-style-controls.css';

const selector='.lms-element[data-type="tabla_dinamica"]';
export function tableStyleButtonsHTML() {
  return `<button type="button" class="table-appearance-tool text-gray-400 p-1 rounded flex items-center justify-center" data-table-tool="styles" title="Estilos de tabla" aria-label="Estilos de tabla" aria-haspopup="true" aria-controls="table-style-popover"><span class="material-symbols-outlined text-[18px]">table_chart</span></button>
  <button type="button" class="table-appearance-tool text-gray-400 p-1 rounded flex items-center justify-center" data-table-tool="radius" title="Redondeado de la tabla" aria-label="Redondeado de la tabla" aria-haspopup="true" aria-controls="table-style-popover"><span class="material-symbols-outlined text-[18px]">rounded_corner</span></button>`;
}
const normalized=new Map<string,string>();
const paint=(element:HTMLElement,property:string,value:string,priority='')=>{
  const key=property+':'+value;
  if(!normalized.has(key)){const probe=element.ownerDocument.createElement('span').style;probe.setProperty(property,value);normalized.set(key,probe.getPropertyValue(property));}
  if(element.style.getPropertyValue(property)!==normalized.get(key)||element.style.getPropertyPriority(property)!==priority)element.style.setProperty(property,value,priority);
};
export function applyTableAppearance(block:HTMLElement) {
  const table=block.querySelector<HTMLTableElement>('.table-container > table');if(!table)return;
  // Keep the 16px interaction gutter outside the page's content margins, rather
  // than shrinking the visible table. Inline sizing also survives LMS export.
  const container=table.parentElement!;
  paint(container,'box-sizing','border-box');
  paint(container,'width','calc(100% + 32px)','important');
  paint(container,'max-width','calc(100% + 32px)','important');
  paint(container,'margin-left','-16px');paint(container,'margin-right','-16px');
  paint(container,'padding','16px');
  const preset=tableStyle(block.dataset.tableStyle),radius=tableRadius(block.dataset.tableRadius);
  const color=block.dataset.tableBorderColor||preset.line,width=block.dataset.tableBorderWidth||'1px';
  for(const cls of Array.from(table.classList))if(cls.startsWith('theme-')&&cls!==`theme-${preset.id}`)table.classList.remove(cls);
  if(!table.classList.contains(`theme-${preset.id}`))table.classList.add(`theme-${preset.id}`);
  const outer=preset.grid;
  paint(table,'border-collapse','separate');paint(table,'border-spacing','0px');
  paint(table,'border',`${outer?width:'0px'} solid ${color}`);paint(table,'border-radius',`${radius}px`);
  paint(table,'background-color','transparent');
  const rows=Array.from(table.rows),cells=rows.flatMap(row=>Array.from(row.cells));
  const layout=tableCellPositions(rows.map(row=>Array.from(row.cells)));
  cells.forEach((cell,i)=>{
    const p=layout.positions[i],header=cell.tagName==='TH',first=p.col===0;
    const bodyRow=(cell.parentElement as HTMLTableRowElement).sectionRowIndex;
    const background=header?preset.header:preset.id==='first-column'&&first?'#f3eef9':bodyRow%2===0?preset.stripe:'#ffffff';
    paint(cell,'background-color',background);paint(cell,'background-clip','padding-box');
    paint(cell,'color',header?preset.ink:preset.id==='first-column'&&first?'#5d428c':'#374151');
    if(!cell.style.padding)paint(cell,'padding','12px');
    if(header&&!cell.style.textAlign)paint(cell,'text-align','left');
    paint(cell,'font-weight',header||preset.id==='first-column'&&first?'700':'400');
    paint(cell,'border-style','solid');paint(cell,'border-color',color);
    paint(cell,'border-top-width','0px');paint(cell,'border-left-width','0px');
    paint(cell,'border-right-width',preset.grid&&p.colEnd<layout.columns?width:'0px');
    paint(cell,'border-bottom-width',p.rowEnd<layout.rows?(!preset.grid&&header?block.dataset.tableBorderWidth||'2px':width):'0px');
    paint(cell,'border-top-left-radius',p.row===0&&first?`${radius}px`:'0px');
    paint(cell,'border-top-right-radius',p.row===0&&p.colEnd===layout.columns?`${radius}px`:'0px');
    paint(cell,'border-bottom-left-radius',p.rowEnd===layout.rows&&first?`${radius}px`:'0px');
    paint(cell,'border-bottom-right-radius',p.rowEnd===layout.rows&&p.colEnd===layout.columns?`${radius}px`:'0px');
  });
}

export function prepareTableStylesExport(root:HTMLElement) {
  root.querySelectorAll<HTMLElement>(selector).forEach(applyTableAppearance);
}

let installed=false;
export function setupTableStyleControls() {
  document.querySelectorAll<HTMLElement>(selector).forEach(block=>{
    const toolbar=block.querySelector(':scope > .block-toolbar');
    if(toolbar&&!toolbar.querySelector('[data-table-tool]')){
      const legacy=Array.from(toolbar.querySelectorAll<HTMLElement>('[onclick*="changeTableStyle"]'));
      legacy[0]?.insertAdjacentHTML('beforebegin',tableStyleButtonsHTML());legacy.forEach(button=>button.remove());
    }
    applyTableAppearance(block);
  });
  if(installed)return;installed=true;
  const popup=document.createElement('div');popup.id='table-style-popover';popup.hidden=true;popup.setAttribute('role','group');document.body.append(popup);
  let anchor:HTMLElement|null=null,block:HTMLElement|null=null,timer:ReturnType<typeof setTimeout>|undefined,dragging=false;
  const stay=()=>clearTimeout(timer);
  const hide=()=>{stay();if(dragging)return;popup.hidden=true;anchor=null;block=null;};
  const later=()=>{stay();timer=setTimeout(()=>{if(!popup.contains(document.activeElement))hide();},180);};
  const locate=()=>{
    if(!anchor?.isConnected||!block?.isConnected){hide();return;}
    const a=anchor.getBoundingClientRect(),p=popup.getBoundingClientRect();
    popup.style.left=Math.max(8,Math.min(innerWidth-p.width-8,a.left+a.width/2-p.width/2))+'px';
    popup.style.top=Math.max(8,Math.min(innerHeight-p.height-8,a.top>p.height+12?a.top-p.height-8:a.bottom+8))+'px';
  };
  const preview=(id:string)=>{
    const s=tableStyle(id);
    return `<svg viewBox="0 0 100 46" aria-hidden="true"><rect x="1" y="1" width="98" height="44" rx="5" fill="white" stroke="${s.line}"/><path d="M6 1H94Q99 1 99 6V15H1V6Q1 1 6 1" fill="${s.header}"/><path d="M1 15H99V30H1Z" fill="${s.stripe}"/>${id==='first-column'?'<path d="M1 15H34V45H6Q1 45 1 40Z" fill="#f3eef9"/>':''}<path d="M1 15H99M1 30H99${s.grid?'M34 1V45M67 1V45':''}" stroke="${s.line}" stroke-width=".8"/><path d="M7 8H26M40 8H59M73 8H91" stroke="${s.ink}" stroke-width="2"/><path d="M7 23H24M40 23H57M73 23H90M7 38H24M40 38H57M73 38H90" stroke="#646464" stroke-width="1.5"/></svg>`;
  };
  const show=(button:HTMLElement)=>{
    stay();if(anchor===button&&!popup.hidden)return;
    if(dragging)return;
    block=button.closest<HTMLElement>(selector);if(!block)return;anchor=button;
    const styles=button.dataset.tableTool==='styles';
    popup.setAttribute('aria-label',styles?'Estilos de tabla':'Redondeado de la tabla');
    popup.innerHTML=styles?`<h3>Estilos de tabla</h3><div class="table-style-grid">${tableStyles.map(s=>`<button type="button" data-table-style-choice="${s.id}" aria-pressed="${tableStyle(block!.dataset.tableStyle).id===s.id}">${preview(s.id)}<span>${s.name}</span></button>`).join('')}</div>`:`<label for="table-radius-slider">Redondeado <output>${tableRadius(block.dataset.tableRadius)} px</output></label><input id="table-radius-slider" aria-label="Radio de las esquinas de la tabla" type="range" min="0" max="40" step="1" value="${tableRadius(block.dataset.tableRadius)}"><small>0: esquinas rectas · 40: máximo</small>`;
    popup.hidden=false;locate();
  };
  document.addEventListener('pointerover',event=>{const button=(event.target as Element).closest<HTMLElement>('[data-table-tool]');if(button)show(button);});
  document.addEventListener('pointerout',event=>{if((event.target as Element).closest('[data-table-tool]'))later();});
  document.addEventListener('focusin',event=>{const button=(event.target as Element).closest<HTMLElement>('[data-table-tool]');if(button)show(button);else if(!popup.contains(event.target as Node))later();});
  popup.addEventListener('pointerenter',stay);popup.addEventListener('pointerleave',later);popup.addEventListener('focusin',stay);popup.addEventListener('focusout',later);
  document.addEventListener('click',event=>{
    const target=event.target as Element,button=target.closest<HTMLElement>('[data-table-tool]');
    if(button){event.preventDefault();show(button);return;}
    if(!popup.contains(target))hide();
  });
  popup.addEventListener('click',event=>{
    const choice=(event.target as Element).closest<HTMLElement>('[data-table-style-choice]');if(!choice||!block?.isConnected)return;
    window.saveHistoryState?.(true);block.dataset.tableStyle=choice.dataset.tableStyleChoice!;applyTableAppearance(block);window.saveHistoryState?.(true);
    popup.querySelectorAll('[aria-pressed]').forEach(b=>b.setAttribute('aria-pressed',String(b===choice)));
  });
  const start=()=>{if(!dragging){window.saveHistoryState?.(true);dragging=true;window.modularResizing=true;}};
  const finish=()=>{if(dragging){dragging=false;window.modularResizing=false;window.saveHistoryState?.(true);}};
  popup.addEventListener('pointerdown',event=>{if((event.target as Element).matches('input'))start();});
  popup.addEventListener('keydown',event=>{if((event.target as Element).matches('input')&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key))start();});
  popup.addEventListener('input',event=>{
    const input=event.target as HTMLInputElement;if(input.type!=='range'||!block?.isConnected)return;
    start();block.dataset.tableRadius=String(tableRadius(input.value));applyTableAppearance(block);popup.querySelector('output')!.textContent=block.dataset.tableRadius+' px';
  });
  popup.addEventListener('change',finish);document.addEventListener('pointerup',finish);document.addEventListener('pointercancel',finish);window.addEventListener('blur',finish);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){finish();const button=anchor;hide();button?.focus();hide();}});
  window.addEventListener('resize',()=>{if(!popup.hidden)locate();});window.addEventListener('scroll',()=>{if(!popup.hidden)locate();},true);
}
