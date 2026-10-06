export const studentColors = {
  border: [['#5d428c','Morado Anáhuac'],['#ff5900','Naranja Anáhuac'],['#646464','Gris oscuro'],['#ffffff','Blanco']],
  fill: [['#f2edf8','Morado suave'],['#fff1e8','Naranja suave'],['#f1f2f3','Gris suave'],['#ffffff','Blanco']],
};
const lines = [['dotted','Punteada'],['short','Guiones cortos'],['long','Guiones espaciados'],['solid','Continua']];
export const studentRadii = [[0,'Sin redondear'],[6,'Suave'],[12,'Medio'],[20,'Amplio']] as const;
export function setStudentRadius(field: HTMLTextAreaElement, radius: number) {
  if (!studentRadii.some(([value]) => value === radius)) return;
  field.style.borderRadius = radius + 'px';
  paint(field, field.dataset.lineKind || (field.style.borderStyle === 'dotted' ? 'dotted' : field.style.borderStyle === 'solid' ? 'solid' : 'short'));
}
function paint(field: HTMLTextAreaElement, kind: string) {
  field.dataset.lineKind = kind;
  field.style.backgroundImage = '';
  field.style.borderStyle = kind === 'dotted' ? 'dotted' : 'solid';
  if (kind !== 'short' && kind !== 'long') return;
  const ink = field.style.borderColor || '#5d428c';
  const dash = kind === 'short' ? 5 : 12, gap = kind === 'short' ? 4 : 8;
  const gradient = (direction:string) => `repeating-linear-gradient(${direction},${ink} 0 ${dash}px,transparent ${dash}px ${dash+gap}px)`;
  field.style.borderStyle = 'none';
  field.style.backgroundImage = [gradient('to right'),gradient('to right'),gradient('to bottom'),gradient('to bottom')].join(',');
  field.style.backgroundSize = '100% 2px,100% 2px,2px 100%,2px 100%';
  field.style.backgroundPosition = 'top,bottom,left,right';
  // Explicit per-layer values survive CSS shorthand serialization and reparsing.
  field.style.backgroundRepeat = 'no-repeat, no-repeat, no-repeat, no-repeat';
  const radius = parseFloat(field.style.borderRadius) || 0;
  if (radius > 0) {
    // Keep the dashed straight sections and connect them around rounded corners.
    const corner = (position:string) => `radial-gradient(circle at ${position},transparent ${radius-2}px,${ink} ${radius-2}px ${radius}px,transparent ${radius}px)`;
    field.style.backgroundImage += ',' + ['bottom right','bottom left','top right','top left'].map(corner).join(',');
    field.style.backgroundSize = `calc(100% - ${radius*2}px) 2px,calc(100% - ${radius*2}px) 2px,2px calc(100% - ${radius*2}px),2px calc(100% - ${radius*2}px),` + Array(4).fill(`${radius}px ${radius}px`).join(',');
    field.style.backgroundPosition = 'top center,bottom center,left center,right center,top left,top right,bottom left,bottom right';
    field.style.backgroundRepeat = Array(8).fill('no-repeat').join(', ');
  }
}
export function restoreStudentAppearance(field: HTMLTextAreaElement) {
  if (field.dataset.lineKind) paint(field, field.dataset.lineKind);
}
export function normalizeStudentControls(block: HTMLElement) {
  const field = block.querySelector<HTMLTextAreaElement>('.student-answer');
  const toolbar = block.querySelector(':scope > .block-toolbar > div');
  if (!field || !toolbar) return;
  restoreStudentAppearance(field);
  field.style.padding = '4px 12px';
  field.style.boxSizing = 'border-box';
  block.querySelector<HTMLElement>('.student-label')?.classList.add('editable-text');
  block.querySelector('.exercise-tools')?.remove();
  if (toolbar.querySelector('[data-student-control="radius"]') && toolbar.querySelector('[data-student-control="border"][value="#5d428c"]')) return;
  toolbar.querySelector('.student-controls')?.remove();
  const controls = document.createElement('div'); controls.className = 'student-controls';
  const height = Math.max(30,parseFloat(field.style.height) || parseFloat(field.style.minHeight) || 120);
  const menu = (icon:string,title:string,content:string) => `<details class="student-control-menu"><summary title="${title}" aria-label="${title}"><span class="material-symbols-outlined" aria-hidden="true">${icon}</span></summary><div class="student-control-panel"><strong>${title}</strong>${content}</div></details>`;
  controls.innerHTML = menu('height','Altura del campo',`<label class="student-height-slider"><input aria-label="Altura del campo" data-student-control="height" type="range" min="30" max="1200" value="${height}"><output>${height} px</output></label>`)
    + menu('line_style','Tipo de línea',lines.map(([v,t])=>`<button type="button" data-student-control="line" value="${v}"><span class="student-line-sample" data-line="${v}"></span>${t}</button>`).join(''))
    + menu('rounded_corner','Redondeado del borde',studentRadii.map(([v,t])=>`<button type="button" data-student-control="radius" value="${v}"><span style="width:24px;height:20px;border:2px solid #64748b;border-radius:${v}px" aria-hidden="true"></span>${t} · ${v} px</button>`).join(''))
    + (['border','fill'] as const).map(prop=>menu(prop==='border'?'border_color':'format_color_fill',prop==='border'?'Color de línea':'Color de relleno',studentColors[prop].map(([v,t])=>`<button type="button" data-student-control="${prop}" value="${v}"><span class="student-color-swatch" style="background-color:${v}"></span>${t}</button>`).join(''))).join('');
  toolbar.insertBefore(controls,toolbar.lastElementChild);
}
export function setupStudentControls(canvas: HTMLElement) {
  const apply = (control: HTMLInputElement | HTMLButtonElement) => {
    const field = control.closest('.exercise-block')?.querySelector<HTMLTextAreaElement>('.student-answer');
    if (!field) return;
    if (control instanceof HTMLInputElement) control.setAttribute('value',control.value);
    const prop = control.dataset.studentControl;
    if (prop === 'height') {
      const height = Math.max(30,Math.min(1200,Number(control.value)));
      field.style.minHeight = height+'px'; field.style.height = height+'px'; field.style.boxSizing='border-box';
      control.parentElement!.querySelector('output')!.textContent=height+' px';
    } else if (prop === 'line') paint(field,control.value);
    else if (prop === 'radius') setStudentRadius(field,Number(control.value));
    else if (control.value) {
      if (prop === 'fill') field.style.backgroundColor=control.value;
      if (prop === 'border') { field.style.borderColor=control.value;paint(field,field.dataset.lineKind || 'short'); }
    }
    window.saveHistoryState();
  };
  canvas.addEventListener('input', event => {
    const control = (event.target as Element).closest<HTMLInputElement>('input[data-student-control]');
    if (control) apply(control);
  });
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const menu = event.target.closest('.student-control-menu');
    canvas.querySelectorAll<HTMLDetailsElement>('.student-control-menu[open]').forEach(other => {
      if (other !== menu) other.open = false;
    });
    if (!canvas.contains(event.target)) return;
    const button = event.target.closest<HTMLButtonElement>('button[data-student-control]');
    if (button) {
      apply(button);
      const details = button.closest('details');
      if (details) { details.open = false; details.querySelector('summary')?.focus(); }
    }
  });
  canvas.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !(event.target instanceof Element)) return;
    const menu = event.target.closest('details.student-control-menu') as HTMLDetailsElement | null;
    if (menu) { menu.open = false; menu.querySelector('summary')?.focus(); }
  });
}
