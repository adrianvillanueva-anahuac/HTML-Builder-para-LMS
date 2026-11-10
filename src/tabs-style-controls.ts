import {applyTabsStyle,tabsStylePresets} from './tabs-runtime.js';
import './tabs-style-controls.css';

export function tabsStyleButtonHTML(){
  return '<button type="button" data-tabs-style-tool class="text-gray-400 p-1 rounded flex items-center justify-center" title="Estilos de pestañas" aria-label="Estilos de pestañas" aria-haspopup="true" aria-controls="tabs-style-popover"><span class="material-symbols-outlined text-[18px]">palette</span></button>';
}
let installed=false;
export function setupTabsStyleControls(){
  document.querySelectorAll<HTMLElement>('[data-type="pestanas"][data-tabs-style]').forEach(block=>{if(block.dataset.tabsLayout!=='joined')applyTabsStyle(block);});
  // Saved pages can predate both the palette control and the old two-color toggle.
  document.querySelectorAll<HTMLElement>('[data-type="pestanas"]').forEach(block=>{
    const tools=block.querySelector<HTMLElement>(':scope > .block-toolbar > div');
    if(!tools)return;
    const legacy=tools.querySelector('[onclick="toggleTabsStyle(this)"]');
    if(!tools.querySelector('[data-tabs-style-tool]')){
      const anchor=tools.querySelector('[data-duplicate-element]')||tools.querySelector('.drag-handle');
      if(anchor)anchor.insertAdjacentHTML('afterend',tabsStyleButtonHTML());
      else tools.insertAdjacentHTML('afterbegin',tabsStyleButtonHTML());
    }
    legacy?.remove();
  });
  if(installed)return;installed=true;
  const popup=document.createElement('div');popup.id='tabs-style-popover';popup.hidden=true;popup.setAttribute('role','group');popup.setAttribute('aria-label','Estilos de pestañas');document.body.append(popup);
  let anchor:HTMLElement|null=null,block:HTMLElement|null=null,timer:ReturnType<typeof setTimeout>|undefined;
  const stay=()=>clearTimeout(timer);
  const hide=()=>{stay();popup.hidden=true;anchor=null;block=null;};
  const later=()=>{stay();timer=setTimeout(()=>{if(!popup.contains(document.activeElement))hide();},180);};
  const locate=()=>{
    if(!anchor?.isConnected||!block?.isConnected){hide();return;}
    const a=anchor.getBoundingClientRect(),p=popup.getBoundingClientRect();
    popup.style.left=Math.max(8,Math.min(innerWidth-p.width-8,a.left+a.width/2-p.width/2))+'px';
    popup.style.top=Math.max(8,Math.min(innerHeight-p.height-8,a.top>p.height+12?a.top-p.height-8:a.bottom+8))+'px';
  };
  const show=(button:HTMLElement)=>{
    stay();if(anchor===button&&!popup.hidden)return;
    block=button.closest('[data-type="pestanas"]');if(!block)return;anchor=button;
    popup.innerHTML=`<h3>Estilos de pestañas</h3><div class="tabs-style-grid">${tabsStylePresets().map(s=>`<button type="button" data-tabs-style-choice="${s.id}" aria-pressed="${(block!.dataset.tabsStyle||'line-orange')===s.id}"><svg viewBox="0 0 120 66" aria-hidden="true"><rect x="2" y="24" width="116" height="40" rx="4" fill="white" stroke="${s.solid?s.color:'#e5e7eb'}"/><rect x="3" y="2" width="54" height="21" rx="4" fill="${s.solid?s.color:'white'}"/><path d="M10 12H48" stroke="${s.solid?'white':s.color}" stroke-width="3"/><path d="M68 12H106" stroke="${s.muted}" stroke-width="3"/>${s.solid?'':`<path d="M3 23H57" stroke="${s.color}" stroke-width="2"/>`}<path d="M12 37H102M12 45H93M12 53H75" stroke="#d1d5db" stroke-width="2"/></svg><span>${s.name}</span></button>`).join('')}</div>`;
    popup.hidden=false;locate();
  };
  document.addEventListener('pointerover',e=>{const button=(e.target as Element).closest<HTMLElement>('[data-tabs-style-tool]');if(button)show(button);});
  document.addEventListener('pointerout',e=>{if((e.target as Element).closest('[data-tabs-style-tool]'))later();});
  document.addEventListener('focusin',e=>{const button=(e.target as Element).closest<HTMLElement>('[data-tabs-style-tool]');if(button)show(button);else if(!popup.contains(e.target as Node))later();});
  popup.addEventListener('pointerenter',stay);popup.addEventListener('pointerleave',later);popup.addEventListener('focusin',stay);popup.addEventListener('focusout',later);
  document.addEventListener('click',e=>{const button=(e.target as Element).closest<HTMLElement>('[data-tabs-style-tool]');if(button){show(button);return;}if(!popup.contains(e.target as Node))hide();});
  popup.addEventListener('click',e=>{
    const choice=(e.target as Element).closest<HTMLElement>('[data-tabs-style-choice]');if(!choice||!block?.isConnected){hide();return;}
    window.saveHistoryState?.(true);
    block.dataset.tabsStyle=choice.dataset.tabsStyleChoice!;applyTabsStyle(block);window.saveHistoryState?.(true);
    popup.querySelectorAll('[aria-pressed]').forEach(button=>button.setAttribute('aria-pressed',String(button===choice)));
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!popup.hidden){const button=anchor;hide();button?.focus();hide();}});
  window.addEventListener('resize',hide);window.addEventListener('scroll',hide,true);
  // The popup lives outside the authored canvas; release references on deletion/undo.
  const observer=new MutationObserver(()=>{if(block&&!block.isConnected)hide();});
  observer.observe(document.getElementById('canvas')||document.body,{childList:true,subtree:true});
}
