// Shared by the editor and published HTML. Animation effects are never written
// into the authored DOM, so saving/exporting mid-transition keeps natural size.
// Inline presentation survives project persistence and standalone HTML export.
export function tabsStylePresets(){
  return [
    {id:'line-orange',name:'Línea naranja',color:'#ff5900',muted:'#646464',solid:false},
    {id:'line-purple',name:'Línea morada',color:'#5d428c',muted:'#646464',solid:false},
    {id:'purple',name:'Sólido morado',color:'#5d428c',muted:'#81758f',solid:true},
    {id:'orange',name:'Sólido naranja',color:'#ff5900',muted:'#977761',solid:true}
  ];
}
export function applyTabsStyle(container){
  const theme=container?.getAttribute('data-tabs-style');
  if(!theme)return;
  const preset=tabsStylePresets().find(style=>style.id===theme)||tabsStylePresets()[0];
  const {color,muted,solid}=preset;
  const list=container.querySelector('.tab-buttons-container');
  const main=container.querySelector('.tabs-main-container');
  if(!list||!main)return;
  main.style.backgroundColor='#ffffff';
  main.style.padding=solid?'0px':'';
  main.style.gap=solid?'0px':'';
  main.style.borderWidth=solid?'0px':'';
  main.style.boxShadow=solid?'none':'';
  container.setAttribute('data-tabs-layout','joined');
  list.style.backgroundColor='#ffffff';
  list.style.gap=solid?'4px':'';
  list.style.padding=solid?'0px':'';
  list.style.margin=solid?'0px':'';
  list.style.borderWidth=solid?'0px':'';
  list.style.borderColor=solid?'transparent':'';
  const wrapper=container.querySelector('.tabs-panes-wrapper');
  if(wrapper){
    wrapper.style.border=solid?`1px solid ${color}`:'';
    wrapper.style.borderRadius=solid?'0px 6px 6px':'';
    wrapper.style.padding=solid?'16px':'';
  }
  for(const button of list.children){
    if(button.tagName!=='BUTTON')continue;
    const active=button.classList.contains('border-anahuac-orange');
    button.style.backgroundColor=active&&solid?color:'#ffffff';
    button.style.color=active?(solid?'#ffffff':color):muted;
    button.style.borderColor=active?color:'transparent';
    button.style.borderRadius=solid?(container.getAttribute('data-orientation')==='vertical'?'6px 0 0 6px':'6px 6px 0 0'):'';
    button.style.boxShadow=active&&solid?`0 2px 5px ${color}40`:'';
  }
}

export function toggleTabsStyle(btn){
  const container=btn.closest('[data-type="pestanas"]');
  if(!container)return;
  container.setAttribute('data-tabs-style',container.getAttribute('data-tabs-style')==='orange'?'purple':'orange');
  applyTabsStyle(container);
}

/** @param {HTMLElement} btn @param {string} targetId */
export function toggleLmsTab(btn,targetId){
  if(btn.querySelector('.editable-text[contenteditable="true"]'))return;
  const container=btn.closest('[data-type="pestanas"]')||btn.closest('.lms-element');
  const list=container?.querySelector('.tab-buttons-container'),wrapper=container?.querySelector('.tabs-panes-wrapper');
  if(!list||!wrapper||btn.parentElement!==list)return;
  const panes=Array.from(wrapper.children).filter(pane=>pane.classList.contains('lms-tab-pane'));
  const target=panes.find(pane=>pane.id===targetId);
  if(!target||!target.classList.contains('hidden')&&target.style.display!=='none')return;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let state=toggleLmsTab.motion;
  if(!state){
    state={running:new WeakMap(),active:new Set()};toggleLmsTab.motion=state;
    const stopAll=()=>Array.from(state.active).forEach(session=>session.stop());
    window.addEventListener('resize',stopAll);
    reduced?.addEventListener?.('change',stopAll);
  }
  // Read the visible intermediate height before cancelling a rapid switch.
  const height=()=>parseFloat(getComputedStyle(wrapper).height)||wrapper.clientHeight;
  const from=height();state.running.get(wrapper)?.stop();
  for(const button of Array.from(list.children).filter(node=>node.tagName==='BUTTON')){
    const active=button===btn;
    for(const name of ['border-anahuac-orange','text-anahuac-orange'])button.classList.toggle(name,active);
    for(const name of ['border-transparent','text-gray-500','hover:text-anahuac-orange'])button.classList.toggle(name,!active);
  }
  panes.forEach(pane=>{
    const active=pane===target;
    pane.classList.remove('block');pane.classList.toggle('hidden',!active);pane.classList.toggle('flex',active);
    pane.style.display=active?'flex':'none';
  });
  applyTabsStyle(container);
  const to=height();
  if(!wrapper.isConnected||reduced?.matches||typeof wrapper.animate!=='function')return;
  const easing='cubic-bezier(.22,1,.36,1)';
  // In a column, flex-basis:0% would override the animated height. Temporarily
  // use the height as its basis; row layouts retain their responsive width.
  const basis=getComputedStyle(wrapper.parentElement).flexDirection.startsWith('column')?{flex:'0 0 auto'}:{};
  const grow=Math.abs(from-to)>.5?wrapper.animate([{...basis,height:from+'px',overflow:'hidden'},{...basis,height:to+'px',overflow:'hidden'}],{duration:450,easing}):null;
  const fade=target.animate([{opacity:.35},{opacity:1}],{duration:280,easing});
  const session={stop:()=>{
    if(state.running.get(wrapper)!==session)return;
    state.running.delete(wrapper);state.active.delete(session);
    grow?.cancel();fade.cancel();
  }};
  state.running.set(wrapper,session);state.active.add(session);
  const last=grow||fade;last.onfinish=session.stop;last.oncancel=session.stop;
}

/** @param {HTMLElement} btn */
export function toggleTabsOrientation(btn){
  const container=btn.closest('[data-type="pestanas"]')||btn.closest('.lms-element[data-type="pestanas"]');
  if(!container)return;
  const mainContent=container.querySelector('.tabs-main-container');
  const tabList=container.querySelector('.tab-buttons-container');
  if(!mainContent||!tabList)return;
  const isHorizontal=container.getAttribute('data-orientation')==='horizontal';
  if(isHorizontal){
    container.setAttribute('data-orientation','vertical');
    mainContent.classList.remove('flex-col');
    mainContent.classList.add('md:flex-row','gap-4');
    tabList.classList.remove('border-b','mb-3');
    tabList.classList.add('flex-col','border-r','md:w-1/4','mb-0');
    tabList.querySelectorAll('button').forEach(b=>{
      b.classList.remove('border-b-2','px-3','py-1.5');
      b.classList.add('border-r-2','px-4','py-2','text-left');
      if(b.classList.contains('border-anahuac-orange'))b.classList.add('border-anahuac-orange');
      else b.classList.add('border-transparent');
    });
  }else{
    container.setAttribute('data-orientation','horizontal');
    mainContent.classList.add('flex-col');
    mainContent.classList.remove('md:flex-row','gap-4');
    tabList.classList.add('border-b','mb-3');
    tabList.classList.remove('flex-col','border-r','md:w-1/4','mb-0');
    tabList.querySelectorAll('button').forEach(b=>{
      b.classList.add('border-b-2','px-3','py-1.5');
      b.classList.remove('border-r-2','px-4','py-2','text-left');
      if(b.classList.contains('border-anahuac-orange'))b.classList.add('border-anahuac-orange');
      else b.classList.add('border-transparent');
    });
  }
  applyTabsStyle(container);
}
