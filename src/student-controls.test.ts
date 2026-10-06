import test from 'node:test';
import assert from 'node:assert/strict';
import { restoreStudentAppearance, studentColors, studentRadii, setStudentRadius } from './student-controls';

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
