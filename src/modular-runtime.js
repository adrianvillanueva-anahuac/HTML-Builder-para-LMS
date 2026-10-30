// Self-contained: the same layout logic runs in the Builder and published HTML.
export function mountModularRuntime(block) {
  const hasText=text=>!!text&&(!!text.textContent.replace(/\u200b/g,'').trim()||!!text.querySelector('img,svg,video,audio,iframe'));
  let frame=0;
  let heldLift=0,liftUntil=0,liftTimer=0;
  const set=(el,name,value)=>{
    // Reposition published overlays without erasing their inline fallback appearance.
    if(name==='style'&&block.classList.contains('mod-published')&&el.matches('.mod-edge,.mod-center,.mod-preview,.mod-text-box-preview')){
      const next=document.createElement('div').style;next.cssText=value;
      for(let i=0;i<next.length;i++){const key=next[i];if(el.style.getPropertyValue(key)!==next.getPropertyValue(key))el.style.setProperty(key,next.getPropertyValue(key));}
    }else if(el.getAttribute(name)!==value)el.setAttribute(name,value);
  };
  const positionPreview=(info,panel)=>{
    if(!panel||!info.open&&!info.matches(':hover,:focus-within'))return;
    const anchor=info.getBoundingClientRect(),area=block.closest('#scroll-container')?.getBoundingClientRect();
    const leftLimit=Math.max(8,(area?.left||0)+8),rightLimit=Math.min(window.innerWidth-8,(area?.right||window.innerWidth)-8),width=Math.min(340,rightLimit-leftLimit);
    const below=window.innerHeight-anchor.bottom-16,height=Math.min(340,Math.max(below,anchor.top-16)),top=below>=Math.min(200,height)?anchor.bottom:Math.max(8,anchor.top-height);
    set(panel,'style',`position:fixed;left:${Math.max(leftLimit,Math.min(anchor.right-width,rightLimit-width))}px;top:${top}px;right:auto;width:${width}px;max-height:${height}px;z-index:200`);
  };
  const update=()=>{
    frame=0;
    const grid=block.querySelector('.mod-grid');
    if(!grid || !grid.getBoundingClientRect().width)return;
    const auto=block.dataset.overflow==='true';
    const rows=JSON.parse(block.dataset.rowHeights||'[]');
    const heights=[...rows];
    block.querySelectorAll('.mod-card[data-text-overflow]').forEach(card=>{
      const config=JSON.parse(card.dataset.textOverflow),row=Number(card.closest('.mod-cell').dataset.cell.split(':')[0]),baseHeight=rows[row]||120;
      card.dataset.textBaseHeight=String(baseHeight);card.dataset.clipped='false';
      const padding=parseFloat(getComputedStyle(card).paddingTop)||0,width=card.clientWidth;
      const items=[];
      const primary=card.querySelector('.mod-text');
      if(primary&&!primary.closest('.mod-text-box-frame')){
        const hidden=(primary.dataset.textSuggestion==='true'&&!!card.querySelector('.mod-text-box-frame'))||(config.enabled&&config.boxIds.includes('primary')&&!primary.isContentEditable&&hasText(primary));primary.style.display=hidden?'none':'';
        primary.style.maxHeight='none';primary.style.overflow='visible';primary.style.visibility='visible';
        if(!hidden){primary.style.alignSelf='flex-start';items.push({left:padding,right:width-padding,top:padding,height:Math.max(24,primary.scrollHeight),text:primary});}
      }
      card.querySelectorAll('.mod-text-box-frame').forEach(frame=>{
        const text=frame.querySelector('.mod-text,.mod-extra-text');if(!text)return;
        const hidden=config.enabled&&config.boxIds.includes(frame.dataset.modTextId)&&!text.isContentEditable&&hasText(text),layout=JSON.parse(frame.dataset.textLayout||'{"x":0.1,"y":0.1,"width":0.8,"height":0.4}');
        frame.dataset.clipped='false';frame.style.display=hidden?'none':'flex';if(hidden)return;
        frame.style.left=layout.x*100+'%';frame.style.width=layout.width*100+'%';
        text.style.maxHeight='none';text.style.overflow='visible';text.style.visibility='visible';text.style.height='auto';
        const height=Math.max(layout.height*baseHeight,text.scrollHeight,24);
        items.push({left:layout.x*width,right:(layout.x+layout.width)*width,top:layout.y*baseHeight,height,frame,text});
      });
      // Absolute authored anchors refer to the BASE row, not its growing size.
      // Push intersecting lower boxes down; never scale typography or feed the
      // enlarged row back into percentage heights (which would grow forever).
      items.sort((a,b)=>a.top-b.top);const placed=[];
      for(const item of items){for(const previous of placed)if(item.left<previous.right&&item.right>previous.left&&item.top<previous.top+previous.height+8)item.top=previous.top+previous.height+8;
        if(item.frame){item.frame.style.top=item.top+'px';item.frame.style.height=item.height+'px';}
        else if(items.length>1){item.text.style.position='absolute';item.text.style.top=item.top+'px';item.text.style.left=padding+'px';item.text.style.width=Math.max(0,width-2*padding)+'px';}
        else{item.text.style.position='';item.text.style.top='';item.text.style.left='';item.text.style.width='100%';}
        heights[row]=Math.max(heights[row],Math.ceil(item.top+item.height+padding+2));placed.push(item);
      }
      const info=card.querySelector('.mod-overflow-info');if(!info)return;
      info.dataset.enabled=String(config.enabled);const summary=info.querySelector('summary');
      const panel=info.querySelector('.mod-overflow-panel'),content=info.querySelector('.mod-overflow-content'),p=config.panel;
      const parts=config.enabled?config.boxIds.map(id=>{const text=id==='primary'?primary:card.querySelector(`.mod-text-box-frame[data-mod-text-id="${id}"] .mod-extra-text`);return hasText(text)?{id,html:text.innerHTML,layout:config.textLayouts?.[id],style:['font-size','font-family','font-weight','font-style','text-decoration','text-align','color','line-height','align-content'].map(key=>key+':'+text.style.getPropertyValue(key)).join(';')}:null;}).filter(Boolean):[];
      info.dataset.hasContent=String(parts.length>0);info.style.display=config.enabled&&parts.length?'block':'none';
      const signature=JSON.stringify(parts);if(content.dataset.signature!==signature){content.replaceChildren(...parts.map(part=>{const el=document.createElement('div');el.className='mod-overflow-text';el.dataset.overflowSource=part.id;el.innerHTML=part.html;el.style.cssText=part.style;if(part.layout){const l=part.layout;el.dataset.textLayout=JSON.stringify(l);Object.assign(el.style,{position:'absolute',left:l.x*100+'%',top:l.y*100+'%',width:l.width*100+'%',height:l.height*100+'%',margin:'0',overflow:'auto'});}el.querySelectorAll('[contenteditable]').forEach(node=>node.removeAttribute('contenteditable'));return el;}));content.dataset.signature=signature;}
      const bw=summary.offsetWidth||46,bh=summary.offsetHeight||22;
      const x=Math.max(bw/2,Math.min(card.clientWidth-bw/2,config.button.x*card.clientWidth)),y=Math.max(bh/2,Math.min(card.clientHeight-bh/2,config.button.y*card.clientHeight));
      Object.assign(info.style,{left:(x-bw/2)+'px',top:(y-bh/2)+'px',transform:'none'});
      const surface=info.querySelector('.mod-overflow-surface');surface.dataset.panelStyle=p.style;surface.style.setProperty('--overflow-radius',p.radius+'px');surface.style.setProperty('--overflow-fill',p.fill);surface.style.setProperty('--overflow-opacity',String(p.opacity));
      const backdrop=info.querySelector('.mod-overflow-backdrop');Object.assign(backdrop.style,{background:`rgb(0 0 0 / ${p.dim})`,backdropFilter:`blur(${p.blur}px)`});
      if(info.open||(block.classList.contains('mod-published')&&info.matches(':hover,:focus-within'))){
        const anchor=summary.getBoundingClientRect(),area=block.closest('#scroll-container')?.getBoundingClientRect(),limit=Math.max(8,(area?.left||0)+8),right=Math.min(innerWidth-8,(area?.right||innerWidth)-8),w=Math.min(p.width,right-limit),h=Math.min(p.height,Math.max(1,innerHeight-100));
        const left=Math.max(limit,Math.min(right-w,p.x*innerWidth-w/2)),top=Math.max(8,Math.min(innerHeight-h-8,p.y*innerHeight));
        Object.assign(surface.style,{position:'fixed',left:left+'px',top:top+'px',width:w+'px',height:h+'px'});
        // A bridge follows the button, keeping hover reachable if the authored
        // panel has been moved away from it. Click/touch pins it open as well.
        panel.style.setProperty('--anchor-y',anchor.bottom+'px');
      }
    });
    block.querySelectorAll('.mod-card').forEach(card=>{
      if(card.hasAttribute('data-text-overflow'))return;
      const text=card.querySelector('.mod-text');if(!text)return;
      if(text.closest('.mod-primary-text-frame')&&card.dataset.student!=='true')return;
      if(!auto&&!text.classList.contains('student-rich-answer')&&card.dataset.studentPrompt!=='true')return;
      const side=card.dataset.studentPrompt==='true'&&['left','right'].includes(card.dataset.promptPosition);
      const oldHeight=text.style.height,oldMin=text.style.minHeight,oldFlex=text.style.flex,oldAlign=text.style.alignSelf;
      text.style.height='auto';text.style.minHeight='0';
      // In a row, flex controls width: retain it while measuring wrapped content.
      // Disable cross-axis stretching so the current row height is not fed back
      // into the next measurement by ResizeObserver.
      if(side)text.style.alignSelf='flex-start';else text.style.flex='0 0 auto';
      const padding=getComputedStyle(card);
      const textStyle=getComputedStyle(text);
      const prompt=card.querySelector('.mod-student-prompt');
      const promptAlign=prompt?.style.alignSelf;
      if(side&&prompt)prompt.style.alignSelf='flex-start';
      const promptHeight=prompt&&getComputedStyle(prompt).display!=='none'?prompt.getBoundingClientRect().height:0;
      const answerHeight=Math.max(30,text.scrollHeight)+parseFloat(textStyle.borderTopWidth||0)+parseFloat(textStyle.borderBottomWidth||0);
      const contentHeight=side?Math.max(answerHeight,promptHeight):answerHeight+(promptHeight?promptHeight+(parseFloat(padding.rowGap)||0):0);
      const required=Math.ceil(contentHeight+parseFloat(padding.paddingTop)+parseFloat(padding.paddingBottom)+2);
      text.style.height=oldHeight;text.style.minHeight=oldMin;text.style.flex=oldFlex;text.style.alignSelf=oldAlign;
      if(prompt)prompt.style.alignSelf=promptAlign;
      const row=Number(card.closest('.mod-cell').dataset.cell.split(':')[0]);
      heights[row]=Math.max(heights[row]||40,required);
    });
    const template=heights.map(n=>n+'px').join(' ');
    if(template && grid.style.gridTemplateRows!==template)grid.style.gridTemplateRows=template;
    const base=grid.getBoundingClientRect();
    const scrollBounds=block.querySelector('.mod-scroll').getBoundingClientRect();
    // Clamp the whole toolbar, not just its menus, inside the clipping scroll area.
    const secondaryBars=[];
    const primary=block.querySelector(':scope > .block-toolbar');
    const primaryBar=primary?.querySelector(':scope > .mod-tools');
    const primaryRect=primary?.getBoundingClientRect();
    const shift=primary?getComputedStyle(primary).translate.split(' ').map(v=>parseFloat(v)||0):[0,0];
    const primaryBounds=primaryRect?{left:primaryRect.left-shift[0],right:primaryRect.right-shift[0],top:primaryRect.top-(shift[1]||0),bottom:primaryRect.bottom-(shift[1]||0)}:null;
    block.querySelectorAll('.mod-cell-tools').forEach(tool=>{
      if(!tool.getClientRects().length)return;
      const cell=tool.parentElement.getBoundingClientRect();
      const leftLimit=Math.max(4,scrollBounds.left+4);
      const rightLimit=Math.min(window.innerWidth-4,scrollBounds.right-4);
      tool.style.maxWidth=Math.max(30,rightLimit-leftLimit)+'px';
      const width=tool.getBoundingClientRect().width;
      const left=Math.max(leftLimit,Math.min(cell.right-width,rightLimit-width));
      const height=tool.offsetHeight;
      const firstRow=tool.parentElement.dataset.cell?.split(':')[0]==='0';
      let alignedTop=firstRow&&primaryBounds&&primaryBounds.top>=4&&primaryBounds.bottom<=window.innerHeight-4
        ?primaryBounds.top:cell.top-height-6;
      const badge=tool.parentElement.querySelector(':scope > .mod-badge')?.getBoundingClientRect();
      if(badge&&left<badge.right+6&&left+width>badge.left-6&&alignedTop<badge.bottom+6&&alignedTop+height>badge.top-6){
        alignedTop=Math.min(alignedTop,badge.top-height-8);
      }
      const top=Math.max(4,Math.min(alignedTop,window.innerHeight-height-4));
      tool.style.right='auto';
      tool.style.left=left+'px';tool.style.top=top+'px';
      if(firstRow)secondaryBars.push({left,right:left+width,top,bottom:top+height});
    });
    if(primaryBar){
      // Measure the unshifted wrapper: reading the animated child would feed
      // intermediate positions back into the next layout and cause jitter.
      const r=primaryBounds,width=primaryBar.offsetWidth;
      const hit=secondaryBars.find(s=>r.left<s.right+8&&r.left+width>s.left-8&&r.top<s.bottom+8&&r.bottom>s.top-8);
      let dy=0;
      if(hit){
        // Keep the table toolbar on its original horizontal axis. The cell
        // controls stay anchored to their rectangle; lift only the main bar.
        dy=hit.top-8-primaryBar.offsetHeight-r.top;
      }
      block.querySelectorAll('.mod-badge').forEach(badge=>{
        const b=badge.getBoundingClientRect();
        if(r.left<b.right+8&&r.left+width>b.left-8&&r.top+dy<b.bottom+8&&r.top+dy+primaryBar.offsetHeight>b.top-8){
          dy=Math.min(dy,b.top-8-primaryBar.offsetHeight-r.top);
        }
      });
      if(!block.querySelector('.mod-badge-picker[data-dragging]')){
        const now=Date.now();
        if(dy<=heldLift||primary.matches(':hover,:focus-within')){heldLift=Math.min(dy,heldLift);liftUntil=now+2000;}
        if(dy>heldLift&&now<liftUntil){dy=heldLift;clearTimeout(liftTimer);liftTimer=setTimeout(schedule,liftUntil-now+10);}
        else heldLift=dy;
        primaryBar.style.removeProperty('translate');
        primary.style.translate=`0px ${dy}px`;
      }
    }
    block.querySelectorAll('.mod-row-tools').forEach(tool=>{
      const row=tool.closest('.mod-cell').getBoundingClientRect();
      set(tool,'style',`left:${Math.max(4,row.left-tool.offsetWidth-8)}px;top:${row.top+row.height/2-20}px`);
    });
    block.querySelectorAll('.mod-column-tools').forEach(tool=>{
      const cell=tool.closest('.mod-cell').getBoundingClientRect();
      set(tool,'style',`left:${Math.max(4,Math.min(window.innerWidth-tool.offsetWidth-4,cell.left+(cell.width-tool.offsetWidth)/2))}px;top:${cell.bottom+6}px`);
    });
    block.querySelectorAll('.mod-card').forEach(card=>{
      const text=card.querySelector('.mod-text');
      const info=card.querySelector('.mod-info');
      const preview=card.querySelector('.mod-preview-content');
      if(!text || !info)return;
      const clipped=(!auto||text.closest('.mod-primary-text-frame')) && card.dataset.student!=='true' && (text.scrollHeight>text.clientHeight+1 || text.scrollWidth>text.clientWidth+1);
      set(card,'data-clipped',String(clipped));
      set(info,'data-needed',String(clipped));
      if(block.classList.contains('mod-published')){
        const display=clipped?'block':'none';if(info.style.display!==display)info.style.display=display;
      }
      if(preview && info.dataset.editing!=='true' && preview.innerHTML!==text.innerHTML)preview.innerHTML=text.innerHTML;
      if(preview&&info.dataset.editing!=='true')for(const key of ['fontSize','fontFamily','fontWeight','fontStyle','textDecoration','textAlign','color','lineHeight'])if(preview.style[key]!==text.style[key])preview.style[key]=text.style[key];
      const panel=info.querySelector('.mod-preview');
      positionPreview(info,panel);
    });
    block.querySelectorAll('.mod-text-box-frame').forEach(frame=>{
      if(frame.closest('.mod-card[data-text-overflow]'))return;
      const text=frame.querySelector('.mod-extra-text,.mod-text');if(!text)return;
      const clipped=text.scrollHeight>text.clientHeight+1||text.scrollWidth>text.clientWidth+1;
      set(frame,'data-clipped',String(clipped));
      const info=frame.querySelector('.mod-text-box-info'),preview=frame.querySelector('.mod-text-box-preview-content');
      if(info){set(info,'data-needed',String(clipped));if(block.classList.contains('mod-published'))info.style.display=clipped?'block':'none';}
      if(preview&&preview.innerHTML!==text.innerHTML)preview.innerHTML=text.innerHTML;
      if(preview&&preview.style.cssText!==text.style.cssText)preview.style.cssText=text.style.cssText;
      if(info)positionPreview(info,info.querySelector('.mod-text-box-preview'));
    });
    block.querySelectorAll('.mod-center').forEach(center=>{
      const [r,c]=center.dataset.center.split(':').map(Number);
      const a=grid.querySelector(`[data-cell="${r}:${c}"]`),b=grid.querySelector(`[data-cell="${r+1}:${c+1}"]`);
      if(!a||!b)return;
      const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();
      const size=Number(center.dataset.size)||80;
      set(center,'style',`left:${(ar.right+br.left)/2-base.left-size/2}px;top:${(ar.bottom+br.top)/2-base.top-size/2}px;width:${size}px;height:${size}px`);
      const tools=center.querySelector('.mod-center-tools');
      if(tools&&tools.getClientRects().length){
        const rect=center.getBoundingClientRect(),width=tools.offsetWidth;
        tools.style.left=Math.max(scrollBounds.left+4,Math.min(rect.left,scrollBounds.right-width-4))+'px';
        tools.style.top=Math.max(8,rect.top-tools.offsetHeight)+'px';
      }
    });
    block.querySelectorAll('.mod-edge').forEach(edge=>{
      const a=grid.querySelector(`[data-cell="${edge.dataset.from}"]`);
      const b=grid.querySelector(`[data-cell="${edge.dataset.to}"]`);
      if(!a || !b)return;
      const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();
      const vertical=edge.dataset.from.split(':')[0]!==edge.dataset.to.split(':')[0];
      const x=vertical?(ar.left+ar.width/2-base.left):(ar.right+br.left)/2-base.left;
      const y=vertical?(ar.bottom+br.top)/2-base.top:ar.top+ar.height/2-base.top;
      const distance=vertical?br.top-ar.bottom:br.left-ar.right;
      const length=Math.max(24,distance+8);
      const scale=Math.max(.5,Math.min(3,Number(edge.dataset.scale)||1));
      const offset=Math.max(-100,Math.min(100,Number(edge.dataset.offset)||0));
      // Resolve obstacles from the authored position every time, never accumulate displacement.
      const desired=(vertical?x:y)+offset;
      const cross=vertical?y:x;
      const pathNode=edge.querySelector('path');
      const stroke=pathNode?.getAttribute('stroke')==='none'?0:Number(pathNode?.getAttribute('stroke-width')||2)*scale/2;
      const half=14*scale+stroke,along=length*scale/2+stroke;
      const intervals=[];
      block.querySelectorAll('.mod-center:has(.mod-center-visual)').forEach(center=>{
        const rect=center.getBoundingClientRect();
        const axisMin=vertical?rect.left-base.left:rect.top-base.top;
        const axisMax=vertical?rect.right-base.left:rect.bottom-base.top;
        const crossMin=vertical?rect.top-base.top:rect.left-base.left;
        const crossMax=vertical?rect.bottom-base.top:rect.right-base.left;
        if(cross+along+2>crossMin&&cross-along-2<crossMax)intervals.push([axisMin-half-2,axisMax+half+2]);
      });
      const free=p=>intervals.every(([lo,hi])=>p<=lo||p>=hi);
      const candidates=[desired,...intervals.flat()].filter(free);
      candidates.sort((a,b)=>Math.abs(a-desired)-Math.abs(b-desired));
      const position=candidates[0]??desired;
      set(edge,'style',`left:${vertical?position:x}px;top:${vertical?y:position}px;width:${(vertical?28:length)*scale}px;height:${(vertical?length:28)*scale}px`);
      const svg=edge.querySelector('svg');
      if(!svg)return;
      set(svg,'viewBox',`0 0 ${length} 28`);
      set(svg,'style',vertical?'transform:rotate(90deg);width:'+(length*scale)+'px;height:'+(28*scale)+'px;position:absolute;left:50%;top:50%;margin-left:'+(-length*scale/2)+'px;margin-top:'+(-14*scale)+'px':'width:100%;height:100%');
      const path=svg.querySelector('path');
      const dir=edge.dataset.direction;
      const left=dir==='backward'||dir==='both',right=dir==='forward'||dir==='both';
      const l=left?9:2,r=right?length-9:length-2;
      const points=`M ${l} 9 L ${r} 9 ${right?`L ${r} 3 L ${length-2} 14 L ${r} 25 L ${r} 19`:`L ${r} 19`} L ${l} 19 ${left?`L ${l} 25 L 2 14 L ${l} 3 L ${l} 9`:''} Z`;
      const radius=Number(edge.dataset.radius)||0;
      let outline=points;
      if(radius>0){
        const values=points.match(/-?[\d.]+/g).map(Number),vertices=[];
        for(let i=0;i<values.length;i+=2)vertices.push([values[i],values[i+1]]);
        if(vertices.length>1&&vertices[0][0]===vertices.at(-1)[0]&&vertices[0][1]===vertices.at(-1)[1])vertices.pop();
        outline=vertices.map((p,i)=>{
          const prev=vertices[(i+vertices.length-1)%vertices.length],next=vertices[(i+1)%vertices.length];
          const a=Math.hypot(prev[0]-p[0],prev[1]-p[1]),b=Math.hypot(next[0]-p[0],next[1]-p[1]);
          const d=Math.min(radius,a/2,b/2);
          const start=[p[0]+(prev[0]-p[0])*d/a,p[1]+(prev[1]-p[1])*d/a];
          const end=[p[0]+(next[0]-p[0])*d/b,p[1]+(next[1]-p[1])*d/b];
          return `${i?'L':'M'} ${start.join(' ')} Q ${p.join(' ')} ${end.join(' ')}`;
        }).join(' ')+' Z';
      }
      if(path){set(path,'d',outline);set(path,'stroke-linejoin',radius?'round':'miter');}
    });
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  const hoverTimers=new Map();
  const overflowHover=event=>{const info=event.target.closest?.('.mod-overflow-info');if(!info||!block.contains(info))return;clearTimeout(hoverTimers.get(info));if(block.classList.contains('mod-published'))info.open=true;schedule();};
  const overflowLeave=event=>{const info=event.target.closest?.('.mod-overflow-info');if(!info||info.contains(event.relatedTarget))return;clearTimeout(hoverTimers.get(info));hoverTimers.set(info,setTimeout(()=>{if(info.dataset.pinned!=='true'&&!info.matches(':hover,:focus-within'))info.open=false;},650));};
  const overflowClick=event=>{const summary=event.target.closest?.('.mod-overflow-info>summary');if(!summary)return;event.preventDefault();if(!block.classList.contains('mod-published'))return;const info=summary.parentElement;info.dataset.pinned=String(info.dataset.pinned!=='true');info.open=info.dataset.pinned==='true';schedule();};
  const closeOutside=event=>block.querySelectorAll('.mod-info[open],.mod-text-box-info[open],.mod-overflow-info[open]').forEach(info=>{if(info.dataset.editing!=='true'&&!info.contains(event.target)){info.open=false;delete info.dataset.pinned;}});
  const resize=new ResizeObserver(schedule); resize.observe(block);
  block.querySelectorAll('.mod-text,.mod-extra-text,.mod-text-box-frame,.mod-grid').forEach(el=>resize.observe(el));
  const observer=new MutationObserver(schedule);
  observer.observe(block,{childList:true,subtree:true,characterData:true});
  block.addEventListener('input',schedule);
  block.addEventListener('pointerover',schedule);
  block.addEventListener('pointerout',schedule);
  block.addEventListener('focusin',schedule);
  block.addEventListener('toggle',schedule,true);
  block.addEventListener('pointerover',overflowHover);
  block.addEventListener('pointerout',overflowLeave);
  block.addEventListener('click',overflowClick);
  window.addEventListener('scroll',schedule,true);
  document.addEventListener('click',closeOutside);
  document.fonts?.ready.then(schedule);
  schedule();
  return {update:schedule,destroy:()=>{clearTimeout(liftTimer);hoverTimers.forEach(clearTimeout);resize.disconnect();observer.disconnect();cancelAnimationFrame(frame);block.removeEventListener('input',schedule);block.removeEventListener('pointerover',schedule);block.removeEventListener('pointerout',schedule);block.removeEventListener('focusin',schedule);block.removeEventListener('toggle',schedule,true);block.removeEventListener('pointerover',overflowHover);block.removeEventListener('pointerout',overflowLeave);block.removeEventListener('click',overflowClick);window.removeEventListener('scroll',schedule,true);document.removeEventListener('click',closeOutside);}};
}
