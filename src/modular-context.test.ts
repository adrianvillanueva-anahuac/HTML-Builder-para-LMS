import test from 'node:test';
import assert from 'node:assert/strict';
import {createBadge,normalizeBadge} from './modular-badges-model';
import {normalizeFlowRichDocument,flowRichHTML,flowRichNeedsHTML} from './flow-rich-document';
import {modularTextStyle} from './modular-text-model';
test('triangle badges retain authored icon markup and perimeter geometry',()=>{
 const badge={...createBadge('triangle'),position:{edge:'right' as const,offset:.35},html:'<span class="material-symbols-outlined">star</span>'};
 assert.deepEqual(normalizeBadge(JSON.parse(JSON.stringify(badge))),badge);
});
test('vertical text alignment survives rich document and modular style normalization',()=>{
 for(const value of ['start','center','end']){
  const doc=normalizeFlowRichDocument({tag:'div',style:{'align-content':value},children:[{tag:'#text',text:'Texto'}]})!;
  assert.equal(doc.style?.['align-content'],value);assert.equal(flowRichNeedsHTML(doc),true);assert.match(flowRichHTML(doc),new RegExp('align-content:'+value));
  assert.equal(modularTextStyle({'align-content':value})?.['align-content'],value);
 }
 assert.equal(normalizeFlowRichDocument({tag:'div',style:{'align-content':'url(javascript:alert(1))'}})?.style,undefined);
});
