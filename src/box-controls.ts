import {getBlockToolbar} from './templates';
import './box-controls.css';

const colors=[['#ff5900','Naranja'],['#5d428c','Morado'],['#646464','Gris'],['#cdd5dc','Gris claro'],['#ffffff','Blanco']];
const lines=[['solid','Continua'],['dashed','Discontinua'],['dotted','Punteada'],['double','Doble'],['none','Sin borde']];
const focusBindings=new WeakSet<HTMLElement>();

export function setupBoxControls(root:ParentNode=document){
  root.querySelectorAll<HTMLElement>('[data-type="cuadro_naranja"]').forEach(block=>{
    const surface=block.querySelector<HTMLElement>(':scope > div:not(.block-toolbar)');
    const toolbar=block.querySelector<HTMLElement>(':scope > .block-toolbar > div');if(!surface||!toolbar)return;
    if(!surface.classList.contains('lms-dropzone')){
      surface.classList.add('lms-dropzone','flex','flex-col','min-h-[80px]');
      surface.style.minWidth='0';surface.style.width='100%';surface.style.boxSizing='border-box';
    }
    surface.querySelectorAll<HTMLElement>(':scope > .editable-text:not(.lms-element)').forEach(text=>{
      const wrapper=document.createElement('div');wrapper.className='relative lms-element is-rendered';wrapper.dataset.type='parrafo_basico';
      wrapper.innerHTML=getBlockToolbar('parrafo_basico');text.before(wrapper);wrapper.append(text);
    });
    // Upgrade previously saved dialog controls.
    toolbar.querySelectorAll('[data-box-control]').forEach(button=>button.remove());
    const remove=toolbar.querySelector<HTMLButtonElement>(':scope > button[onclick*="deleteBlock"]');
    let menu=toolbar.querySelector<HTMLElement>(':scope > .box-stroke-menu');
    if(!menu){
      menu=document.createElement('div');menu.className='box-stroke-menu';
      menu.innerHTML='<button type="button" class="box-stroke-trigger" title="Configurar borde" aria-label="Configurar borde" aria-expanded="false"><span class="material-symbols-outlined" aria-hidden="true">border_style</span></button><div class="box-stroke-popover"><div class="box-stroke-panel" role="group" aria-label="Opciones del borde"><div class="box-stroke-label">Color del borde</div><div class="box-stroke-colors">'+colors.map(([color,name])=>'<button type="button" data-box-color="'+color+'" title="'+name+'" aria-label="Borde: '+name+'" style="background:'+color+'"></button>').join('')+'</div><label class="box-stroke-width">Grosor <input type="number" min="0" max="20" step="1" aria-label="Grosor del borde en píxeles"><span>px</span></label><div class="box-stroke-lines" role="group" aria-label="Tipo de línea">'+lines.map(([value,label])=>'<button type="button" data-box-line="'+value+'" title="'+label+'" aria-label="'+label+'"><span aria-hidden="true" style="border-top-style:'+value+'"></span>'+label+'</button>').join('')+'</div></div></div>';
      toolbar.insertBefore(menu,remove);
    }
    if(remove&&toolbar.lastElementChild!==remove)toolbar.append(remove);
    const trigger=menu.querySelector<HTMLButtonElement>('.box-stroke-trigger')!;
    const width=menu.querySelector<HTMLInputElement>('input')!;
    const sync=()=>{
      const style=getComputedStyle(surface);width.value=String(parseFloat(style.borderTopWidth)||0);
      const color=block.dataset.boxStrokeColor||style.borderTopColor;
      menu!.querySelectorAll<HTMLButtonElement>('[data-box-color]').forEach(b=>{
        const swatch=document.createElement('span');swatch.style.color=b.dataset.boxColor!;
        b.setAttribute('aria-pressed',String(b.dataset.boxColor===color||swatch.style.color===color));
      });
      menu!.querySelectorAll<HTMLButtonElement>('[data-box-line]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.boxLine===style.borderTopStyle)));
    };
    const apply=(change:()=>void)=>{
      window.saveHistoryState(true);change();sync();block.dispatchEvent(new Event('input',{bubbles:true}));window.saveHistoryState(true);
    };
    menu.onpointerenter=()=>{menu!.classList.remove('is-dismissed');trigger.setAttribute('aria-expanded','true');sync();};
    menu.onpointerleave=()=>{if(!menu!.contains(document.activeElement))trigger.setAttribute('aria-expanded','false');};
    if(!focusBindings.has(menu)){
      focusBindings.add(menu);
      menu.addEventListener('focusin',()=>{menu!.classList.remove('is-dismissed');trigger.setAttribute('aria-expanded','true');sync();});
      menu.addEventListener('focusout',event=>{if(!menu!.contains(event.relatedTarget as Node))trigger.setAttribute('aria-expanded','false');});
    }
    trigger.onclick=event=>{event.preventDefault();event.stopPropagation();trigger.focus();sync();};
    menu.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();menu!.classList.add('is-dismissed');(document.activeElement as HTMLElement)?.blur();trigger.setAttribute('aria-expanded','false');}};
    const ensureVisibleBorder=()=>{
      if(getComputedStyle(surface).borderTopStyle==='none')surface.style.borderStyle='solid';
      if(!parseFloat(getComputedStyle(surface).borderTopWidth))surface.style.borderWidth='1px';
    };
    menu.querySelectorAll<HTMLButtonElement>('[data-box-color]').forEach(button=>button.onclick=event=>{
      event.preventDefault();event.stopPropagation();apply(()=>{
        block.dataset.boxStrokeColor=button.dataset.boxColor!;surface.style.borderColor=button.dataset.boxColor!;ensureVisibleBorder();
      });
    });
    menu.querySelectorAll<HTMLButtonElement>('[data-box-line]').forEach(button=>button.onclick=event=>{
      event.preventDefault();event.stopPropagation();apply(()=>{
        surface.style.borderStyle=button.dataset.boxLine!;
        if(button.dataset.boxLine!=='none'&&!parseFloat(getComputedStyle(surface).borderTopWidth))surface.style.borderWidth='1px';
      });
    });
    width.onchange=()=>{
      if(!width.checkValidity()||width.value===''){sync();return;}
      const value=Number(width.value);apply(()=>{surface.style.borderWidth=value+'px';if(value>0&&getComputedStyle(surface).borderTopStyle==='none')surface.style.borderStyle='solid';});
    };
  });
}
