import type {ChecklistItem,Workspace} from './project-model';
import {automaticButtonTaskHint,syncWorkspaceButtonChecklist} from './button-checklist';

export interface MediaResource {id:string;label:string;hasContent:boolean}
const mediaNames:Record<string,string>={calculadora_html:'Funciones externas',embed_youtube:'YouTube',embed_vimeo:'Vimeo',embed_genially:'Genially',embed_canva:'Canva',embed_sketchfab:'Sketchfab',embed_gamma:'Gamma'};
const mediaSelector=Object.keys(mediaNames).map(type=>`[data-type="${type}"]`).join(',');
export const isAutomaticTask=(item:ChecklistItem)=>!!(item.buttonId||item.mediaId);
export const automaticTaskHint=(item:ChecklistItem)=>item.mediaId?'Se actualiza automáticamente al insertar o quitar el contenido del medio.':automaticButtonTaskHint;

export function reconcileMediaChecklist(checklist:ChecklistItem[]|undefined,resources:MediaResource[],allowNew=true,trackedIds:ReadonlySet<string>=new Set()):ChecklistItem[]|undefined {
  const remaining=new Map(resources.filter(resource=>resource.id).map(resource=>[resource.id,resource]));
  const task=(resource:MediaResource):ChecklistItem=>({mediaId:resource.id,text:`Tienes pendiente agregar contenido en "${resource.label}".`,done:resource.hasContent});
  const next:ChecklistItem[]=[];
  for(const item of checklist||[]){
    if(!item.mediaId){next.push(item);continue;}
    const resource=remaining.get(item.mediaId);
    if(resource){next.push(task(resource));remaining.delete(item.mediaId);}
  }
  remaining.forEach(resource=>{if((allowNew&&!resource.hasContent)||trackedIds.has(resource.id))next.push(task(resource));});
  if(!next.length)return checklist?.length?undefined:checklist;
  if(checklist?.length===next.length&&next.every((item,index)=>{const old=checklist[index];return old.text===item.text&&old.done===item.done&&old.mediaId===item.mediaId;}))return checklist;
  return next;
}

// Use DOM ids because the existing duplicate/group tools regenerate them.
// Moved elements keep the same identity, including inside tabs and buttons.
export function ensureMediaChecklistIds(root:ParentNode):boolean {
  let changed=false;
  root.querySelectorAll<HTMLElement>(mediaSelector).forEach(block=>{if(!block.id){block.id=`media-${crypto.randomUUID()}`;changed=true;}});
  return changed;
}

export function isMediaFilled(block:HTMLElement):boolean {
  const result=block.querySelector<HTMLElement>(':scope > .embed-result,:scope > .calc-result');
  if(!result||result.hidden||result.classList.contains('hidden')||result.style.display==='none')return false;
  if(block.dataset.type==='calculadora_html'&&result.querySelector<HTMLElement>('[data-standalone-html]')?.dataset.standaloneHtml?.trim())return true;
  return Array.from(result.querySelectorAll('iframe')).some(frame=>{
    const src=frame.getAttribute('src')?.trim();
    return !!frame.getAttribute('srcdoc')?.trim()||!!(src&&!/^about:blank(?:[#?]|$)|^javascript:/i.test(src));
  });
}

export function syncWorkspaceAutomaticChecklist(space:Workspace,root?:ParentNode,allowNew=true,tracked?:{buttons:ReadonlySet<string>;media:ReadonlySet<string>}):Workspace {
  const live=!!root;
  if(!root){
    if(!space.html.includes('data-button-deferred')&&!Object.keys(mediaNames).some(type=>space.html.includes(type))&&!space.checklist?.some(isAutomaticTask))return space;
    const container=document.createElement('div');container.innerHTML=space.html;root=container;
  }
  const changed=ensureMediaChecklistIds(root);
  // Live roots receive ids before snapshot(); detached legacy pages need their
  // normalized HTML saved too, otherwise every scan would invent new tasks.
  let next=changed&&!live?{...space,html:(root as HTMLElement).innerHTML}:space;
  next=syncWorkspaceButtonChecklist(next,root,allowNew,tracked?.buttons);
  const resources=Array.from(root.querySelectorAll<HTMLElement>(mediaSelector)).filter(block=>!block.closest('.sortable-ghost,.sortable-fallback,.lms-drag-origin')).map(block=>({id:block.id,label:mediaNames[block.dataset.type!],hasContent:isMediaFilled(block)}));
  const checklist=reconcileMediaChecklist(next.checklist,resources,allowNew,tracked?.media);
  return checklist===next.checklist?next:{...next,checklist};
}
