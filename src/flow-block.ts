import {createFlowModel, normalizeFlowModel, type FlowModel} from './flow-model';
import {renderFlowSVG} from './flow-svg';
import {openFlowEditor} from './flow-editor';
import {getBlockToolbar} from './templates';
import {imageURL} from './published-resources';
import {flowBlockControlsHTML,setupFlowBlockControls} from './flow-block-controls';
import './flow-block.css';

const escapeAttribute=(value:string)=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const scopes=new WeakMap<HTMLElement,string>();
const rendered=new WeakMap<HTMLElement,string>();
let installed=false;
let presentation:ReturnType<typeof setupFlowBlockControls>|null=null;
const scopeFor=(block:HTMLElement)=>{
  if(!scopes.has(block)){
    let id=block.dataset.flowBlockId;
    // Reuse the diagram's scope on history/project restoration. Duplicated
    // blocks receive their own scope, so hydration never changes history IDs.
    if(!id||!/^flow-block-[a-f0-9-]{36}$/.test(id)||Array.from(block.ownerDocument.querySelectorAll(`[data-flow-block-id="${id}"]`))[0]!==block)id='flow-block-'+crypto.randomUUID();
    block.dataset.flowBlockId=id;scopes.set(block,id);
  }
  return scopes.get(block)!;
};
const flowIcon='<svg viewBox="0 0 64 64" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><rect x="22" y="5" width="20" height="12" rx="6"/><path d="M32 17v9m0 16v8M13 32H6v24h16m29-24h7v24H42"/><path d="m32 24 15 10-15 10-15-10Z"/><rect x="22" y="50" width="20" height="10" rx="3"/></svg>';

export function getFlowHTML():string {
  return `<section class="relative lms-element is-rendered mb-6 w-full flow-block" data-type="diagrama_flujo" data-flow-model="${escapeAttribute(JSON.stringify(createFlowModel()))}">${getBlockToolbar('diagrama_flujo')}<div class="flow-preview"><button type="button" class="flow-placeholder" data-flow-open title="Diseñar diagrama de flujo" onclick="window.editFlowDiagram(this)">${flowIcon}<strong>Diseñar diagrama de flujo</strong><span>Abre el lienzo para construir tu flujo de trabajo.</span></button></div></section>`;
}

function readModel(block:HTMLElement):FlowModel {
  try{return normalizeFlowModel(JSON.parse(block.dataset.flowModel||'{}'));}
  catch{return createFlowModel();}
}
function renderBlock(block:HTMLElement) {
  const model=readModel(block),value=JSON.stringify(model);
  const toolbar=block.querySelector(':scope > .block-toolbar');
  if(toolbar&&!toolbar.querySelector('[data-flow-presentation]'))toolbar.querySelector('button[title="Editar diagrama de flujo"]')?.insertAdjacentHTML('beforebegin',flowBlockControlsHTML());
  presentation?.sync(block,model);
  if(block.dataset.flowModel!==value)block.dataset.flowModel=value;
  if(rendered.get(block)===value&&block.querySelector(':scope > .flow-preview'))return;
  let preview=block.querySelector<HTMLElement>(':scope > .flow-preview');
  if(!preview){preview=document.createElement('div');preview.className='flow-preview';block.append(preview);}
  const populated=!!(model.nodes.length||model.lanes.length);
  block.classList.toggle('flow-has-content',populated);
  if(populated){
    preview.innerHTML=renderFlowSVG(model,{scope:scopeFor(block)});
    preview.removeAttribute('role');preview.removeAttribute('tabindex');
  } else {
    preview.innerHTML=`<button type="button" class="flow-placeholder" data-flow-open title="Diseñar diagrama de flujo" onclick="window.editFlowDiagram(this)">${flowIcon}<strong>Diseñar diagrama de flujo</strong><span>Abre el lienzo para construir tu flujo de trabajo.</span></button>`;
  }
  rendered.set(block,value);
}

export function initFlowBlocks(root:ParentNode=document) {
  root.querySelectorAll<HTMLElement>('[data-type="diagrama_flujo"]').forEach(block=>{
    if(!block.classList.contains('is-rendered'))return;
    block.classList.add('flow-block');renderBlock(block);
  });
}

export function setupFlowBlocks() {
  if(installed)return;installed=true;
  presentation=setupFlowBlockControls({read:readModel,write:(block,model)=>{
    block.dataset.flowModel=JSON.stringify(model);rendered.delete(block);renderBlock(block);window.checkEmptyState?.();
  }});
  window.editFlowDiagram=(trigger:HTMLElement)=>{
    const block=trigger.closest<HTMLElement>('[data-type="diagrama_flujo"]');
    if(!block||document.querySelector('dialog.flow-design-editor[open]'))return;
    presentation?.close();
    openFlowEditor(readModel(block),model=>{
      if(!block.isConnected)return;
      const value=JSON.stringify(normalizeFlowModel(model));
      if(value===block.dataset.flowModel)return;
      window.saveHistoryState?.(true);
      block.dataset.flowModel=value;rendered.delete(block);renderBlock(block);
      window.checkEmptyState?.();window.saveHistoryState?.(true);
    });
  };
}

// Rebuild from the authoritative model: no editor DOM or handlers.
// Imported diagram rasters are portable data images; URL images follow the
// existing public-image policy instead of retaining localhost/file references.
// leak into Brightspace. Empty placeholders are omitted from published content.
export function prepareFlowExport(root:ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-type="diagrama_flujo"]').forEach(block=>{
    const model=readModel(block);
    for(const node of model.nodes)if(node.image?.src&&!node.image.src.startsWith('data:image/'))node.image.src=imageURL(node.image.src);
    if(!model.nodes.length&&!model.lanes.length){block.remove();return;}
    block.replaceChildren();
    block.innerHTML=renderFlowSVG(model,{scope:'flow-published-'+crypto.randomUUID()});
    block.className='flow-published';
    block.style.width='100%';block.style.maxWidth='100%';
    block.removeAttribute('data-flow-model');
    block.removeAttribute('data-flow-block-id');
  });
}
