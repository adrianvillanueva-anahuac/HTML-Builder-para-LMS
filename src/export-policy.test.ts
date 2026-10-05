import assert from 'node:assert/strict';
import test from 'node:test';
import { necessaryFontFaces } from './font-subsets';
import { imageURL } from './published-resources';
import { exerciseDownloadURL } from './exercise-download';

test('published download contains only the exercise and needs no click handler', () => {
  const exercise = '<!doctype html><html><body>Ejercicio: á ñ & # % " <script>test()</script></body></html>';
  const url = exerciseDownloadURL(exercise);
  assert.ok(url.startsWith('data:text/html;charset=utf-8,'));
  assert.ok(!url.includes(';base64,'));
  assert.ok(!url.includes('#'));
  assert.equal(decodeURIComponent(url.slice(url.indexOf(',') + 1)), exercise);
});

test('fonts keep Latin input and authored scripts, not unused scripts', () => {
  const css = '@font-face{font-family:Latin;unicode-range:U+0000-00FF;}@font-face{font-family:Greek;unicode-range:U+0370-03FF;}@font-face{font-family:Other;unicode-range:U+4E00-9FFF;}';
  const spanish = necessaryFontFaces(css, 'Respuesta: áéíóú ñ\n');
  assert.ok(spanish.includes('Latin')); assert.ok(!spanish.includes('Greek')); assert.ok(!spanish.includes('Other'));
  assert.ok(necessaryFontFaces(css, 'α').includes('Greek'));
});

test('images reject base64, temporary and disk URLs', () => {
  for (const url of ['data:image/png;base64,AAAA', 'blob:https://example.com/id', 'file:///E:/foto.png']) assert.throws(() => imageURL(url), /URL HTTPS/);
});

test('catalog images resolve to repository URLs, public images stay external', () => {
  Object.defineProperty(globalThis, 'location', {value:{href:'http://127.0.0.1:3000/'}, configurable:true});
  assert.equal(imageURL('./imagenes/Logotipos/logo6.png'), 'https://raw.githubusercontent.com/adrianvillanueva-anahuac/HTML-Builder-para-LMS/main/public/imagenes/Logotipos/logo6.png');
  assert.equal(imageURL('https://example.com/photo.png'), 'https://example.com/photo.png');
  assert.throws(() => imageURL('http://localhost:3000/private.png'), /pública/);
});
