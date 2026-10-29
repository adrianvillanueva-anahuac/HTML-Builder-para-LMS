/** The Builder owns one React toolbar. Modal editors borrow it, never copy it. */
export const builderTextHostEvent='builder-text-tools-host';
export function borrowBuilderTextTools(host:HTMLElement){
 document.dispatchEvent(new CustomEvent(builderTextHostEvent,{detail:host}));
 const borrowed=['inline-icon-toolbar','text-link-tools'].flatMap(id=>{const node=document.getElementById(id);if(!node)return[];const parent=node.parentNode!,next=node.nextSibling;host.append(node);return[{node,parent,next}];});
 return()=>{for(const {node,parent,next}of borrowed){if(node.id==='text-link-tools')node.hidden=true;else{node.style.opacity='0';node.style.pointerEvents='none';}if(next?.parentNode===parent)parent.insertBefore(node,next);else parent.appendChild(node);}document.dispatchEvent(new CustomEvent(builderTextHostEvent,{detail:null}));};
}
export function builderTextToolTarget(target:EventTarget|null){return target instanceof Element&&!!target.closest('#rtf-toolbar,#image-toolbar,#inline-icon-toolbar,#text-link-tools,#icon-modal,.text-link-dialog');}
