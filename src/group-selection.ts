import {cloneElement} from './element-actions';
import './group-selection.css';

let installed=false;
export function setupGroupSelection(){
  if(installed)return;installed=true;
  const box=document.createElement('div');box.id='lms-group-selection';box.hidden=true;
  const tools=document.createElement('div');tools.className='lms-group-tools';
  tools.innerHTML='<button type="button" data-group-move aria-label="Mover selección" title="Mover selección"><span class="material-symbols-outlined">drag_indicator</span></button><button type="button" data-group-copy aria-label="Duplicar selección" title="Duplicar selección"><span class="material-symbols-outlined">content_copy</span></button><span data-group-count></span>';
  box.append(tools);
  const marquee=document.createElement('div');marquee.id='lms-group-marquee';marquee.hidden=true;
  const marker=document.createElement('div');marker.id='lms-group-drop';marker.hidden=true;
  document.body.append(box,marquee,marker);
  let selected:HTMLElement[]=[],origin:{x:number;y:number;scroll:number}|null=null;
  let moving=false,lastX=0,lastY=0,frame=0;
  const canvas=()=>document.getElementById('canvas');
  const scroller=()=>document.getElementById('scroll-container');
  const page=(el:HTMLElement)=>el.parentElement?.id==='canvas'&&!!el.querySelector(':scope > .lms-dropzone.bg-white');
  const blocks=()=>Array.from(canvas()?.querySelectorAll<HTMLElement>('.lms-element.is-rendered')||[]).filter(el=>{
    if(page(el)||el.getBoundingClientRect().height===0)return false;
    const parent=el.parentElement?.closest<HTMLElement>('.lms-element');
    return !parent||page(parent);
  });
  const setRect=(el:HTMLElement,left:number,top:number,width:number,height:number)=>{
    Object.assign(el.style,{left:left+'px',top:top+'px',width:width+'px',height:height+'px'});
  };
  const clear=()=>{selected=[];box.hidden=true;};
  const draw=()=>{
    if(moving)return;
    selected=selected.filter(el=>el.isConnected&&canvas()?.contains(el));
    if(!selected.length){box.hidden=true;return;}
    const rects=selected.map(el=>el.getBoundingClientRect());
    const left=Math.min(...rects.map(r=>r.left)),top=Math.min(...rects.map(r=>r.top));
    setRect(box,left-4,top-4,Math.max(...rects.map(r=>r.right))-left+8,Math.max(...rects.map(r=>r.bottom))-top+8);
    tools.style.top=top<52?8-top+'px':'-46px';
    tools.querySelector('[data-group-count]')!.textContent=`${selected.length} ${selected.length===1?'elemento':'elementos'}`;
    box.hidden=false;
  };
  const hit=(x:number,y:number)=>document.elementsFromPoint(x,y).find(el=>!el.closest('#lms-group-selection,#lms-group-marquee,#lms-group-drop'));
  const slot=()=>{
    const target=hit(lastX,lastY);
    let zone=target?.closest<HTMLElement>('.lms-dropzone');
    if(!zone||!canvas()?.contains(zone)&&zone!==canvas())return null;
    // Groups remain complete: do not drop into one of their own descendants.
    if(selected.some(el=>el===zone||el.contains(zone!)))return null;
    while(zone&&zone!==canvas()){
      const owner=zone.closest<HTMLElement>('.lms-element');
      if(!owner||page(owner))break;
      zone=owner.parentElement?.closest<HTMLElement>('.lms-dropzone')||null;
    }
    if(!zone)return null;
    const children=Array.from(zone.children).filter((el):el is HTMLElement=>el instanceof HTMLElement&&el.matches('.lms-element')&&!selected.includes(el));
    // A blank area of the canvas with a page template inserts into that page.
    if(zone===canvas()&&children.some(page)){
      const nearest=children.filter(page).sort((a,b)=>Math.abs(a.getBoundingClientRect().top-lastY)-Math.abs(b.getBoundingClientRect().top-lastY))[0];
      zone=nearest.querySelector<HTMLElement>(':scope > .lms-dropzone.bg-white')!;
    }
    const siblings=Array.from(zone.children).filter((el):el is HTMLElement=>el instanceof HTMLElement&&el.matches('.lms-element')&&!selected.includes(el));
    const footer=zone.querySelector<HTMLElement>(':scope > .lms-footer-wrapper,:scope > .lms-page-footer');
    const before=siblings.find(el=>{const r=el.getBoundingClientRect();return lastY<r.top+r.height/2;})||footer;
    const bounds=zone.getBoundingClientRect();
    const y=before?before.getBoundingClientRect().top:(siblings.at(-1)?.getBoundingClientRect().bottom??bounds.top+20);
    return {zone,before,footer,left:bounds.left+8,width:bounds.width-16,y};
  };
  const updateDrag=()=>{
    const destination=slot();marker.hidden=!destination;
    if(destination)setRect(marker,destination.left,destination.y,destination.width,3);
    box.style.left=Math.min(innerWidth-180,lastX+14)+'px';box.style.top=Math.max(48,lastY+14)+'px';
  };
  const tick=()=>{
    if(!moving&&!origin)return;
    const scroll=scroller(),r=scroll?.getBoundingClientRect();
    if(scroll&&r&&lastX>=r.left&&lastX<=r.right){
      const delta=lastY<r.top+40?-12:lastY>r.bottom-40?12:0;
      if(delta){scroll.scrollTop+=delta;if(origin)select();}
    }
    if(moving)updateDrag();frame=requestAnimationFrame(tick);
  };
  const select=()=>{
    if(!origin)return;
    const startY=origin.y-(scroller()?.scrollTop||0)+origin.scroll;
    const left=Math.min(origin.x,lastX),right=Math.max(origin.x,lastX),top=Math.min(startY,lastY),bottom=Math.max(startY,lastY);
    setRect(marquee,left,top,right-left,bottom-top);marquee.hidden=false;
    const touched=blocks().filter(el=>{const r=el.getBoundingClientRect();return r.left<=right&&r.right>=left&&r.top<=bottom&&r.bottom>=top;});
    // One page/content flow at a time; nested content belongs to its whole element.
    selected=touched.filter(el=>el.parentElement===touched[0]?.parentElement);draw();
  };
  const finish=(cancelled=false)=>{
    if(origin){origin=null;marquee.hidden=true;document.body.classList.remove('lms-group-selecting');if(cancelled)clear();else draw();}
    if(moving){
      const destination=cancelled?null:slot();
      if(destination){selected.forEach(el=>destination.zone.insertBefore(el,destination.before));if(destination.footer)destination.zone.append(destination.footer);}
      const handled=window.lmsEndWorkspaceDrag?.(!destination);
      moving=false;window.isLmsDragging=false;
      document.body.classList.remove('lms-group-moving');box.classList.remove('is-moving');marker.hidden=true;
      if(!handled){window.initNestedDropzones();window.checkEmptyState();window.saveHistoryState(true);draw();window.dispatchEvent(new Event('lms-drag-ended'));}
      else clear();
    }
    cancelAnimationFrame(frame);
  };
  document.addEventListener('pointerdown',event=>{
    const target=event.target as HTMLElement;
    if(event.button===0&&selected.length&&!box.hidden&&!box.contains(target)){
      const r=box.getBoundingClientRect();
      if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)clear();
      else return;
    }
    if(event.button!==0||target.closest('dialog,[role="dialog"],#rtf-toolbar,[contenteditable="true"],input,textarea,select'))return;
    if(target.closest('[data-group-copy]'))return;
    if(target.closest('[data-group-move]')&&selected.length){
      event.preventDefault();event.stopImmediatePropagation();window.saveHistoryState(true);
      window.lmsBeginWorkspaceDrag?.(selected[0]);moving=true;lastX=event.clientX;lastY=event.clientY;
      window.isLmsDragging=true;document.body.classList.add('lms-group-moving');box.classList.add('is-moving');
      box.style.width='170px';box.style.height='1px';tools.style.top='-46px';updateDrag();tick();return;
    }
    if(!target.closest('#scroll-container')||!canvas()||window.isLmsDragging)return;
    const element=target.closest<HTMLElement>('.lms-element');
    if(element&&!page(element)||target.closest('button,a,.block-toolbar,.mod-tools,#element-spacing-handles'))return;
    event.preventDefault();event.stopImmediatePropagation();window.getSelection()?.removeAllRanges();clear();
    lastX=event.clientX;lastY=event.clientY;origin={x:lastX,y:lastY,scroll:scroller()?.scrollTop||0};
    document.body.classList.add('lms-group-selecting');tick();
  },true);
  document.addEventListener('pointermove',event=>{
    if(!origin&&!moving)return;lastX=event.clientX;lastY=event.clientY;event.preventDefault();
    if(origin)select();else updateDrag();
  },{passive:false});
  document.addEventListener('pointerup',event=>{if(origin||moving){lastX=event.clientX;lastY=event.clientY;finish();}});
  document.addEventListener('pointercancel',()=>finish(true));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&(origin||moving||selected.length)){event.preventDefault();event.stopImmediatePropagation();finish(true);clear();}},true);
  window.addEventListener('blur',()=>finish(true));
  window.addEventListener('scroll',()=>{if(!moving&&!origin)draw();},true);
  window.addEventListener('resize',draw);
  window.addEventListener('lms-drag-ended',draw);
  new MutationObserver(()=>{if(!moving&&!origin)draw();}).observe(document.getElementById('canvas-container-outer')!,{childList:true,subtree:true});
  tools.querySelector('[data-group-copy]')!.addEventListener('click',event=>{
    event.stopPropagation();if(!selected.length)return;window.saveHistoryState(true);
    const clones=selected.map(cloneElement),fragment=document.createDocumentFragment();clones.forEach(el=>fragment.append(el));
    selected.at(-1)!.after(fragment);selected=clones;
    window.initNestedDropzones();window.checkEmptyState();window.saveHistoryState(true);draw();
  });
}
