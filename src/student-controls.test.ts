import test from 'node:test';
import assert from 'node:assert/strict';
import {
  restoreStudentAppearance,
  studentColors,
  studentRadii,
  setStudentRadius,
  STUDENT_MIN_ROWS,
  STUDENT_MAX_ROWS,
  studentRowsToHeight,
  studentHeightToRows,
  formatStudentRows,
  setStudentRows,
  setStudentPlaceholder,
  setStudentLabelPosition,
  setStudentLabelSplit,
  studentLabelPositions,
} from './student-controls';

test('four radius levels preserve fill, dimensions and line style when restored', () => {
  assert.equal(studentRadii.length,4);
  for (const kind of ['solid','dotted','short','long']) {
    for (const [radius] of studentRadii) {
      const field = {dataset:{lineKind:kind},style:{borderColor:'#ff5900',backgroundColor:'#fff1e8',height:'120px',borderRadius:''}};
      setStudentRadius(field as unknown as HTMLTextAreaElement,radius);
      assert.equal(field.style.borderRadius,radius+'px');
      assert.equal(field.dataset.lineKind,kind);
      assert.equal(field.style.backgroundColor,'#fff1e8');
      const snapshot = JSON.stringify(field);
      restoreStudentAppearance(field as unknown as HTMLTextAreaElement);
      assert.equal(JSON.stringify(field),snapshot);
    }
  }
});

test('line colors use institutional tones and only fills use pale tones', () => {
  assert.deepEqual(studentColors.border.map(([color])=>color), ['#5d428c','#ff5900','#646464','#ffffff']);
  assert.deepEqual(studentColors.fill.map(([color])=>color), ['#f2edf8','#fff1e8','#f1f2f3','#ffffff']);
  assert.ok(studentColors.border.every(([,label])=>!label.includes('suave')));
});

test('restores all four dashed border layers without changing fill or dimensions', () => {
  for (const kind of ['short','long']) {
    const field = {dataset:{lineKind:kind},style:{borderColor:'rgb(255, 241, 232)',backgroundColor:'#ffffff',height:'33px',backgroundRepeat:'no-repeat, repeat, repeat, repeat'}};
    restoreStudentAppearance(field as unknown as HTMLTextAreaElement);
    assert.equal(field.style.backgroundRepeat,'no-repeat, no-repeat, no-repeat, no-repeat');
    assert.equal(field.style.backgroundColor,'#ffffff');
    assert.equal(field.style.height,'33px');
    const first = JSON.stringify(field);
    restoreStudentAppearance(field as unknown as HTMLTextAreaElement);
    assert.equal(JSON.stringify(field),first);
  }
});

test('student height slider steps from 1 to 6 renglones and round-trips height', () => {
  assert.equal(STUDENT_MIN_ROWS, 1);
  assert.equal(STUDENT_MAX_ROWS, 6);
  assert.equal(formatStudentRows(1), '1 renglón');
  assert.equal(formatStudentRows(6), '6 renglones');

  for (let rows = STUDENT_MIN_ROWS; rows <= STUDENT_MAX_ROWS; rows++) {
    const attrs: Record<string, string> = {};
    const field = {
      dataset: {} as Record<string, string>,
      style: {} as Record<string, string>,
      setAttribute: (k: string, v: string) => { attrs[k] = v; },
      getAttribute: (k: string) => attrs[k] ?? null,
    };
    setStudentRows(field as unknown as HTMLTextAreaElement, rows);
    assert.equal(field.dataset.rows, String(rows));
    assert.equal(attrs.rows, String(rows));
    assert.equal(field.style.minHeight, `${studentRowsToHeight(rows)}px`);
    assert.equal(studentHeightToRows(field as unknown as HTMLTextAreaElement), rows);
  }
});

test('student label position and suggested placeholder text can be configured', () => {
  const attrs: Record<string, string> = {};
  const label = { style: {} as Record<string, string> };
  const field = {
    placeholder: '',
    style: {} as Record<string, string>,
    setAttribute: (k: string, v: string) => { attrs[k] = v; },
  };
  const block = {
    dataset: {} as Record<string, string>,
    style: {} as Record<string, string>,
    querySelector: (sel: string) => (sel === '.student-label' ? label : sel === '.student-answer' ? field : null),
  };

  setStudentPlaceholder(field as unknown as HTMLTextAreaElement, 'Escribe tu reflexión en 3 renglones');
  assert.equal(field.placeholder, 'Escribe tu reflexión en 3 renglones');
  assert.equal(attrs.placeholder, 'Escribe tu reflexión en 3 renglones');

  for (const [pos] of studentLabelPositions) {
    setStudentLabelPosition(block as unknown as HTMLElement, pos);
    assert.equal(block.dataset.labelPosition, pos);
  }
  setStudentLabelPosition(block as unknown as HTMLElement, 'bottom-right');
  assert.equal(block.style.flexDirection, 'column');
  assert.equal(label.style.order, '2');
  assert.equal(label.style.textAlign, 'right');

  setStudentLabelPosition(block as unknown as HTMLElement, 'left');
  assert.equal(block.style.flexDirection, 'row');
  assert.equal(label.style.order, '0');
  assert.equal(field.style.order, '2');

  setStudentLabelSplit(block as unknown as HTMLElement, 45);
  assert.equal(block.dataset.labelSplit, '45');
  assert.equal(label.style.width, 'calc(45% - 8px)');
});
