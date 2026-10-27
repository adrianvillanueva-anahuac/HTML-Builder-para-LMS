import { getPaginaBasicaHTML, getParrafoBasicoHTML, getSeparadorHTML, getTituloBasicoHTML } from './templates';
import { createFodaModel } from './foda-model';

const spaced = (html: string, top = 10, bottom = 10) => html.replace(
  /<(div|section)\b/,
  `<$1 data-space-top="${top}" data-space-bottom="${bottom}" style="margin-top:${top}px!important;margin-bottom:${bottom}px!important"`,
);
const separator = (thickness: number, compact = false) => getSeparadorHTML()
  .replace('data-line-color="#646464"', 'data-line-color="#ff5900"')
  .replace('border-top-color: #646464', 'border-top-color: #ff5900')
  .replace('data-line-thickness="1"', `data-line-thickness="${thickness}"`)
  .replace('border-top-width: 1px', `border-top-width: ${thickness}px`)
  .replace('border-top-width:1px', `border-top-width:${thickness}px`)
  .replace('padding-top: 24px; padding-bottom: 24px;', compact ? 'padding-top:0px;padding-bottom:11px;' : 'padding-top:24px;padding-bottom:24px;');

export function getFodaExerciseHTML(studentBlock: string): string {
  const model = JSON.stringify(createFodaModel()).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const content = [
    spaced(getTituloBasicoHTML().replace('Escribe tu título aquí', 'FODA')),
    spaced(separator(1, true)),
    spaced(getParrafoBasicoHTML(), 10, 13),
    spaced(`<section class="lms-element is-rendered modular-table" data-type="tabla_modular" data-modular="${model}"></section>`, 13, 10),
    spaced(separator(2)),
    spaced(getTituloBasicoHTML().replace('text-4xl font-serif text-anahuac-orange text-center', 'text-2xl font-serif text-anahuac-orange text-left')),
    spaced(getParrafoBasicoHTML()),
    spaced(studentBlock.replace('padding:12px', 'padding:4px 12px')),
  ].join('');
  return spaced(getPaginaBasicaHTML(true, content)).replace('<div data-space-top=', '<div data-type="pagina_foda" data-space-top=');
}
