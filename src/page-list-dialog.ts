import Sortable from 'sortablejs';
import './page-list-dialog.css';

export function nextPageName(name:string):string {
  const text=name.trim();const match=text.match(/^(.*?)(\d+)$/);
  return match ? match[1]+String(BigInt(match[2])+1n).padStart(match[2].length,'0') : `${text||'Página'} 2`;
}

export function pageListDialog(initial:string):Promise<string[]|null> {
  return new Promise(resolve=>{
    const previous=document.activeElement as HTMLElement|null;
    const dialog=document.createElement('dialog');dialog.className='exercise-settings project-prompt page-list-dialog';
    dialog.setAttribute('aria-labelledby','page-list-title');
    const form=document.createElement('form');form.method='dialog';
    form.innerHTML='<header><h2 id="page-list-title">Nombre de la nueva página</h2><button type="button" class="page-list-mode" title="Crear varias páginas" aria-label="Crear varias páginas" aria-pressed="false"><span class="material-symbols-outlined" aria-hidden="true">format_list_numbered</span></button></header><div class="page-name-list"></div><p class="page-list-help" hidden>Agrega páginas con +. Arrastra los seis puntos para ordenar; también puedes usar Alt + ↑ o ↓ en el campo.</p><div class="exercise-dialog-actions"><button value="cancel" formnovalidate>Cancelar</button><button value="ok">Aceptar</button></div>';
    const list=form.querySelector<HTMLElement>('.page-name-list')!;
    let multiple=false;
    const icon=(name:string)=>`<span class="material-symbols-outlined" aria-hidden="true">${name}</span>`;
    const refresh=()=>{
      Array.from(list.children).forEach((row,i)=>{
        row.querySelector('input')!.setAttribute('aria-label',`Nombre de la página ${i+1}`);
        row.querySelector<HTMLButtonElement>('.page-name-delete')!.disabled=list.children.length===1;
        row.querySelector<HTMLElement>('.page-name-add')!.hidden=!multiple||i!==list.children.length-1;
      });
    };
    const add=(value:string,focus=false)=>{
      const row=document.createElement('div');row.className='page-name-row';
      const grip=document.createElement('button');grip.type='button';grip.className='page-name-grip';grip.title='Arrastrar para ordenar';grip.setAttribute('aria-label',grip.title);grip.innerHTML=icon('drag_indicator');
      const input=document.createElement('input');input.type='text';input.required=true;input.maxLength=120;input.value=value;
      input.oninput=()=>input.setCustomValidity('');
      const remove=document.createElement('button');remove.type='button';remove.className='page-name-delete';remove.title='Eliminar campo';remove.setAttribute('aria-label',remove.title);remove.innerHTML=icon('delete');
      remove.onclick=()=>{if(list.children.length<2)return;const next=(row.nextElementSibling||row.previousElementSibling) as HTMLElement;row.remove();refresh();next.querySelector('input')!.focus();};
      const plus=document.createElement('button');plus.type='button';plus.className='page-name-add';plus.title='Agregar otra página';plus.setAttribute('aria-label',plus.title);plus.innerHTML=icon('add');
      plus.onclick=()=>{const last=list.lastElementChild!.querySelector('input')!.value;add(nextPageName(last),true);};
      row.onkeydown=event=>{
        if(!multiple||!event.altKey||!['ArrowUp','ArrowDown'].includes(event.key))return;
        event.preventDefault();const adjacent=event.key==='ArrowUp'?row.previousElementSibling:row.nextElementSibling;
        if(adjacent){if(event.key==='ArrowUp')list.insertBefore(row,adjacent);else list.insertBefore(adjacent,row);refresh();input.focus();}
      };
      row.append(grip,input,remove,plus);list.append(row);refresh();if(focus){input.focus();input.select();}
    };
    add(initial);
    const sortable=Sortable.create(list,{animation:150,handle:'.page-name-grip',draggable:'.page-name-row',disabled:true,onEnd:refresh});
    form.querySelector<HTMLButtonElement>('.page-list-mode')!.onclick=()=>{
      multiple=true;dialog.classList.add('is-list');sortable.option('disabled',false);
      form.querySelector('.page-list-mode')!.setAttribute('aria-pressed','true');
      form.querySelector('h2')!.textContent='Nombres de las nuevas páginas';form.querySelector<HTMLElement>('.page-list-help')!.hidden=false;refresh();
    };
    form.onsubmit=event=>{
      if((event as SubmitEvent).submitter?.getAttribute('value')!=='ok')return;
      for(const input of list.querySelectorAll('input'))if(!input.value.trim()){event.preventDefault();input.setCustomValidity('Escribe un nombre');input.reportValidity();break;}
    };
    dialog.addEventListener('close',()=>{
      const names=dialog.returnValue==='ok'?Array.from(list.querySelectorAll('input')).map(input=>input.value.trim()):null;
      sortable.destroy();dialog.remove();previous?.focus();resolve(names);
    },{once:true});
    dialog.append(form);document.body.append(dialog);dialog.showModal();list.querySelector('input')!.focus();list.querySelector('input')!.select();
  });
}
