/* Embedded in the downloadable exercise; no server or editor is required. */
(() => {
  const state = JSON.parse(document.getElementById('exercise-student-state').textContent);
  const answers = [...document.querySelectorAll('.student-answer')];
  const nameInput = document.querySelector('.student-name');
  const finish = document.querySelector('.exercise-finish');
  const status = document.querySelector('.exercise-status');
  let dirty = false;
  let handle = null;
  let busy = false;
  let saving = false;
  let revision = 0;
  const filename = () => ((nameInput?.value.trim() || 'sin_nombre') + ' - ' + document.title).normalize('NFKC').replace(/[<>:"/\\|?*\x00-\x1f]/g,'').replace(/\s+/g,'_').slice(0,120);
  const resize = field => {
    field.style.height='auto';field.style.height=field.scrollHeight+'px';
    // Nested containers must not clip a growing response.
    let parent=field.parentElement;
    while(parent && !parent.classList.contains('anahuac-builder-export')) {
      parent.style.maxHeight='none';
      if(getComputedStyle(parent).overflowY==='hidden') parent.style.overflowY='visible';
      if(parent.classList.contains('flipcard-front') || parent.classList.contains('flipcard-back')) {parent.style.position='relative';parent.style.height='auto';}
      parent=parent.parentElement;
    }
  };
  const update = () => {
    answers.forEach(field=>{field.readOnly=state.finalized || busy;resize(field);});
    if (nameInput) nameInput.readOnly=state.finalized || busy;
    if (finish) finish.disabled=busy || saving || (!state.finalized && (!nameInput || nameInput.value.trim().split(/\s+/).length<2));
    document.getElementById('student-save').disabled=busy || saving;
    if (finish) finish.querySelector('.exercise-button-text').textContent=state.finalized?'Descargar HTML final y entregar':finish.dataset.originalText;
  };
  if (finish) finish.dataset.originalText=finish.dataset.originalText || finish.querySelector('.exercise-button-text').textContent;
  function serialize() {
    const clone=document.documentElement.cloneNode(true);
    clone.querySelectorAll('.student-dialog').forEach(el=>el.remove());
    clone.querySelectorAll('.student-answer').forEach((field,i)=>{field.textContent=answers[i].value;});
    if (nameInput) clone.querySelector('.student-name').setAttribute('value',nameInput.value);
    clone.querySelector('#exercise-student-state').textContent=JSON.stringify(state).replace(/</g,'\\u003c');
    return '<!doctype html>\n'+clone.outerHTML;
  }
  function download(blob, name) {
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  async function save() {
    if(busy || saving) return false;
    saving=true;update();
    try {
      if('showSaveFilePicker' in window) {
        if(!handle) handle=await window.showSaveFilePicker({suggestedName:filename()+'.html',types:[{description:'Ejercicio HTML',accept:{'text/html':['.html']}}]});
        const writable=await handle.createWritable();
        const savedRevision=revision;
        await writable.write(serialize());await writable.close();
        dirty=revision!==savedRevision;
        status.textContent=dirty?'Hay cambios posteriores al último guardado':'Progreso guardado en el archivo seleccionado';
      } else {
        download(new Blob([serialize()],{type:'text/html'}),filename()+'.html');
        status.textContent='Copia descargada: verifica que se guardó antes de cerrar';
        // A download cannot confirm that bytes reached disk. Keep the unload warning.
      }
      return true;
    } catch(error) {
      if(error.name!=='AbortError') {
        handle=null;
        status.textContent='No se pudo guardar. Pulsa «Guardar progreso» de nuevo y elige un archivo con permiso de escritura.';
      }
      return false;
    } finally {saving=false;update();}
  }
  document.getElementById('student-save').onclick=()=>save();
  document.addEventListener('input',event=> {
    if(!event.target.matches('.student-answer,.student-name'))return;
    revision++;dirty=true;status.textContent='Cambios sin guardar';update();
  });
  window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
  function dialog(title,text) {
    const el=document.createElement('dialog');el.className='student-dialog';
    const h=document.createElement('h2');h.textContent=title;const p=document.createElement('p');p.textContent=text;
    el.append(h,p);document.body.append(el);el.addEventListener('close',()=>el.remove());el.showModal();return el;
  }
  async function finalize() {
    busy=true;update();status.textContent='Preparando HTML final…';
    try {
      const previousFinalized=state.finalized;
      state.finalized=true;dirty=true;busy=false;update();
      try { download(new Blob([serialize()],{type:'text/html;charset=utf-8'}),filename()+' - final.html'); } catch(error) { state.finalized=previousFinalized; throw error; }
      status.textContent='HTML final descargado. Adjunta el archivo manualmente; aún no se ha enviado.';
      const panel=dialog('HTML final preparado','El archivo aún no se ha enviado. Abre el destino y adjunta manualmente el HTML descargado. En Brightspace, inicia sesión y confirma la entrega; por correo, comprueba que permita adjuntar HTML.');
      const mail=document.createElement('a');const email=document.querySelector('[data-teacher-email]')?.dataset.teacherEmail || '';
      mail.href='mailto:'+encodeURIComponent(email)+'?subject='+encodeURIComponent('Entrega de ejercicio — '+nameInput.value)+'&body='+encodeURIComponent('Profesor/a:\nAdjunto mi ejercicio en HTML.\n\n'+nameInput.value);
      mail.textContent='Abrir correo al profesor';if (email) panel.append(mail);
      const url=document.querySelector('[data-brightspace-url]')?.dataset.brightspaceUrl || '';
      if (url) {
        try {
          if (new URL(url).protocol === 'https:') {
            const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';
            link.textContent='Abrir entrega en Brightspace';link.style.display='block';panel.append(link);
          }
        } catch {}
      }
      const footer=document.createElement('footer');
      const locateButton=document.createElement('button');locateButton.textContent='Cómo localizar el archivo';
      locateButton.onclick=()=> {
        const help=dialog('Localizar el HTML final','Abre el menú de Chrome y selecciona Descargas (Ctrl+J en Windows). Busca la descarga reciente «'+filename()+' - final.html» y pulsa «Mostrar en carpeta». Si cambiaste el nombre o Chrome añadió un número, identifica la descarga por su hora. Este documento no puede abrir directamente la carpeta ni conocer la ubicación elegida.');
        const done=document.createElement('button');done.textContent='Entendido';done.onclick=()=>help.close();help.append(done);
      };
      const close=document.createElement('button');close.textContent='Cerrar';close.onclick=()=>panel.close();footer.append(locateButton,close);panel.append(footer);
    } catch(error) {status.textContent='No se pudo preparar el HTML final. Tus respuestas siguen disponibles.';console.error(error);} finally {busy=false;update();}
  }
  if (finish) finish.onclick=()=> {
    if(state.finalized){void finalize();return;}
    const panel=dialog('¿Finalizar el ejercicio?','Revisa tus respuestas. La copia final quedará bloqueada para edición. Podrás descargar el HTML final y abrir el destino de entrega de nuevo.');
    const footer=document.createElement('footer');const cancel=document.createElement('button');cancel.textContent='Seguir editando';cancel.onclick=()=>panel.close();
    const confirm=document.createElement('button');confirm.textContent='Finalizar';confirm.onclick=()=>{panel.close();void finalize();};footer.append(cancel,confirm);panel.append(footer);
  };
  status.textContent=state.finalized?'Ejercicio finalizado':'Ejercicio abierto';update();
  window.addEventListener('resize',()=>answers.forEach(resize));
})();
