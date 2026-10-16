// Self-contained: included unchanged in the exported LMS document.
export function setupStandaloneHTML() {
  if(window.__lmsStandaloneReady)return;
  window.__lmsStandaloneReady=true;
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('button[data-standalone-html]');
    if(!button)return;
    event.preventDefault();event.stopPropagation();
    let code;
    try{code=new TextDecoder().decode(Uint8Array.from(atob(button.dataset.standaloneHtml),c=>c.charCodeAt(0)));}
    catch{alert('No se pudo abrir el HTML del recurso. Vuelve a cargar el archivo original.');return;}
    const dialog=document.createElement('dialog');
    dialog.setAttribute('aria-label',button.dataset.resourceTitle||'Recurso interactivo');
    dialog.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;max-width:none;max-height:none;margin:0;padding:0;border:0;background:#fff;display:flex;flex-direction:column;overflow:hidden';
    const bar=document.createElement('div');
    bar.style.cssText='flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:8px 16px;background:#5d428c;color:white;font:14px Roboto,Arial,sans-serif';
    const label=document.createElement('span');label.textContent=button.dataset.resourceTitle||'Recurso interactivo';
    const close=document.createElement('button');close.type='button';close.textContent='Cerrar ×';close.setAttribute('aria-label','Cerrar recurso');
    close.style.cssText='border:1px solid #ffffff80;border-radius:20px;background:transparent;color:white;padding:6px 16px;font:inherit;cursor:pointer';
    bar.append(label,close);
    const frame=document.createElement('iframe');frame.title=button.dataset.resourceTitle||'Recurso interactivo';
    // Run the application without granting access to the LMS or builder DOM.
    frame.setAttribute('sandbox','allow-scripts allow-downloads allow-forms allow-modals allow-pointer-lock');
    frame.setAttribute('allow','fullscreen');frame.setAttribute('allowfullscreen','');
    frame.style.cssText='display:block;flex:1 1 0;min-height:0;width:100%;border:0;background:#fff';
    frame.srcdoc=code;
    dialog.append(bar,frame);document.body.append(dialog);dialog.showModal();close.focus();
    let finished=false;
    const finish=()=>{
      if(finished)return;finished=true;
      document.removeEventListener('fullscreenchange',fullscreenChanged);
      if(document.fullscreenElement===dialog)document.exitFullscreen().catch(()=>{});
      dialog.remove();button.focus({preventScroll:true});
    };
    let entered=false;
    const fullscreenChanged=()=>{
      if(document.fullscreenElement===dialog)entered=true;
      else if(entered&&!document.fullscreenElement)finish();
    };
    close.addEventListener('click',finish);
    dialog.addEventListener('cancel',event=>{event.preventDefault();finish();});
    document.addEventListener('fullscreenchange',fullscreenChanged);
    // Called synchronously from the user's click. Permission may be denied by LMS.
    try{dialog.requestFullscreen?.().catch(()=>{label.textContent+=' · Vista ampliada';});}
    catch{label.textContent+=' · Vista ampliada';}
  });
}
