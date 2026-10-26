import type {ChecklistItem,Workspace} from './project-model';

export interface DeferredButton {id:string;label:string;action:string}
export const automaticButtonTaskHint='Se actualiza automáticamente al configurar la acción del botón.';

// Identity is the trigger's DOM id: duplication already regenerates it, while
// moving, undoing and saving preserve it. Equal labels must not merge tasks.
export function reconcileButtonChecklist(checklist:ChecklistItem[]|undefined,buttons:DeferredButton[],allowNew=true,trackedIds:ReadonlySet<string>=new Set()):ChecklistItem[]|undefined {
  const pending=new Map(buttons.filter(button=>button.id).map(button=>[button.id,button]));
  const task=(button:DeferredButton):ChecklistItem=>({buttonId:button.id,text:`Tienes pendiente poner acción en "${button.label.trim()||'Botón'}".`,done:button.action==='encapsulate'||button.action==='link'});
  const next:ChecklistItem[]=[];
  for(const item of checklist||[]){
    if(!item.buttonId){next.push(item);continue;}
    const button=pending.get(item.buttonId);
    if(button){next.push(task(button));pending.delete(item.buttonId);}
  }
  pending.forEach(button=>{if(allowNew||trackedIds.has(button.id))next.push(task(button));});
  // Removing the only generated task must not leave an empty metadata field
  // that keeps an otherwise restored project dirty after undo.
  if(!next.length)return checklist?.length?undefined:checklist;
  if(checklist?.length===next.length&&next.every((item,index)=>{const old=checklist[index];return old.text===item.text&&old.done===item.done&&old.buttonId===item.buttonId;}))return checklist;
  return next;
}

export function syncWorkspaceButtonChecklist(space:Workspace,root?:ParentNode,allowNew=true,trackedIds?:ReadonlySet<string>):Workspace {
  if(!root&&!space.html.includes('data-button-deferred')&&!space.checklist?.some(item=>item.buttonId))return space;
  if(!root){const container=document.createElement('div');container.innerHTML=space.html;root=container;}
  const buttons=Array.from(root.querySelectorAll<HTMLElement>('[data-type="boton_interactivo"][data-button-deferred="true"]')).filter(block=>!block.closest('.sortable-ghost,.sortable-fallback,.lms-drag-origin')).map(block=>{
    const trigger=block.querySelector<HTMLElement>(':scope > .ib-shell > .ib-button-row > .ib-trigger');
    return {id:trigger?.id||'',label:trigger?.querySelector('.ib-label')?.textContent||'Botón',action:block.dataset.buttonAction||'none'};
  });
  const checklist=reconcileButtonChecklist(space.checklist,buttons,allowNew,trackedIds);
  return checklist===space.checklist?space:{...space,checklist};
}
