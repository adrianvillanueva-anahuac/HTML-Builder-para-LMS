import Sortable from 'sortablejs';
import type {Project,Workspace} from './project-model';
import {restoreBackgroundMetadata} from './workspace-appearance';

type Content=Pick<Workspace,'html'|'style'|'bg'|'bgColor'|'bgMargin'>;
type Adapter={
  begin:()=>Project|null;
  show:(id:string)=>void;
  serialize:(root:HTMLElement)=>Content;
  finish:(before:Project,updates:Map<string,Content>,activeId:string,cancelled:boolean)=>void;
};
type Parked={node:HTMLElement;style:string;bg:string;bgColor?:string;bgMargin?:string;scroll:number};
type Drag={item:HTMLElement;parent:HTMLElement;next:Node|null;before:Project;activeId:string;parked:Map<string,Parked>;switched:boolean;cancelled:boolean;ending:boolean;x:number;y:number};

// Keep the source Sortable and its nodes alive until mouseup. Rebuilding the
// source canvas while the pointer is held would terminate the drag and lose it.
export function installWorkspaceDrag(adapter:Adapter) {
  let drag:Drag|null=null,hoverId='',timer:ReturnType<typeof setTimeout>|undefined;
  const outer=()=>document.getElementById('canvas-container-outer')!;
  const clearHover=()=>{clearTimeout(timer);hoverId='';document.querySelectorAll('[data-workspace-drag-hover]').forEach(t=>t.removeAttribute('data-workspace-drag-hover'));};
  const switchTo=(id:string)=>{
    const d=drag,s=d?.before.spaces.find(s=>s.id===id);
    if(!d||!s||id===d.activeId||d.ending)return;
    const root=outer(),scroll=document.getElementById('scroll-container');
    const node=document.createElement('div');node.dataset.workspaceParking=d.activeId;node.style.display='none';node.inert=true;document.body.append(node);
    const parked={node,style:root.style.cssText,bg:root.dataset.bg||'blanco',bgColor:root.dataset.bgColor,bgMargin:root.dataset.bgMargin,scroll:scroll?.scrollTop||0};
    restoreBackgroundMetadata(node,parked);
    while(root.firstChild)node.append(root.firstChild);
    d.parked.set(d.activeId,parked);
    const existing=d.parked.get(id);
    root.style.cssText=existing?.style??s.style;restoreBackgroundMetadata(root,existing||s);
    if(existing){while(existing.node.firstChild)root.append(existing.node.firstChild);existing.node.remove();d.parked.delete(id);}
    else root.innerHTML=s.html;
    d.activeId=id;d.switched=true;window.lmsWorkspaceDragSwitched=true;
    window.lmsLayoutIntent=null;window.lmsLayoutIntentTarget=null;
    document.getElementById('lms-layout-indicator')?.style.setProperty('display','none');
    window.initNestedDropzones();if(scroll)scroll.scrollTop=existing?.scroll||0;
    adapter.show(id);
  };
  const hit=(x:number,y:number)=>document.elementsFromPoint(x,y).find(el=>!el.closest('.sortable-fallback,[data-workspace-parking]'));
  const move=(event:MouseEvent|TouchEvent)=>{
    if(!drag||drag.ending||drag.cancelled)return;
    const point='touches' in event?event.touches[0]:event;if(!point)return;
    drag.x=point.clientX;drag.y=point.clientY;
    const tab=hit(drag.x,drag.y)?.closest<HTMLElement>('[data-workspace-id]');
    const id=tab?.dataset.workspaceId;
    if(!id||id===drag.activeId){clearHover();return;}
    if(hoverId===id)return;
    clearHover();hoverId=id;tab!.setAttribute('data-workspace-drag-hover','true');
    timer=setTimeout(()=>{if(drag&&!drag.ending&&hoverId===id){clearHover();switchTo(id);}},500);
  };
  const release=(event:MouseEvent|TouchEvent)=>{
    if(!drag)return;const point='changedTouches' in event?event.changedTouches[0]:event;
    if(event.type.endsWith('cancel'))drag.cancelled=true;
    if(point){drag.x=point.clientX;drag.y=point.clientY;}clearHover();
  };
  const begin=(item:HTMLElement)=>{
    if(drag||!item.matches('.lms-element.is-rendered')||!outer()?.contains(item))return;
    const before=adapter.begin();if(!before||!item.parentElement)return;
    drag={item,parent:item.parentElement,next:item.nextSibling,before,activeId:before.activeId,parked:new Map(),switched:false,cancelled:false,ending:false,x:-1,y:-1};
    window.lmsWorkspaceDragActive=true;
  };
  const end=(cancelled=false)=>{
    const d=drag;if(!d)return false;
    if(cancelled)d.cancelled=true;
    clearHover();
    const zone=hit(d.x,d.y)?.closest('.lms-dropzone');
    const valid=!d.cancelled&&!!zone&&outer().contains(zone)&&outer().contains(d.item)&&!!d.item.parentElement?.closest('.lms-dropzone');
    if(!d.switched&&valid){drag=null;window.lmsWorkspaceDragActive=false;return false;}
    // Defer DOM disposal until Sortable has finished its own drop cleanup.
    d.ending=true;
    setTimeout(()=>{
      if(!valid){
        d.parent.insertBefore(d.item,d.next?.parentNode===d.parent?d.next:null);
        d.ending=false;switchTo(d.before.activeId);d.ending=true;
      }
      const updates=new Map<string,Content>();
      for(const [id,p] of d.parked){const content=adapter.serialize(p.node);updates.set(id,{...content,style:p.style,bg:p.bg});}
      updates.set(d.activeId,adapter.serialize(outer()));
      for(const p of d.parked.values()){
        p.node.querySelectorAll<HTMLElement>('.lms-dropzone').forEach(zone=>Sortable.get(zone)?.destroy());p.node.remove();
      }
      drag=null;window.lmsWorkspaceDragActive=false;window.lmsWorkspaceDragSwitched=false;
      adapter.finish(d.before,updates,d.activeId,!valid);
      window.initNestedDropzones();window.checkEmptyState();window.dispatchEvent(new Event('lms-drag-ended'));
    },0);
    return true;
  };
  const escape=(event:KeyboardEvent)=>{
    if(document.body.classList.contains('lms-group-moving'))return;
    if(event.key!=='Escape'||!drag||drag.ending)return;
    event.preventDefault();event.stopImmediatePropagation();drag.cancelled=true;clearHover();
    // Support both Pointer Events and the legacy mouse fallback without using private Sortable APIs.
    document.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientX:drag.x,clientY:drag.y,pointerId:1,pointerType:'mouse'}));
    if(!drag)return;
    document.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,clientX:drag.x,clientY:drag.y}));
  };
  window.lmsBeginWorkspaceDrag=begin;window.lmsEndWorkspaceDrag=end;
  document.addEventListener('mousemove',move,true);document.addEventListener('touchmove',move,true);
  document.addEventListener('pointermove',move,true);document.addEventListener('pointerup',release,true);document.addEventListener('pointercancel',release,true);document.addEventListener('touchcancel',release,true);
  document.addEventListener('mouseup',release,true);document.addEventListener('touchend',release,true);document.addEventListener('keydown',escape,true);
  return()=>{
    clearHover();document.removeEventListener('mousemove',move,true);document.removeEventListener('touchmove',move,true);
    document.removeEventListener('pointermove',move,true);document.removeEventListener('pointerup',release,true);document.removeEventListener('pointercancel',release,true);document.removeEventListener('touchcancel',release,true);
    document.removeEventListener('mouseup',release,true);document.removeEventListener('touchend',release,true);document.removeEventListener('keydown',escape,true);
    delete window.lmsBeginWorkspaceDrag;delete window.lmsEndWorkspaceDrag;
  };
}
