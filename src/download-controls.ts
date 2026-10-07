const palette = [['#5d428c','Morado'],['#ff5900','Naranja'],['#646464','Gris'],['#ffffff','Blanco']];
const menu = (icon:string,title:string,content:string) => `<details class="student-control-menu"><summary aria-label="${title}" title="${title}"><span class="material-symbols-outlined">${icon}</span></summary><div class="student-control-panel"><strong>${title}</strong>${content}</div></details>`;
const choice = (prop:string,value:string,label:string) => `<button type="button" data-download-control="${prop}" value="${value}">${label}</button>`;
export function downloadControls() {
  return menu('edit','Texto del botón','<input aria-label="Texto del botón" data-download-control="label" maxlength="120" placeholder="Descargar ejercicio">')
    + ['fill','ink','border'].map((prop,i)=>menu(['format_color_fill','format_color_text','border_color'][i],['Relleno del botón','Color del texto','Color del borde'][i],palette.map(([v,t])=>choice(prop,v,`<span class="student-color-swatch" style="background:${v}"></span>${t}`)).join(''))).join('')
    + menu('font_download','Fuente del botón',['Roboto','Zilla Slab','Lato'].map(v=>choice('font',v,v)).join(''))
    + menu('line_style','Línea del botón',[['solid','Continua'],['dashed','Guiones'],['dotted','Punteada'],['none','Sin borde']].map(([v,t])=>choice('line',v,t)).join(''))
    + menu('rounded_corner','Redondeado',[['0','Sin redondear'],['6','Suave'],['12','Medio'],['20','Amplio']].map(([v,t])=>choice('radius',v,`${t} · ${v} px`)).join(''));
}
export function setupDownloadControls(canvas:HTMLElement) {
  canvas.addEventListener('input',event=>{
    const input=event.target as HTMLInputElement;
    if(!input.matches('input[data-download-control="label"]'))return;
    const text=input.closest('.exercise-block')?.querySelector('.exercise-button-text');
    if(text){text.textContent=input.value || 'Descargar ejercicio';window.saveHistoryState();}
  });
  canvas.addEventListener('click',event=>{
    if(!(event.target instanceof Element))return;
    const control=event.target.closest<HTMLButtonElement>('button[data-download-control]');
    if(!control)return;
    const block=control.closest<HTMLElement>('.exercise-block')!;
    const link=block.querySelector<HTMLElement>('.exercise-download');if(!link)return;
    const prop=control.dataset.downloadControl,value=control.value;
    if(prop==='fill')link.style.backgroundColor=value;
    if(prop==='ink')link.style.color=value;
    if(prop==='border')link.style.borderColor=value;
    if(prop==='font')link.style.fontFamily=value;
    if(prop==='line')link.style.borderStyle=value;
    if(prop==='radius'){
      link.style.borderRadius=value+'px';
      const box=block.querySelector<HTMLElement>('.exercise-download-row');if(box)box.style.borderRadius=value+'px';
    }
    const details=control.closest('details');if(details){details.open=false;details.querySelector('summary')?.focus();}
    window.saveHistoryState();
  });
  canvas.addEventListener('click',event=>{
    const target=event.target as Element;
    const summary=target.closest('summary');
    if(!summary)return;
    const input=summary.parentElement?.querySelector<HTMLInputElement>('input[data-download-control="label"]');
    if(input)input.value=summary.closest('.exercise-block')?.querySelector('.exercise-button-text')?.textContent || '';
  });
}
