import {inlineInteractiveButtonIcon} from './interactive-button-icons';

// Brightspace can discard stylesheets and scripts. Publish concrete inline
// styles and a native disclosure first; JavaScript only enhances that fallback.
export function inlineInteractiveButtonExport(block:HTMLElement){
  const apply=(node:HTMLElement|null,styles:Partial<CSSStyleDeclaration>)=>node&&Object.assign(node.style,styles);
  const variable=(key:string,fallback:string)=>block.style.getPropertyValue(key).trim()||fallback;
  const base=variable('--ib-base','#5d428c'),mid=variable('--ib-mid','#7755a6'),light=variable('--ib-light','#a68acb'),ink=variable('--ib-ink','#ffffff');
  const shell=block.querySelector<HTMLElement>(':scope > .ib-shell');
  const row=shell?.querySelector<HTMLElement>(':scope > .ib-button-row');
  const trigger=row?.querySelector<HTMLElement>(':scope > .ib-trigger');
  const panel=shell?.querySelector<HTMLElement>(':scope > .ib-panel');
  if(!shell||!row||!trigger||!panel)return;
  const body=panel.querySelector(':scope > .ib-panel-inner > .ib-body');
  if(body)Array.from(body.children).filter(child=>child.matches('.ib-collapse-row')).forEach((closeRow,i)=>{
    (closeRow as HTMLElement).dataset.ibClosePosition=i===0?'top':'bottom';
    if(i===0)panel.prepend(closeRow);else panel.append(closeRow);
  });
  block.dataset.ibPublished='true';
  apply(block,{position:'relative',width:'100%',minWidth:'0',boxSizing:'border-box'});
  apply(shell,{display:'block',width:'100%',minWidth:'0',boxSizing:'border-box'});
  apply(row,{display:'flex',alignItems:'center',justifyContent:'center',boxSizing:'border-box',height:'auto',padding:'8px',minWidth:'0',margin:'0',opacity:'1',transform:'scale(1)',listStyle:'none',cursor:'pointer',transition:'height .5s cubic-bezier(.22,1,.36,1),padding .5s cubic-bezier(.22,1,.36,1),opacity .25s ease,transform .5s cubic-bezier(.22,1,.36,1)'});
  const controlStyle:Partial<CSSStyleDeclaration>={position:'relative',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:'10px',boxSizing:'border-box',maxWidth:'100%',border:'0',borderRadius:'15px',padding:'14px 26px',backgroundColor:base,backgroundImage:`linear-gradient(120deg,${base},${mid},${light},${base})`,backgroundSize:'230% 100%',color:ink,font:'700 16px/1.4 Roboto,Arial,sans-serif',textDecoration:'none',cursor:'pointer',boxShadow:'0 3px 9px #0002',transition:'background-position .55s ease,box-shadow .4s ease,transform .3s ease',isolation:'isolate'};
  apply(trigger,controlStyle);
  apply(trigger.querySelector('.ib-label'),{overflowWrap:'anywhere',minWidth:'0',color:'inherit',font:'inherit'});
  apply(trigger.querySelector('.ib-icon'),{fontSize:'23px',flexShrink:'0',fontFamily:'"Material Symbols Outlined"',fontWeight:'400',fontStyle:'normal',lineHeight:'1',letterSpacing:'normal',textTransform:'none',whiteSpace:'nowrap',fontFeatureSettings:'"liga"'});
  inlineInteractiveButtonIcon(trigger.querySelector('.ib-icon'));
  // Default visible panel styles are safe: <details> itself hides the content.
  // Do not leave inert/aria-hidden on content that must work without a script.
  panel.removeAttribute('inert');panel.removeAttribute('aria-hidden');
  row.removeAttribute('inert');row.removeAttribute('aria-hidden');
  apply(panel,{position:'relative',display:'grid',gridTemplateRows:'1fr',visibility:'visible',width:'100%',margin:'18px 0',transition:'grid-template-rows .5s cubic-bezier(.22,1,.36,1),width .5s cubic-bezier(.22,1,.36,1),margin .5s cubic-bezier(.22,1,.36,1),visibility .5s'});
  apply(panel.querySelector(':scope > .ib-panel-inner'),{minHeight:'0',overflow:'hidden',borderRadius:'16px',backgroundColor:variable('--ib-tint','#5d428c0d'),opacity:'1',transform:'translateY(0)',transition:'opacity .35s ease,transform .5s cubic-bezier(.22,1,.36,1)'});
  apply(panel.querySelector(':scope > .ib-panel-inner > .ib-body'),{padding:'32px 20px',minWidth:'0',boxSizing:'border-box'});
  apply(panel.querySelector('.ib-content'),{minWidth:'0',display:'flex',flexDirection:'column',overflowWrap:'anywhere'});
  panel.querySelectorAll<HTMLElement>(':scope > .ib-collapse-row').forEach(closeRow=>{
    // These controls require the enhancement. The native summary remains the
    // open/close control when an LMS removes JavaScript.
    apply(closeRow,{position:'absolute',left:'50%',zIndex:'25',display:'none',justifyContent:'center',padding:'0',opacity:'0',pointerEvents:'none',transition:'opacity .2s ease'});
    if(closeRow.dataset.ibClosePosition==='top')apply(closeRow,{top:'0',transform:'translate(-50%,-50%)'});
    else apply(closeRow,{bottom:'0',transform:'translate(-50%,50%)'});
    const close=closeRow.querySelector<HTMLElement>('[data-ib-collapse]');
    apply(close,{...controlStyle,width:'32px',height:'32px',minWidth:'32px',padding:'0',borderRadius:'50%',gap:'0'});
    // A real multiplication glyph keeps the X usable if icon fonts are removed.
    if(close){close.textContent='×';apply(close,{fontFamily:'Arial,sans-serif',fontSize:'25px',fontWeight:'400',lineHeight:'1'});}
  });
  if(block.dataset.buttonAction==='encapsulate'){
    const details=block.ownerDocument.createElement('details');details.className=shell.className;details.style.cssText=shell.style.cssText;
    const summary=block.ownerDocument.createElement('summary');summary.className=row.className;summary.style.cssText=row.style.cssText;
    summary.dataset.ibTrigger='';summary.id=trigger.id;summary.setAttribute('aria-controls',panel.id);
    const face=block.ownerDocument.createElement('span');face.className=trigger.className;face.style.cssText=trigger.style.cssText;
    face.append(...Array.from(trigger.childNodes));summary.append(face);row.replaceWith(summary);
    details.append(...Array.from(shell.childNodes));shell.replaceWith(details);
  }else{
    // Non-disclosure actions retain their native anchor (or unassigned button).
    panel.style.display='none';panel.setAttribute('inert','');panel.setAttribute('aria-hidden','true');
  }
}
