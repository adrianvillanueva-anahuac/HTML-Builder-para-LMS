import {applyPromptLayout} from './modular-prompt';
// Critical published layout must survive editors that discard embedded stylesheets.
// Use concrete values, not CSS variables, for the standalone fallback.
export function inlineModularLayout(root:ParentNode) {
  root.querySelectorAll<HTMLElement>('.modular-table').forEach(block=>{
    const variable=(el:HTMLElement,key:string,fallback:string)=>el.style.getPropertyValue(key).trim()||fallback;
    const apply=(selector:string,styles:Partial<CSSStyleDeclaration>)=>block.querySelectorAll<HTMLElement>(selector).forEach(el=>Object.assign(el.style,styles));
    Object.assign(block.style,{position:'relative',width:'100%',margin:'24px 0',clear:'both'});
    apply('.mod-shell',{paddingInline:variable(block,'--mod-margin','0%'),boxSizing:'border-box'});
    apply('.mod-scroll',{overflowX:'auto',padding:'28px 14px 24px',marginInline:'-14px'});
    apply('.mod-grid',{position:'relative',display:'grid',gap:variable(block,'--mod-gap','20px'),boxSizing:'border-box'});
    apply('.mod-cell',{position:'relative',minWidth:'0',minHeight:'0',border:'0',boxSizing:'border-box'});
    const stroke=variable(block,'--mod-stroke-width','0px'),strokeColor=variable(block,'--mod-stroke-color','#5d428c');
    block.querySelectorAll<HTMLElement>('.mod-card').forEach(card=>{
      const color=variable(card,'--card-color','#f3eef9'),ink=variable(card,'--card-text','#333333');
      const radius=variable(card,'--card-radius','6px'),padding=variable(card,'--card-padding','12px');
      Object.assign(card.style,{position:'relative',width:'100%',height:'100%',boxSizing:'border-box',display:'flex',flexDirection:'column',
        justifyContent:variable(card,'--card-align','center'),backgroundColor:color,color:ink,borderRadius:radius,padding,
        boxShadow:`inset 0 0 0 ${stroke} ${strokeColor}`});
      if(block.dataset.joined==='true'){
        card.style.borderRadius=[0,1,2,3].map(i=>variable(card,'--joined-corner-'+i,'0px').replace(/var\(--card-radius\s*,\s*[^)]+\)/g,radius)).join(' ');
        // A real border also works without pseudo-elements. Suppress the CSS overlay.
        card.style.boxShadow='none';card.style.borderStyle='solid';card.style.borderColor=strokeColor;
        card.style.borderWidth=[0,1,2,3].map(i=>(parseFloat(stroke)*Number(variable(card,'--joined-stroke-'+i,'1')))+'px').join(' ');
        card.style.setProperty('--mod-stroke-width','0px');
      }
      card.querySelectorAll<HTMLElement>('.mod-text,.mod-student-prompt').forEach(text=>{
        Object.assign(text.style,{width:'100%',minWidth:'0',boxSizing:'border-box',overflowWrap:'anywhere'});
        if(!text.style.textAlign)text.style.textAlign='center';
        if(!text.style.color)text.style.color=ink;
      });
      const text=card.querySelector<HTMLElement>('.mod-text');
      if(text)Object.assign(text.style,{maxHeight:'100%',flexShrink:'0',overflow:block.dataset.overflow==='true'?'visible':'hidden'});
      if(card.dataset.studentPrompt==='true'){
        card.style.gap='8px';card.style.justifyContent='flex-start';
        if(text)Object.assign(text.style,{height:'auto',flex:'1 0 30px',maxHeight:'none'});
      }
      card.querySelectorAll<HTMLElement>('.student-rich-answer').forEach(answer=>Object.assign(answer.style,{height:'100%',minHeight:'30px',border:'1px dotted currentColor',padding:'8px',borderRadius:'4px',whiteSpace:'pre-wrap'}));
      applyPromptLayout(card);
      card.querySelectorAll<HTMLElement>('.mod-info').forEach(info=>{
        Object.assign(info.style,{display:info.dataset.needed==='true'?'block':'none',position:'absolute',inset:'0',margin:'auto',width:'max-content',height:'max-content',zIndex:'25'});
        const summary=info.querySelector<HTMLElement>('summary');
        if(summary)Object.assign(summary.style,{cursor:'pointer',listStyle:'none',backgroundColor:variable(card,'--info-color','#5d428c'),color:'white',borderRadius:'12px',padding:'2px 7px',font:'12px Roboto,sans-serif',whiteSpace:'nowrap'});
        const preview=info.querySelector<HTMLElement>('.mod-preview');
        if(preview)Object.assign(preview.style,{position:'absolute',right:'0',top:'100%',padding,width:'min(340px,65vw)',maxHeight:'340px',overflow:'auto',borderRadius:radius,backgroundColor:color,color:ink,border:'1px solid #cdd5dc',boxShadow:'0 5px 20px #0003',whiteSpace:'normal',overflowWrap:'anywhere'});
      });
    });
    apply('.mod-edge',{position:'absolute',transform:'translate(-50%,-50%)',zIndex:'65',pointerEvents:'none'});
    apply('.mod-edge svg',{overflow:'visible'});
    apply('.mod-center',{position:'absolute',pointerEvents:'none'});
    block.querySelectorAll<HTMLElement>('.mod-center-visual').forEach(el=>Object.assign(el.style,{position:'absolute',inset:'0',zIndex:el.parentElement?.dataset.front==='false'?'1':'40',pointerEvents:'auto',display:'grid',placeItems:'center'}));
    apply('.mod-center-visual svg',{position:'absolute',width:'100%',height:'100%',inset:'0'});
    apply('.mod-center-text',{position:'relative',width:'58%',maxHeight:'65%',overflow:'auto',textAlign:'center',overflowWrap:'anywhere',fontSize:'12px',lineHeight:'1.2',whiteSpace:'pre-wrap'});
  });
}
