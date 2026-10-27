import test from 'node:test';
import assert from 'node:assert/strict';
import { createFodaModel } from './foda-model';

test('FODA conserva la matriz, diseño y cuatro campos del alumno', () => {
  const model = createFodaModel();
  assert.deepEqual(model.rows, [273, 286]);
  assert.deepEqual(model.columns, [1, 1]);
  assert.equal(model.gap, 1);
  assert.equal(model.margin, 0);
  assert.deepEqual(Object.keys(model.cells), ['0:0', '0:1', '1:0', '1:1']);
  ['Fortalezas', 'Debilidades', 'Oportunidades', 'Amenazas'].forEach((name, index) => {
    const cell = Object.values(model.cells)[index];
    assert.equal(cell.color, '#646464'); assert.equal(cell.radius, 12);
    assert.equal(cell.student, true); assert.equal(cell.html, '');
    assert.equal(cell.studentPromptEnabled, true); assert.equal(cell.studentPromptPosition, 'top');
    assert.ok(cell.studentPromptHtml?.endsWith(name));
  });
  assert.match(model.cells['1:1'].studentPromptHtml!, />bolt</);
});

test('las inserciones no comparten referencias y admiten guardar/restaurar', () => {
  const first = createFodaModel(); const second = createFodaModel();
  assert.deepEqual(JSON.parse(JSON.stringify(first)), second);
  first.rows[0] = 400; first.cells['0:0'].studentPromptHtml = 'Otra consigna';
  first.connections.push({ from: '0:0', to: '0:1', direction: 'forward', fill: '#5d428c', stroke: 'none', dotted: false });
  assert.equal(second.rows[0], 273); assert.equal(second.connections.length, 0);
  assert.match(second.cells['0:0'].studentPromptHtml!, /Fortalezas$/);
});
