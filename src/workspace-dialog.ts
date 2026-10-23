import {tabPalette,type Workspace,type ChecklistItem} from './project-model';
import {automaticButtonTaskHint} from './button-checklist';

export function workspaceDialog(space:Workspace):Promise<Pick<Workspace,'name'|'tabColor'|'notes'|'checklist'>|null> {
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');dialog.className='exercise-settings workspace-settings';
    const form=document.createElement('form');form.method='dialog';
    form.innerHTML='<h2 id="workspace-settings-title">Info. pestaña</h2><label>Nombre<input name="page-name" required maxlength="120"></label><fieldset class="workspace-color-field"><legend>Color de la pestaña</legend><div class="workspace-colors"></div></fieldset><fieldset><legend>Notas internas</legend><p>Se mostrarán al pasar el cursor por la pestaña.</p><div class="workspace-notes"></div><button type="button" class="workspace-add" data-add-note title="Agregar nota" aria-label="Agregar nota"><span class="material-symbols-outlined" aria-hidden="true">add</span></button></fieldset><div class="exercise-dialog-actions"><button value="cancel" formnovalidate>Cancelar</button><button value="ok">Aceptar</button></div>';
    dialog.setAttribute('aria-labelledby','workspace-settings-title');
    const input=form.querySelector<HTMLInputElement>('input')!;input.value=space.name;
    // Keep an unset color unset until the user explicitly chooses a swatch.
    let color=space.tabColor;
    const palette=form.querySelector('.workspace-colors')!;
    const colorMenu=document.createElement('div');colorMenu.className='workspace-color-picker';
    const colorTrigger=document.createElement('button');colorTrigger.type='button';colorTrigger.className='workspace-color-trigger';colorTrigger.title='Color de la pestaña';colorTrigger.setAttribute('aria-label','Color de la pestaña');colorTrigger.setAttribute('aria-expanded','false');colorTrigger.innerHTML='<span class="material-symbols-outlined" aria-hidden="true">palette</span>';
    const nameLabel=input.closest('label')!;
    const nameRow=document.createElement('div');nameRow.className='workspace-name-row';nameLabel.before(nameRow);nameRow.append(nameLabel,colorMenu);
    colorMenu.append(colorTrigger,palette);form.querySelector('.workspace-color-field')!.remove();
    palette.id='workspace-color-options';palette.setAttribute('role','group');palette.setAttribute('aria-label','Elegir color');colorTrigger.setAttribute('aria-controls',palette.id);
    const toggle=(open:boolean)=>{(palette as HTMLElement).hidden=!open;colorTrigger.setAttribute('aria-expanded',String(open));};toggle(false);
    colorTrigger.onclick=()=>toggle((palette as HTMLElement).hidden);
    form.addEventListener('click',event=>{if(!colorMenu.contains(event.target as Node))toggle(false);});
    colorMenu.addEventListener('keydown',event=>{if(event.key==='Escape'&&!(palette as HTMLElement).hidden){event.preventDefault();event.stopPropagation();toggle(false);colorTrigger.focus();}});
    const choose=(value:string)=>{
      color=value;colorTrigger.style.setProperty('--chosen-color',value);
      palette.querySelectorAll<HTMLButtonElement>('.workspace-color').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.color===value)));
      toggle(false);colorTrigger.focus();
    };
    if(color)colorTrigger.style.setProperty('--chosen-color',color);
    const swatch=(value:string,label:string)=>{
      const button=document.createElement('button');button.type='button';button.className='workspace-color';button.style.backgroundColor=value;
      button.title=label;button.setAttribute('aria-label',label);button.setAttribute('aria-pressed',String(color===value));
      button.dataset.color=value;button.onclick=()=>choose(value);return button;
    };
    palette.append(swatch('#ffffff','Blanco'));
    for(const group of tabPalette){
      const row=document.createElement('div');row.className='workspace-color-row';row.setAttribute('role','group');row.setAttribute('aria-label',group.name);
      group.colors.forEach((value,i)=>row.append(swatch(value,group.name+(i?` · pastel ${i}`:''))));palette.append(row);
    }
    const custom=document.createElement('label');custom.className='workspace-custom-color';custom.textContent='Color personalizado';
    const customInput=document.createElement('input');customInput.type='color';customInput.value=color||'#ffffff';customInput.setAttribute('aria-label','Elegir cualquier color');customInput.onchange=()=>choose(customInput.value);custom.append(customInput);palette.append(custom);
    const notes=form.querySelector('.workspace-notes')!;
    const addNote=(text:string,focus=false)=>{
      const row=document.createElement('div');row.className='workspace-note';
      const area=document.createElement('textarea');area.value=text;area.rows=2;area.setAttribute('aria-label','Nota de la pestaña');
      const remove=document.createElement('button');remove.type='button';remove.title='Eliminar nota';remove.setAttribute('aria-label','Eliminar nota');remove.innerHTML='<span class="material-symbols-outlined" aria-hidden="true">delete</span>';
      remove.onclick=()=>{row.remove();form.querySelector<HTMLButtonElement>('[data-add-note]')!.focus();};row.append(area,remove);notes.append(row);if(focus)area.focus();
    };
    (space.notes||[]).forEach(note=>addNote(note));
    form.querySelector<HTMLButtonElement>('[data-add-note]')!.onclick=()=>addNote('',true);
    const checklist=document.createElement('fieldset');checklist.innerHTML='<legend>Checklist</legend><div class="workspace-checklist"></div><button type="button" class="workspace-add" data-add-task title="Agregar tarea" aria-label="Agregar tarea"><span class="material-symbols-outlined" aria-hidden="true">add</span></button>';
    form.querySelector('.exercise-dialog-actions')!.before(checklist);
    const tasks=checklist.querySelector('.workspace-checklist')!;
    const taskLinks=new WeakMap<Element,string>();
    const addTask=(text:string,done=false,focus=false,buttonId?:string)=>{
      const row=document.createElement('div');row.className='workspace-task';
      const check=document.createElement('input');check.type='checkbox';check.checked=done;check.setAttribute('aria-label','Marcar tarea como completada');
      const field=document.createElement('input');field.type='text';field.value=text;field.placeholder='Describe la tarea';field.setAttribute('aria-label','Texto de la tarea');
      const update=()=>{row.dataset.done=String(check.checked);field.title=check.checked?'Completado':'Pendiente';};check.onchange=update;update();
      const remove=document.createElement('button');remove.type='button';remove.setAttribute('aria-label','Eliminar tarea');remove.title='Eliminar tarea';remove.innerHTML='<span class="material-symbols-outlined" aria-hidden="true">delete</span>';remove.onclick=()=>{row.remove();checklist.querySelector<HTMLButtonElement>('[data-add-task]')!.focus();};
      row.append(check,field);
      if(buttonId){
        taskLinks.set(row,buttonId);row.dataset.automatic='true';row.title=automaticButtonTaskHint;
        check.disabled=true;field.readOnly=true;field.title=text+'\n'+automaticButtonTaskHint;
        const automatic=document.createElement('span');automatic.className='material-symbols-outlined';automatic.textContent='sync';automatic.setAttribute('aria-label','Tarea automática');automatic.title=automaticButtonTaskHint;row.append(automatic);
      }else row.append(remove);
      tasks.append(row);if(focus)field.focus();
    };
    (space.checklist||[]).forEach(item=>addTask(item.text,item.done,false,item.buttonId));
    checklist.querySelector<HTMLButtonElement>('[data-add-task]')!.onclick=()=>addTask('',false,true);
    form.addEventListener('submit',event=>{if((event as SubmitEvent).submitter?.getAttribute('value')==='ok'&&!input.value.trim()){event.preventDefault();input.setCustomValidity('Escribe un nombre');input.reportValidity();}});
    input.oninput=()=>input.setCustomValidity('');
    const previous=document.activeElement as HTMLElement|null;
    dialog.addEventListener('close',()=>{const result=dialog.returnValue==='ok'?{name:input.value.trim(),tabColor:color,notes:Array.from(notes.querySelectorAll('textarea')).map(n=>n.value.trim()).filter(Boolean),checklist:Array.from(tasks.children).map((row):ChecklistItem=>({text:row.querySelector<HTMLInputElement>('input[type=text]')!.value.trim(),done:row.querySelector<HTMLInputElement>('input[type=checkbox]')!.checked,...(taskLinks.has(row)?{buttonId:taskLinks.get(row)}:{})})).filter(item=>item.text)}:null;dialog.remove();previous?.focus();resolve(result);},{once:true});
    dialog.append(form);document.body.append(dialog);dialog.showModal();input.focus();input.select();
  });
}
