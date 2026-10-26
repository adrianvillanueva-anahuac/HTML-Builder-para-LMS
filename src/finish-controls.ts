import './finish-controls.css';
import {tabInk} from './project-model';

const icon=(name:string)=>`<span class="material-symbols-outlined" aria-hidden="true">${name}</span>`;
const colors=[['#5d428c','Morado'],['#ff5900','Naranja'],['#646464','Gris'],['#cdd5dc','Gris claro'],['#ffffff','Blanco']];

export function normalizeFinish(block:HTMLElement) {
  block.querySelector('.exercise-instructions')?.classList.add('editable-text');
  const tools=block.querySelector<HTMLElement>('.exercise-tools:not(.finish-tools)');
  const toolbar=block.querySelector(':scope > .block-toolbar:not(.exercise-tools) > div');
  if(tools&&toolbar&&tools.parentElement!==toolbar){
    tools.classList.remove('block-toolbar');toolbar.insertBefore(tools,toolbar.lastElementChild);
    const configure=tools.querySelector('button');
    if(configure){configure.innerHTML=icon('settings');configure.title='Configurar entrega';configure.setAttribute('aria-label','Configurar entrega');}
  }
  const name=block.querySelector<HTMLInputElement>('.student-name');
  if(name){
    const enabled=block.dataset.requireName!=='false';
    name.required=enabled;name.disabled=!enabled;
    const label=name.closest('label');if(label){label.hidden=!enabled;label.style.display=enabled?'block':'none';}
  }
  const button=block.querySelector<HTMLElement>('.exercise-finish');if(!button)return;
  if(block.querySelector('.finish-tools'))return;
  const row=document.createElement('div');row.className='finish-button-row';
  row.style.cssText='display:flex;justify-content:'+({left:'flex-start',center:'center',right:'flex-end'}[block.dataset.finishAlign||'left']||'flex-start')+';';
  const wrap=document.createElement('div');wrap.className='finish-button-wrap';wrap.style.cssText='position:relative;display:inline-flex;max-width:100%';
  button.before(row);row.append(wrap);wrap.append(button);
  const controls=document.createElement('div');controls.className='exercise-tools finish-tools';
  controls.innerHTML=`<details class="finish-color-menu"><summary aria-label="Color del botón" title="Color del botón">${icon('palette')}</summary><div class="finish-colors">${colors.map(([color,label])=>`<button type="button" data-finish-color="${color}" aria-label="${label}" title="${label}" style="--swatch:${color}"></button>`).join('')}</div></details>`
    + ['left','center','right'].map((align,i)=>`<button type="button" data-finish-align="${align}" aria-label="${['Alinear izquierda','Centrar','Alinear derecha'][i]}" title="${['Alinear izquierda','Centrar','Alinear derecha'][i]}">${icon('format_align_'+align)}</button>`).join('')
    + `<details><summary aria-label="Redondeo del botón" title="Redondeo del botón">${icon('rounded_corner')}</summary><div class="finish-radius">${[0,6,12,20,32].map(n=>`<button type="button" data-finish-radius="${n}">${n} px</button>`).join('')}</div></details>`;
  wrap.append(controls);
}

export function setupFinishControls(canvas:HTMLElement) {
  canvas.addEventListener('pointerover',event=>{
    const menu=(event.target as Element).closest<HTMLDetailsElement>('.finish-color-menu');if(menu)menu.open=true;
  });
  canvas.addEventListener('pointerout',event=>{
    const menu=(event.target as Element).closest<HTMLDetailsElement>('.finish-color-menu');
    if(menu&&!menu.contains(event.relatedTarget as Node|null))menu.open=false;
  });
  canvas.addEventListener('click',event=>{
    const target=event.target as Element;
    const control=target.closest<HTMLElement>('[data-finish-color],[data-finish-align],[data-finish-radius]');
    if(!control)return;
    const block=control.closest<HTMLElement>('[data-type="enviar_ejercicio"]')!;
    const button=block.querySelector<HTMLElement>('.exercise-finish')!;
    window.saveHistoryState(true);
    if(control.dataset.finishColor){const color=control.dataset.finishColor;button.style.backgroundColor=color;button.style.borderColor=color;button.style.color=tabInk(color);}
    if(control.dataset.finishAlign){block.dataset.finishAlign=control.dataset.finishAlign;block.querySelector<HTMLElement>('.finish-button-row')!.style.justifyContent=({left:'flex-start',center:'center',right:'flex-end'})[control.dataset.finishAlign]!;}
    if(control.dataset.finishRadius)button.style.borderRadius=control.dataset.finishRadius+'px';
    const menu=control.closest('details');if(menu)menu.open=false;
    window.saveHistoryState(true);
  });
}

export function configureFinish(block:HTMLElement,validate:(email:string,url:string)=>void) {
  const dialog=document.createElement('dialog');dialog.className='exercise-settings project-prompt finish-settings';
  dialog.innerHTML='<form method="dialog"><h2>Configurar entrega</h2><label class="finish-name-option"><input name="requireName" type="checkbox"> Solicitar nombre y apellido (obligatorio para finalizar)</label><label>ID del ejercicio<input name="exerciseId" required maxlength="80" placeholder="Ejemplo: ACT01"></label><p>El ID se utiliza en el nombre del archivo; no aparece como campo para el alumno.</p><label>Correo del profesor<input name="email" type="email"></label><label>Enlace de entrega en Brightspace<input name="brightspace" type="url" placeholder="https://..."></label><p role="alert" class="finish-error"></p><div class="exercise-dialog-actions"><button value="cancel" formnovalidate>Cancelar</button><button value="save">Guardar</button></div></form>';
  const form=dialog.querySelector('form')!;
  const input=(name:string)=>form.elements.namedItem(name) as HTMLInputElement;
  input('requireName').checked=block.dataset.requireName!=='false';
  input('exerciseId').value=block.dataset.exerciseId||'ejercicio';
  input('email').value=block.dataset.teacherEmail||'';input('brightspace').value=block.dataset.brightspaceUrl||'';
  const watermarkOption=document.createElement('label');watermarkOption.className='finish-name-option';
  const watermarkCheck=document.createElement('input');watermarkCheck.type='checkbox';watermarkCheck.name='reviewWatermark';
  watermarkCheck.checked=block.dataset.reviewWatermark==='true';
  watermarkOption.append(watermarkCheck,document.createTextNode('Agregar marca de agua al HTML que envía alumno.'));
  const watermarkLabel=document.createElement('label');watermarkLabel.hidden=!watermarkCheck.checked;
  watermarkLabel.className='finish-watermark-text';watermarkLabel.textContent='Texto de la marca de agua';
  const watermarkText=document.createElement('input');watermarkText.name='reviewWatermarkText';watermarkText.maxLength=120;
  watermarkText.value=block.dataset.reviewWatermarkText||'Para revisión';watermarkText.disabled=!watermarkCheck.checked;
  watermarkLabel.append(watermarkText);
  const watermarkHelp=document.createElement('p');watermarkHelp.textContent='Se mostrará arriba a la derecha del documento bloqueado para entrega. No aparece al guardar progreso.';
  watermarkHelp.hidden=!watermarkCheck.checked;
  input('email').closest('label')!.before(watermarkOption,watermarkLabel,watermarkHelp);
  watermarkCheck.addEventListener('change',()=>{
    watermarkLabel.hidden=watermarkHelp.hidden=!watermarkCheck.checked;watermarkText.disabled=!watermarkCheck.checked;
  });
  const deliveryFields=['email','brightspace'] as const;
  const deliveryChecks=deliveryFields.map((name,index)=>{
    const field=input(name),label=field.closest('label')!;
    const heading=document.createElement('label');heading.className='finish-name-option';
    const check=document.createElement('input');check.type='checkbox';check.name=name+'Enabled';
    check.checked=index===0?!!block.dataset.teacherEmail:!block.dataset.teacherEmail&&!!block.dataset.brightspaceUrl;
    heading.append(check,document.createTextNode(index===0?'Correo del profesor':'Enlace de entrega en Brightspace'));
    field.id='finish-delivery-'+name;field.setAttribute('aria-label',index===0?'Correo del profesor':'Enlace de entrega en Brightspace');
    label.replaceWith(heading,field);return check;
  });
  const syncDelivery=()=>deliveryFields.forEach((name,index)=>{
    input(name).disabled=!deliveryChecks[index].checked;
    input(name).required=deliveryChecks[index].checked;
  });
  deliveryChecks.forEach((check,index)=>check.addEventListener('change',()=>{
    if(check.checked)deliveryChecks[1-index].checked=false;
    form.querySelector('.finish-error')!.textContent='';syncDelivery();
  }));
  syncDelivery();
  form.addEventListener('submit',event=>{
    if((event as SubmitEvent).submitter?.getAttribute('value')!=='save')return;
    try{
      if(!input('exerciseId').value.trim()||/[<>:"/\\|?*\x00-\x1f]/.test(input('exerciseId').value))throw new Error('Escribe un ID válido, sin caracteres especiales de archivo.');
      validate(input('email').disabled?'':input('email').value,input('brightspace').disabled?'':input('brightspace').value);
    }catch(error){event.preventDefault();form.querySelector('.finish-error')!.textContent=(error as Error).message;}
  });
  dialog.addEventListener('close',()=>{
    if(dialog.returnValue==='save'){
      window.saveHistoryState(true);
      block.dataset.exerciseId=input('exerciseId').value.trim();block.dataset.requireName=String(input('requireName').checked);
      block.dataset.teacherEmail=input('email').disabled?'':input('email').value.trim();
      block.dataset.brightspaceUrl=input('brightspace').disabled?'':input('brightspace').value.trim();
      block.dataset.reviewWatermark=String(watermarkCheck.checked);
      block.dataset.reviewWatermarkText=watermarkText.value.replace(/\s+/g,' ').trim()||'Para revisión';
      normalizeFinish(block);window.saveHistoryState(true);
    }
    dialog.remove();
  },{once:true});
  document.body.append(dialog);dialog.showModal();
}
