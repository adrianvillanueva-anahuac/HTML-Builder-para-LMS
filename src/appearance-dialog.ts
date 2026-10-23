import type {FooterConfig,Workspace} from './project-model';
import {applyBackground,applyFooter,backgroundLabel,footerLabel,readBackground,readFooter,restoreBackgroundMetadata,selectAppearanceRows,workspaceAppearanceRoot,type AppearanceChanges,type BackgroundAppearance,type SelectionAction} from './workspace-appearance';
import './interactive-button.css';
import './appearance-dialog.css';

const icon=(name:string)=>`<span class="material-symbols-outlined" aria-hidden="true">${name}</span>`;
type Column='background'|'footer';

// The existing React galleries remain in their original DOM. Only their editing
// target is detached; accepting a gallery cannot mutate the live project.
function pickAppearance(column:Column,target:HTMLElement):Promise<boolean> {
  return new Promise((resolve,reject)=>{
    const modal=document.getElementById(column==='background'?'bg-modal':'footer-modal');
    if(!modal||!modal.classList.contains('hidden')){reject(new Error('Cierra el selector de diseño abierto e inténtalo de nuevo.'));return;}
    const keys=['currentBgTarget','tempBgTheme','tempBgColorHex','tempBgMargin','isGlobalFooterConfig','currentFooterWrapper','tempFooterType','tempFooterLogo','tempFooterLogoColor','tempFooterBlockColor'];
    const previous=keys.map(key=>window[key]);
    const attrs=['role','aria-modal','tabindex'].map(key=>[key,modal.getAttribute(key)] as const);
    let accepted=false,finished=false;
    const eventName=column==='background'?'lms-background-applied':'lms-footer-applied';
    const applied=(event:Event)=>{if((event as CustomEvent).detail?.target===target)accepted=true;};
    const observer=new MutationObserver(()=>{if(modal.classList.contains('hidden'))finish();});
    const focusable=()=>Array.from(modal.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]')).filter(el=>el.getClientRects().length>0);
    const keydown=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();modal.classList.add('hidden');}
      if(event.key==='Tab'){
        const elements=focusable(),first=elements[0],last=elements.at(-1);
        if(!first){event.preventDefault();modal.focus();return;}
        if(event.shiftKey&&(document.activeElement===first||!modal.contains(document.activeElement))){event.preventDefault();last!.focus();}
        else if(!event.shiftKey&&(document.activeElement===last||!modal.contains(document.activeElement))){event.preventDefault();first.focus();}
      }
    };
    function cleanup(){
      observer.disconnect();window.removeEventListener(eventName,applied);document.removeEventListener('keydown',keydown,true);
      keys.forEach((key,index)=>window[key]=previous[index]);
      attrs.forEach(([key,value])=>{if(value===null)modal!.removeAttribute(key);else modal!.setAttribute(key,value);});
    }
    function finish(){if(finished)return;finished=true;cleanup();resolve(accepted);}
    window.addEventListener(eventName,applied);document.addEventListener('keydown',keydown,true);
    observer.observe(modal,{attributes:true,attributeFilter:['class']});
    modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.tabIndex=-1;
    try{
      if(column==='background')window.openBgModal(target);else window.openFooterModal(target);
      (focusable()[0]||modal).focus({preventScroll:true});
    }catch(error){finished=true;modal.classList.add('hidden');cleanup();reject(error);}
  });
}

export function appearanceDialog(spaces:Workspace[],globalFooter?:FooterConfig):Promise<AppearanceChanges|null> {
  return new Promise(resolve=>{
    const previous=document.activeElement as HTMLElement|null;
    const dialog=document.createElement('dialog');dialog.className='appearance-dialog';
    dialog.setAttribute('aria-labelledby','appearance-title');dialog.setAttribute('aria-describedby','appearance-help');
    dialog.innerHTML=`<form method="dialog"><header><div class="appearance-heading">${icon('checklist')}<h2 id="appearance-title">Diseño de varias páginas</h2></div><p id="appearance-help">Marca las páginas por columna y elige el fondo o footer con los botones superiores. Cada fila muestra su diseño actual; los cambios se harán al confirmar.</p></header><div class="appearance-table-scroll"><table><thead><tr><th scope="col">Página / espacio</th><th scope="col"><button type="button" class="appearance-selection" data-column="background" aria-label="Selección de fondos" aria-haspopup="menu" aria-expanded="false">Fondo ${icon('arrow_drop_down')}</button></th><th scope="col"><button type="button" class="appearance-selection" data-column="footer" aria-label="Selección de footers" aria-haspopup="menu" aria-expanded="false">Footer ${icon('arrow_drop_down')}</button></th><th scope="col"><button type="button" class="appearance-picker ib-trigger" data-column="background" aria-label="Elegir fondo">${icon('wallpaper')}<span>Elegir fondo</span></button><small class="appearance-next" data-column="background" aria-live="polite"></small></th><th scope="col"><button type="button" class="appearance-picker ib-trigger" data-column="footer" aria-label="Elegir footer">${icon('design_services')}<span>Elegir footer</span></button><small class="appearance-next" data-column="footer" aria-live="polite"></small></th></tr></thead><tbody></tbody></table></div><p class="appearance-summary" role="status" aria-live="polite"></p><p class="appearance-error" role="alert" hidden></p><footer><button value="cancel" class="appearance-cancel">Cancelar</button><button value="apply" class="appearance-apply" disabled>Aplicar cambios</button></footer></form>`;
    const tbody=dialog.querySelector('tbody')!,form=dialog.querySelector('form')!;
    const selection:Record<Column,Set<string>>={background:new Set(),footer:new Set()};
    const backgrounds=new Map(spaces.map(s=>[s.id,readBackground(workspaceAppearanceRoot(s))]));
    const footers=new Map(spaces.map(s=>[s.id,readFooter(workspaceAppearanceRoot(s),s.footerConfig||globalFooter)]));
    let background:BackgroundAppearance|undefined,footer:FooterConfig|undefined,suspended=false,settled=false;
    const error=dialog.querySelector<HTMLElement>('.appearance-error')!;
    const apply=dialog.querySelector<HTMLButtonElement>('.appearance-apply')!;
    const menu=document.createElement('div');menu.className='appearance-selection-menu';menu.role='menu';menu.hidden=true;
    dialog.append(menu);
    let menuColumn:Column='background',menuAnchor:HTMLButtonElement|undefined,hideTimer:ReturnType<typeof setTimeout>;
    const closeMenu=()=>{clearTimeout(hideTimer);menu.hidden=true;menuAnchor?.setAttribute('aria-expanded','false');};
    const scheduleClose=()=>{clearTimeout(hideTimer);hideTimer=setTimeout(()=>{if(!menu.contains(document.activeElement))closeMenu();},180);};
    const update=()=>{
      for(const row of tbody.querySelectorAll<HTMLTableRowElement>('tr')){
        const id=row.dataset.id!;
        for(const column of ['background','footer'] as const){
          const checked=selection[column].has(id),input=row.querySelector<HTMLInputElement>(`input[data-column="${column}"]`)!;
          input.checked=checked;
          row.querySelector<HTMLElement>(`.appearance-current[data-column="${column}"]`)!.dataset.selected=String(checked);
        }
      }
      for(const column of ['background','footer'] as const){
        const count=selection[column].size,button=dialog.querySelector<HTMLButtonElement>(`.appearance-picker[data-column="${column}"]`)!;
        button.disabled=count===0;
        button.title=count?`Elegir ${column==='background'?'fondo':'footer'} para ${count} página${count===1?'':'s'} seleccionada${count===1?'':'s'}`:'Marca páginas en esta columna primero';
        const note=dialog.querySelector<HTMLElement>(`.appearance-next[data-column="${column}"]`)!;
        const value=column==='background'?background:footer;
        note.textContent=value?(column==='background'?backgroundLabel(value as BackgroundAppearance):footerLabel(value as FooterConfig)):(count?'Sin diseño seleccionado':'Marca páginas primero');
        note.dataset.pending=String(count>0&&!!value);
      }
      const bgCount=selection.background.size,footerCount=selection.footer.size;
      dialog.querySelector('.appearance-summary')!.textContent=`${bgCount} fondo${bgCount===1?'':'s'} y ${footerCount} footer${footerCount===1?'':'s'} seleccionados.${(bgCount&&!background)||(footerCount&&!footer)?' Elige un diseño para cada columna marcada.':''}`;
      // Avoid silently ignoring a checked column that has no chosen design.
      apply.disabled=!(bgCount||footerCount)||!!(bgCount&&!background)||!!(footerCount&&!footer);
    };
    const actions:[SelectionAction,string][]=[['all','Seleccionar todas'],['none','Quitar selección'],['invert','Invertir selección'],['odd','Una sí, una no (1, 3, 5…)'],['even','Una no, una sí (2, 4, 6…)']];
    for(const [action,label] of actions){
      const button=document.createElement('button');button.type='button';button.role='menuitem';button.textContent=label;button.dataset.action=action;
      button.onclick=()=>{selection[menuColumn]=selectAppearanceRows(spaces.map(s=>s.id),selection[menuColumn],action);update();const anchor=menuAnchor;closeMenu();anchor?.focus({preventScroll:true});};menu.append(button);
    }
    const showMenu=(anchor:HTMLButtonElement)=>{
      clearTimeout(hideTimer);if(menuAnchor!==anchor)closeMenu();menuAnchor=anchor;menuColumn=anchor.dataset.column as Column;
      menu.hidden=false;anchor.setAttribute('aria-expanded','true');menu.setAttribute('aria-label',menuColumn==='background'?'Selección de fondos':'Selección de footers');
      const rect=anchor.getBoundingClientRect(),frame=dialog.getBoundingClientRect();
      // Glass establishes a containing block. Position outside the table's scroll
      // region, relative to the dialog, while keeping the popup in the viewport.
      menu.style.left=`${Math.max(12,Math.min(rect.left,innerWidth-menu.offsetWidth-12))-frame.left-dialog.clientLeft}px`;
      menu.style.top=`${(rect.bottom+menu.offsetHeight+12<innerHeight?rect.bottom+4:Math.max(12,rect.top-menu.offsetHeight-4))-frame.top-dialog.clientTop}px`;
    };
    dialog.querySelectorAll<HTMLButtonElement>('.appearance-selection').forEach(anchor=>{
      anchor.onpointerenter=()=>showMenu(anchor);anchor.onpointerleave=scheduleClose;
      anchor.onclick=()=>showMenu(anchor);
      anchor.onkeydown=event=>{if(event.key==='ArrowDown'){event.preventDefault();showMenu(anchor);menu.querySelector('button')!.focus();}};
    });
    menu.onpointerenter=()=>clearTimeout(hideTimer);menu.onpointerleave=scheduleClose;
    menu.addEventListener('focusout',()=>setTimeout(()=>{if(!menu.contains(document.activeElement)&&document.activeElement!==menuAnchor)closeMenu();},0));
    menu.onkeydown=event=>{
      const items=Array.from(menu.querySelectorAll('button')),index=items.indexOf(document.activeElement as HTMLButtonElement);
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();items[(index+(event.key==='ArrowDown'?1:items.length-1))%items.length].focus();}
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeMenu();menuAnchor?.focus();}
    };
    dialog.addEventListener('pointerdown',event=>{if(!menu.contains(event.target as Node)&&!(event.target as Element).closest('.appearance-selection'))closeMenu();});
    dialog.querySelector('.appearance-table-scroll')!.addEventListener('scroll',closeMenu);
    window.addEventListener('resize',closeMenu);
    const choose=async(column:Column,button:HTMLButtonElement)=>{
      const space=spaces.find(s=>selection[column].has(s.id));if(!space)return;
      closeMenu();error.hidden=true;
      const draft=workspaceAppearanceRoot(space);
      restoreBackgroundMetadata(draft,readBackground(draft));
      if(column==='background'&&background)applyBackground(draft,background);
      let target=draft;
      if(column==='footer'){
        target=document.createElement('div');target.className='lms-footer-wrapper';target.innerHTML='<div class="footer-content"></div>';
        draft.replaceChildren(target);applyFooter(draft,footer||footers.get(space.id)!);
      }
      suspended=true;dialog.close('picker');
      try{
        if(await pickAppearance(column,target)){
          if(column==='background')background=readBackground(draft);else footer=readFooter(draft);
        }
      }catch(reason){error.textContent=(reason as Error).message;error.hidden=false;}
      finally{
        suspended=false;dialog.returnValue='';update();dialog.showModal();button.focus({preventScroll:true});
      }
    };
    dialog.querySelectorAll<HTMLButtonElement>('.appearance-picker').forEach(button=>{
      button.onclick=()=>void choose(button.dataset.column as Column,button);
    });
    spaces.forEach((space,index)=>{
      const row=document.createElement('tr');row.dataset.id=space.id;
      const name=document.createElement('th');name.scope='row';name.textContent=space.name;name.title=space.name;row.append(name);
      for(const column of ['background','footer'] as const){
        const cell=document.createElement('td'),input=document.createElement('input');input.type='checkbox';input.dataset.column=column;
        input.setAttribute('aria-label',`${column==='background'?'Modificar fondo':'Modificar footer'} de ${space.name} (${index+1})`);
        input.onchange=()=>{if(input.checked)selection[column].add(space.id);else selection[column].delete(space.id);update();};cell.append(input);row.append(cell);
      }
      for(const column of ['background','footer'] as const){
        const cell=document.createElement('td'),value=document.createElement('div');value.className='appearance-current';value.dataset.column=column;
        const label=column==='background'?backgroundLabel(backgrounds.get(space.id)!):footerLabel(footers.get(space.id)!);
        value.setAttribute('aria-label',`${column==='background'?'Fondo':'Footer'} actual de ${space.name}: ${label}`);
        value.innerHTML=`${icon(column==='background'?'wallpaper':'design_services')}<span class="appearance-value"></span>`;
        value.querySelector('.appearance-value')!.textContent=label;cell.append(value);row.append(cell);
      }
      tbody.append(row);
    });
    form.onsubmit=event=>{if((event as SubmitEvent).submitter===apply&&apply.disabled)event.preventDefault();};
    dialog.addEventListener('close',()=>{
      if(suspended||dialog.open||settled)return;
      settled=true;closeMenu();window.removeEventListener('resize',closeMenu);
      const changes:AppearanceChanges={};
      if(background&&selection.background.size)changes.background={ids:[...selection.background],value:background};
      if(footer&&selection.footer.size)changes.footer={ids:[...selection.footer],value:footer};
      const accepted=dialog.returnValue==='apply'&&!apply.disabled;dialog.remove();previous?.focus({preventScroll:true});resolve(accepted?changes:null);
    });
    document.body.append(dialog);update();dialog.showModal();dialog.querySelector<HTMLInputElement>('input')?.focus({preventScroll:true});
  });
}
