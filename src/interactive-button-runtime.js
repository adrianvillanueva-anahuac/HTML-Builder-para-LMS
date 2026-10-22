// The same interaction runs in the builder, LMS HTML and downloadable exercises.
/** @param {ParentNode} root */
export function setupInteractiveButtonRuntime(root=document,editor=false){
  const attr=(node,name,value)=>{if(node.getAttribute(name)!==value)node.setAttribute(name,value);};
  const set=(node,key,value)=>{if(node.style.getPropertyValue(key)!==value)node.style.setProperty(key,value);};
  const parts=block=>{
    const shell=block.querySelector(':scope > .ib-shell'),row=shell?.querySelector(':scope > .ib-button-row');
    return {shell,row,trigger:row?.matches('[data-ib-trigger]')?row:row?.querySelector(':scope > .ib-trigger'),panel:shell?.querySelector(':scope > .ib-panel')};
  };
  // Inline state changes keep the exported interaction working even if the LMS
  // discarded every <style>. Never apply these overrides to the editable canvas.
  const paint=block=>{
    if(block.dataset.ibPublished!=='true')return;
    const {row,panel}=parts(block);if(!row||!panel)return;
    const open=block.dataset.buttonAction==='encapsulate'&&block.classList.contains('ib-open');
    const variable=(key,fallback)=>block.style.getPropertyValue(key).trim()||fallback;
    const left=variable('--ib-bleed-left','0px'),right=variable('--ib-bleed-right','0px');
    set(row,'height',open?'0px':variable('--ib-trigger-height','66px'));set(row,'padding',open?'0px':'8px');
    set(row,'opacity',open?'0':'1');set(row,'transform',open?'scale(.85)':'scale(1)');
    set(row,'overflow',open?'hidden':'visible');set(row,'pointer-events',open?'none':'auto');
    set(panel,'display',block.dataset.buttonAction==='encapsulate'?'grid':'none');
    set(panel,'grid-template-rows',open?'1fr':'0fr');set(panel,'visibility',open?'visible':'hidden');
    set(panel,'width',open?`calc(100% + ${left} + ${right})`:'100%');
    set(panel,'margin',open?`18px 0 18px -${left}`:'0px');
    const inner=panel.querySelector(':scope > .ib-panel-inner'),body=inner?.querySelector(':scope > .ib-body');
    if(inner){set(inner,'opacity',open?'1':'0');set(inner,'transform',open?'translateY(0)':'translateY(-8px)');}
    if(body){set(body,'padding-left',variable('--ib-content-left','20px'));set(body,'padding-right',variable('--ib-content-right','20px'));}
    panel.querySelectorAll(':scope > .ib-collapse-row').forEach(closeRow=>{
      set(closeRow,'display','flex');set(closeRow,'opacity',open?'1':'0');set(closeRow,'pointer-events',open?'auto':'none');
    });
  };
  const measure=block=>{
    const {trigger}=parts(block);
    if(!trigger||!block.isConnected)return;
    const face=trigger.matches('summary')?trigger.querySelector('.ib-trigger'):trigger;
    set(block,'--ib-trigger-height',(face.offsetHeight+16)+'px');
    const page=block.parentElement;
    let left=0,right=0,paddingLeft=20,paddingRight=20;
    if(page?.matches('.lms-dropzone.bg-white,[data-ib-page]')){
      attr(page,'data-ib-page','true');
      const p=page.getBoundingClientRect(),b=block.getBoundingClientRect();
      const scale=p.width/page.offsetWidth||1;
      left=Math.max(0,(b.left-p.left)/scale-10);right=Math.max(0,(p.right-b.right)/scale-10);
      paddingLeft=left;paddingRight=right;
    }
    set(block,'--ib-bleed-left',left.toFixed(3)+'px');set(block,'--ib-bleed-right',right.toFixed(3)+'px');
    set(block,'--ib-content-left',paddingLeft.toFixed(3)+'px');set(block,'--ib-content-right',paddingRight.toFixed(3)+'px');
    paint(block);
  };
  const layouts=setupInteractiveButtonRuntime.layouts||(setupInteractiveButtonRuntime.layouts=new WeakMap());
  let layout=layouts.get(root);
  if(!layout){
    let frame=0;
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;root.querySelectorAll('[data-type="boton_interactivo"]').forEach(measure);});};
    layout={observer:typeof ResizeObserver==='function'?new ResizeObserver(schedule):null,observed:new WeakSet(),closing:new WeakMap()};layouts.set(root,layout);
    window.addEventListener('resize',schedule);
  }
  root.querySelectorAll('[data-type="boton_interactivo"]').forEach(block=>{
    const {shell,row,trigger,panel}=parts(block);if(!trigger||!panel)return;
    if(shell.matches('details')&&!block.hasAttribute('data-ib-enhanced')){
      block.classList.toggle('ib-open',shell.open);attr(block,'data-ib-enhanced','true');
    }
    // Upgrade saved buttons: close controls sit outside the clipping layer.
    const body=panel.querySelector(':scope > .ib-panel-inner > .ib-body');
    if(body)Array.from(body.children).filter(child=>child.matches('.ib-collapse-row')).forEach((closeRow,i)=>{
      attr(closeRow,'data-ib-close-position',i===0?'top':'bottom');
      if(i===0)panel.prepend(closeRow);else panel.append(closeRow);
    });
    panel.querySelectorAll(':scope > .ib-collapse-row').forEach((closeRow,i)=>{
      attr(closeRow,'data-ib-close-position',i===0?'top':'bottom');
      const close=closeRow.querySelector('[data-ib-collapse]');if(!close)return;
      attr(close,'aria-label','Contraer contenido');attr(close,'title','Contraer contenido');
      if(block.dataset.ibPublished!=='true'&&(close.children.length!==1||close.firstElementChild?.textContent!=='close'||close.childNodes.length!==1))close.innerHTML='<span class="material-symbols-outlined" aria-hidden="true">close</span>';
    });
    if(block.classList.contains('ib-editor')!==editor)block.classList.toggle('ib-editor',editor);
    if(!panel.id)panel.id='ib-panel-'+crypto.randomUUID();
    if(!trigger.id)trigger.id='ib-trigger-'+crypto.randomUUID();
    attr(panel,'aria-labelledby',trigger.id);
    if(block.dataset.buttonAction==='link'&&block.dataset.buttonHref){
      let safe=false;try{safe=['https:','http:','mailto:','tel:'].includes(new URL(block.dataset.buttonHref,location.href).protocol);}catch{}
      if(safe){attr(trigger,'href',block.dataset.buttonHref);attr(trigger,'target','_blank');attr(trigger,'rel','noopener noreferrer');}
      trigger.removeAttribute('role');trigger.removeAttribute('aria-expanded');trigger.removeAttribute('aria-controls');
    }else{
      trigger.removeAttribute('href');trigger.removeAttribute('target');trigger.removeAttribute('rel');
      if(trigger.matches('summary'))trigger.removeAttribute('role');else attr(trigger,'role','button');
      if(block.dataset.buttonAction==='encapsulate'){
        attr(trigger,'aria-controls',panel.id);attr(trigger,'aria-expanded',String(block.classList.contains('ib-open')));
      }else{trigger.removeAttribute('aria-controls');trigger.removeAttribute('aria-expanded');}
    }
    const open=block.dataset.buttonAction==='encapsulate'&&block.classList.contains('ib-open');
    attr(panel,'aria-hidden',String(!open));if(panel.hasAttribute('inert')===open)panel.toggleAttribute('inert',!open);
    attr(row,'aria-hidden',String(open));if(row.hasAttribute('inert')!==open)row.toggleAttribute('inert',open);
    measure(block);
    if(block.dataset.ibPublished==='true'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)block.querySelectorAll('.ib-trigger,.ib-collapse,.ib-button-row,.ib-panel,.ib-panel-inner,.ib-collapse-row').forEach(node=>set(node,'transition','none'));
    for(const node of [block,trigger,block.parentElement])if(node&&!layout.observed.has(node)){layout.observed.add(node);layout.observer?.observe(node);}
  });
  const bindings=setupInteractiveButtonRuntime.bindings||(setupInteractiveButtonRuntime.bindings=new WeakSet());
  if(bindings.has(root))return;bindings.add(root);
  const toggle=(block,open)=>{
    const {shell,row,panel,trigger}=parts(block);
    const focusWasInside=panel.contains(document.activeElement),focusWasTrigger=document.activeElement===trigger;
    clearTimeout(layout.closing.get(block));
    measure(block);
    if(open&&shell.matches('details')&&!shell.open){
      shell.open=true;
      // Start from the closed layout so the first expansion also animates.
      void panel.offsetHeight;
    }
    block.classList.toggle('ib-open',open);attr(panel,'aria-hidden',String(!open));panel.toggleAttribute('inert',!open);attr(trigger,'aria-expanded',String(open));
    attr(row,'aria-hidden',String(open));row.toggleAttribute('inert',open);paint(block);
    if(!open&&shell.matches('details'))layout.closing.set(block,setTimeout(()=>{if(!block.classList.contains('ib-open'))shell.open=false;},window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?0:500));
    if(open&&focusWasTrigger)panel.querySelector('[data-ib-collapse]')?.focus({preventScroll:true});
    if(!open&&focusWasInside)trigger.focus({preventScroll:true});
    block.dispatchEvent(new CustomEvent('lms-button-toggled',{bubbles:true,detail:{open}}));
  };
  root.addEventListener('click',event=>{
    const target=event.target instanceof Element?event.target:null;
    const control=target?.closest('[data-ib-trigger],[data-ib-collapse]');if(!control)return;
    const block=control.closest('[data-type="boton_interactivo"]');if(!block||!root.contains(block))return;
    if(control.hasAttribute('data-ib-collapse')){event.preventDefault();toggle(block,false);return;}
    const action=block.dataset.buttonAction;
    if(action==='encapsulate'){event.preventDefault();toggle(block,!block.classList.contains('ib-open'));}
    else if(editor){event.preventDefault();block.dispatchEvent(new CustomEvent('lms-button-configure',{bubbles:true}));}
  });
  root.addEventListener('keydown',event=>{
    const trigger=event.target instanceof Element?event.target.closest('[data-ib-trigger]'):null;
    if(!trigger||!root.contains(trigger)||!['Enter',' '].includes(event.key))return;
    if(trigger.hasAttribute('href'))return;
    event.preventDefault();trigger.click();
  });
  const feedback=(event,active)=>{
    const control=event.target instanceof Element?event.target.closest('.ib-trigger,[data-ib-trigger],[data-ib-collapse]'):null;
    const block=control?.closest('[data-ib-published="true"]');if(!block||!root.contains(block))return;
    if(event.relatedTarget instanceof Node&&control.contains(event.relatedTarget))return;
    const face=control.matches('summary')?control.querySelector('.ib-trigger'):control;
    const light=block.style.getPropertyValue('--ib-light')||'#a68acb',mid=block.style.getPropertyValue('--ib-mid')||'#7755a6';
    set(face,'background-position',active?'95% 50%':'5% 50%');set(face,'transform',active?'translateY(-1px)':'translateY(0)');
    set(face,'box-shadow',active?`0 0 0 2px #ffffffb3,0 0 0 5px ${light},0 0 20px ${mid}`:'0 3px 9px #0002');
  };
  root.addEventListener('mouseover',event=>feedback(event,true));root.addEventListener('mouseout',event=>feedback(event,false));
  root.addEventListener('focusin',event=>feedback(event,true));root.addEventListener('focusout',event=>feedback(event,false));
}
