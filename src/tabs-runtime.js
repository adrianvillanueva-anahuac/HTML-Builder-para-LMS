// Shared by the editor and published HTML. Animation effects are never written
// into the authored DOM, so saving/exporting mid-transition keeps natural size.
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
