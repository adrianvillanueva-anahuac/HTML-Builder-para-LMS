import {cloneElement} from './element-actions';
import {isGroupPage,groupDragStarted,groupToolsPosition} from './group-selection-model';
import './group-selection.css';

let installed=false;
export function setupGroupSelection(){
  if(installed)return;installed=true;
  const box=document.createElement('div');box.id='lms-group-selection';box.hidden=true;
  const tools=document.createElement('div');tools.className='lms-group-tools';
  tools.setAttribute('role','toolbar');tools.setAttribute('aria-label','Acciones de la selección');
  tools.innerHTML='<button type="button" data-group-move aria-label="Mover selección" title="Mover selección"><span class="material-symbols-outlined" aria-hidden="true">drag_indicator</span></button><button type="button" data-group-copy aria-label="Duplicar selección" title="Duplicar selección"><span class="material-symbols-outlined" aria-hidden="true">content_copy</span></button><button type="button" data-group-delete aria-label="Eliminar selección" title="Eliminar selección (Supr)"><span class="material-symbols-outlined" aria-hidden="true">delete</span></button><span data-group-count aria-live="polite"></span>';
  box.append(tools);
  const marquee=document.createElement('div');marquee.id='lms-group-marquee';marquee.hidden=true;
  const marker=document.createElement('div');marker.id='lms-group-drop';marker.hidden=true;
  document.body.append(box,marquee,marker);
  let selected:HTMLElement[]=[],origin:{x:number;y:number;scroll:number}|null=null;
  let moving=false,pendingSelect=false,isSelecting=false;
  let startX=0,startY=0,startScroll=0,lastX=0,lastY=0,frame=0;
  const canvas=()=>document.getElementById('canvas');
  const scroller=()=>document.getElementById('scroll-container');
  const page=isGroupPage;
  const blocks=()=>Array.from(canvas()?.querySelectorAll<HTMLElement>('.lms-element.is-rendered')||[]).filter(el=>{
    if(page(el)||el.getBoundingClientRect().height===0)return false;
    const parent=el.parentElement?.closest<HTMLElement>('.lms-element');
    return !parent||page(parent)||parent.classList.contains('exercise-block');
  });
  const setRect=(el:HTMLElement,left:number,top:number,width:number,height:number)=>{
    Object.assign(el.style,{left:left+'px',top:top+'px',width:width+'px',height:height+'px'});
  };
  let drawRaf=0;
  const scheduleDraw=()=>{
    if(moving||(!selected.length&&box.hidden))return;
    if(drawRaf)return;
    drawRaf=requestAnimationFrame(()=>{drawRaf=0;draw();});
  };
  const clear=()=>{if(drawRaf){cancelAnimationFrame(drawRaf);drawRaf=0;}selected=[];box.hidden=true;};
  const draw=()=>{
    if(moving)return;
    if(!selected.length){clear();return;}
    selected=selected.filter(el=>el.isConnected&&canvas()?.contains(el));
    if(!selected.length){clear();return;}
    const rects=selected.map(el=>el.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0);
    if(!rects.length){box.hidden=true;return;}
    const left=Math.min(...rects.map(r=>r.left)),top=Math.min(...rects.map(r=>r.top));
    const right=Math.max(...rects.map(r=>r.right)),bottom=Math.max(...rects.map(r=>r.bottom));
    const width=right-left+8,height=bottom-top+8;
    setRect(box,left-4,top-4,width,height);

    const scrollerRect=scroller()?.getBoundingClientRect();
    const minVisibleTop=(scrollerRect?scrollerRect.top:0)+8;
    const maxVisibleBottom=(scrollerRect?scrollerRect.bottom:innerHeight)-8;

    if(bottom<minVisibleTop-10||top>maxVisibleBottom+10){
      box.hidden=true;
      return;
    }

    const position=groupToolsPosition(left,right,top,minVisibleTop,maxVisibleBottom,scrollerRect?.left||0,scrollerRect?.right||innerWidth,tools.offsetWidth||230);
    const toolsY=position.top;
    tools.style.top=(toolsY-(top-4))+'px';

    const clampedCenter=position.center;
    tools.style.left=(clampedCenter-(left-4))+'px';
    tools.style.transform='translateX(-50%)';

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
      if(!owner||page(owner)||owner.classList.contains('exercise-block'))break;
      zone=owner.parentElement?.closest<HTMLElement>('.lms-dropzone')||null;
    }
    if(!zone)return null;
    const children=Array.from(zone.children).filter((el):el is HTMLElement=>el instanceof HTMLElement&&el.matches('.lms-element')&&!selected.includes(el));
    // A blank area of the canvas with a page template inserts into that page.
    if(zone===canvas()&&children.some(page)){
      const nearest=children.filter(page).sort((a,b)=>Math.abs(a.getBoundingClientRect().top-lastY)-Math.abs(b.getBoundingClientRect().top-lastY))[0];
      zone=nearest?.querySelector<HTMLElement>(':scope > .lms-dropzone, .lms-dropzone')||nearest||canvas();
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
    if(!moving&&(!isSelecting||!origin))return;
    const scroll=scroller(),r=scroll?.getBoundingClientRect();
    if(scroll&&r&&lastX>=r.left&&lastX<=r.right){
      const delta=lastY<r.top+40?-12:lastY>r.bottom-40?12:0;
      if(delta){scroll.scrollTop+=delta;if(origin&&isSelecting)select();}
    }
    if(moving)updateDrag();frame=requestAnimationFrame(tick);
  };
  const select=()=>{
    if(!origin||!isSelecting)return;
    const startY=origin.y-(scroller()?.scrollTop||0)+origin.scroll;
    const left=Math.min(origin.x,lastX),right=Math.max(origin.x,lastX),top=Math.min(startY,lastY),bottom=Math.max(startY,lastY);
    setRect(marquee,left,top,right-left,bottom-top);marquee.hidden=false;
    const touched=blocks().filter(el=>{const r=el.getBoundingClientRect();return r.left<=right&&r.right>=left&&r.top<=bottom&&r.bottom>=top;});
    // One container flow at a time; nested content belongs to its whole element.
    selected=touched.filter(el=>el.parentElement===touched[0]?.parentElement);draw();
  };
  const finish=(cancelled=false)=>{
    pendingSelect=false;isSelecting=false;
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
    if(!(event.target instanceof Element))return;
    const target=event.target;
    if(event.button!==0||target.closest('dialog,[role="dialog"],#rtf-toolbar,[contenteditable="true"],input,textarea,select'))return;
    if(event.shiftKey&&!moving&&!window.isLmsDragging&&!target.closest('button,a,.block-toolbar,.mod-tools,#element-spacing-handles')){
      const element=blocks().find(el=>el.contains(target));
      if(element){
        event.preventDefault();event.stopImmediatePropagation();
        if(selected[0]?.parentElement!==element.parentElement)clear();
        selected=selected.includes(element)?selected.filter(el=>el!==element):[...selected,element];
        selected.sort((a,b)=>a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1);
        draw();return;
      }
    }
    if(event.button===0&&selected.length&&!box.hidden&&!box.contains(target)){
      const r=box.getBoundingClientRect();
      if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)clear();
      else return;
    }
    if(target.closest('[data-group-copy],[data-group-delete]'))return;
    if(target.closest('[data-group-move]')&&selected.length){
      event.preventDefault();event.stopImmediatePropagation();window.saveHistoryState(true);
      window.lmsBeginWorkspaceDrag?.(selected[0]);moving=true;lastX=event.clientX;lastY=event.clientY;
      window.isLmsDragging=true;document.body.classList.add('lms-group-moving');box.classList.add('is-moving');
      box.style.width='170px';box.style.height='1px';tools.style.top='-46px';updateDrag();tick();return;
    }
    if(!target.closest('#scroll-container')||!canvas()||window.isLmsDragging)return;
    const element=target.closest<HTMLElement>('.lms-element');
    if(element&&!page(element)||target.closest('button,a,.block-toolbar,.mod-tools,#element-spacing-handles'))return;

    clear();
    startX=lastX=event.clientX;startY=lastY=event.clientY;startScroll=scroller()?.scrollTop||0;
    pendingSelect=true;isSelecting=false;
  },true);
  document.addEventListener('pointermove',event=>{
    if(pendingSelect&&!isSelecting){
      if(groupDragStarted(startX,startY,event.clientX,event.clientY)){
        isSelecting=true;
        origin={x:startX,y:startY,scroll:startScroll};
        window.getSelection()?.removeAllRanges();
        document.body.classList.add('lms-group-selecting');
        tick();
      }
    }
    if(!isSelecting&&!moving)return;
    lastX=event.clientX;lastY=event.clientY;event.preventDefault();
    if(isSelecting)select();else updateDrag();
  },{passive:false});
  document.addEventListener('pointerup',event=>{
    if(isSelecting||moving){lastX=event.clientX;lastY=event.clientY;finish();}
    pendingSelect=false;isSelecting=false;
  });
  document.addEventListener('pointercancel',()=>finish(true));
  const protectedTarget=(target:EventTarget|null)=>target instanceof Element&&!!target.closest('input,textarea,select,[contenteditable="true"],dialog,[role="dialog"],#rtf-toolbar');
  const deleteSelected=()=>{
    if(moving||isSelecting||window.isLmsDragging||document.querySelector('dialog[open],.exercise-editor-overlay'))return;
    const live=selected.filter(el=>el.isConnected&&canvas()?.contains(el));
    if(!live.length){clear();return;}
    window.saveHistoryState(true);
    live.forEach(el=>{window.destroyNestedDropzones?.(el);el.remove();});
    clear();window.currentEditableText=null;window.lastKnownRange=null;
    window.checkEmptyState();window.saveHistoryState(true);
    window.dispatchEvent(new Event('lms-drag-ended'));
  };
  document.addEventListener('keydown',event=>{
    if(protectedTarget(event.target)||protectedTarget(document.activeElement))return;
    if(event.key==='Escape'&&(origin||moving||selected.length||pendingSelect||isSelecting)){event.preventDefault();event.stopImmediatePropagation();finish(true);clear();}
    else if((event.key==='Delete'||event.key==='Backspace')&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&selected.length&&!moving&&!isSelecting){event.preventDefault();event.stopImmediatePropagation();deleteSelected();}
  },true);
  window.addEventListener('blur',()=>finish(true));
  window.addEventListener('scroll',()=>{if(!moving&&!origin&&selected.length)scheduleDraw();},{capture:true,passive:true});
  window.addEventListener('resize',scheduleDraw);
  window.addEventListener('lms-drag-ended',scheduleDraw);
  new MutationObserver(()=>{if(!moving&&!origin&&(selected.length||!box.hidden))scheduleDraw();}).observe(document.getElementById('canvas-container-outer')!,{childList:true,subtree:true});
  tools.querySelector('[data-group-delete]')!.addEventListener('click',event=>{event.stopPropagation();deleteSelected();});
  tools.querySelector('[data-group-copy]')!.addEventListener('click',event=>{
    event.stopPropagation();if(!selected.length)return;window.saveHistoryState(true);
    const clones=selected.map(cloneElement),fragment=document.createDocumentFragment();clones.forEach(el=>fragment.append(el));
    selected.at(-1)!.after(fragment);selected=clones;
    window.initNestedDropzones();window.checkEmptyState();window.saveHistoryState(true);draw();
  });
}
