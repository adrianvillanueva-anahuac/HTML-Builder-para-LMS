import {compactModularState} from './modular-table';
import {getBlockToolbar} from './templates';

// Upgrade both existing projects and newly inserted tab panes without replacing
// the editable node (and therefore without losing its formatting or selection).
export function upgradeTabParagraphs(root:ParentNode=document) {
  root.querySelectorAll<HTMLElement>('#canvas .lms-tab-pane > .editable-text:not(.lms-element)').forEach(text=>{
    const block=document.createElement('div');
    block.className='relative mb-6 lms-element is-rendered';
    block.dataset.type='parrafo_basico';
    block.innerHTML=getBlockToolbar('parrafo_basico');
    text.before(block);block.append(text);
  });
}

export function ensureDuplicateButtons() {
  upgradeTabParagraphs();
  document.querySelectorAll<HTMLElement>('#canvas .block-toolbar').forEach(toolbar=>{
    if(toolbar.querySelector('[data-duplicate-element]'))return;
    const handle=toolbar.querySelector('.drag-handle');
    if(!handle)return;
    const button=document.createElement('button');
    button.type='button';button.title='Duplicar elemento';button.setAttribute('aria-label','Duplicar elemento');
    button.dataset.duplicateElement='true';
    button.className='text-gray-400 hover:text-anahuac-orange p-1 rounded hover:bg-gray-100 flex items-center justify-center';
    button.innerHTML='<span class="material-symbols-outlined text-[18px]" aria-hidden="true">content_copy</span>';
    button.setAttribute('onclick','window.duplicateBlock(this)');
    handle.after(button);
  });
}

export function duplicateElement(button:HTMLElement) {
  const source=button.closest<HTMLElement>('.lms-element');
  if(!source)return;
  window.saveHistoryState(true);
  const clone=source.cloneNode(true) as HTMLElement;
  // Preserve live form values, which cloneNode does not always serialize.
  const originals=source.querySelectorAll<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>('input,textarea,select');
  clone.querySelectorAll<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>('input,textarea,select').forEach((field,i)=>{
    // Browsers prohibit assigning a file picker value; the imported media itself is in the block.
    if(field instanceof HTMLInputElement&&field.type==='file')return;
    field.value=originals[i].value;
    if(field instanceof HTMLTextAreaElement)field.textContent=field.value;
    if(field instanceof HTMLInputElement){field.setAttribute('value',field.value);field.checked=(originals[i] as HTMLInputElement).checked;field.toggleAttribute('checked',field.checked);}
    if(field instanceof HTMLSelectElement)Array.from(field.options).forEach(option=>option.toggleAttribute('selected',option.selected));
  });
  const holder=document.createElement('div');holder.append(clone);
  compactModularState(holder);
  const ids=new Map<string,string>();
  holder.querySelectorAll<HTMLElement>('[id]').forEach(el=>{const old=el.id;el.id=`copy-${crypto.randomUUID()}`;ids.set(old,el.id);});
  holder.querySelectorAll<HTMLElement>('*').forEach(el=>{
    for(const attr of Array.from(el.attributes)){
      if(attr.name==='id')continue;
      let value=attr.value;
      if(['for','aria-controls','aria-labelledby','aria-describedby','headers','data-target'].includes(attr.name))value=value.split(' ').map(id=>ids.get(id)||(id.startsWith('#')&&ids.has(id.slice(1))?'#'+ids.get(id.slice(1)):id)).join(' ');
      if(attr.name==='href'&&value.startsWith('#')&&ids.has(value.slice(1)))value='#'+ids.get(value.slice(1));
      if(attr.name.startsWith('on'))for(const [old,id] of ids){value=value.split(`'${old}'`).join(`'${id}'`).split(`"${old}"`).join(`"${id}"`);}
      if(value!==attr.value)el.setAttribute(attr.name,value);
    }
    el.removeAttribute('data-sortable-active');
    el.classList.remove('sortable-ghost','sortable-chosen','sortable-drag','mod-cell-selected');
    if(el.hasAttribute('contenteditable'))el.setAttribute('contenteditable','false');
  });
  source.after(clone);
  window.initNestedDropzones();ensureDuplicateButtons();window.checkEmptyState();window.saveHistoryState(true);
}

export function applyVerticalSpacing(button:HTMLElement,padding:string) {
  const block=button.closest<HTMLElement>('.lms-element');
  const content=block?.querySelector<HTMLElement>(':scope > div:not(.block-toolbar)');
  if(!block||!content)return;
  const mode=padding==='py-2'?'tight':(['py-12','py-16'].includes(padding)?'wide':'normal');
  const values={tight:{line:'1.25',margin:8,gap:4},normal:{line:'1.625',margin:24,gap:8},wide:{line:'1.9',margin:40,gap:16}}[mode];
  // Inline vertical styles override legacy pt/pb and responsive md:p classes without changing horizontal spacing.
  content.style.paddingTop=content.style.paddingBottom=`${Number(padding.slice(3))*4}px`;
  content.style.minHeight='0';content.style.rowGap=`${values.gap}px`;
  // Dropzones reset child margins with !important; an explicit spacing choice must win.
  block.style.setProperty('margin-top',`${values.margin}px`,'important');
  block.style.setProperty('margin-bottom',`${values.margin}px`,'important');
  content.querySelectorAll<HTMLElement>('.editable-text,.editable-text p,.editable-text li,.editable-text h1,.editable-text h2,.editable-text h3,.editable-text div').forEach(text=>{
    text.style.lineHeight=values.line;text.style.marginTop='0';text.style.marginBottom=`${values.gap}px`;
  });
  block.querySelectorAll<HTMLButtonElement>('.block-toolbar button[onclick*="Padding"]').forEach(choice=>choice.setAttribute('aria-pressed',String(choice===button)));
}
