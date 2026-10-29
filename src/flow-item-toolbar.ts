import type {FlowModel} from './flow-model';
import type {FlowSelectionKind} from './flow-selection';
import {flowEdgeGeometry} from './flow-geometry';
type Item={kind:FlowSelectionKind;id:string};
type Hooks={model:()=>FlowModel;busy:()=>boolean;action:(action:'duplicate'|'delete',item:Item)=>void};
/** Editor-only HTML overlay; no toolbar markup enters SVG/history/export. */
export function createFlowItemToolbar(dialog:HTMLDialogElement,viewport:HTMLElement,surface:HTMLElement,hooks:Hooks){
 const toolbar=document.createElement('div');toolbar.className='fde-item-toolbar';toolbar.hidden=true;toolbar.setAttribute('role','toolbar');toolbar.setAttribute('aria-label','Acciones del elemento');
 toolbar.innerHTML='<button type="button" data-flow-item-action="duplicate" aria-label="Duplicar elemento" title="Duplicar elemento (Ctrl + D)"><span class="material-symbols-outlined" aria-hidden="true">content_copy</span></button><button type="button" data-flow-item-action="delete" aria-label="Eliminar elemento" title="Eliminar elemento (Suprimir)"><span class="material-symbols-outlined" aria-hidden="true">delete</span></button>';
 dialog.append(toolbar);let active:Item|null=null,anchor:{x:number;y:number}|null=null,timer:ReturnType<typeof setTimeout>|undefined;
 const cancel=()=>{clearTimeout(timer);timer=undefined;};
 function hide(){cancel();active=null;anchor=null;toolbar.hidden=true;}
 function sync(){
  if(!active)return;if(hooks.busy()){hide();return;}
  const model=hooks.model();let x=0,y=0;
  if(active.kind==='edge'){
   const edge=model.edges.find(item=>item.id===active!.id),a=model.nodes.find(node=>node.id===edge?.from),b=model.nodes.find(node=>node.id===edge?.to);if(!edge||!a||!b){hide();return;}
   ({x,y}=anchor||flowEdgeGeometry(edge,a,b).label);
  }else{const item=(active.kind==='node'?model.nodes:model.lanes).find(item=>item.id===active!.id);if(!item){hide();return;}x=item.x+item.width/2;y=item.y;}
  const rect=surface.getBoundingClientRect(),outer=dialog.getBoundingClientRect(),view=viewport.getBoundingClientRect(),scale=rect.width/model.width,px=rect.left+x*scale,py=rect.top+y*scale;
  if(px<view.left||px>view.right||py<view.top||py>view.bottom){hide();return;}
  toolbar.hidden=false;toolbar.dataset.itemKind=active.kind;toolbar.dataset.itemId=active.id;
  toolbar.style.left=`${Math.max(view.left-outer.left+4,Math.min(view.right-outer.left-86,px-outer.left-42))}px`;
  toolbar.style.top=`${Math.max(view.top-outer.top+3,py-outer.top-47)}px`;
 }
 function show(target:Element,event?:PointerEvent){
  if(hooks.busy()){hide();return;}
  const element=target.closest<SVGElement>('[data-flow-node],[data-flow-edge],[data-flow-lane]');if(!element){scheduleHide();return;}
  cancel();active=element.dataset.flowNode?{kind:'node',id:element.dataset.flowNode}:element.dataset.flowEdge?{kind:'edge',id:element.dataset.flowEdge}:{kind:'lane',id:element.dataset.flowLane!};
  const rect=surface.getBoundingClientRect(),scale=rect.width/hooks.model().width;anchor=active.kind==='edge'&&event?.isTrusted?{x:(event.clientX-rect.left)/scale,y:(event.clientY-rect.top)/scale}:null;sync();
 }
 function scheduleHide(){cancel();timer=setTimeout(()=>{if(!toolbar.contains(document.activeElement))hide();},180);}
 viewport.addEventListener('pointerover',event=>show(event.target as Element,event));
 viewport.addEventListener('focusin',event=>show(event.target as Element));
 viewport.addEventListener('pointerleave',event=>{if(!toolbar.contains(event.relatedTarget as Node))scheduleHide();});
 toolbar.addEventListener('pointerenter',cancel);toolbar.addEventListener('pointerleave',scheduleHide);
 toolbar.addEventListener('focusout',event=>{if(!toolbar.contains(event.relatedTarget as Node))hide();});
 toolbar.addEventListener('pointerdown',event=>event.stopPropagation());
 toolbar.addEventListener('click',event=>{const action=(event.target as Element).closest<HTMLElement>('[data-flow-item-action]')?.dataset.flowItemAction;if(!active||!action)return;event.stopPropagation();const item=active;hide();hooks.action(action as 'duplicate'|'delete',item);});
 dialog.addEventListener('pointerdown',event=>{if(!toolbar.contains(event.target as Node))hide();},true);
 return{sync,hide,dispose:()=>{hide();toolbar.remove();}};
}
