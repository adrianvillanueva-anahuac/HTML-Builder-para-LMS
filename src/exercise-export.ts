import appStyles from './index.css?inline';
import { externalizeImages } from './published-resources';
import runtime from './exercise-student.js?raw';
import modularStyles from './modular.css?raw';
import {inlineModularLayout} from './modular-export';
import { optimizeStudentDocumentStyles } from './exercise-css-purge';

export async function buildStudentDocument(html: string): Promise<string> {
  const doc=new DOMParser().parseFromString(html,'text/html');
  if(doc.querySelector('.modular-table')){
    if(!doc.head.querySelector('style[data-modular-styles]')){
      const styles=doc.createElement('style');styles.dataset.modularStyles='';styles.textContent=modularStyles;doc.head.append(styles);
    }
    inlineModularLayout(doc);
  }
  doc.querySelector('#lms-state')?.remove();
  doc.querySelectorAll('script[src],script').forEach(script=> { if(script.textContent?.includes('tailwind.config') || script.hasAttribute('src')) script.remove(); });
  externalizeImages(doc);
  // Student fields only: remove designer handlers, editable regions and resize constraints.
  doc.querySelectorAll<HTMLElement>('*').forEach(el=> {
    for(const attr of Array.from(el.attributes)) if(attr.name.startsWith('on') && !(attr.name==='onclick' && attr.value.startsWith('toggleLmsTab('))) el.removeAttribute(attr.name);
    el.removeAttribute('contenteditable');
  });
  doc.querySelectorAll('.student-split-handle').forEach(el=>el.remove());
  doc.querySelectorAll<HTMLTextAreaElement>('.student-answer').forEach((el,index)=> {
    delete el.dataset.editingPlaceholder; el.value=''; el.textContent='';
    el.dataset.answerId=String(index); el.style.resize='none'; el.style.height='auto'; el.style.overflow='hidden';
  });
  // Keep the submission block at the end, outside nested layouts.
  const submit=doc.querySelector('.exercise-finish')?.closest('.exercise-block');
  if(submit) doc.querySelector('.anahuac-builder-export')!.append(submit);
  doc.title='Ejercicio descargable';
  const css=doc.createElement('style'); css.textContent=appStyles+`\nhtml,body{height:auto!important;overflow:auto!important}body{padding:90px 24px 32px;color:#222;background:#f3f4f6}.student-answer{box-sizing:border-box;white-space:pre-wrap;overflow-wrap:anywhere;max-width:100%}.exercise-savebar{position:fixed;top:0;right:0;left:0;display:flex;gap:12px;justify-content:flex-end;align-items:center;padding:12px;background:white;box-shadow:0 2px 8px #0002;z-index:9999}.exercise-savebar button,.student-dialog button{padding:10px 16px;border:1px solid #5d428c;border-radius:8px;background:#5d428c;color:white;cursor:pointer}button:disabled{opacity:.5;cursor:not-allowed}.student-dialog{max-width:520px;width:90%;padding:28px;border:0;border-radius:16px}.student-dialog::backdrop{background:#0008}.student-dialog h2{font-size:24px;margin-bottom:16px}.student-dialog p{margin:16px 0}.student-dialog footer{display:flex;gap:12px;justify-content:flex-end}.student-dialog a{color:#5d428c;text-decoration:underline}.exercise-status{font-size:13px}@media print{.exercise-savebar,.student-dialog,.exercise-finish{display:none!important}body{padding:0;background:white}}`;
  doc.head.append(css);
  if (doc.querySelector('.student-rich-answer')) {
    const richCss=doc.createElement('style');richCss.textContent='.student-rich-tools{position:fixed;z-index:10000;display:flex;flex-wrap:wrap;gap:4px;align-items:center;padding:6px;background:white;color:#5d428c;border:1px solid #ddd;border-radius:8px;box-shadow:0 3px 12px #0003;max-width:calc(100vw - 16px)}.student-rich-tools[hidden]{display:none}.student-rich-tools button{width:30px;height:30px;cursor:pointer;border-radius:4px}.student-rich-tools button:hover{background:#f3eef9}.student-rich-tools .material-symbols-outlined{font-size:20px}.student-rich-tools label{font-size:12px;display:flex;align-items:center;gap:4px}.student-rich-tools input{width:28px}.student-rich-answer{white-space:pre-wrap;overflow-wrap:anywhere}@media print{.student-rich-tools{display:none!important}}';doc.head.append(richCss);
  }
  const bar=doc.createElement('div');bar.className='exercise-savebar';bar.innerHTML='<span class="exercise-status" role="status">Ejercicio sin guardar</span><button id="student-save">Guardar progreso</button>';doc.body.prepend(bar);
  const state=doc.createElement('script');state.type='application/json';state.id='exercise-student-state';state.textContent=JSON.stringify({version:1,finalized:false});doc.body.append(state);
  for(const source of [runtime]) {const script=doc.createElement('script');script.textContent=source.replace(/<\/script/gi,'<\\/script');doc.body.append(script);}
  optimizeStudentDocumentStyles(doc);
  return '<!doctype html>\n'+doc.documentElement.outerHTML;
}
