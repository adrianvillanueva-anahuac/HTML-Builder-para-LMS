import test from 'node:test';
import assert from 'node:assert/strict';
import {flowRasterMime,importFlowImage,flowClipboardImage} from './flow-image-import';
import {createFlowModel,addFlowNode,flowNodeTypes} from './flow-model';
import {renderFlowSVG} from './flow-svg';

test('PNG and other raster files are recognized by bytes rather than a Windows MIME label',()=>{
 assert.equal(flowRasterMime(new Uint8Array([137,80,78,71,13,10,26,10])),'image/png');
 assert.equal(flowRasterMime(new Uint8Array([255,216,255,224])),'image/jpeg');
 assert.equal(flowRasterMime(new Uint8Array([71,73,70,56,57,97])),'image/gif');
 assert.equal(flowRasterMime(new Uint8Array([71,73,70,56,55,97])),'image/gif');
 assert.equal(flowRasterMime(new Uint8Array([82,73,70,70,10,0,0,0,87,69,66,80])),'image/webp');
 for(const bytes of [[],[137,80,78,71],[60,115,118,103,62],[71,73,70,56,57,98]])assert.equal(flowRasterMime(new Uint8Array(bytes)),null);
});
test('renaming non-image content to png never bypasses validation',async()=>{
 await assert.rejects(importFlowImage(new File(['<html>not an image</html>'],'fake.png',{type:'image/png'}),new AbortController().signal),/no contiene una imagen/);
 await assert.rejects(importFlowImage(new File([],'empty.png',{type:'image/png'}),new AbortController().signal),/10 MB/);
});
test('clipboard image discovery supports files, item-only PNGs and missing MIME labels',()=>{
 const file=new File(['png'],'alpha.png');
 assert.equal(flowClipboardImage({files:[file],items:[]} as unknown as DataTransfer),file);
 assert.equal(flowClipboardImage({files:[],items:[{kind:'file',getAsFile:()=>file}]} as unknown as DataTransfer),file);
 assert.equal(flowClipboardImage(null),undefined);
 assert.equal(flowClipboardImage({files:[new File(['text'],'text.txt')],items:[]} as unknown as DataTransfer),undefined);
});
test('connection preview snaps to real target contours without mutating or exporting draft state',()=>{
 for(const entry of flowNodeTypes){
  const model=createFlowModel(),a=addFlowNode(model,'process',100,100),b=addFlowNode(model,entry.type,600,300),before=JSON.stringify(model);
  const connectionPreview={from:a.id,fromSide:'right' as const,to:b.id,toSide:'left' as const,point:{x:600,y:340}};
  const svg=renderFlowSVG(model,{interactive:true,connecting:true,connectionPreview});
  assert.match(svg,/data-flow-connection-preview="true"/);
  assert.ok(svg.includes(`data-flow-connection-target="${b.id}"`));
  assert.ok(!/NaN|Infinity/.test(svg));assert.equal(model.edges.length,0);assert.equal(JSON.stringify(model),before);
  const published=renderFlowSVG(model,{connectionPreview});assert.ok(!published.includes('data-flow-connection-preview'));assert.ok(!published.includes('data-flow-connection-target'));
 }
});
test('free connection preview is finite for all sides and ignored for a missing origin',()=>{
 const model=createFlowModel(),a=addFlowNode(model,'image',300,200);
 for(const fromSide of ['auto','top','right','bottom','left'] as const)for(const point of [{x:0,y:0},{x:400,y:600},{x:390,y:240}]){
  const svg=renderFlowSVG(model,{interactive:true,connectionPreview:{from:a.id,fromSide,point}});assert.match(svg,/data-flow-connection-preview/);assert.ok(!/NaN|Infinity/.test(svg));
 }
 assert.ok(!renderFlowSVG(model,{interactive:true,connectionPreview:{from:'missing',fromSide:'auto',point:{x:0,y:0}}}).includes('data-flow-connection-preview'));
});
