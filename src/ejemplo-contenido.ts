import source from './ejemplo-contenido.html?raw';
import fieldSource from './ejemplo-contenido-fields.json?raw';
import {cloneElement} from './element-actions';

/** Preserve the authored page and give each insertion independent identifiers. */
export function getEjemploContenidoHTML(): string {
  const template = document.createElement('template');
  template.innerHTML = source.trim();
  const page = template.content.firstElementChild as HTMLElement;
  const fields: {value: string; checked: boolean}[] = JSON.parse(fieldSource);
  page.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input,textarea,select').forEach((field, index) => {
    if (!fields[index] || (field instanceof HTMLInputElement && field.type === 'file')) return;
    field.value = fields[index].value;
    if (field instanceof HTMLInputElement) field.checked = fields[index].checked;
  });
  const clone = cloneElement(page);
  clone.dataset.type = 'ejemplo_contenido';
  return clone.outerHTML;
}
