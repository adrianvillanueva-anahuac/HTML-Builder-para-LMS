// Native HTML dialogs work in Chrome and the embedded preview (window.prompt does not).
export function projectDialog(title: string, initial?: string, choices?: {value:string;label:string}[]): Promise<string | null> {
  return new Promise(resolve => {
    const dialog=document.createElement('dialog');dialog.className='exercise-settings';
    const form=document.createElement('form');form.method='dialog';
    const heading=document.createElement('h2');heading.textContent=title;form.append(heading);
    let input:HTMLInputElement | undefined;
    if(initial!==undefined){input=document.createElement('input');input.value=initial;input.required=true;input.maxLength=120;input.setAttribute('aria-label',title);form.append(input);}
    const footer=document.createElement('div');footer.className='exercise-dialog-actions';
    const cancel=document.createElement('button');cancel.value='cancel';cancel.formNoValidate=true;cancel.textContent='Cancelar';
    const ok=document.createElement('button');ok.value='ok';ok.textContent=initial===undefined?'Continuar':'Aceptar';
    if(choices){for(const choice of choices){const button=document.createElement('button');button.value=choice.value;button.textContent=choice.label;footer.append(button);}}
    else footer.append(cancel,ok);
    form.append(footer);dialog.append(form);document.body.append(dialog);
    dialog.addEventListener('close',()=>{resolve(choices?(dialog.returnValue || null):(dialog.returnValue==='ok'?(input?.value.trim() ?? 'ok'):null));dialog.remove();},{once:true});
    dialog.showModal();input?.select();
  });
}
