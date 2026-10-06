import { getBlockToolbar, getPaginaBasicaHTML } from './templates';
import { exerciseDownloadURL } from './exercise-download';
import { projectDialog } from './project-dialog';
import { normalizeStudentControls, setupStudentControls, restoreStudentAppearance } from './student-controls';

export const exerciseMode = new URLSearchParams(location.search).get('editor') === 'exercise' && window.parent !== window;
export const escapeHTML = (text: string) => text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
// Decode only for migration of previously saved exercises.
export const decode = (text: string) => decodeURIComponent(escape(atob(text)));
const buttonStyle = 'display:inline-flex;align-items:center;gap:8px;padding:12px 24px;background:#5d428c;color:#ffffff;border:2px solid #5d428c;border-radius:12px;font-family:Roboto,sans-serif;font-size:16px;cursor:pointer;';

const exerciseName = (block: HTMLElement) => block.dataset.exerciseName?.trim() || 'Nombre del ejercicio';
export const exerciseFilename = (name: string) => {
  const safe = name.normalize('NFKC').replace(/[<>:"/\\|?*\x00-\x1f]/g, '').replace(/\s+/g, ' ').replace(/\.html?$/i, '').replace(/(?:\s+para editar)+$/i, '').trim().replace(/[. ]+$/g, '').slice(0, 120);
  return `${safe || 'Ejercicio'} para editar.html`;
};
const alignmentControls = () => ['left','center','right'].map((align, i) => `<button type="button" onclick="window.alignExercise(this,'${align}')" title="${['Alinear a la izquierda','Centrar','Alinear a la derecha'][i]}"><span class="material-symbols-outlined">format_align_${align}</span></button>`).join('');

// Upgrade existing blocks too, including imported documents and undo snapshots.
function normalizeDownload(block: HTMLElement) {
  const link = block.querySelector<HTMLAnchorElement>('.exercise-download');
  if (!link) return;
  let row = block.querySelector<HTMLElement>('.exercise-download-row');
  if (!row) {
    row = document.createElement('div'); row.className = 'exercise-download-row';
    row.style.cssText = 'display:flex;align-items:center;gap:16px;flex-wrap:wrap;';
    link.before(row); row.append(link);
    const details = document.createElement('div'); details.className = 'exercise-download-details';
    details.style.cssText = 'min-width:0;max-width:100%;overflow-wrap:anywhere;';
    const name = document.createElement('span'); name.className = 'exercise-name';
    name.textContent = exerciseName(block); name.tabIndex = 0;
    name.title = 'Doble clic para editar el nombre del ejercicio';
    details.append(name);
    const note = block.querySelector('.exercise-design-note'); if (note) details.append(note);
    row.append(details);
  }
  const justify = ({left:'flex-start',center:'center',right:'flex-end'})[block.dataset.exerciseAlign || 'left'] || 'flex-start';
  if (row.style.justifyContent !== justify) row.style.justifyContent = justify;
  const tools = block.querySelector('.exercise-tools');
  const toolbar = block.querySelector(':scope > .block-toolbar:not(.exercise-tools) > div');
  if (tools && toolbar && tools.parentElement !== toolbar) {
    tools.classList.remove('block-toolbar');
    toolbar.insertBefore(tools, toolbar.lastElementChild);
  }
  if (tools && !tools.querySelector('[data-exercise-alignment]')) {
    const group = document.createElement('span'); group.dataset.exerciseAlignment = '';
    group.style.cssText = 'display:flex;gap:6px'; group.innerHTML = alignmentControls(); tools.append(group);
  }
  const filename = exerciseFilename(exerciseName(block));
  if (link.download !== filename) link.download = filename;
}

function setExerciseName(block: HTMLElement, value: string) {
  block.dataset.exerciseName = value.replace(/\s+/g, ' ').trim().slice(0, 120) || 'Nombre del ejercicio';
  const label = block.querySelector('.exercise-name');
  if (label && label.textContent?.replace(/\s+/g, ' ').trim() !== exerciseName(block)) label.textContent = exerciseName(block);
  normalizeDownload(block);
}

export function getExerciseBlock(type: string): string {
  if (type === 'pagina_ejercicio') return exerciseMode ? getPaginaBasicaHTML(true) : '';
  if (!['ejercicio_descargable', 'texto_alumno', 'enviar_ejercicio'].includes(type)) return '';
  if ((type === 'ejercicio_descargable') === exerciseMode) return '';
  const controls = `<div class="exercise-tools block-toolbar"><button type="button" onclick="window.configureExercise(this)" title="Texto, colores, fuente y bordes"><span class="material-symbols-outlined">tune</span> Configurar</button>${type === 'ejercicio_descargable' ? '<button type="button" onclick="window.editExercise(this)"><span class="material-symbols-outlined">edit_document</span> Edita ejercicio</button>' : ''}</div>`;
  let content = '';
  if (type === 'ejercicio_descargable') content = `<a class="exercise-download" style="${buttonStyle}" download="ejercicio.html"><span class="material-symbols-outlined">download</span><span class="exercise-button-text">Descargar ejercicio</span></a><p class="exercise-design-note">Edita el ejercicio y guarda para habilitar su descarga.</p>`;
  if (type === 'texto_alumno') content = '<label class="student-label">Respuesta del alumno</label><textarea class="student-answer" placeholder="Escribe tu respuesta aquí" aria-label="Respuesta del alumno" style="width:100%;min-height:120px;resize:both;border:2px dashed #5d428c;padding:12px;max-width:100%;display:block;background:white;color:#222"></textarea>';
  if (type === 'enviar_ejercicio') content = `<p class="exercise-instructions">Al terminar, descarga el HTML final de tu ejercicio y adjúntalo al correo dirigido a tu profesor. Revisa tus respuestas antes de finalizar.</p><label style="display:block;margin:12px 0">Nombre y apellidos <input class="student-name" placeholder="Nombre y apellidos" style="display:block;width:100%;padding:12px;border:1px solid #ccc" /></label><button type="button" class="exercise-finish" style="${buttonStyle}"><span class="exercise-button-text">Finalizar y descargar HTML</span></button>`;
  return `<section class="lms-element is-rendered relative mb-8 exercise-block" data-type="${type}">${getBlockToolbar(type)}${controls}${content}</section>`;
}

export function prepareExerciseLinks(clone: HTMLElement) {
  clone.querySelectorAll<HTMLTextAreaElement>('.student-answer').forEach(restoreStudentAppearance);
  clone.querySelectorAll<HTMLElement>('[data-type="ejercicio_descargable"]').forEach(block => {
    normalizeDownload(block);
    const a = block.querySelector<HTMLAnchorElement>('.exercise-download');
    if (a && block.dataset.exerciseFile) {
      if (block.dataset.exerciseEncoding !== 'text') throw new Error('Abre y guarda de nuevo el ejercicio para actualizarlo a entrega HTML sin base64.');
      a.download = exerciseFilename(exerciseName(block));
      const studentDocument = new DOMParser().parseFromString(block.dataset.exerciseFile, 'text/html');
      if (!studentDocument.querySelector('#exercise-student-state')) throw new Error('El archivo del botón no es un ejercicio válido. Abre «Edita ejercicio» y vuelve a guardarlo.');
      studentDocument.title = exerciseName(block);
      a.href = exerciseDownloadURL('<!doctype html>\n' + studentDocument.documentElement.outerHTML);
    }
    delete block.dataset.exerciseFile;
    delete block.dataset.exerciseSource;
    delete block.dataset.exerciseEncoding;
    const name = block.querySelector('.exercise-name');
    name?.removeAttribute('tabindex'); name?.removeAttribute('title'); name?.removeAttribute('contenteditable');
  });
  clone.querySelectorAll('.exercise-design-note,.exercise-tools').forEach(el => el.remove());
}

export function setupExercises() {
  document.body.classList.toggle('exercise-editor', exerciseMode);
  window.getExerciseBlock = getExerciseBlock;
  const canvas = document.getElementById('canvas-container-outer');
  const upgradeDownloads = () => {
    canvas?.querySelectorAll<HTMLElement>('[data-type="ejercicio_descargable"]').forEach(normalizeDownload);
    canvas?.querySelectorAll<HTMLElement>('[data-type="texto_alumno"]').forEach(normalizeStudentControls);
  };
  if (canvas) setupStudentControls(canvas);
  upgradeDownloads();
  if (canvas) new MutationObserver(upgradeDownloads).observe(canvas, {childList:true,subtree:true});
  window.alignExercise = (button: HTMLElement, align: string) => {
    const block = button.closest<HTMLElement>('.exercise-block')!;
    window.saveHistoryState(true); block.dataset.exerciseAlign = align; normalizeDownload(block); window.saveHistoryState(true);
  };
  document.addEventListener('dblclick', event => {
    const name = (event.target as HTMLElement).closest<HTMLElement>('.exercise-name');
    if (!name || name.isContentEditable) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const block = name.closest<HTMLElement>('.exercise-block')!;
    const previous = name.innerHTML;
    const previousStyle = name.getAttribute('style');
    const toolbar = document.getElementById('rtf-toolbar');
    window.saveHistoryState(true);
    name.classList.add('editable-text');
    name.contentEditable = 'true'; name.focus();
    window.currentEditableText = name;
    if (toolbar) {
      const rect = name.getBoundingClientRect();
      toolbar.style.top = `${rect.top - 15}px`;
      toolbar.style.left = `${rect.left + rect.width / 2}px`;
      toolbar.classList.remove('hidden');
    }
    const range = document.createRange(); range.selectNodeContents(name);
    const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
    const finish = () => {
      name.removeEventListener('keydown', keydown);
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('focusin', outside, true);
      name.removeAttribute('contenteditable');
      toolbar?.classList.add('hidden');
      setExerciseName(block, name.textContent || ''); window.saveHistoryState(true);
    };
    const outside = (ev: Event) => {
      const target = ev.target as Node;
      if (!name.contains(target) && !toolbar?.contains(target)) finish();
    };
    const keydown = (key: KeyboardEvent) => {
      if (key.key === 'Enter') { key.preventDefault(); finish(); name.blur(); }
      if (key.key === 'Escape') {
        key.preventDefault(); name.innerHTML = previous;
        if (previousStyle === null) name.removeAttribute('style'); else name.setAttribute('style', previousStyle);
        finish(); name.blur();
      }
    };
    name.addEventListener('keydown', keydown);
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('focusin', outside, true);
  }, true);
  window.configureExercise = (button: HTMLElement) => {
    const block = button.closest<HTMLElement>('.exercise-block')!;
    if (block.dataset.type === 'ejercicio_descargable') normalizeDownload(block);
    const answer = block.querySelector<HTMLTextAreaElement>('.student-answer');
    const target = block.querySelector<HTMLElement>('.exercise-download,.exercise-finish');
    const dialog = document.createElement('dialog');
    dialog.className = 'exercise-settings';
    const palette = ['#5d428c','#ff5900','#646464','#ffffff','#333333'];
    const colorField = (name: string, label: string, value: string) => `<label>${label}<select name="${name}">${palette.map(c=>`<option value="${c}" ${c===value?'selected':''}>${({'#5d428c':'Morado','#ff5900':'Naranja','#646464':'Gris','#ffffff':'Blanco','#333333':'Gris oscuro'})[c]}</option>`).join('')}</select></label>`;
    const styleColor = (prop: string, fallback: string) => { const rgb = target?.style[prop]; if (!rgb) return fallback; const values = rgb.match(/\d+/g); return values ? '#' + values.slice(0,3).map(n=>Number(n).toString(16).padStart(2,'0')).join('') : rgb; };
    dialog.innerHTML = `<form method="dialog"><h2>${answer ? 'Texto alumno' : 'Configurar botón'}</h2>${answer ? `<label>Etiqueta<input name="label" required value="${escapeHTML(block.querySelector('.student-label')?.textContent || '')}"></label><label>Ancho (%)<input name="width" type="number" min="20" max="100" value="${answer.style.width.endsWith('%') ? parseFloat(answer.style.width) : 100}" required></label><label>Altura mínima (px)<input name="height" type="number" min="60" max="1200" value="${parseFloat(answer.style.minHeight) || 120}" required></label>` : `<label>Texto<input name="label" required value="${escapeHTML(target?.querySelector('.exercise-button-text')?.textContent || '')}"></label>${colorField('fill','Relleno',styleColor('backgroundColor','#5d428c'))}${colorField('ink','Texto',styleColor('color','#ffffff'))}${colorField('border','Borde',styleColor('borderColor','#5d428c'))}<label>Fuente<select name="font">${['Roboto','Zilla Slab','Lato'].map(f=>`<option ${target?.style.fontFamily.includes(f)?'selected':''}>${f}</option>`).join('')}</select></label><label>Estilo de borde<select name="borderStyle">${['solid','dashed','dotted','none'].map(s=>`<option ${target?.style.borderStyle===s?'selected':''}>${s}</option>`).join('')}</select></label><label>Redondeado (px)<input name="radius" type="number" min="0" max="60" value="${parseFloat(target?.style.borderRadius || '12')}" required></label>${block.dataset.type==='enviar_ejercicio' ? `<label>Correo del profesor<input name="email" type="email" value="${escapeHTML(block.dataset.teacherEmail || '')}"></label><label>Enlace de entrega en Brightspace<input name="brightspace" type="url" placeholder="https://..." value="${escapeHTML(block.dataset.brightspaceUrl || '')}"></label><label>Indicaciones<textarea name="instructions">${escapeHTML(block.querySelector('.exercise-instructions')?.textContent || '')}</textarea></label>` : ''}` }<div class="exercise-dialog-actions"><button value="cancel" formnovalidate>Cancelar</button><button value="save">Guardar</button></div></form>`;
    if (block.dataset.type === 'ejercicio_descargable') {
      const field = document.createElement('label'); field.textContent = 'Nombre del ejercicio';
      const input = document.createElement('input'); input.name = 'exerciseName'; input.required = true; input.maxLength = 120; input.value = exerciseName(block);
      field.append(input); dialog.querySelector('h2')!.after(field);
    }
    if (block.dataset.type === 'enviar_ejercicio') {
      const form = dialog.querySelector('form')!;
      form.addEventListener('submit', (event: SubmitEvent) => {
        if ((event.submitter as HTMLButtonElement)?.value !== 'save') return;
        const data = new FormData(form);
        try { validateDelivery(String(data.get('email') || ''), String(data.get('brightspace') || '')); }
        catch (error) { event.preventDefault(); alert((error as Error).message); }
      });
    }
    dialog.addEventListener('close', () => {
      if (dialog.returnValue === 'save') {
        const data = new FormData(dialog.querySelector('form')!);
        window.saveHistoryState(true);
        if (data.has('exerciseName')) setExerciseName(block, String(data.get('exerciseName')));
        if (answer) {
          block.querySelector('.student-label')!.textContent = String(data.get('label'));
          answer.setAttribute('aria-label', String(data.get('label')));
          answer.style.width = data.get('width') + '%'; answer.style.minHeight = data.get('height') + 'px'; answer.style.height = 'auto';
        } else if (target) {
          target.querySelector('.exercise-button-text')!.textContent = String(data.get('label'));
          Object.assign(target.style, { backgroundColor:data.get('fill'), color:data.get('ink'), borderColor:data.get('border'), borderStyle:data.get('borderStyle'), borderRadius:data.get('radius')+'px', fontFamily:data.get('font') });
          if (data.has('email')) { block.dataset.teacherEmail=String(data.get('email')).trim(); block.dataset.brightspaceUrl=String(data.get('brightspace') || '').trim(); block.querySelector('.exercise-instructions')!.textContent=String(data.get('instructions')); }
        }
        window.saveHistoryState(true);
      }
      dialog.remove();
    });
    document.body.append(dialog); dialog.showModal();
  };
  window.editExercise = (button: HTMLElement) => {
    if (exerciseMode) return;
    const block = button.closest<HTMLElement>('[data-type="ejercicio_descargable"]')!;
    const overlay = document.createElement('div'); overlay.className='exercise-editor-overlay';
    const frame = document.createElement('iframe'); frame.title='Diseñar ejercicio descargable';
    const url=new URL(location.href); url.searchParams.set('editor','exercise'); frame.src=url.href;
    overlay.append(frame); document.body.append(overlay);
    const receive = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
      if (event.data?.type === 'exercise-ready') frame.contentWindow!.postMessage({type:'exercise-load', source:block.dataset.exerciseSource || '', encoding:block.dataset.exerciseEncoding}, location.origin);
      if (event.data?.type === 'exercise-save' && typeof event.data.source==='string' && typeof event.data.file==='string') {
        window.saveHistoryState(true);
        block.dataset.exerciseSource=event.data.source; block.dataset.exerciseFile=event.data.file;
        block.dataset.exerciseEncoding='text';
        block.querySelector('.exercise-design-note')!.textContent='Ejercicio guardado. Listo para descargar.';
        window.saveHistoryState(true);
      }
      if (['exercise-save','exercise-cancel'].includes(event.data?.type)) { window.removeEventListener('message',receive); overlay.remove(); }
    };
    window.addEventListener('message',receive);
  };
  document.addEventListener('click', async event => {
    const link=(event.target as HTMLElement).closest<HTMLAnchorElement>('.exercise-download');
    if (!link || !canvas?.contains(link)) return;
    event.preventDefault();
    const block=link.closest<HTMLElement>('[data-type="ejercicio_descargable"]')!;
    if (!block.dataset.exerciseFile && !block.dataset.exerciseSource) {
      window.editExercise(link);
      return;
    }
    const choice=await projectDialog('¿Qué deseas hacer con el ejercicio?',undefined,[
      {value:'download',label:'Descargar archivo de ejercicio'},
      {value:'edit',label:'Seguir editando'},
      {value:'cancel',label:'Cancelar'}
    ]);
    if (!block.isConnected) return;
    if (choice==='edit') { window.editExercise(link); return; }
    if (choice!=='download') return;
    const data=block.dataset.exerciseFile;
    if (data) {
      if (block.dataset.exerciseEncoding !== 'text') { alert('Abre «Edita ejercicio» y guarda para actualizar el archivo a HTML sin PDF.'); return; }
      const doc = new DOMParser().parseFromString(data, 'text/html'); doc.title = exerciseName(block);
      const url=URL.createObjectURL(new Blob(['<!doctype html>\n'+doc.documentElement.outerHTML],{type:'text/html;charset=utf-8'}));
      const a=document.createElement('a'); a.href=url; a.download=exerciseFilename(exerciseName(block)); a.click(); setTimeout(()=>URL.revokeObjectURL(url),30000);
    }
    else await projectDialog('Primero edita y guarda el ejercicio para poder descargarlo.',undefined,[
      {value:'ok',label:'Aceptar'}
    ]);
  });
  if (exerciseMode) {
    window.addEventListener('message', event => {
      if (event.origin!==location.origin || event.source!==parent || event.data?.type!=='exercise-load') return;
      if (event.data.source) {
        const doc=JSON.parse(event.data.encoding === 'text' ? event.data.source : decode(event.data.source));
        if(doc.version!==1) { alert('Versión de ejercicio incompatible.'); return; }
        const outer=document.getElementById('canvas-container-outer')!;
        outer.innerHTML=doc.html; outer.setAttribute('style',doc.style || ''); outer.setAttribute('data-bg',doc.bg || 'blanco');
        outer.querySelectorAll('.exercise-instructions,.exercise-finish .exercise-button-text').forEach(el => {
          el.textContent = (el.textContent || '').replace(/PDF/g, 'HTML');
        });
        outer.querySelectorAll<HTMLElement>('[data-sortable-active]').forEach(el=>delete el.dataset.sortableActive);
        window.initNestedDropzones();
      }
      window.resetExerciseHistory();
    });
    parent.postMessage({type:'exercise-ready'}, location.origin);
    window.switchTab('pages');
  }
}

function validateDelivery(email: string, url: string) {
  email = email.trim(); url = url.trim();
  if (!email && !url) throw new Error('Configura un correo del profesor o un enlace de entrega en Brightspace.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Introduce un correo válido.');
  if (url) {
    let valid = false;
    try { valid = new URL(url).protocol === 'https:'; } catch {}
    if (!valid) throw new Error('El enlace de Brightspace debe ser una URL HTTPS válida.');
  }
}

export async function saveExercise() {
  const outer=document.getElementById('canvas-container-outer')!;
  const submissions = outer.querySelectorAll<HTMLElement>('[data-type="enviar_ejercicio"]');
  if (submissions.length > 1) throw new Error('Usa como máximo un bloque «Enviar ejercicio».');
  submissions.forEach(submission => validateDelivery(submission.dataset.teacherEmail || '', submission.dataset.brightspaceUrl || ''));
  if (!outer.querySelector('.student-answer')) throw new Error('Añade al menos un campo «Texto alumno».');
  const {buildStudentDocument}=await import('./exercise-export');
  const html=window.generateExportHTML(false);
  if (!html) throw new Error('No se pudo generar el contenido del ejercicio.');
  const file=await buildStudentDocument(html);
  const source=JSON.stringify({version:1, html:outer.innerHTML, style:outer.getAttribute('style'), bg:outer.dataset.bg});
  parent.postMessage({type:'exercise-save',source,file},location.origin);
}
