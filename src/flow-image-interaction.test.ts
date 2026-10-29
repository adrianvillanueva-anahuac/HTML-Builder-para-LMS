import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlowModel,addFlowNode,addFlowEdge,normalizeFlowModel,duplicateFlowNode} from './flow-model';
import {normalizeFlowImage,flowImagePlacement,flowReframeImage,flowImageMasks} from './flow-image';
import {flowImageTextArea,flowImageTextBox,moveFlowImageText,normalizeFlowTextRuns,flowTextLink} from './flow-image-text';
import {renderFlowSVG} from './flow-svg';
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
test('dots and dashes scale with actual stroke width and retain width-two compatibility',()=>{
 for(const width of [1,2,8,24])for(const dash of ['dashed','dotted']as const){const m=createFlowModel(),a=addFlowNode(m,'process'),b=addFlowNode(m,'process',500,200);addFlowEdge(m,a.id,b.id,{width,dash});const scale=width/2;assert.ok(renderFlowSVG(m).includes(`stroke-dasharray="${dash==='dotted'?scale:9*scale} ${6*scale}"`));}
});
test('image editing has a 15-percent exterior ghost, distinct photo scale and eight crop handles',()=>{
 const m=createFlowModel(),node=addFlowNode(m,'image');node.image=normalizeFlowImage({src:png,zoom:2,mask:'circle'});const svg=renderFlowSVG(m,{interactive:true,selectedNodeId:node.id,imageEditingId:node.id});
 assert.match(svg,/data-flow-image-ghost="true" opacity="0.15"/);assert.equal((svg.match(/data-flow-image-crop=/g)||[]).length,8);assert.equal((svg.match(/data-flow-image-scale=/g)||[]).length,4);assert.ok(svg.includes('maskUnits="userSpaceOnUse"'));
 const staticSVG=renderFlowSVG(m,{selectedNodeId:node.id,imageEditingId:node.id});assert.ok(!/data-flow-image-ghost|data-flow-image-crop|data-flow-image-scale|<mask/.test(staticSVG));
 const ids=[...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);for(const match of svg.matchAll(/url\(#([^)]*)\)/g))assert.ok(ids.includes(match[1]));
});
test('crop frame resize preserves world photo size, centre and alpha for every mask',()=>{
 for(const mask of flowImageMasks){const image=normalizeFlowImage({src:png,naturalWidth:400,naturalHeight:260,mask,zoom:1.5,offsetX:.1,offsetY:-.1,alpha:true}),start={x:100,y:80,width:300,height:220},next={x:140,y:95,width:230,height:180},before=flowImagePlacement(image,start.width,start.height),updated=flowReframeImage(image,start,next),after=flowImagePlacement(updated,next.width,next.height);
 assert.ok(Math.abs(before.width-after.width)<1e-6);assert.ok(Math.abs(before.height-after.height)<1e-6);assert.ok(Math.abs(start.x+before.x-next.x-after.x)<1e-6);assert.ok(Math.abs(start.y+before.y-next.y-after.y)<1e-6);assert.equal(updated.alpha,true);}
});
test('captions reuse dynamic-image layout and remain inscribed when moved or resized',()=>{
 const m=createFlowModel(),node=addFlowNode(m,'image');Object.assign(node,{width:300,height:220});
 for(const mask of flowImageMasks){node.image=normalizeFlowImage({src:png,mask});const area=flowImageTextArea(node);for(const handle of ['move','nw','n','ne','e','se','s','sw','w']){node.image.textLayout=moveFlowImageText(node,node.image.textLayout,handle,999,-999);const b=flowImageTextBox(node);assert.ok(b.x>=area.x-1e-6);assert.ok(b.y>=area.y-1e-6);assert.ok(b.x+b.width<=area.x+area.width+1e-6);assert.ok(b.y+b.height<=area.y+area.height+1e-6);}}
});
test('rich text accepts only safe run attributes, institutional fonts and inert text',()=>{
 const runs=normalizeFlowTextRuns([{text:'<script>x</script>',font:'evil',color:'url(javascript:x)',href:'javascript:alert(1)',bold:true},{text:' Hola',font:'Zilla Slab',color:'#ff5900',href:'https://example.com/review',italic:true,underline:true}]);
 assert.equal(runs[0].font,'Roboto');assert.equal(runs[0].color,'');assert.equal(runs[0].href,'');assert.equal(runs[1].font,'Zilla Slab');assert.equal(runs[1].href,'https://example.com/review');assert.equal(flowTextLink('https://user:pass@example.com'),'');assert.equal(flowTextLink('data:text/html,x'),'');
 const m=createFlowModel(),node=addFlowNode(m,'image');Object.assign(node,{width:700,height:300,text:runs.map(r=>r.text).join(''),image:normalizeFlowImage({src:png,textRuns:runs})});const svg=renderFlowSVG(m);assert.ok(!svg.includes('<script>'));assert.ok(svg.includes('&lt;script&gt;'));assert.ok(svg.includes('font-weight="700"'));assert.ok(svg.includes('font-style="italic"'));assert.ok(svg.includes('text-decoration="underline"'));assert.ok(!svg.includes('javascript:'));assert.ok(!svg.includes('foreignObject'));
});
test('caption transforms, styles and alpha survive roundtrip and duplicate independently',()=>{
 const m=createFlowModel(),node=addFlowNode(m,'image');node.text='Hola';node.image=normalizeFlowImage({src:png,alpha:true,textAlign:'right',textRuns:[{text:'Hola',bold:true}],textLayout:{x:20,y:30,width:60,height:40}});assert.deepEqual(normalizeFlowModel(JSON.parse(JSON.stringify(m))),m);const copy=duplicateFlowNode(m,node.id)!;copy.image!.textLayout.x=90;copy.image!.textRuns[0].bold=false;assert.equal(node.image.textLayout.x,20);assert.equal(node.image.textRuns[0].bold,true);
});
test('captions publish as clipped SVG and all editing tools remain editor-only',()=>{
 const m=createFlowModel(),node=addFlowNode(m,'image');node.text='Texto';node.image=normalizeFlowImage({src:png,mask:'circle'});const interactive=renderFlowSVG(m,{interactive:true,selectedNodeId:node.id});assert.equal((interactive.match(/data-flow-text-resize=/g)||[]).length,8);assert.ok(interactive.includes('data-flow-image-text'));
 const svg=renderFlowSVG(m,{selectedNodeId:node.id,textEditingId:node.id});assert.ok(svg.includes('Texto'));assert.ok(!/data-flow-text-resize|data-flow-image-text|contenteditable|foreignObject/.test(svg));
});
test('legacy caption text does not depend on a rich-text payload and empty image clips resolve',()=>{
 const m=createFlowModel(),node=addFlowNode(m,'image');node.text='Texto anterior';const svg=renderFlowSVG(m);assert.ok(svg.includes('anterior'));const ids=[...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);for(const match of svg.matchAll(/url\(#([^)]*)\)/g))assert.ok(ids.includes(match[1]));
});
