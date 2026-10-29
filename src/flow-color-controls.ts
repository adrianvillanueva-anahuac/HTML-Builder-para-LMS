import {flowColorGroups,flowShapeCombinations,normalizeFlowHex} from './flow-colors';
import {flowLaneStyles,flowLaneCombinations} from './flow-lane-presets';
import type {FlowLaneStyle} from './flow-model';
type ColorOptions={transparent?:boolean;gradient?:{active:boolean;from:string;to:string;choose:()=>void}};

/** Menus live inside the editor's top layer, not inside the scrolling inspector. */
export function createFlowColorControls(dialog:HTMLDialogElement){
  let popup:HTMLElement|null=null,trigger:HTMLButtonElement|null=null;
  let sequence=0;
  function close(focus=false){const previous=trigger;popup?.remove();popup=null;trigger=null;previous?.setAttribute('aria-expanded','false');if(focus&&previous?.isConnected)previous.focus();}
  function show(button:HTMLButtonElement,label:string,content:HTMLElement){
    if(trigger===button){close();return;}
    close();trigger=button;popup=content;content.classList.add('fde-color-popover');content.id=`fde-colors-${++sequence}`;
    content.setAttribute('role','dialog');content.setAttribute('aria-label',label);button.setAttribute('aria-controls',content.id);button.setAttribute('aria-expanded','true');
    dialog.append(content);
    const bounds=dialog.getBoundingClientRect(),anchor=button.getBoundingClientRect();
    content.style.width=`${Math.min(330,dialog.clientWidth-24)}px`;
    content.style.maxHeight=`${Math.max(120,dialog.clientHeight-32)}px`;
    content.style.left=`${Math.max(12,Math.min(anchor.right-bounds.left-content.offsetWidth,dialog.clientWidth-content.offsetWidth-12))}px`;
    content.style.top=`${Math.max(12,Math.min(anchor.bottom-bounds.top+8,dialog.clientHeight-content.offsetHeight-12))}px`;
    (content.querySelector<HTMLButtonElement>('[aria-pressed="true"]')||content.querySelector<HTMLButtonElement>('button'))?.focus();
  }
  const outside=(event:MouseEvent)=>{if(popup&&!popup.contains(event.target as Node)&&!trigger?.contains(event.target as Node))close();};
  const resize=()=>close();dialog.addEventListener('click',outside);window.addEventListener('resize',resize);
  function field(parent:HTMLElement,labelText:string,key:string,value:string,mixed:boolean,onChoose:(value:string)=>void,options:ColorOptions={}){
    const wrapper=document.createElement('div');wrapper.className='fde-field fde-color-field';
    const label=document.createElement('span');label.textContent=labelText+(mixed?' · Varios':'');
    const button=document.createElement('button');button.type='button';button.className='fde-color-trigger';button.dataset.colorKey=key;
    button.setAttribute('aria-label',labelText+(mixed?' · valores distintos':''));button.setAttribute('aria-expanded','false');button.setAttribute('aria-haspopup','dialog');
    button.title=mixed?'Hay varios colores. Elige uno para aplicarlo a toda la selección.':`${labelText}: ${value}`;
    button.style.setProperty('--fde-swatch',mixed?'conic-gradient(#5d428c 0 25%,#ff5900 0 50%,#cdd5dc 0 75%,#ffffff 0)':options.gradient?.active?`linear-gradient(135deg,${options.gradient.from},${options.gradient.to})`:value==='none'?'transparent':value);
    if(['none','transparent'].includes(value)&&!mixed)button.classList.add('is-empty');
    button.onclick=()=>{
      const content=document.createElement('div'),heading=document.createElement('h4');heading.textContent=labelText;content.append(heading);
      const description=document.createElement('p');description.textContent='Colores institucionales · 4 claros y 4 oscuros por color.';content.append(description);
      if(options.transparent||options.gradient){
        const specials=document.createElement('div');specials.className='fde-color-specials';
        const add=(name:string,background:string,active:boolean,choose:()=>void,type:string)=>{const wrapper=document.createElement('div'),choice=document.createElement('button'),label=document.createElement('span');choice.type='button';choice.className='fde-color-swatch';choice.style.background=background;choice.setAttribute('aria-label',name);choice.setAttribute('aria-pressed',String(!mixed&&active));choice.title=name;choice.dataset.flowColorMode=type;label.textContent=name;choice.onclick=()=>{close();choose();dialog.querySelector<HTMLButtonElement>(`[data-color-key="${key}"]`)?.focus();};wrapper.append(choice,label);specials.append(wrapper);};
        if(options.transparent)add('Transparente','repeating-conic-gradient(#d3cddc 0 25%,#fff 0 50%) 0/10px 10px',['none','transparent'].includes(value),()=>onChoose('transparent'),'transparent');
        if(options.gradient)add('Gradiente entre figuras','linear-gradient(135deg,#ff5900,#5d428c)',options.gradient.active,options.gradient.choose,'gradient');
        content.append(specials);
      }
      for(const group of flowColorGroups){
        const row=document.createElement('div');row.className='fde-color-group';row.setAttribute('role','group');row.setAttribute('aria-label',group.name);
        const name=document.createElement('span');name.textContent=group.name;row.append(name);
        const swatches=document.createElement('div');swatches.className='fde-color-swatches';
        for(const color of group.colors){const swatch=document.createElement('button');swatch.type='button';swatch.className='fde-color-swatch';swatch.style.background=color.value;swatch.dataset.flowColor=color.value;swatch.title=color.label;swatch.setAttribute('aria-label',color.label);swatch.setAttribute('aria-pressed',String(!mixed&&!options.gradient?.active&&normalizeFlowHex(value)===color.value));swatch.onclick=()=>{close();onChoose(color.value);dialog.querySelector<HTMLButtonElement>(`[data-color-key="${key}"]`)?.focus();};swatches.append(swatch);}
        row.append(swatches);content.append(row);
      }
      show(button,`Elegir ${labelText.toLowerCase()}`,content);
    };
    wrapper.append(label,button);parent.append(wrapper);return button;
  }
  function combinations(parent:HTMLElement,current:{fill:string;stroke:string;textColor:string}|null,onChoose:(colors:{fill:string;stroke:string;textColor:string})=>void,kind:'node'|'lane'='node'){
    const button=document.createElement('button');button.type='button';button.className='fde-combinations-trigger';if(kind==='node')button.dataset.colorCombinations='true';else button.dataset.laneCombinations='true';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');button.innerHTML=`<span class="material-symbols-outlined" aria-hidden="true">palette</span><span>${kind==='lane'?'Colores de carril':'Combinaciones de color'}</span>`;
    button.onclick=()=>{
      const content=document.createElement('div'),heading=document.createElement('h4');heading.textContent=kind==='lane'?'Combinaciones claras para carriles':'Combinaciones para figuras';content.append(heading);
      const description=document.createElement('p');description.textContent=kind==='lane'?'Aplica fondo, borde y texto a los carriles seleccionados.':'Aplica relleno, borde y texto a las figuras seleccionadas.';content.append(description);
      const choices=document.createElement('div');choices.className='fde-combination-options';
      for(const combination of kind==='lane'?flowLaneCombinations:flowShapeCombinations){
        const choice=document.createElement('button');choice.type='button';choice.className='fde-combination-choice';choice.dataset.flowCombination=combination.id;choice.setAttribute('aria-label',combination.name);choice.setAttribute('aria-pressed',String(!!current&&(['fill','stroke','textColor']as const).every(key=>normalizeFlowHex(current[key])===combination[key])));
        const preview=document.createElement('span');preview.className='fde-combination-preview';preview.style.background=combination.fill;preview.style.borderColor=combination.stroke;preview.style.color=combination.textColor;preview.setAttribute('aria-hidden','true');preview.textContent='Ab';
        const name=document.createElement('span');name.textContent=combination.name;choice.append(preview,name);
        choice.onclick=()=>{close();onChoose({fill:combination.fill,stroke:combination.stroke,textColor:combination.textColor});dialog.querySelector<HTMLButtonElement>(kind==='lane'?'[data-lane-combinations]':'[data-color-combinations]')?.focus();};choices.append(choice);
      }
      content.append(choices);show(button,'Combinaciones de color',content);
    };parent.append(button);
  }
  function laneStyles(parent:HTMLElement,current:FlowLaneStyle|null,onChoose:(style:FlowLaneStyle)=>void){
    const button=document.createElement('button');button.type='button';button.className='fde-combinations-trigger';button.dataset.laneStyles='true';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');button.innerHTML='<span class="material-symbols-outlined" aria-hidden="true">view_week</span><span>Estilos de carril</span>';
    button.onclick=()=>{const content=document.createElement('div'),heading=document.createElement('h4');heading.textContent='Estilos de carril';content.append(heading);const choices=document.createElement('div');choices.className='fde-combination-options';for(const style of flowLaneStyles){const choice=document.createElement('button');choice.type='button';choice.className='fde-combination-choice';choice.dataset.laneStyle=style.id;choice.setAttribute('aria-label',style.name);choice.setAttribute('aria-pressed',String(current===style.id));const preview=document.createElement('span');preview.className=`fde-lane-style-preview is-${style.id}`;preview.setAttribute('aria-hidden','true');const label=document.createElement('span');label.textContent=style.name;choice.append(preview,label);choice.onclick=()=>{close();onChoose(style.id);dialog.querySelector<HTMLButtonElement>('[data-lane-styles]')?.focus();};choices.append(choice);}content.append(choices);show(button,'Estilos de carril',content);};parent.append(button);
  }
  return{field,combinations,laneStyles,close,isOpen:()=>!!popup,dispose(){close();dialog.removeEventListener('click',outside);window.removeEventListener('resize',resize);}};
}
