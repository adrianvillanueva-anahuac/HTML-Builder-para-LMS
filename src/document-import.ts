import './document-import.css';
import {extractDocument} from './document-extract';
import {checkExtraction,duplicateCount,localPlans,validatePlans,IMPORT_LIMITS,type ExtractedDocument,type DocumentPlan,type SourceBlock} from './document-plan';
import {renderDocumentPlan,documentImportPanelHTML} from './document-render';
import {escapeHtml} from './html-sanitize';

let active:HTMLDialogElement|null=null;
const descriptions=[['Lectura continua','Recorrido completo en una columna.'],['Pestañas temáticas','Secciones consultables dentro de una misma página.'],['Acordeones','Despliega cada sección cuando la necesites.'],['Fichas','Compara secciones en una cuadrícula adaptable.']];

export function openDocumentImport(target:HTMLElement, initialFiles?:File[], previewOnly=false){
  if(active||!target.isConnected)return;
  let documents:ExtractedDocument[]=[],blocks:SourceBlock[]=[],plans:DocumentPlan[]=[],selected=-1,closed=false,busy=false;
  const controller=new AbortController();const previous=document.activeElement as HTMLElement|null;
  const dialog=document.createElement('dialog');active=dialog;dialog.className='document-import-dialog';dialog.setAttribute('aria-label','Documentos a página');
  dialog.innerHTML=`<header><h2>${previewOnly?'Vista previa del documento':'Documentos a página'}</h2><button type="button" data-close aria-label="Cerrar importación">Cerrar</button></header>
    <div data-import-source-controls><p>1. Carga y revisa · 2. Convierte a lectura continua o genera cuatro propuestas con IA · 3. Revisa e inserta</p>
    <p>Hasta 5 archivos, 5 MB por archivo y 12 MB en total. DOCX, Markdown, TXT UTF-8 y CSV. Máximo 35 elementos por propuesta, incluyendo los anidados.</p>
    <details><summary>Desde Google o Microsoft Office</summary><p>Google Docs: Archivo → Descargar → Word (.docx) o Markdown. Google Sheets / Excel: exporta cada hoja a CSV UTF-8 separado por comas. Word: guarda como .docx. No se admiten enlaces directos, PDF, PPTX o XLSX en esta versión.</p></details>
    <div class="doc-actions"><label>Seleccionar documentos <input type="file" multiple accept=".docx,.md,.markdown,.txt,.csv" data-files></label><button type="button" data-example>Usar ejemplo ficticio</button></div>
    </div><p role="status" aria-live="polite" class="doc-status">Los archivos se procesan en este navegador. No se envían automáticamente.</p>
    <div data-review></div>
    <label class="doc-consent"><input type="checkbox" data-consent><span>Autorizo enviar a Gemini el texto extraído de estos documentos para organizarlo. No se enviarán imágenes ni archivos originales. El nivel gratuito puede usar contenido para mejorar productos; revisa los términos de tu cuenta. No enviar información privada sin autorización.</span></label>
    <div class="doc-actions" data-import-generation-controls><button type="button" data-local disabled>Convertir a lectura continua (local)</button><button type="button" data-ai disabled>Generar 4 propuestas con Gemini</button></div>
    <div class="doc-proposals"></div><section data-full-preview hidden><button type="button" data-close-preview>Volver a propuestas</button><div data-full-preview-body></div></section><div class="doc-actions"><button type="button" class="doc-primary" data-insert disabled>Insertar propuesta elegida</button></div>
    <p>Se conserva el contenido extraído. Duplicados y contradicciones no se eliminan ni resuelven automáticamente. Al insertar, guarda tu proyecto .lmsproject para continuar editando.</p>`;
  document.body.append(dialog);dialog.showModal();
  const q=<T extends HTMLElement>(s:string)=>dialog.querySelector<T>(s)!;
  const status=q('.doc-status');
  const setBusy=(value:boolean)=>{busy=value;dialog.setAttribute('aria-busy',String(value));q<HTMLInputElement>('[data-files]').disabled=value;q<HTMLButtonElement>('[data-example]').disabled=value;q<HTMLButtonElement>('[data-local]').disabled=value||!blocks.length;q<HTMLButtonElement>('[data-ai]').disabled=value||!blocks.length;q<HTMLButtonElement>('[data-insert]').disabled=value||selected<0;};
  const cleanup=()=>{if(closed)return;closed=true;controller.abort();dialog.remove();active=null;documents=[];blocks=[];plans=[];previous?.isConnected&&previous.focus();};
  dialog.addEventListener('close',cleanup,{once:true});const close=()=>{dialog.close();cleanup();};dialog.addEventListener('cancel',event=>{event.preventDefault();close();});q('[data-close]').onclick=close;
  q('[data-close-preview]').onclick=()=>{q('[data-full-preview]').hidden=true;q('[data-full-preview-body]').replaceChildren();};
  const clearPlans=()=>{q('[data-full-preview]').hidden=true;q('[data-full-preview-body]').replaceChildren();plans=[];selected=-1;q('.doc-proposals').replaceChildren();q<HTMLButtonElement>('[data-insert]').disabled=true;};
  const load=async(files:File[])=>{
    clearPlans();blocks=[];documents=[];q('[data-review]').replaceChildren();q<HTMLInputElement>('[data-consent]').checked=false;
    if(!files.length)return;
    if(files.length>IMPORT_LIMITS.files||files.reduce((n,f)=>n+f.size,0)>IMPORT_LIMITS.totalBytes){status.textContent='Máximo 5 archivos y 12 MB en total.';setBusy(false);return;}
    setBusy(true);
    try{
      for(const [i,file] of files.entries()){if(closed)return;status.textContent=`Extrayendo ${i+1}/${files.length}: ${file.name}`;documents.push(await extractDocument(file,i));}
      if(closed)return;blocks=checkExtraction(documents);
      q('[data-review]').innerHTML=`<details open><summary>Revisar ${blocks.length} bloques extraídos</summary><div class="doc-review">${documents.map(d=>`<h3>${escapeHtml(d.name)} — ${d.blocks.length} bloques, ${d.blocks.filter(b=>b.kind==='table').length} tablas</h3>${d.warnings.map(w=>`<p>⚠ ${escapeHtml(w)}</p>`).join('')}${d.blocks.map(b=>`<p><b>${escapeHtml(b.kind)}</b> · ${escapeHtml(b.text)}</p>`).join('')}`).join('')}</div></details>`;
      status.textContent=`Extracción lista: ${documents.length} documentos. ${duplicateCount(blocks)} repeticiones exactas conservadas. Revisa las advertencias antes de insertar.`;
      if(previewOnly){plans=localPlans(blocks).filter(p=>p.layout==='reading');selected=0;const preview=renderDocumentPlan(plans[0],blocks);const count=preview.querySelectorAll('.lms-element').length;preview.querySelectorAll('.block-toolbar,summary button').forEach(el=>el.remove());preview.querySelectorAll('.editable-text').forEach(el=>el.classList.remove('editable-text'));q('[data-full-preview-body]').replaceChildren(preview);q('[data-full-preview]').hidden=false;status.textContent+=` Vista previa: ${count} / 35 elementos. Aún no se ha insertado en la página.`;q('[data-review] details')?.removeAttribute('open');}
    }catch(error){documents=[];blocks=[];status.textContent=(error as Error).message;}
    finally{if(!closed)setBusy(false);}
  };
  q<HTMLInputElement>('[data-files]').onchange=e=>void load(Array.from((e.target as HTMLInputElement).files||[]));
  q('[data-example]').onclick=()=>void load([new File(['# Uso responsable del agua\n\nEl agua es un recurso compartido.\n\n## Observa\n\nRegistra el consumo durante **tres días**.\n\n## Compara\n\n| Acción | Litros del ejemplo |\n|---|---|\n| Reparar fuga | 10 |\n| Reutilizar agua | 5 |\n\n## Reflexiona\n\n¿Qué hábito puedes cambiar?'], 'Ejemplo-agua.md',{type:'text/markdown'}),new File(['# Actividad\n\nComparte una propuesta con tu grupo.\n\nEl agua es un recurso compartido.'],'Actividad.txt',{type:'text/plain'})]);
  const showPlans=(result:DocumentPlan[],mode:string)=>{
    plans=result;selected=-1;const list=q('.doc-proposals');list.replaceChildren();
    plans.forEach((plan,i)=>{const index=['reading','tabs','accordion','cards'].indexOf(plan.layout);const card=document.createElement('section');card.className='doc-choice';card.innerHTML=`<h3>${descriptions[index][0]}</h3><p>${descriptions[index][1]}</p><p>${plan.groups.length} secciones · ${blocks.length} bloques</p><div class="doc-preview" aria-label="Vista previa de ${descriptions[index][0]}"></div><button type="button" data-doc-select>Elegir ${descriptions[index][0]}</button>`;const preview=renderDocumentPlan(plan,blocks);const count=document.createElement('p');count.textContent=`${preview.querySelectorAll('.lms-element').length} / 35 elementos`;card.prepend(count);preview.querySelectorAll('.block-toolbar').forEach(el=>el.remove());preview.querySelectorAll('*').forEach(el=>{for(const attr of [...el.attributes])if(attr.name.startsWith('on')||attr.name==='id')el.removeAttribute(attr.name);});preview.inert=true;card.querySelector('.doc-preview')!.append(preview);const expand=document.createElement('button');expand.type='button';expand.dataset.docExpand='';expand.textContent='Vista completa';expand.onclick=()=>{const full=renderDocumentPlan(plan,blocks);full.querySelectorAll('.block-toolbar,summary button').forEach(el=>el.remove());full.querySelectorAll('.editable-text').forEach(el=>el.classList.remove('editable-text'));q('[data-full-preview-body]').replaceChildren(full);q('[data-full-preview]').hidden=false;q('[data-full-preview]').scrollIntoView({block:'start'});};card.append(expand);card.querySelector<HTMLElement>('[data-doc-select]')!.onclick=()=>{selected=i;list.querySelectorAll('.doc-choice').forEach((el,j)=>el.setAttribute('aria-pressed',String(i===j)));q<HTMLButtonElement>('[data-insert]').disabled=false;};list.append(card);});
    status.textContent=`${plans.length===1?'Lectura continua lista':'Cuatro propuestas listas'} · ${mode}. Las miniaturas muestran el inicio; el contenido completo se insertará editable.`;
  };
  q('[data-local]').onclick=()=>{if(!busy&&blocks.length){clearPlans();showPlans(localPlans(blocks).filter(plan=>plan.layout==='reading'),'conversión local, sin IA ni envío');}};
  q('[data-ai]').onclick=async()=>{
    if(busy||!blocks.length)return;
    if(!q<HTMLInputElement>('[data-consent]').checked){status.textContent='Autoriza el envío del texto a Gemini o utiliza composición local.';return;}
    clearPlans();setBusy(true);status.textContent='Gemini está organizando el contenido. Puedes cancelar cerrando este diálogo.';
    try{
      const response=await fetch(`${import.meta.env.BASE_URL}__document-ai`,{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({consent:true,blocks:blocks.map(({id,kind,text})=>({id,kind,text}))})});
      if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('Gemini requiere el servidor local configurado. En esta versión publicada usa composición local.');
      const result=await response.json();if(!response.ok)throw new Error(result.error||'No fue posible generar propuestas.');
      if(!closed)showPlans(validatePlans(result,blocks.map(b=>b.id)),'Gemini');
    }catch(error){if(!closed)status.textContent=(error as Error).message;}
    finally{if(!closed)setBusy(false);}
  };
  q('[data-insert]').onclick=()=>{
    if(selected<0||busy)return;
    if(!target.isConnected){status.textContent='El bloque original ya no está en el lienzo. Cierra y abre otro bloque de importación.';return;}
    const result=renderDocumentPlan(plans[selected],blocks);if(result.querySelectorAll('.lms-element').length>35){status.textContent='La propuesta excede 35 elementos. No se insertó.';return;}const parent=target.parentElement!;
    window.saveHistoryState?.(true);target.replaceWith(...Array.from(result.children));window.initNestedDropzones?.();parent.dispatchEvent(new Event('input',{bubbles:true}));window.saveHistoryState?.(true);dialog.close();cleanup();
  };
  if(previewOnly){q('[data-import-source-controls]').hidden=true;q('.doc-consent').hidden=true;q('[data-import-generation-controls]').hidden=true;q('.doc-proposals').hidden=true;q('[data-close-preview]').hidden=true;q('[data-close]').textContent='Volver';q('[data-insert]').textContent='Aceptar e insertar';}
  if(initialFiles?.length)void load(initialFiles);
}

const pendingImports=new WeakMap<HTMLElement,{files:File[];connecting:boolean}>();
export function setupDocumentImport(){
  document.querySelectorAll<HTMLElement>('#canvas [data-type="document_importer"]').forEach(target=>{
    if(pendingImports.has(target))return;
    if(!target.querySelector('[data-doc-drop]')){
      Array.from(target.children).filter(child=>!child.classList.contains('block-toolbar')).forEach(child=>child.remove());
      target.insertAdjacentHTML('beforeend',documentImportPanelHTML());
    }
    const state={files:[] as File[],connecting:false};pendingImports.set(target,state);
    const q=<T extends HTMLElement>(s:string)=>target.querySelector<T>(s)!;
    const surface=q('[data-doc-drop]'),status=q('[data-doc-block-status]'),input=q<HTMLInputElement>('[data-doc-file-input]');
    const refresh=()=>{
      q('[data-doc-pending]').replaceChildren();
      state.files.forEach(file=>{const li=document.createElement('li');const extension=file.name.split('.').pop()?.toUpperCase();li.textContent=`${file.name} · ${extension} · ${(file.size/1024).toFixed(1)} KB`;q('[data-doc-pending]').append(li);});
      q<HTMLButtonElement>('[data-doc-process]').disabled=state.connecting||!state.files.length;q<HTMLButtonElement>('[data-doc-clear]').disabled=state.connecting||!state.files.length;
      status.textContent=state.files.length?`${state.files.length} archivo(s) listos. Pulsa Procesar para revisar el resultado.`:'Selecciona un archivo para comenzar.';
    };
    const select=(files:File[])=>{
      if(state.connecting||!files.length)return;
      const invalid=files.find(file=>! /\.(docx|md|markdown|txt|csv)$/i.test(file.name)||!file.size||file.size>IMPORT_LIMITS.fileBytes);
      if(invalid||files.length>IMPORT_LIMITS.files||files.reduce((n,file)=>n+file.size,0)>IMPORT_LIMITS.totalBytes){state.files=[];refresh();status.textContent=invalid?`${invalid.name}: formato incompatible, archivo vacío o mayor de 5 MB. Usa DOCX, Markdown, TXT o CSV.`:'Máximo 5 archivos y 12 MB en total.';return;}
      state.files=files;refresh();
    };
    refresh();input.value='';
    q('[data-doc-pick]').onclick=()=>{if(!state.connecting)input.click();};
    input.onchange=()=>{select(Array.from(input.files||[]));input.value='';};
    surface.ondragover=event=>{if(event.dataTransfer?.types.includes('Files')){event.preventDefault();event.stopPropagation();event.dataTransfer.dropEffect='copy';surface.classList.add('doc-drag-active');}};
    surface.ondragleave=event=>{if(!(event.relatedTarget instanceof Node)||!surface.contains(event.relatedTarget))surface.classList.remove('doc-drag-active');};
    surface.ondrop=event=>{if(event.dataTransfer?.types.includes('Files')){event.preventDefault();event.stopPropagation();surface.classList.remove('doc-drag-active');select(Array.from(event.dataTransfer.files));}};
    q('[data-doc-clear]').onclick=()=>{state.files=[];refresh();};
    q('[data-doc-process]').onclick=()=>{if(state.files.length&&!state.connecting)openDocumentImport(target,state.files,true);};
    q('[data-open-document-import]').onclick=()=>openDocumentImport(target,state.files);
    target.querySelectorAll<HTMLButtonElement>('[data-doc-cloud]').forEach(button=>button.onclick=async()=>{
      if(state.connecting)return;state.connecting=true;refresh();status.textContent='Preparando acceso autorizado…';
      try{const {chooseCloudDocuments}=await import('./document-cloud');const files=await chooseCloudDocuments(button.dataset.docCloud as 'google'|'microsoft');state.connecting=false;if(!target.isConnected)return;if(files.length)select(files);else refresh();}
      catch(error){state.connecting=false;refresh();status.textContent=(error as Error).message;}
    });
  });
}
