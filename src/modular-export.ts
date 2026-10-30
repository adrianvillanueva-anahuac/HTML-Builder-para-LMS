import {applyPromptLayout} from './modular-prompt';
// Critical published layout must survive editors that discard embedded stylesheets.
// Use concrete values, not CSS variables, for the standalone fallback.
export function inlineModularLayout(root:ParentNode) {
  root.querySelectorAll<HTMLElement>('.modular-table').forEach(block=>{
    const variable=(el:HTMLElement,key:string,fallback:string)=>el.style.getPropertyValue(key).trim()||fallback;
    const apply=(selector:string,styles:Partial<CSSStyleDeclaration>)=>block.querySelectorAll<HTMLElement>(selector).forEach(el=>Object.assign(el.style,styles));
    Object.assign(block.style,{position:'relative',width:'100%',clear:'both'});
    apply('.mod-shell',{padding:variable(block,'--mod-margin','0%'),boxSizing:'border-box'});
    const badges=Array.from(block.querySelectorAll<HTMLElement>('.mod-badge'));
    // Scroll containers clip overflow on both axes. Leave space for the halves
    // outside each cell, including corner positions and enlarged shapes.
    const gutterX=badges.length?Math.ceil(Math.max(...badges.map(b=>parseFloat(b.style.width)/2)))+2:0;
    const gutterY=badges.length?Math.ceil(Math.max(...badges.map(b=>parseFloat(b.style.height)/2)))+2:0;
    apply('.mod-scroll',{overflowX:'auto',padding:`${gutterY}px ${gutterX}px`,margin:'0px',boxSizing:'border-box'});
    apply('.mod-grid',{position:'relative',display:'grid',gap:variable(block,'--mod-gap','20px'),boxSizing:'border-box'});
    apply('.mod-cell',{position:'relative',minWidth:'0',minHeight:'0',border:'0',boxSizing:'border-box'});
    block.querySelectorAll<HTMLElement>('.mod-card').forEach(card=>{
      const authoredStroke=variable(card,'--mod-stroke-width',variable(block,'--mod-stroke-width','0px'));
      const stroke=block.dataset.joined==='true'?variable(card,'--mod-export-joined-stroke-width',authoredStroke):authoredStroke;
      const strokeColor=variable(card,'--mod-stroke-color',variable(block,'--mod-stroke-color','#5d428c'));
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
        card.style.setProperty('--mod-export-joined-stroke-width',stroke);
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
      card.querySelectorAll<HTMLElement>('.mod-text-box-frame').forEach(frame=>{
        Object.assign(frame.style,{position:'absolute',display:'flex',alignItems:'center',boxSizing:'border-box',minWidth:'0',minHeight:'0',zIndex:'10'});
        const text=frame.querySelector<HTMLElement>('.mod-extra-text,.mod-text');
        if(text){Object.assign(text.style,{width:'100%',minWidth:'0',maxHeight:'100%',overflow:'hidden',overflowWrap:'anywhere',boxSizing:'border-box',flexShrink:'0'});if(!text.style.textAlign)text.style.textAlign='center';if(!text.style.color)text.style.color=ink;}
      });
      card.querySelectorAll<HTMLElement>('.mod-text-box-info').forEach(info=>{
        Object.assign(info.style,{display:info.dataset.needed==='true'?'block':'none',position:'absolute',inset:'0',margin:'auto',width:'max-content',height:'max-content',zIndex:'25'});
        const summary=info.querySelector<HTMLElement>('summary');if(summary)Object.assign(summary.style,{backgroundColor:variable(card,'--info-color','#5d428c'),color:'white',borderRadius:'12px',padding:'2px 7px',font:'12px Roboto,sans-serif',whiteSpace:'nowrap',cursor:'pointer'});
        const preview=info.querySelector<HTMLElement>('.mod-text-box-preview');if(preview)Object.assign(preview.style,{position:'absolute',top:'100%',right:'0',backgroundColor:color,color:ink,padding,width:'min(340px,65vw)',maxHeight:'340px',overflow:'auto',border:'1px solid #cdd5dc',borderRadius:radius,boxShadow:'0 5px 20px #0003'});
      });
      card.querySelectorAll<HTMLElement>('.mod-info').forEach(info=>{
        Object.assign(info.style,{display:info.dataset.needed==='true'?'block':'none',position:'absolute',inset:'0',margin:'auto',width:'max-content',height:'max-content',zIndex:'25'});
        const summary=info.querySelector<HTMLElement>('summary');
        if(summary)Object.assign(summary.style,{cursor:'pointer',listStyle:'none',backgroundColor:variable(card,'--info-color','#5d428c'),color:'white',borderRadius:'12px',padding:'2px 7px',font:'12px Roboto,sans-serif',whiteSpace:'nowrap'});
        const preview=info.querySelector<HTMLElement>('.mod-preview');
        if(preview)Object.assign(preview.style,{position:'absolute',right:'0',top:'100%',padding,width:'min(340px,65vw)',maxHeight:'340px',overflow:'auto',borderRadius:radius,backgroundColor:color,color:ink,border:'1px solid #cdd5dc',boxShadow:'0 5px 20px #0003',whiteSpace:'normal',overflowWrap:'anywhere'});
      });
      const info=card.querySelector<HTMLElement>('.mod-overflow-info');
      if(info){
        const config=JSON.parse(card.dataset.textOverflow||'{}'),p=config.panel;
        Object.assign(info.style,{display:config.enabled?'block':'none',position:'absolute',left:`calc(${config.button.x*100}% - 23px)`,top:`calc(${config.button.y*100}% - 11px)`,transform:'none',width:'max-content',height:'max-content',zIndex:'26'});
        const summary=info.querySelector<HTMLElement>('summary')!;summary.title='Mostrar texto completo';Object.assign(summary.style,{listStyle:'none',cursor:'pointer',backgroundColor:variable(card,'--info-color','#5d428c'),color:'white',borderRadius:'12px',padding:'2px 7px',font:'12px Roboto,sans-serif',whiteSpace:'nowrap'});
        const surface=info.querySelector<HTMLElement>('.mod-overflow-surface')!,background=info.querySelector<HTMLElement>('.mod-overflow-background')!,content=info.querySelector<HTMLElement>('.mod-overflow-content')!;
        Object.assign(surface.style,{position:'fixed',zIndex:'4',left:`max(8px,min(calc(100vw - min(${p.width}px,90vw) - 8px),calc(${p.x*100}vw - min(${p.width/2}px,45vw))))`,top:`max(8px,min(${p.y*100}vh,calc(100vh - min(${p.height}px,80vh) - 8px)))`,width:`min(${p.width}px,90vw)`,height:`min(${p.height}px,80vh)`,padding:'22px',boxSizing:'border-box',isolation:'isolate',borderRadius:p.radius+'px',color:'#333',boxShadow:'0 8px 32px #0003'});
        Object.assign(background.style,{position:'absolute',inset:'0',zIndex:'-1',backgroundColor:p.fill,opacity:String(p.opacity),borderRadius:'inherit',border:'1px solid #cdd5dc',pointerEvents:'none'});
        Object.assign(content.style,{position:'relative',height:'100%',overflow:'auto',overflowWrap:'anywhere'});
        // Populate selected text even before the runtime's first animation frame.
        for(const id of config.boxIds||[]){const source=id==='primary'?card.querySelector<HTMLElement>('.mod-text'):card.querySelector<HTMLElement>(`.mod-text-box-frame[data-mod-text-id="${id}"] .mod-extra-text`);if(!source)continue;const copy=document.createElement('div');copy.className='mod-overflow-text';copy.innerHTML=source.innerHTML;for(const name of ['font-size','font-family','font-weight','font-style','text-decoration','text-align','color','line-height','align-content'])copy.style.setProperty(name,source.style.getPropertyValue(name));Object.assign(copy.style,{marginBottom:'12px',whiteSpace:'pre-wrap',overflowWrap:'anywhere'});const l=config.textLayouts?.[id];if(l)Object.assign(copy.style,{position:'absolute',left:l.x*100+'%',top:l.y*100+'%',width:l.width*100+'%',height:l.height*100+'%',margin:'0',overflow:'auto'});content.append(copy);}
        if(config.enabled)for(const id of config.boxIds||[]){const source=id==='primary'?card.querySelector<HTMLElement>('.mod-text'):card.querySelector<HTMLElement>(`.mod-text-box-frame[data-mod-text-id="${id}"]`);if(source)source.style.display='none';}
      }
    });
    apply('.mod-edge',{position:'absolute',transform:'translate(-50%,-50%)',zIndex:'65',pointerEvents:'none'});
    apply('.mod-edge svg',{overflow:'visible'});
    apply('.mod-center',{position:'absolute',pointerEvents:'none'});
    block.querySelectorAll<HTMLElement>('.mod-center-visual').forEach(el=>Object.assign(el.style,{position:'absolute',inset:'0',zIndex:el.parentElement?.dataset.front==='false'?'1':'40',pointerEvents:'auto',display:'grid',placeItems:'center'}));
    apply('.mod-center-visual svg',{position:'absolute',width:'100%',height:'100%',inset:'0'});
    apply('.mod-center-text',{position:'relative',width:'58%',maxHeight:'65%',overflow:'auto',textAlign:'center',overflowWrap:'anywhere',fontSize:'12px',lineHeight:'1.2',whiteSpace:'pre-wrap'});
    // Percent anchors and translate keep each badge's center on the perimeter
    // even when a published table is resized, without requiring JavaScript.
    apply('.mod-badge',{position:'absolute',transform:'translate(-50%,-50%)',zIndex:'70',display:'grid',placeItems:'center',cursor:'default'});
    apply('.mod-badge>svg',{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none'});
    apply('.mod-badge-text',{position:'relative',width:'70%',maxHeight:'none',minHeight:'0',overflow:'visible',overflowWrap:'anywhere',textAlign:'center',lineHeight:'1.2',whiteSpace:'pre-wrap',padding:'0',margin:'0'});
    apply('.mod-badge-text :is(p,div,h1,h2,h3)',{margin:'0',textAlign:'center'});
  });
}
