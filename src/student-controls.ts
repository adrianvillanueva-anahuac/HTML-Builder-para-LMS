export const studentColors = {
  border: [['#5d428c','Morado Anáhuac'],['#ff5900','Naranja Anáhuac'],['#646464','Gris oscuro'],['#ffffff','Blanco']],
  fill: [['#f2edf8','Morado suave'],['#fff1e8','Naranja suave'],['#f1f2f3','Gris suave'],['#ffffff','Blanco']],
};
const lines = [['dotted','Punteada'],['short','Guiones cortos'],['long','Guiones espaciados'],['solid','Continua']];
export const studentRadii = [[0,'Sin redondear'],[6,'Suave'],[12,'Medio'],[20,'Amplio']] as const;

export const STUDENT_MIN_ROWS = 1;
export const STUDENT_MAX_ROWS = 6;
export const STUDENT_DEFAULT_ROWS = 4;

export const STUDENT_MIN_SPLIT = 15;
export const STUDENT_MAX_SPLIT = 75;
export const STUDENT_DEFAULT_SPLIT = 30;

export type StudentLabelPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'left'
  | 'right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'none';

export const studentLabelPositions: readonly [StudentLabelPosition, string, string][] = [
  ['top-left', 'Arriba izquierda', 'north_west'],
  ['top-center', 'Arriba centro', 'north'],
  ['top-right', 'Arriba derecha', 'north_east'],
  ['left', 'Izquierda del campo', 'west'],
  ['right', 'Derecha del campo', 'east'],
  ['bottom-left', 'Abajo izquierda', 'south_west'],
  ['bottom-center', 'Abajo centro', 'south'],
  ['bottom-right', 'Abajo derecha', 'south_east'],
  ['none', 'Ocultar texto externo', 'visibility_off'],
] as const;

const escapeAttr = (value: string) =>
  value.replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch]!));

export function clampStudentRows(rows: number): number {
  const num = Math.round(Number(rows));
  if (!Number.isFinite(num)) return STUDENT_DEFAULT_ROWS;
  return Math.max(STUDENT_MIN_ROWS, Math.min(STUDENT_MAX_ROWS, num));
}

export function clampStudentLabelSplit(split: number): number {
  const num = Math.round(Number(split));
  if (!Number.isFinite(num)) return STUDENT_DEFAULT_SPLIT;
  return Math.max(STUDENT_MIN_SPLIT, Math.min(STUDENT_MAX_SPLIT, num));
}

export function studentRowsToHeight(rows: number): number {
  return clampStudentRows(rows) * 24 + 12;
}

export function studentHeightToRows(field: HTMLTextAreaElement): number {
  const explicit = Number(field.dataset?.rows || field.getAttribute?.('rows'));
  if (Number.isFinite(explicit) && explicit >= STUDENT_MIN_ROWS && explicit <= STUDENT_MAX_ROWS) {
    return clampStudentRows(explicit);
  }
  const px = parseFloat(field.style?.height) || parseFloat(field.style?.minHeight) || studentRowsToHeight(STUDENT_DEFAULT_ROWS);
  return clampStudentRows((px - 12) / 24);
}

export function formatStudentRows(rows: number): string {
  const clamped = clampStudentRows(rows);
  return clamped === 1 ? '1 renglón' : `${clamped} renglones`;
}

export function setStudentRows(field: HTMLTextAreaElement, rows: number) {
  const clamped = clampStudentRows(rows);
  const height = studentRowsToHeight(clamped);
  if (field.dataset) field.dataset.rows = String(clamped);
  field.setAttribute?.('rows', String(clamped));
  field.style.lineHeight = '24px';
  field.style.minHeight = height + 'px';
  field.style.height = height + 'px';
  field.style.boxSizing = 'border-box';
}

export function setStudentPlaceholder(field: HTMLTextAreaElement, text: string) {
  field.placeholder = text;
  field.setAttribute?.('placeholder', text);
}

function ensureStudentSplitHandle(block: HTMLElement): HTMLElement | null {
  let handle = block.querySelector<HTMLElement>('.student-split-handle');
  if (!handle && block.ownerDocument?.createElement) {
    handle = block.ownerDocument.createElement('div');
    handle.className = 'student-split-handle';
    handle.tabIndex = 0;
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-orientation', 'vertical');
    handle.setAttribute('aria-valuemin', String(STUDENT_MIN_SPLIT));
    handle.setAttribute('aria-valuemax', String(STUDENT_MAX_SPLIT));
    handle.setAttribute('aria-label', 'Ajustar espacio entre texto y campo');
    handle.title = 'Arrastra para ajustar el espacio entre el texto y el campo';
    block.appendChild(handle);
  }
  return handle;
}

export function setStudentLabelSplit(block: HTMLElement, split: number) {
  const clamped = clampStudentLabelSplit(split);
  if (block.dataset) block.dataset.labelSplit = String(clamped);
  const pos = (block.dataset?.labelPosition as StudentLabelPosition) || 'top-left';
  if (pos === 'left' || pos === 'right') {
    setStudentLabelPosition(block, pos);
  }
}

export function setStudentLabelPosition(block: HTMLElement, position: StudentLabelPosition) {
  const valid = studentLabelPositions.some(([pos]) => pos === position) ? position : 'top-left';
  if (block.dataset) block.dataset.labelPosition = valid;
  const label = block.querySelector<HTMLElement>('.student-label');
  const field = block.querySelector<HTMLTextAreaElement>('.student-answer');
  if (!label || !field) return;
  const handle = ensureStudentSplitHandle(block);

  block.style.display = 'flex';
  if (valid === 'none') {
    block.style.flexDirection = 'column';
    block.style.alignItems = 'stretch';
    block.style.gap = '6px';
    label.style.display = 'none';
    label.style.flex = '';
    label.style.width = '';
    label.style.maxWidth = '';
    if (handle) {
      handle.hidden = true;
      handle.style.display = 'none';
    }
    field.style.order = '1';
    field.style.width = '100%';
    field.style.flex = '';
    return;
  }

  label.style.display = 'block';
  if (valid === 'left' || valid === 'right') {
    const split = clampStudentLabelSplit(Number(block.dataset?.labelSplit ?? STUDENT_DEFAULT_SPLIT));
    if (block.dataset) block.dataset.labelSplit = String(split);
    block.style.flexDirection = 'row';
    block.style.alignItems = 'stretch';
    block.style.gap = '8px';
    label.style.order = valid === 'right' ? '2' : '0';
    label.style.textAlign = valid === 'right' ? 'right' : 'left';
    label.style.paddingTop = '6px';
    label.style.flex = `0 0 calc(${split}% - 8px)`;
    label.style.width = `calc(${split}% - 8px)`;
    label.style.maxWidth = `calc(${split}% - 8px)`;
    label.style.minWidth = '0';
    label.style.overflowWrap = 'anywhere';
    if (handle) {
      handle.hidden = false;
      handle.style.display = 'flex';
      handle.style.order = '1';
      handle.setAttribute?.('aria-valuenow', String(split));
    }
    field.style.order = valid === 'right' ? '0' : '2';
    field.style.flex = '1 1 0%';
    field.style.width = 'auto';
    field.style.minWidth = '0';
  } else {
    const isBottom = valid.startsWith('bottom-');
    const align = valid.endsWith('-center') ? 'center' : valid.endsWith('-right') ? 'right' : 'left';
    block.style.flexDirection = 'column';
    block.style.alignItems = 'stretch';
    block.style.gap = '6px';
    label.style.order = isBottom ? '2' : '0';
    label.style.textAlign = align;
    label.style.paddingTop = '';
    label.style.flex = '';
    label.style.width = '';
    label.style.maxWidth = '';
    if (handle) {
      handle.hidden = true;
      handle.style.display = 'none';
    }
    field.style.order = '1';
    field.style.flex = '';
    field.style.width = '100%';
  }
}

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
  const rows = studentHeightToRows(field);
  setStudentRows(field, rows);
  const label = block.querySelector<HTMLElement>('.student-label');
  label?.classList.add('editable-text');
  const labelPos = (block.dataset.labelPosition as StudentLabelPosition) || 'top-left';
  setStudentLabelPosition(block, labelPos);
  block.querySelector('.exercise-tools')?.remove();
  if (
    toolbar.querySelector('[data-student-control="radius"]') &&
    toolbar.querySelector('[data-student-control="border"][value="#5d428c"]') &&
    toolbar.querySelector('[data-student-control="label-position"]') &&
    toolbar.querySelector('input[data-student-control="placeholder"]') &&
    toolbar.querySelector('input[data-student-control="height"][max="6"]')
  ) {
    return;
  }
  toolbar.querySelector('.student-controls')?.remove();
  const controls = document.createElement('div'); controls.className = 'student-controls';
  const currentPlaceholder = field.getAttribute('placeholder') ?? 'Escribe tu respuesta aquí';
  const currentLabel = label?.textContent || 'Respuesta del alumno';
  const menu = (icon:string,title:string,content:string) => `<details class="student-control-menu"><summary title="${title}" aria-label="${title}"><span class="material-symbols-outlined" aria-hidden="true">${icon}</span></summary><div class="student-control-panel"><strong>${title}</strong>${content}</div></details>`;
  controls.innerHTML =
    menu(
      'height',
      'Altura del campo (renglones)',
      `<label class="student-height-slider"><input aria-label="Altura del campo" data-student-control="height" type="range" min="${STUDENT_MIN_ROWS}" max="${STUDENT_MAX_ROWS}" step="1" value="${rows}"><output>${formatStudentRows(rows)}</output></label>`,
    ) +
    menu(
      'place_item',
      'Texto externo y posición',
      `<input aria-label="Texto fuera del campo" data-student-control="label" maxlength="140" placeholder="Respuesta del alumno" value="${escapeAttr(currentLabel)}">` +
        studentLabelPositions
          .map(
            ([v, t, ic]) =>
              `<button type="button" data-student-control="label-position" value="${v}"><span class="material-symbols-outlined" style="font-size:16px" aria-hidden="true">${ic}</span>${t}</button>`,
          )
          .join(''),
    ) +
    menu(
      'edit_note',
      'Texto sugerido dentro del campo',
      `<input aria-label="Texto sugerido dentro del campo" data-student-control="placeholder" maxlength="240" placeholder="Escribe tu respuesta aquí" value="${escapeAttr(currentPlaceholder)}">`,
    ).replace('</summary>', '<span class="button-text-icon-label" aria-hidden="true">txt</span></summary>') +
    menu('line_style','Tipo de línea',lines.map(([v,t])=>`<button type="button" data-student-control="line" value="${v}"><span class="student-line-sample" data-line="${v}"></span>${t}</button>`).join('')) +
    menu('rounded_corner','Redondeado del borde',studentRadii.map(([v,t])=>`<button type="button" data-student-control="radius" value="${v}"><span style="width:24px;height:20px;border:2px solid #64748b;border-radius:${v}px" aria-hidden="true"></span>${t} · ${v} px</button>`).join('')) +
    (['border','fill'] as const).map(prop=>menu(prop==='border'?'border_color':'format_color_fill',prop==='border'?'Color de línea':'Color de relleno',studentColors[prop].map(([v,t])=>`<button type="button" data-student-control="${prop}" value="${v}"><span class="student-color-swatch" style="background-color:${v}"></span>${t}</button>`).join(''))).join('');
  toolbar.insertBefore(controls,toolbar.lastElementChild);
}
export function setupStudentControls(canvas: HTMLElement) {
  const syncMenuInputs = (menu: HTMLElement) => {
    const block = menu.closest<HTMLElement>('.exercise-block');
    if (!block) return;
    const downloadInput = menu.querySelector<HTMLInputElement>('input[data-download-control="label"]');
    if (downloadInput && document.activeElement !== downloadInput) {
      downloadInput.value = block.querySelector('.exercise-button-text')?.textContent || '';
    }
    const placeholderInput = menu.querySelector<HTMLInputElement>('input[data-student-control="placeholder"]');
    if (placeholderInput && document.activeElement !== placeholderInput) {
      const field = block.querySelector<HTMLTextAreaElement>('.student-answer');
      placeholderInput.value = field?.getAttribute('placeholder') ?? '';
    }
    const labelInput = menu.querySelector<HTMLInputElement>('input[data-student-control="label"]');
    if (labelInput && document.activeElement !== labelInput) {
      labelInput.value = block.querySelector('.student-label')?.textContent || '';
    }
  };
  const apply = (control: HTMLInputElement | HTMLButtonElement) => {
    const block = control.closest<HTMLElement>('.exercise-block');
    const field = block?.querySelector<HTMLTextAreaElement>('.student-answer');
    if (!block || !field) return;
    if (control instanceof HTMLInputElement) control.setAttribute('value',control.value);
    const prop = control.dataset.studentControl;
    if (prop === 'height') {
      const rows = clampStudentRows(Number(control.value));
      setStudentRows(field, rows);
      control.parentElement!.querySelector('output')!.textContent = formatStudentRows(rows);
    } else if (prop === 'placeholder') {
      setStudentPlaceholder(field, control.value);
    } else if (prop === 'label') {
      const label = block.querySelector<HTMLElement>('.student-label');
      if (label) label.textContent = control.value;
      field.setAttribute('aria-label', control.value || 'Respuesta del alumno');
      if (control.value.trim() && block.dataset.labelPosition === 'none') {
        setStudentLabelPosition(block, 'top-left');
      }
    } else if (prop === 'label-position') {
      setStudentLabelPosition(block, control.value as StudentLabelPosition);
    } else if (prop === 'line') paint(field,control.value);
    else if (prop === 'radius') setStudentRadius(field,Number(control.value));
    else if (control.value) {
      if (prop === 'fill') field.style.backgroundColor=control.value;
      if (prop === 'border') { field.style.borderColor=control.value;paint(field,field.dataset.lineKind || 'short'); }
    }
    window.saveHistoryState();
  };
  canvas.addEventListener('pointerover', event => {
    if (!(event.target instanceof Element)) return;
    const menu = event.target.closest<HTMLDetailsElement>('.student-control-menu');
    if (!menu) return;
    canvas.querySelectorAll<HTMLDetailsElement>('.student-control-menu[open]').forEach(other => {
      if (other !== menu) other.open = false;
    });
    syncMenuInputs(menu);
    menu.open = true;
  });
  canvas.addEventListener('pointerout', event => {
    if (!(event.target instanceof Element)) return;
    const menu = event.target.closest<HTMLDetailsElement>('.student-control-menu');
    if (!menu || menu.contains(event.relatedTarget as Node | null)) return;
    if (document.activeElement instanceof HTMLInputElement && menu.contains(document.activeElement)) return;
    menu.open = false;
  });
  canvas.addEventListener('focusin', event => {
    if (!(event.target instanceof HTMLTextAreaElement) || !event.target.classList.contains('student-answer')) return;
    const field = event.target;
    if (field.dataset.editingPlaceholder === 'true') return;
    field.dataset.editingPlaceholder = 'true';
    field.value = field.getAttribute('placeholder') ?? '';
  });
  canvas.addEventListener('focusout', event => {
    if (!(event.target instanceof HTMLTextAreaElement) || !event.target.classList.contains('student-answer')) return;
    const field = event.target;
    if (field.dataset.editingPlaceholder !== 'true') return;
    delete field.dataset.editingPlaceholder;
    setStudentPlaceholder(field, field.value);
    field.value = '';
    field.textContent = '';
    window.saveHistoryState(true);
  });
  canvas.addEventListener('input', event => {
    const target = event.target as Element;
    if (target instanceof HTMLTextAreaElement && target.classList.contains('student-answer')) {
      setStudentPlaceholder(target, target.value);
      const block = target.closest<HTMLElement>('.exercise-block');
      const placeholderInput = block?.querySelector<HTMLInputElement>('input[data-student-control="placeholder"]');
      if (placeholderInput && document.activeElement !== placeholderInput) {
        placeholderInput.value = target.value;
        placeholderInput.setAttribute('value', target.value);
      }
      window.saveHistoryState();
      return;
    }
    const control = target.closest<HTMLInputElement>('input[data-student-control]');
    if (control) apply(control);
  });
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const menu = event.target.closest<HTMLElement>('.student-control-menu');
    if (menu) syncMenuInputs(menu);
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
  canvas.addEventListener('pointerdown', event => {
    if (!(event.target instanceof Element)) return;
    const handle = event.target.closest<HTMLElement>('.student-split-handle');
    if (!handle) return;
    const block = handle.closest<HTMLElement>('.exercise-block');
    if (!block) return;
    event.preventDefault();
    event.stopPropagation();
    window.saveHistoryState(true);
    const rect = block.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    handle.dataset.dragging = 'true';
    handle.setPointerCapture?.(event.pointerId);
    const onMove = (ev: PointerEvent) => {
      const ratio = ((ev.clientX - rect.left) / width) * 100;
      const pos = block.dataset.labelPosition;
      const nextSplit = pos === 'right' ? 100 - ratio : ratio;
      setStudentLabelSplit(block, nextSplit);
    };
    const onEnd = () => {
      delete handle.dataset.dragging;
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onEnd);
      handle.removeEventListener('pointercancel', onEnd);
      handle.removeEventListener('lostpointercapture', onEnd);
      window.saveHistoryState(true);
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onEnd);
    handle.addEventListener('pointercancel', onEnd);
    handle.addEventListener('lostpointercapture', onEnd);
  });
  canvas.addEventListener('keydown', event => {
    if (!(event.target instanceof Element)) return;
    const splitHandle = event.target.closest<HTMLElement>('.student-split-handle');
    if (splitHandle && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      const block = splitHandle.closest<HTMLElement>('.exercise-block');
      if (!block) return;
      event.preventDefault();
      event.stopPropagation();
      const dir = (event.key === 'ArrowRight' ? 1 : -1) * (block.dataset.labelPosition === 'right' ? -1 : 1);
      const current = Number(block.dataset.labelSplit ?? STUDENT_DEFAULT_SPLIT);
      window.saveHistoryState(true);
      setStudentLabelSplit(block, current + dir * 5);
      window.saveHistoryState(true);
      return;
    }
    if (event.key !== 'Escape') return;
    if (event.target instanceof HTMLTextAreaElement && event.target.classList.contains('student-answer')) {
      event.target.blur();
      return;
    }
    const menu = event.target.closest('details.student-control-menu') as HTMLDetailsElement | null;
    if (menu) { menu.open = false; menu.querySelector('summary')?.focus(); }
  });
}
