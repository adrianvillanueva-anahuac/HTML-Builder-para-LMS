// Self-contained: the same layout logic runs in the Builder and published HTML.
export function mountModularRuntime(block) {
  let frame=0;
  const set=(el,name,value)=>{if(el.getAttribute(name)!==value)el.setAttribute(name,value);};
  const update=()=>{
    frame=0;
    const grid=block.querySelector('.mod-grid');
    if(!grid || !grid.getBoundingClientRect().width)return;
    const auto=block.dataset.overflow==='true';
    const rows=JSON.parse(block.dataset.rowHeights||'[]');
    const heights=[...rows];
    block.querySelectorAll('.mod-card').forEach(card=>{
      const text=card.querySelector('.mod-text');if(!text)return;
      if(!auto&&!text.classList.contains('student-rich-answer'))return;
      const oldHeight=text.style.height,oldMin=text.style.minHeight;
      text.style.height='auto';text.style.minHeight='0';
      const padding=getComputedStyle(card);
      const textStyle=getComputedStyle(text);
      const required=Math.ceil(text.scrollHeight+parseFloat(textStyle.borderTopWidth||0)+parseFloat(textStyle.borderBottomWidth||0)+parseFloat(padding.paddingTop)+parseFloat(padding.paddingBottom)+2);
      text.style.height=oldHeight;text.style.minHeight=oldMin;
      const row=Number(card.closest('.mod-cell').dataset.cell.split(':')[0]);
      heights[row]=Math.max(heights[row]||40,required);
    });
    const template=heights.map(n=>n+'px').join(' ');
    if(template && grid.style.gridTemplateRows!==template)grid.style.gridTemplateRows=template;
    const base=grid.getBoundingClientRect();
    const scrollBounds=block.querySelector('.mod-scroll').getBoundingClientRect();
    block.querySelectorAll('.mod-row-tools').forEach(tool=>{
      const row=tool.closest('.mod-cell').getBoundingClientRect();
      set(tool,'style',`left:${scrollBounds.left-44}px;top:${row.top+row.height/2-20}px`);
    });
    block.querySelectorAll('.mod-card').forEach(card=>{
      const text=card.querySelector('.mod-text');
      const info=card.querySelector('.mod-info');
      const preview=card.querySelector('.mod-preview-content');
      if(!text || !info)return;
      const clipped=!auto && card.dataset.student!=='true' && (text.scrollHeight>text.clientHeight+1 || text.scrollWidth>text.clientWidth+1);
      set(card,'data-clipped',String(clipped));
      set(info,'data-needed',String(clipped));
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
      set(edge,'style',`left:${x}px;top:${y}px;width:${vertical?28:length}px;height:${vertical?length:28}px`);
      const svg=edge.querySelector('svg');
      if(!svg)return;
      set(svg,'viewBox',`0 0 ${length} 28`);
      set(svg,'style',vertical?'transform:rotate(90deg);width:'+length+'px;height:28px;position:absolute;left:50%;top:50%;margin-left:'+(-length/2)+'px;margin-top:-14px':'width:100%;height:100%');
      const path=svg.querySelector('path');
      const dir=edge.dataset.direction;
      const left=dir==='backward'||dir==='both',right=dir==='forward'||dir==='both';
      const l=left?9:2,r=right?length-9:length-2;
      const points=`M ${l} 9 L ${r} 9 ${right?`L ${r} 3 L ${length-2} 14 L ${r} 25 L ${r} 19`:`L ${r} 19`} L ${l} 19 ${left?`L ${l} 25 L 2 14 L ${l} 3 L ${l} 9`:''} Z`;
      if(path)set(path,'d',points);
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
  block.addEventListener('toggle',schedule,true);
  window.addEventListener('scroll',schedule,true);
  document.addEventListener('click',closeOutside);
  document.fonts?.ready.then(schedule);
  schedule();
  return {update:schedule,destroy:()=>{resize.disconnect();observer.disconnect();cancelAnimationFrame(frame);block.removeEventListener('input',schedule);block.removeEventListener('pointerover',schedule);block.removeEventListener('toggle',schedule,true);window.removeEventListener('scroll',schedule,true);document.removeEventListener('click',closeOutside);}};
}
