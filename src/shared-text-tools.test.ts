import {test}from'node:test';import assert from'node:assert/strict';
import {normalizeFlowRichDocument,flowRichHTML,flowRichNeedsHTML,richURL}from'./flow-rich-document';
import {createFlowModel,addFlowNode,normalizeFlowModel}from'./flow-model';
import {renderFlowSVG}from'./flow-svg';
test('structured Builder formatting survives model normalization and SVG publication',()=>{
 const m=createFlowModel(),n=addFlowNode(m,'process');n.richText={tag:'div',children:[{tag:'ol',classes:['list-custom','list-letters','list-color-purple'],children:[{tag:'li',children:[{tag:'#text',text:'Primero'}]}]},{tag:'span',classes:['material-symbols-outlined'],children:[{tag:'#text',text:'home'}]},{tag:'img',src:'https://example.com/image.png',classes:['editorial-image','w-1/4'],style:{transform:'rotate(90deg)','object-fit':'cover'}}]};
 const saved=normalizeFlowModel(JSON.parse(JSON.stringify(m)));assert.deepEqual(saved.nodes[0].richText,n.richText);const svg=renderFlowSVG(saved);assert.match(svg,/<foreignObject/);assert.match(svg,/list-letters/);assert.match(svg,/rotate\(90deg\)/);assert.match(svg,/example.com\/image.png/);assert.equal(flowRichNeedsHTML(n.richText),true);
});
test('structured content never accepts scripts, event handlers, unsafe URLs or active CSS',()=>{
 const doc=normalizeFlowRichDocument({tag:'div',style:{position:'fixed',color:'url(https://evil.test)',width:'expression(alert(1))'},children:[{tag:'script',text:'alert(1)'},{tag:'img',src:'javascript:alert(1)'},{tag:'span',classes:['bad-class'],style:{'font-size':'30px'},children:[{tag:'#text',text:'<script> & safe'}]}]})!;
 const html=flowRichHTML(doc);assert.ok(!html.includes('<script')&&!html.includes('javascript:')&&!html.includes('url(')&&!html.includes('expression')&&!html.includes('bad-class'));assert.match(html,/&lt;script&gt; &amp; safe/);assert.match(html,/30px/);
});
test('Builder hyperlinks preserve supported phone and fragment destinations',()=>{assert.equal(richURL('tel:+525500000000'),'tel:+525500000000');assert.equal(richURL('#seccion'),'#seccion');assert.equal(richURL('data:image/png;base64,test',true),'');});
