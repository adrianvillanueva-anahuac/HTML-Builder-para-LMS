const limit=(n:number)=>Math.max(0,Math.min(30,Number.isFinite(n)?n:10));
const value=(el:HTMLElement,side:'top'|'bottom')=>limit(Number(el.dataset[side==='top'?'spaceTop':'spaceBottom']??10));
const isFooter=(el:HTMLElement)=>el.matches('.lms-footer-wrapper,.lms-page-footer');
export const footerSpacingGrowth=(elementBottom:number,footerTop:number)=>limit(elementBottom)+limit(footerTop)-20;
function updateFooterPage(footer:HTMLElement){
  const page=footer.parentElement;if(!page)return;
  const baseKey='--lms-footer-base-min-height',growthKey='--lms-footer-spacing-growth';
  if(!page.style.getPropertyValue(baseKey)){
    // Capture the original floor, not a fixed height. mt-auto must not absorb
    // the user's added gap, even when a short page has spare vertical space.
    const base=page.style.minHeight||(page.isConnected?getComputedStyle(page).minHeight:'60px');
    page.style.setProperty(baseKey,base&&base!=='auto'?base:'0px');
  }
  if(!page.hasAttribute('data-footer-spacing-page'))page.setAttribute('data-footer-spacing-page','true');
  let upper=footer.previousElementSibling as HTMLElement|null;
  while(upper&&!upper.matches('.lms-element'))upper=upper.previousElementSibling as HTMLElement|null;
  const growth=footerSpacingGrowth(upper?value(upper,'bottom'):10,value(footer,'top'))+'px';
  if(page.style.getPropertyValue(growthKey)!==growth)page.style.setProperty(growthKey,growth);
}
function setFooterSpacing(footer:HTMLElement,top:number){
  const text=String(limit(top));
  if(footer.dataset.spaceTop!==text)footer.dataset.spaceTop=text;
  if(footer.dataset.footerSpacing!=='true')footer.dataset.footerSpacing='true';
  if(footer.style.getPropertyValue('--lms-footer-space-top')!==text+'px')footer.style.setProperty('--lms-footer-space-top',text+'px');
  updateFooterPage(footer);
}
const boundary=(el:HTMLElement)=>isFooter(el)?(el.querySelector<HTMLElement>(':scope > .footer-content')||el).getBoundingClientRect():el.getBoundingClientRect();
export function setElementSpacing(el:HTMLElement,top:number,bottom:number){
  // The footer keeps its negative bottom gutter and automatic bottom anchor.
  if(isFooter(el)){setFooterSpacing(el,top);return;}
  for(const [side,n] of [['top',limit(top)],['bottom',limit(bottom)]] as const){
    const key=side==='top'?'spaceTop':'spaceBottom',text=String(n);
    if(el.dataset[key]!==text)el.dataset[key]=text;
    if(el.style.getPropertyValue('margin-'+side)!==text+'px'||el.style.getPropertyPriority('margin-'+side)!=='important')el.style.setProperty('margin-'+side,text+'px','important');
  }
  const footer=el.nextElementSibling as HTMLElement|null;
  if(footer&&isFooter(footer)&&footer.dataset.footerSpacing==='true')updateFooterPage(footer);
}
export function normalizeElementSpacing(root:ParentNode){
  root.querySelectorAll<HTMLElement>('.lms-dropzone').forEach(zone=>{
    const blocks=Array.from(zone.children).filter((el):el is HTMLElement=>el instanceof HTMLElement&&el.classList.contains('lms-element'));
    const footers=Array.from(zone.children).filter((el):el is HTMLElement=>el instanceof HTMLElement&&isFooter(el));
    if(!blocks.length&&!footers.length)return;
    if(zone.style.display!=='none'&&!zone.classList.contains('hidden')&&zone.style.display!=='flex')zone.style.display='flex';
    if(zone.style.flexDirection!=='column')zone.style.flexDirection='column';
    if(zone.style.rowGap!=='0px')zone.style.rowGap='0px';
    blocks.forEach(block=>setElementSpacing(block,value(block,'top'),value(block,'bottom')));
    footers.forEach(footer=>setFooterSpacing(footer,value(footer,'top')));
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
    const a=boundary(pair.upper),b=boundary(pair.lower),up=value(pair.upper,'bottom'),down=value(pair.lower,'top');
    const footer=isFooter(pair.lower);overlay.dataset.spacingTarget=footer?'footer':'elements';
    buttons[0].title=footer?'Separación del elemento (0–30 px)':'Separación superior (0–30 px)';
    buttons[1].title=footer?'Ajustar separación de elemento y footer (0–30 px por lado)':'Ajustar ambas separaciones (0–30 px por lado)';
    buttons[2].title=footer?'Separación del footer (0–30 px)':'Separación inferior (0–30 px)';
    buttons.forEach(button=>button.setAttribute('aria-label',button.title));
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
      const a=boundary(pair.upper),b=boundary(pair.lower);
      const x=parseFloat(overlay.style.left),y=parseFloat(overlay.style.top);
      if(event.clientY>=Math.min(a.bottom-8,y-34)&&event.clientY<=Math.max(b.top+8,y+34)&&
        event.clientX>=Math.min(a.right,x)-8&&event.clientX<=Math.max(a.right,x+52)+8)return;
    }
    const target=document.elementFromPoint(event.clientX,event.clientY),zone=target?.closest<HTMLElement>('#canvas .lms-dropzone,#canvas');
    if(!zone){overlay.hidden=true;return;}
    const blocks=Array.from(zone.children).filter((el):el is HTMLElement=>el instanceof HTMLElement&&el.matches('.lms-element,.lms-footer-wrapper')&&el.getBoundingClientRect().height>0);
    for(let i=0;i<blocks.length-1;i++){
      const a=boundary(blocks[i]),b=boundary(blocks[i+1]);
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
