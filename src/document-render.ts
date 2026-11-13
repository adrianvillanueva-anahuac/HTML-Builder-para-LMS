import {getBlockToolbar,getParrafoBasicoHTML,getTituloBasicoHTML,getTabsHTML,getAcordeonHTML,getTablaDinamicaHTML} from './templates';
import {escapeHtml} from './html-sanitize';
import type {DocumentPlan,SourceBlock} from './document-plan';

function element(html:string):HTMLElement{const t=document.createElement('template');t.innerHTML=html;return t.content.firstElementChild as HTMLElement;}
export function documentImportPanelHTML():string{
  return `<div class="document-drop-surface" data-doc-drop tabindex="0" role="group" aria-label="Importar documentos">
    <span class="material-symbols-outlined" aria-hidden="true">upload_file</span><h3>Documentos a página</h3>
    <p>Arrastra aquí tus archivos o selecciónalos desde tu PC.</p><p class="doc-format-help">Word (.docx), Markdown, TXT y CSV · Hasta 5 archivos · 5 MB por archivo</p>
    <input type="file" data-doc-file-input accept=".docx,.md,.markdown,.txt,.csv" multiple hidden>
    <div class="doc-block-actions"><button type="button" data-doc-pick>Seleccionar archivos</button></div>
    <div class="doc-cloud-sources"><span>O elige un documento privado en la nube</span><div class="doc-block-actions"><button type="button" data-doc-cloud="google"><span class="material-symbols-outlined" aria-hidden="true">cloud</span> Google Drive</button><button type="button" data-doc-cloud="microsoft"><span class="material-symbols-outlined" aria-hidden="true">cloud_queue</span> OneDrive</button></div><small>Se solicitará iniciar sesión y autorizar el acceso de lectura.</small></div>
    <ul data-doc-pending></ul><p data-doc-block-status role="status" aria-live="polite">Selecciona un archivo para comenzar.</p>
    <div class="doc-block-actions"><button type="button" class="doc-primary" data-doc-process disabled>Procesar</button><button type="button" data-doc-clear disabled>Quitar archivos</button></div>
    <p class="doc-format-help">Verás un previo antes de insertar. El resultado será editable con las herramientas del Builder, con un máximo de 35 elementos.</p>
    <details class="doc-advanced"><summary>Diseño asistido por IA</summary><button type="button" data-open-document-import>Abrir opciones de Gemini</button></details>
  </div>`;
}
export function getDocumentImporterHTML():string{
  return `<div class="relative mb-8 lms-element is-rendered" data-type="document_importer">${getBlockToolbar('document_importer')}${documentImportPanelHTML()}</div>`;
}
function renderBlock(b:SourceBlock):HTMLElement{
  const node=element(b.kind==='heading'?getTituloBasicoHTML():b.kind==='table'?getTablaDinamicaHTML():getParrafoBasicoHTML());
  node.dataset.type=b.kind==='heading'?'titulo_basico':b.kind==='table'?'tabla_dinamica':'parrafo_basico';
  node.dataset.documentSource=b.source;node.dataset.documentBlock=b.id;
  if(b.kind==='table'){
    const table=element(b.html);table.className='w-full border-collapse text-sm font-sans';table.style.width='100%';
    table.querySelectorAll('td,th').forEach(cell=>{const div=document.createElement('div');div.className='editable-text';div.innerHTML=cell.innerHTML;cell.replaceChildren(div);(cell as HTMLElement).style.cssText='border:1px solid #cdd5dc;padding:10px';});
    node.querySelector('table')!.replaceWith(table);
  }else{
    const text=node.querySelector<HTMLElement>('.editable-text')!;
    text.style.fontSize=b.kind==='heading'?'20px':'14px';
    if(b.kind==='heading'){text.textContent=b.text;text.style.textAlign='left';}
    else text.innerHTML=b.html;
  }
  return node;
}
export function renderDocumentPlan(plan:DocumentPlan,blocks:SourceBlock[]):HTMLElement{
  const root=document.createElement('div');const map=new Map(blocks.map(b=>[b.id,b]));
  const groups=plan.groups.map(ids=>ids.map(id=>map.get(id)!));
  // Count actual .lms-element wrappers, including nested blocks. Large sources are
  // packed by semantic group; original source IDs remain on the inner sections.
  const compact=blocks.length+(plan.layout==='reading'?0:1)>35;
  const renderGroup=(group:SourceBlock[]):HTMLElement[]=>{
    if(!compact)return group.map(renderBlock);
    const packed=element(getParrafoBasicoHTML());packed.dataset.type='parrafo_basico';
    const field=packed.querySelector<HTMLElement>('.editable-text')!;field.style.fontSize='14px';field.replaceChildren();
    group.forEach(b=>{const section=document.createElement('div');section.dataset.documentSource=b.source;section.dataset.documentBlock=b.id;section.innerHTML=b.html;section.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6').forEach(h=>{h.style.fontSize='20px';h.style.color='#5d428c';});section.querySelectorAll<HTMLElement>('td,th').forEach(c=>c.style.cssText='border:1px solid #cdd5dc;padding:8px');section.style.marginBottom='12px';field.append(section);});
    return [packed];
  };
  const label=(group:SourceBlock[],i:number)=>group.find(b=>b.kind==='heading')?.text.slice(0,80)||`Sección ${i+1} · ${group[0].source}`;
  if(plan.layout==='reading'){groups.forEach(group=>root.append(...renderGroup(group)));return root;}
  if(plan.layout==='tabs'){
    const tabs=element(getTabsHTML());const buttons=tabs.querySelector('.tab-buttons-container')!;const panes=tabs.querySelector('.tabs-panes-wrapper')!;
    const button=buttons.firstElementChild!.cloneNode(true) as HTMLElement;const pane=panes.firstElementChild!.cloneNode(false) as HTMLElement;buttons.replaceChildren();panes.replaceChildren();
    const uid=crypto.randomUUID();
    groups.forEach((group,i)=>{const btn=button.cloneNode(true) as HTMLElement;const content=pane.cloneNode(false) as HTMLElement;const id=`import-${uid}-${i}`;content.id=id;content.style.display=i?'none':'flex';btn.setAttribute('onclick',`toggleLmsTab(this, '${id}')`);btn.querySelector('.editable-text')!.textContent=label(group,i);if(i){btn.classList.remove('border-anahuac-orange','text-anahuac-orange');btn.classList.add('border-transparent','text-gray-500');}content.append(...renderGroup(group));buttons.append(btn);panes.append(content);});
    root.append(tabs);return root;
  }
  if(plan.layout==='accordion'){
    const accordion=element(getAcordeonHTML());const wrapper=accordion.querySelector('.accordion-wrapper')!;const seed=wrapper.firstElementChild!.cloneNode(true) as HTMLElement;wrapper.replaceChildren();
    groups.forEach((group,i)=>{const topic=seed.cloneNode(true) as HTMLElement;topic.querySelector('summary .editable-text')!.textContent=label(group,i);const zone=topic.querySelector('.lms-dropzone')!;zone.replaceChildren(...renderGroup(group));if(!i)topic.setAttribute('open','');wrapper.append(topic);});root.append(accordion);return root;
  }
  const grid=element(`<div class="relative lms-element is-rendered mb-8" data-type="document_cards">${getBlockToolbar('document_cards')}<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:20px" data-document-cards></div></div>`);
  groups.forEach((group,i)=>{const card=element(`<section class="lms-dropzone" style="background:#f5f0fa;border:1px solid #cdd5dc;border-top:4px solid #5d428c;border-radius:8px;padding:20px;min-width:0"><h3 class="editable-text font-serif" style="font-size:20px;color:#5d428c">${escapeHtml(label(group,i))}</h3></section>`);card.append(...renderGroup(group));grid.querySelector('[data-document-cards]')!.append(card);});root.append(grid);return root;
}
