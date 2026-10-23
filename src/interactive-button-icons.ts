import {materialIconSVG} from './material-icon-vectors';

// Keep the full catalog visible even when the LMS removes external icon fonts.
export function inlineInteractiveButtonIcon(icon:HTMLElement|null){
  if(!icon)return;
  const name=(icon.textContent||'').trim(),svg=materialIconSVG(name);if(!svg)return;
  icon.classList.remove('material-symbols-outlined');icon.dataset.ibIcon=name;
  Object.assign(icon.style,{display:icon.hidden?'none':'inline-flex',width:'23px',height:'23px',flexShrink:'0'});
  icon.innerHTML=svg;
}
