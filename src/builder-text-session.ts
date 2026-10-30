import {builderTextToolTarget} from './builder-text-tools';
import './builder-text-session.css';

const textBox=(text:HTMLElement)=>text.closest('.mod-text-box-frame,.mod-overflow-text-frame,.fde-rich-box')||text;
export function builderTextSessionTarget(target:EventTarget|null,text=window.currentEditableText){return !!text&&target instanceof Node&&(textBox(text).contains(target)||builderTextToolTarget(target));}
export function finishBuilderTextSession(){
 const text=window.currentEditableText;if(!text)return;
 text.contentEditable='false';window.currentEditableText=null;window.lastKnownRange=null;
 document.getSelection()?.removeAllRanges();
 for(const id of ['rtf-toolbar','image-toolbar','icon-modal'])document.getElementById(id)?.classList.add('hidden');
 const inline=document.getElementById('inline-icon-toolbar');if(inline){inline.style.opacity='0';inline.style.pointerEvents='none';}
 const links=document.getElementById('text-link-tools');if(links)links.hidden=true;
 window.selectedEditorialImage=null;window.currentInlineIcon=null;window.currentIconTarget=null;
 document.body.classList.remove('builder-text-editing');
 document.dispatchEvent(new CustomEvent('builder-text-editing-ended',{detail:text}));
}
export function applyBuilderVerticalAlignment(value:'start'|'center'|'end'){
 const text=window.currentEditableText;if(!text?.isContentEditable)return;
 window.saveHistoryState?.(true);text.style.setProperty('align-content',value);text.dispatchEvent(new Event('input',{bubbles:true}));window.saveHistoryState?.(true);
 document.querySelector<HTMLDetailsElement>('#rtf-toolbar .rtf-vertical-menu')?.removeAttribute('open');
}
let installed=false;
export function setupBuilderTextSessions(){
 if(installed)return;installed=true;
 document.body.classList.add('builder-selection-guard');
 if(!window.currentEditableText?.isContentEditable)document.getSelection()?.removeAllRanges();
 document.addEventListener('selectstart',event=>{const target=event.target instanceof Element?event.target:event.target instanceof Node?event.target.parentElement:null;if(!target?.closest('[contenteditable=true],input,textarea'))event.preventDefault();},true);
 const sync=()=>{const editing=!!window.currentEditableText?.isConnected&&window.currentEditableText.isContentEditable,wasEditing=document.body.classList.contains('builder-text-editing');if(wasEditing!==editing){document.body.classList.toggle('builder-text-editing',editing);if(!editing)document.getSelection()?.removeAllRanges();}};
 const observer=new MutationObserver(sync);observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','contenteditable'],childList:true});
 window.addEventListener('pointerdown',event=>{const text=window.currentEditableText;if(text?.isContentEditable&&!builderTextSessionTarget(event.target,text))finishBuilderTextSession();},true);
 window.addEventListener('pointerover',event=>{const text=window.currentEditableText;if(text?.isContentEditable&&!builderTextSessionTarget(event.target,text))event.stopImmediatePropagation();},true);
 window.addEventListener('dblclick',()=>requestAnimationFrame(sync),true);
 sync();
}
