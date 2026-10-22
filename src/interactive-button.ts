import {getBlockToolbar} from './templates';
import {normalizeTextLinkURL} from './text-link-controls';
import {setupInteractiveButtonRuntime} from './interactive-button-runtime.js';
import {inlineInteractiveButtonExport} from './interactive-button-export';
import './interactive-button.css';

const swatches=[{key:'purple',name:'Morado',base:'#5d428c',mid:'#7755a6',light:'#a68acb',ink:'#ffffff'},
  {key:'orange',name:'Naranja',base:'#ff5900',mid:'#ee5000',light:'#ff9b68',ink:'#ffffff'},
  {key:'gray',name:'Gris',base:'#646464',mid:'#505050',light:'#a0a0a0',ink:'#ffffff'},
  {key:'light',name:'Gris claro',base:'#cdd5dc',mid:'#bac6d0',light:'#f0f3f6',ink:'#374151'}];
const actions=[{value:'encapsulate',label:'Encapsular elementos',description:'Escoge uno o más elementos y arrástralos dentro del contenido desplegable.'},
  {value:'link',label:'Hipervínculo',description:'Abrir una dirección web al presionar el botón.'},
  {value:'none',label:'Elegir después',description:'Dejar el botón sin una acción por ahora.'}];
const icons=[['expand_more','Desplegar'],['arrow_forward','Flecha'],['link','Enlace'],['open_in_new','Abrir'],['play_circle','Reproducir'],['download','Descargar'],['info','Información'],['menu_book','Libro'],['school','Aprendizaje'],['add','Más'],['touch_app','Clic'],['','Sin icono']];
const bindings=new WeakSet<ParentNode>();

export function getInteractiveButtonHTML(){
  const id=crypto.randomUUID();
  const collapse='<div class="ib-collapse-row"><button type="button" class="ib-collapse" data-ib-collapse title="Contraer contenido" aria-label="Contraer contenido"><span class="material-symbols-outlined" aria-hidden="true">close</span></button></div>';
  return `<section class="relative lms-element is-rendered mb-6 interactive-button" data-type="boton_interactivo" data-button-action="none" data-button-color="purple" data-button-tone="classic" data-button-pending="true">${getBlockToolbar('boton_interactivo')}<div class="ib-shell"><div class="ib-button-row"><a class="ib-trigger" data-ib-trigger role="button" tabindex="0" id="ib-trigger-${id}"><span class="ib-icon material-symbols-outlined" aria-hidden="true">touch_app</span><span class="ib-label">Botón</span></a></div><div class="ib-panel" id="ib-panel-${id}" role="region" aria-labelledby="ib-trigger-${id}" aria-hidden="true" inert><div class="ib-panel-inner"><div class="ib-body">${collapse}<div class="ib-content lms-dropzone" data-sortable-active="false"></div>${collapse}</div></div></div></div></section>`;
}

function dialog(title:string){
  const el=document.createElement('dialog');el.className='exercise-settings project-prompt ib-dialog';el.setAttribute('aria-label',title);
  const form=document.createElement('form');form.method='dialog';const h=document.createElement('h2');h.textContent=title;form.append(h);
  const buttons=document.createElement('div');buttons.className='exercise-dialog-actions';buttons.innerHTML='<button value="cancel" formnovalidate>Cancelar</button><button value="ok">Aceptar</button>';form.append(buttons);
  el.append(form);const previous=document.activeElement as HTMLElement|null;
  el.addEventListener('close',()=>{el.remove();previous?.isConnected&&previous.focus({preventScroll:true});},{once:true});document.body.append(el);
  return {el,form,buttons};
}

function update(block:HTMLElement,change:()=>void){
  window.saveHistoryState(true);change();block.dispatchEvent(new Event('input',{bubbles:true}));window.saveHistoryState(true);
}

function appearance(block:HTMLElement){
  const color=swatches.find(c=>c.key===block.dataset.buttonColor)||swatches[0];
  const tone=block.dataset.buttonTone||'classic';
  const set=(key:string,value:string)=>{if(block.style.getPropertyValue(key)!==value)block.style.setProperty(key,value);};
  set('--ib-base',tone==='soft'?color.mid:color.base);set('--ib-mid',tone==='intense'?color.base:color.mid);set('--ib-light',tone==='intense'?color.mid:color.light);
  set('--ib-ink',color.ink);set('--ib-tint',color.base+'0d');
}

function openContent(block:HTMLElement){
  if(!block.classList.contains('ib-open'))block.querySelector<HTMLElement>(':scope > .ib-shell > .ib-button-row > .ib-trigger')?.click();
}

export function configureInteractiveButton(block:HTMLElement){
  if(document.querySelector('.ib-dialog')||!block.isConnected)return;
  const {el,form,buttons}=dialog('Acción del botón');
  buttons.querySelector('button[value="ok"]')!.textContent=block.dataset.buttonAction==='none'?'Insertar':'Guardar';
  const choices=document.createElement('div');choices.className='ib-action-options';
  choices.innerHTML=actions.map(action=>`<label><input type="radio" name="action" value="${action.value}"><span><strong>${action.label}</strong><small>${action.description}</small></span></label>`).join('');buttons.before(choices);
  const selected=choices.querySelector<HTMLInputElement>(`[value="${block.dataset.buttonAction||'none'}"]`)||choices.querySelector<HTMLInputElement>('[value="none"]')!;selected.checked=true;
  const urlLabel=document.createElement('label');urlLabel.className='ib-link-field';urlLabel.textContent='Dirección del enlace';
  const url=document.createElement('input');url.type='text';url.placeholder='https://...';url.value=block.dataset.buttonHref||'';url.setAttribute('aria-label','Hipervínculo del botón');urlLabel.append(url);buttons.before(urlLabel);
  const sync=()=>{const link=!!form.querySelector('input[value="link"]:checked');urlLabel.hidden=!link;url.required=link;};sync();
  choices.onchange=()=>{sync();if(!urlLabel.hidden)url.focus();};url.oninput=()=>url.setCustomValidity('');
  let href:string|null=null;
  form.onsubmit=event=>{
    if((event as SubmitEvent).submitter?.getAttribute('value')!=='ok')return;
    if(form.querySelector('input[value="link"]:checked')){href=normalizeTextLinkURL(url.value);if(!href){event.preventDefault();url.setCustomValidity('Pega un hipervínculo válido.');url.reportValidity();}}
  };
  el.addEventListener('close',()=>{
    if(el.returnValue!=='ok'||!block.isConnected)return;
    const value=form.querySelector<HTMLInputElement>('input[name="action"]:checked')!.value;
    update(block,()=>{
      block.dataset.buttonAction=value;if(href)block.dataset.buttonHref=href;
      block.classList.remove('ib-open');
      if(!block.dataset.buttonCustomLabel)block.querySelector('.ib-label')!.textContent=({none:'Botón',link:'Abrir enlace',encapsulate:'Ver contenido'} as Record<string,string>)[value];
      if(!block.dataset.buttonCustomIcon)block.querySelector('.ib-icon')!.textContent=value==='encapsulate'?'expand_more':value==='link'?'open_in_new':'touch_app';
      setupInteractiveButtonRuntime(document,true);if(value==='encapsulate')openContent(block);
    });
  },{once:true});el.showModal();if(!urlLabel.hidden)url.focus();
}

function editLabel(block:HTMLElement){
  if(document.querySelector('.ib-dialog'))return;
  const {el,buttons}=dialog('Texto e icono del botón');
  const label=document.createElement('label');label.className='ib-label-field';label.textContent='Texto del botón';
  const input=document.createElement('input');input.required=true;input.maxLength=120;input.value=block.querySelector('.ib-label')!.textContent||'';input.setAttribute('aria-label','Texto del botón');label.append(input);buttons.before(label);
  const grid=document.createElement('div');grid.className='ib-icon-choices';grid.setAttribute('role','group');grid.setAttribute('aria-label','Icono del botón');
  let selected=block.querySelector('.ib-icon')!.textContent||'';
  const refresh=()=>grid.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.icon===selected)));
  icons.forEach(([icon,name])=>{const b=document.createElement('button');b.type='button';b.dataset.icon=icon;b.title=name;b.setAttribute('aria-label',name);b.innerHTML=`<span class="material-symbols-outlined" aria-hidden="true">${icon||'block'}</span>`;b.onclick=()=>{selected=icon;refresh();};grid.append(b);});refresh();buttons.before(grid);
  el.querySelector('form')!.onsubmit=event=>{if((event as SubmitEvent).submitter?.getAttribute('value')==='ok'&&!input.value.trim()){event.preventDefault();input.setCustomValidity('Escribe el texto del botón.');input.reportValidity();}};input.oninput=()=>input.setCustomValidity('');
  el.addEventListener('close',()=>{
    if(el.returnValue!=='ok'||!block.isConnected)return;
    update(block,()=>{block.querySelector('.ib-label')!.textContent=input.value.trim();const icon=block.querySelector<HTMLElement>('.ib-icon')!;icon.textContent=selected;icon.hidden=!selected;block.dataset.buttonCustomLabel=block.dataset.buttonCustomIcon='true';});
  },{once:true});el.showModal();input.focus();input.select();
}

export function setupInteractiveButtons(root:ParentNode=document){
  setupInteractiveButtonRuntime(root,true);
  if(!bindings.has(root)){
    bindings.add(root);root.addEventListener('lms-button-configure',event=>{const block=(event.target as Element).closest<HTMLElement>('[data-type="boton_interactivo"]');if(block)configureInteractiveButton(block);});
  }
  root.querySelectorAll<HTMLElement>('[data-type="boton_interactivo"]').forEach(block=>{
    appearance(block);
    const toolbar=block.querySelector<HTMLElement>(':scope > .block-toolbar > div');if(!toolbar)return;
    const remove=toolbar.querySelector(':scope > button[onclick*="deleteBlock"]');
    if(!toolbar.querySelector('[data-ib-settings]')){
      const tools=document.createElement('div');tools.className='ib-gear-menu';tools.innerHTML='<button type="button" class="ib-edit-tool" data-ib-settings title="Configurar acción del botón" aria-label="Configurar acción del botón"><span class="material-symbols-outlined" aria-hidden="true">settings</span></button><div class="ib-tool-popover"><div class="ib-tool-panel"><button type="button" data-ib-change-action>Cambiar acción</button></div></div>';toolbar.insertBefore(tools,remove);
      const text=document.createElement('button');text.type='button';text.className='ib-edit-tool';text.dataset.ibText='';text.title='Cambiar texto e icono';text.setAttribute('aria-label',text.title);text.innerHTML='<span class="material-symbols-outlined" aria-hidden="true">edit_note</span>';toolbar.insertBefore(text,remove);
      const color=document.createElement('div');color.className='ib-color-menu';color.innerHTML='<button type="button" class="ib-edit-tool" title="Color y gradiente" aria-label="Color y gradiente"><span class="material-symbols-outlined" aria-hidden="true">palette</span></button><div class="ib-tool-popover"><div class="ib-tool-panel"><div class="ib-gradient-colors">'+swatches.map(c=>`<button type="button" data-ib-color="${c.key}" style="background:linear-gradient(120deg,${c.base},${c.light})" title="${c.name}" aria-label="Botón ${c.name}"></button>`).join('')+'</div><div class="ib-gradient-tones">'+[['classic','Clásico'],['soft','Suave'],['intense','Intenso']].map(([key,name])=>`<button type="button" data-ib-tone="${key}">${name}</button>`).join('')+'</div></div></div>';toolbar.insertBefore(color,remove);
    }
    toolbar.querySelector<HTMLButtonElement>('[data-ib-settings]')!.onclick=()=>block.dataset.buttonAction==='encapsulate'?openContent(block):configureInteractiveButton(block);
    toolbar.querySelector<HTMLButtonElement>('[data-ib-change-action]')!.onclick=()=>configureInteractiveButton(block);
    toolbar.querySelector<HTMLButtonElement>('[data-ib-text]')!.onclick=()=>editLabel(block);
    toolbar.querySelectorAll<HTMLButtonElement>('[data-ib-color],[data-ib-tone]').forEach(button=>{
      button.setAttribute('aria-pressed',String(button.dataset.ibColor?block.dataset.buttonColor===button.dataset.ibColor:block.dataset.buttonTone===button.dataset.ibTone));
      button.onclick=()=>update(block,()=>{if(button.dataset.ibColor)block.dataset.buttonColor=button.dataset.ibColor;if(button.dataset.ibTone)block.dataset.buttonTone=button.dataset.ibTone;appearance(block);setupInteractiveButtons(root);});
    });
    if(block.hasAttribute('data-button-pending')){block.removeAttribute('data-button-pending');queueMicrotask(()=>{if(block.isConnected)configureInteractiveButton(block);});}
  });
}

export function prepareInteractiveButtonExport(root:ParentNode){
  root.querySelectorAll<HTMLElement>('[data-type="boton_interactivo"]').forEach(block=>{
    block.classList.remove('ib-editor','ib-open');block.removeAttribute('data-button-pending');
    const page=block.parentElement;if(page?.matches('.lms-dropzone.bg-white,[data-ib-page]'))page.setAttribute('data-ib-page','true');
    const row=block.querySelector<HTMLElement>(':scope > .ib-shell > .ib-button-row')!;row.setAttribute('aria-hidden','false');row.removeAttribute('inert');
    const panel=block.querySelector<HTMLElement>(':scope > .ib-shell > .ib-panel')!;panel.setAttribute('aria-hidden','true');panel.setAttribute('inert','');
    const trigger=block.querySelector(':scope > .ib-shell > .ib-button-row > .ib-trigger')!;if(block.dataset.buttonAction==='encapsulate')trigger.setAttribute('aria-expanded','false');
    appearance(block);inlineInteractiveButtonExport(block);
  });
}
