import type {FlowTextLayout} from './flow-model';
import {moveModularTextBox} from './modular-text-model';

/** Same nine handles and constraints as rectangle captions, without scaling fonts. */
export function mountModularTextGeometry(frame:HTMLElement,hooks:{bounds:()=>HTMLElement;layout:()=>FlowTextLayout;change:(layout:FlowTextLayout)=>void;start:()=>void}){
 const controls=document.createElement('div');controls.className='mod-text-geometry mod-editor';
 for(const handle of ['move','nw','n','ne','e','se','s','sw','w']){const button=document.createElement('button');button.type='button';button.dataset.modTextHandle=handle;button.setAttribute('aria-label',handle==='move'?'Mover caja de texto':`Redimensionar caja de texto ${handle}`);button.title=handle==='move'?'Arrastra para mover la caja de texto':'Arrastra para redimensionar la caja de texto';if(handle==='move')button.innerHTML='<span class="material-symbols-outlined" aria-hidden="true">drag_indicator</span>';controls.append(button);}
 frame.append(controls);frame.classList.add('mod-text-box-active');
 let drag:{pointer:number;x:number;y:number;width:number;height:number;scaleX:number;scaleY:number;handle:string;start:FlowTextLayout}|null=null;
 const change=(layout:FlowTextLayout,handle:string,dx:number,dy:number,width:number,height:number)=>hooks.change(moveModularTextBox({x:layout.x*width,y:layout.y*height,width:layout.width*width,height:layout.height*height},handle,dx,dy,width,height,0,0));
 controls.addEventListener('pointerdown',event=>{const handle=(event.target as Element).closest<HTMLElement>('[data-mod-text-handle]')?.dataset.modTextHandle;if(event.button!==0||!handle)return;event.preventDefault();event.stopPropagation();hooks.start();const bounds=hooks.bounds(),r=bounds.getBoundingClientRect();drag={pointer:event.pointerId,x:event.clientX,y:event.clientY,width:bounds.clientWidth,height:bounds.clientHeight,scaleX:r.width/bounds.offsetWidth,scaleY:r.height/bounds.offsetHeight,handle,start:{...hooks.layout()}};controls.dataset.dragging='true';controls.setPointerCapture(event.pointerId);});
 controls.addEventListener('pointermove',event=>{if(!drag||drag.pointer!==event.pointerId)return;event.preventDefault();event.stopPropagation();change(drag.start,drag.handle,(event.clientX-drag.x)/drag.scaleX,(event.clientY-drag.y)/drag.scaleY,drag.width,drag.height);});
 const stop=(event:PointerEvent)=>{if(drag?.pointer!==event.pointerId)return;drag=null;delete controls.dataset.dragging;if(controls.hasPointerCapture(event.pointerId))controls.releasePointerCapture(event.pointerId);};
 for(const name of ['pointerup','pointercancel','lostpointercapture'])controls.addEventListener(name,stop);
 controls.addEventListener('keydown',event=>{const handle=(event.target as HTMLElement).dataset.modTextHandle;if(!handle||!event.key.startsWith('Arrow'))return;event.preventDefault();event.stopPropagation();hooks.start();const bounds=hooks.bounds(),step=event.shiftKey?10:1;change({...hooks.layout()},handle,event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0,event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0,bounds.clientWidth,bounds.clientHeight);});
 return()=>{controls.remove();frame.classList.remove('mod-text-box-active');};
}
