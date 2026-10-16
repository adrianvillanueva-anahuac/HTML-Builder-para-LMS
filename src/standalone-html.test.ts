import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isStandaloneHTML,encodeStandaloneHTML,decodeStandaloneHTML} from './standalone-html';
test('full document payload preserves markup, scripts, whitespace and Unicode exactly',()=>{
  const html='\n<!DOCTYPE html>\r\n<html lang="es"><head><style>:root{--ice:#7ce4ec}</style></head><body>Admisión ❄️<script>const a="</textarea>";</script></body></html>\n';
  assert.ok(isStandaloneHTML(html));
  assert.equal(decodeStandaloneHTML(encodeStandaloneHTML(html)),html);
});
test('fragments retain the existing insertion workflow',()=>{
  assert.equal(isStandaloneHTML('<div>Contenido</div><script>const x=1;</script>'),false);
});
test('large full documents round trip without stack overflow',()=>{
  const html='<!doctype html><html><body>'+('á❄️'.repeat(200000))+'</body></html>';
  assert.equal(decodeStandaloneHTML(encodeStandaloneHTML(html)),html);
});
