import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlowModel,addFlowNode,addFlowEdge,normalizeFlowModel,duplicateFlowNode,flowNodeTypes} from './flow-model';
import {normalizeFlowImage,flowImageSource,flowImagePlacement,flowImageMasks} from './flow-image';
import {flowContourAttachment} from './flow-contour';
import {flowGumGeometry,flowAnchor} from './flow-geometry';
import {renderFlowSVG} from './flow-svg';
import {applyFlowSelectionPatch} from './flow-selection';
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
test('image source whitelist excludes active and transient formats',()=>{
  for(const src of ['javascript:alert(1)','data:image/svg+xml;base64,PHN2Zz4=','blob:https://a.test/x','file:///x','/tmp/x.png','https://user:pass@a.test/x.png','data:image/png;base64,AAA\" onload=\"x'])assert.equal(flowImageSource(src),'');
  assert.equal(flowImageSource(png),png);assert.equal(flowImageSource('https://a.test/x.png'),'https://a.test/x.png');
});
test('image state bounds, adjustments and nested copies roundtrip independently',()=>{
  const model=createFlowModel(),node=addFlowNode(model,'image');node.image=normalizeFlowImage({src:png,mask:'decision',zoom:2,offsetX:.2,adjustments:{contrast:150,tint:25}});
  const copy=duplicateFlowNode(model,node.id)!;copy.image!.adjustments.contrast=80;copy.image!.offsetX=-.2;
  assert.equal(node.image.adjustments.contrast,150);assert.equal(node.image.offsetX,.2);
  assert.deepEqual(normalizeFlowModel(JSON.parse(JSON.stringify(model))),model);
  const safe=normalizeFlowImage({zoom:Infinity,offsetX:999,rotation:-1000,mask:'svg',adjustments:{hue:999,tint:999}});
  assert.equal(safe.zoom,1);assert.equal(safe.offsetX,4);assert.equal(safe.rotation,-180);assert.equal(safe.mask,'none');assert.equal(safe.adjustments.hue,180);assert.equal(safe.adjustments.tint,100);
});
test('original fits inside, masks cover, and scale and pan never change frame',()=>{
  const image=normalizeFlowImage({naturalWidth:400,naturalHeight:200});
  assert.deepEqual(flowImagePlacement(image,100,100),{x:0,y:25,width:100,height:50});
  image.mask='circle';assert.deepEqual(flowImagePlacement(image,100,100),{x:-50,y:0,width:200,height:100});
  image.zoom=2;image.offsetX=.1;assert.deepEqual(flowImagePlacement(image,100,100),{x:-140,y:-50,width:400,height:200});
});
test('all image masks render scoped clips, alpha preserving filters, and stroke',()=>{
  const model=createFlowModel();for(const mask of flowImageMasks){const node=addFlowNode(model,'image');node.image=normalizeFlowImage({src:png,mask,adjustments:{tint:20}});node.strokeWidth=4;}
  const svg=renderFlowSVG(model,{scope:'images'});assert.equal((svg.match(/<image /g)||[]).length,7);assert.equal((svg.match(/<clipPath /g)||[]).length,7);
  assert.match(svg,/mode="color"/);assert.match(svg,/in2="SourceAlpha" operator="in"/);assert.ok(!/foreignObject|<script|onload=/.test(svg));
  const ids=[...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
  for(const match of svg.matchAll(/url\(#([^)]*)\)/g))assert.ok(ids.includes(match[1]));
  assert.ok(!svg.includes('data-flow-image-pan'));assert.ok(!svg.includes('data-flow-image-scale'));
  const editor=renderFlowSVG(model,{interactive:true,selectedNodeId:model.nodes[0].id,imageEditingId:model.nodes[0].id});assert.ok(editor.includes('data-flow-image-pan'));assert.ok(editor.includes('data-flow-image-scale'));
});
test('unfiltered semi-transparent rasters do not multiply SourceAlpha',()=>{
  const model=createFlowModel(),node=addFlowNode(model,'image');node.image=normalizeFlowImage({src:png});const svg=renderFlowSVG(model);
  assert.ok(!svg.includes('in2="SourceAlpha"'));assert.equal(node.fill,'transparent');assert.equal(node.strokeWidth,0);
});
test('image masks determine connection ports and contour attachments',()=>{
  const model=createFlowModel(),node=addFlowNode(model,'image',300,100);node.image=normalizeFlowImage({mask:'data'});
  assert.equal(flowAnchor(node,'left').x,node.x+Math.min(24,node.width*.12)/2);
  node.image.mask='decision';const p=flowContourAttachment(node,{x:node.x,y:node.y+node.height/3},{x:-1,y:0});assert.ok(p.x>node.x+node.width*.1);
});
test('gum hugs the diamond slope and curved silhouettes on every side and route',()=>{
  for(const type of flowNodeTypes.filter(t=>!['image','text'].includes(t.type)))for(const side of ['left','right','top','bottom']as const)for(const route of ['orthogonal','straight','curve']as const){
    const model=createFlowModel(),a=addFlowNode(model,'process',50,50),b=addFlowNode(model,type.type,500,300);const edge=addFlowEdge(model,a.id,b.id,{toSide:side,route,endMarker:'gum',startMarker:'gum',startArrow:true})!;
    const gum=flowGumGeometry(edge,a,b)!;assert.ok(!/NaN|Infinity/.test(gum.path));assert.equal(gum.attachments.end.length,2);
    if(type.type==='decision'&&side==='left')for(const p of gum.attachments.end)assert.ok(p.x>b.x+10,'wide seam extends past the tip along the slope');
    if(type.type==='circle'&&side==='left'&&route!=='straight')for(const p of gum.attachments.end)assert.ok(p.x>b.x+1,'ellipse seam curves inward');
  }
});
test('batch image patch normalizes separate nested states without aliasing',()=>{
  const model=createFlowModel(),a=addFlowNode(model,'image'),b=addFlowNode(model,'image');const image=normalizeFlowImage({src:png,mask:'circle'});
  applyFlowSelectionPatch(model,{kind:'node',ids:[a.id,b.id]},{image});a.image!.adjustments.hue=50;assert.equal(b.image!.adjustments.hue,0);assert.equal(b.image!.src,png);
});
