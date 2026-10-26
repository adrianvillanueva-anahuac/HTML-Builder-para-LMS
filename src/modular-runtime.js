// Self-contained: the same layout logic runs in the Builder and published HTML.
export function mountModularRuntime(block) {
  let frame=0;
  const set=(el,name,value)=>{
    // Reposition published overlays without erasing their inline fallback appearance.
    if(name==='style'&&block.classList.contains('mod-published')&&el.matches('.mod-edge,.mod-center,.mod-preview')){
      const next=document.createElement('div').style;next.cssText=value;
      for(let i=0;i<next.length;i++){const key=next[i];if(el.style.getPropertyValue(key)!==next.getPropertyValue(key))el.style.setProperty(key,next.getPropertyValue(key));}
    }else if(el.getAttribute(name)!==value)el.setAttribute(name,value);
  };
  const update=()=>{
    frame=0;
    const grid=block.querySelector('.mod-grid');
    if(!grid || !grid.getBoundingClientRect().width)return;
    const auto=block.dataset.overflow==='true';
    const rows=JSON.parse(block.dataset.rowHeights||'[]');
    const heights=[...rows];
    block.querySelectorAll('.mod-card').forEach(card=>{
      const text=card.querySelector('.mod-text');if(!text)return;
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
      const alignedTop=firstRow&&primaryBounds&&primaryBounds.top>=4&&primaryBounds.bottom<=window.innerHeight-4
        ?primaryBounds.top:cell.top-height-6;
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
      primaryBar.style.removeProperty('translate');
      primary.style.translate=`0px ${dy}px`;
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
      const clipped=!auto && card.dataset.student!=='true' && (text.scrollHeight>text.clientHeight+1 || text.scrollWidth>text.clientWidth+1);
      set(card,'data-clipped',String(clipped));
      set(info,'data-needed',String(clipped));
      if(block.classList.contains('mod-published')){
        const display=clipped?'block':'none';if(info.style.display!==display)info.style.display=display;
      }
      if(preview && info.dataset.editing!=='true' && preview.innerHTML!==text.innerHTML)preview.innerHTML=text.innerHTML;
      const panel=info.querySelector('.mod-preview');
      if(panel && (info.open || info.matches(':hover,:focus-within'))) {
        const anchor=info.getBoundingClientRect();
        const area=block.closest('#scroll-container')?.getBoundingClientRect();
        const leftLimit=Math.max(8,(area?.left||0)+8),rightLimit=Math.min(window.innerWidth-8,(area?.right||window.innerWidth)-8);
        const width=Math.min(340,rightLimit-leftLimit);
        const below=window.innerHeight-anchor.bottom-16;
        const height=Math.min(340,Math.max(below,anchor.top-16));
        const top=below>=Math.min(200,height)?anchor.bottom:Math.max(8,anchor.top-height);
        set(panel,'style',`position:fixed;left:${Math.max(leftLimit,Math.min(anchor.right-width,rightLimit-width))}px;top:${top}px;right:auto;width:${width}px;max-height:${height}px;z-index:200`);
      }
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
  const closeOutside=event=>block.querySelectorAll('.mod-info[open]').forEach(info=>{if(info.dataset.editing!=='true'&&!info.contains(event.target))info.open=false;});
  const resize=new ResizeObserver(schedule); resize.observe(block);
  block.querySelectorAll('.mod-text,.mod-grid').forEach(el=>resize.observe(el));
  const observer=new MutationObserver(schedule);
  observer.observe(block,{childList:true,subtree:true,characterData:true});
  block.addEventListener('input',schedule);
  block.addEventListener('pointerover',schedule);
  block.addEventListener('pointerout',schedule);
  block.addEventListener('focusin',schedule);
  block.addEventListener('toggle',schedule,true);
  window.addEventListener('scroll',schedule,true);
  document.addEventListener('click',closeOutside);
  document.fonts?.ready.then(schedule);
  schedule();
  return {update:schedule,destroy:()=>{resize.disconnect();observer.disconnect();cancelAnimationFrame(frame);block.removeEventListener('input',schedule);block.removeEventListener('pointerover',schedule);block.removeEventListener('pointerout',schedule);block.removeEventListener('focusin',schedule);block.removeEventListener('toggle',schedule,true);window.removeEventListener('scroll',schedule,true);document.removeEventListener('click',closeOutside);}};
}
