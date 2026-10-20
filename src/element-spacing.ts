const limit=(n:number)=>Math.max(0,Math.min(30,Number.isFinite(n)?n:10));
const value=(el:HTMLElement,side:'top'|'bottom')=>limit(Number(el.dataset[side==='top'?'spaceTop':'spaceBottom']??10));
export function setElementSpacing(el:HTMLElement,top:number,bottom:number){
  for(const [side,n] of [['top',limit(top)],['bottom',limit(bottom)]] as const){
    const key=side==='top'?'spaceTop':'spaceBottom',text=String(n);
    if(el.dataset[key]!==text)el.dataset[key]=text;
    if(el.style.getPropertyValue('margin-'+side)!==text+'px'||el.style.getPropertyPriority('margin-'+side)!=='important')el.style.setProperty('margin-'+side,text+'px','important');
  }
}
export function normalizeElementSpacing(root:ParentNode){
  root.querySelectorAll<HTMLElement>('.lms-dropzone').forEach(zone=>{
    const blocks=Array.from(zone.children).filter((el):el is HTMLElement=>el instanceof HTMLElement&&el.classList.contains('lms-element'));
    if(!blocks.length)return;
    if(zone.style.display!=='none'&&!zone.classList.contains('hidden')&&zone.style.display!=='flex')zone.style.display='flex';
    if(zone.style.flexDirection!=='column')zone.style.flexDirection='column';
    if(zone.style.rowGap!=='0px')zone.style.rowGap='0px';
    blocks.forEach(block=>setElementSpacing(block,value(block,'top'),value(block,'bottom')));
  });
}
let installed=false;
export function setupSpacingHandles(){
  if(installed)return;installed=true;
  const overlay=document.createElement('div');overlay.id='element-spacing-handles';overlay.hidden=true;
  overlay.style.cssText='position:fixed;z-index:1100;pointer-events:none;';
  let pair:{upper:HTMLElement;lower:HTMLElement}|null=null,drag:{kind:string;y:number;up:number;down:number}|null=null;
  const buttons=['upper','center','lower'].map((kind,i)=>{
    const button=document.createElement('button');button.type='button';button.dataset.spacingHandle=kind;
    button.title=['Separación superior (0–30 px)','Ajustar ambas separaciones (0–30 px por lado)','Separación inferior (0–30 px)'][i];button.setAttribute('aria-label',button.title);
    button.style.cssText=`position:absolute;left:0;width:52px;height:20px;padding:0;border:1px solid #5d428c;border-radius:10px;background:#fff;color:#5d428c;font:11px Arial;cursor:ns-resize;pointer-events:auto;touch-action:none;box-shadow:0 1px 4px #0002;`;
    overlay.append(button);return button;
  });document.body.append(overlay);
  const draw=()=>{
    if(!pair||!pair.upper.isConnected||!pair.lower.isConnected){overlay.hidden=true;return;}
    const a=pair.upper.getBoundingClientRect(),b=pair.lower.getBoundingClientRect(),up=value(pair.upper,'bottom'),down=value(pair.lower,'top');
    const canvas=pair.upper.closest('#canvas');
    let ancestor=pair.upper.parentElement,page:Element|null=canvas;
    while(ancestor&&ancestor!==canvas){
      if(ancestor.matches('.lms-dropzone.bg-white'))page=ancestor;
      ancestor=ancestor.parentElement;
    }
    const surface=page?.getBoundingClientRect()??a;
    const right=surface.right+8,left=surface.left-60;
    overlay.style.left=(right+52<=window.innerWidth?right:left)+'px';
    overlay.style.top=Math.max(36,Math.min(window.innerHeight-36,(a.bottom+b.top)/2))+'px';
    buttons[0].style.top='-34px';buttons[1].style.top='-10px';buttons[2].style.top='14px';
    buttons[0].textContent=`↥ ${up} px`;buttons[1].textContent=`↕ ${up+down}`;buttons[2].textContent=`↧ ${down} px`;
    overlay.hidden=false;
  };
  const adjust=(kind:string,up:number,down:number,delta:number)=>{
    if(!pair)return;
    if(kind!=='lower')setElementSpacing(pair.upper,value(pair.upper,'top'),up+(kind==='upper'?-delta:delta));
    if(kind!=='upper')setElementSpacing(pair.lower,down+delta,value(pair.lower,'bottom'));
    draw();
  };
  document.addEventListener('pointermove',event=>{
    if(drag){adjust(drag.kind,drag.up,drag.down,Math.round(event.clientY-drag.y));return;}
    if(window.isLmsDragging||(event.target as Element).closest?.('#element-spacing-handles'))return;
    if(pair&&!overlay.hidden){
      const a=pair.upper.getBoundingClientRect(),b=pair.lower.getBoundingClientRect();
      const x=parseFloat(overlay.style.left),y=parseFloat(overlay.style.top);
      if(event.clientY>=Math.min(a.bottom-8,y-34)&&event.clientY<=Math.max(b.top+8,y+34)&&
        event.clientX>=Math.min(a.right,x)-8&&event.clientX<=Math.max(a.right,x+52)+8)return;
    }
    const target=document.elementFromPoint(event.clientX,event.clientY),zone=target?.closest<HTMLElement>('#canvas .lms-dropzone,#canvas');
    if(!zone){overlay.hidden=true;return;}
    const blocks=Array.from(zone.children).filter((el):el is HTMLElement=>el instanceof HTMLElement&&el.matches('.lms-element')&&el.getBoundingClientRect().height>0);
    for(let i=0;i<blocks.length-1;i++){
      const a=blocks[i].getBoundingClientRect(),b=blocks[i+1].getBoundingClientRect();
      if(event.clientY>=a.bottom-8&&event.clientY<=b.top+8&&event.clientX>=a.left&&event.clientX<=a.right){pair={upper:blocks[i],lower:blocks[i+1]};draw();return;}
    }overlay.hidden=true;
  });
  buttons.forEach(button=>{
    button.addEventListener('pointerdown',event=>{if(!pair)return;event.preventDefault();event.stopPropagation();window.saveHistoryState?.(true);window.modularResizing=true;drag={kind:button.dataset.spacingHandle!,y:event.clientY,up:value(pair.upper,'bottom'),down:value(pair.lower,'top')};button.setPointerCapture(event.pointerId);});
    button.addEventListener('keydown',event=>{if(!pair||!['ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();window.saveHistoryState?.(true);adjust(button.dataset.spacingHandle!,value(pair.upper,'bottom'),value(pair.lower,'top'),event.key==='ArrowDown'?1:-1);window.saveHistoryState?.(true);});
  });
  const end=()=>{if(!drag)return;drag=null;window.modularResizing=false;window.saveHistoryState?.(true);};
  document.addEventListener('pointerup',end);document.addEventListener('pointercancel',end);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&drag&&pair){setElementSpacing(pair.upper,value(pair.upper,'top'),drag.up);setElementSpacing(pair.lower,drag.down,value(pair.lower,'bottom'));end();overlay.hidden=true;}});
  window.addEventListener('scroll',()=>{if(!drag)overlay.hidden=true;},true);
  window.addEventListener('resize',()=>{overlay.hidden=true;});
}
