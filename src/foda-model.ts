import type { ModularModel } from './modular-model';

// Fresh state for every insertion: edits to one exercise never alter the preset.
export function createFodaModel(): ModularModel {
  const headings = [
    ['0:0', 'new_releases', 'Fortalezas'],
    ['0:1', 'report_problem', 'Debilidades'],
    ['1:0', 'insights', 'Oportunidades'],
    ['1:1', 'bolt', 'Amenazas'],
  ];
  return {
    version: 1, rows: [273, 286], columns: [1, 1], gap: 1, margin: 0,
    overflow: false, defaultColor: '#646464', defaultRadius: 12, connections: [],
    cells: Object.fromEntries(headings.map(([key, icon, label]) => [key, {
      html: '', color: '#646464', radius: 12, padding: 12, verticalAlign: 'center',
      student: true, studentPromptEnabled: true, studentPromptPosition: 'top',
      studentPromptHtml: `<span class="material-symbols-outlined editable-icon inline-block align-middle cursor-pointer hover:bg-gray-100 rounded text-anahuac-orange text-[32px] p-1" contenteditable="false" title="Haz doble clic para cambiar icono">${icon}</span>&nbsp; ${label}`,
    }])),
  };
}
