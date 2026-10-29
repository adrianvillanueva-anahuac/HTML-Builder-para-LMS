import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlowModel,normalizeFlowModel,flowBackgroundHasColor,addFlowNode,addFlowEdge} from './flow-model';
import {flowPresentationChange,flowBlockControlsHTML} from './flow-block-controls';
import {renderFlowSVG} from './flow-svg';
import {flowOutputBox} from './flow-crop';
test('legacy backgrounds remain opaque with twelve pixel corner radius',()=>{
 const model=normalizeFlowModel({background:'#aabbcc'});assert.equal(model.backgroundRadius,12);assert.equal(model.backgroundOpacity,1);assert.equal(model.autoCrop,false);
});
test('background radius and opacity are bounded and malformed values use compatible defaults',()=>{
 const high=normalizeFlowModel({backgroundRadius:999,backgroundOpacity:2}),low=normalizeFlowModel({backgroundRadius:-10,backgroundOpacity:-1});
 assert.equal(high.backgroundRadius,200);assert.equal(high.backgroundOpacity,1);assert.equal(low.backgroundRadius,0);assert.equal(low.backgroundOpacity,0);
 for(const value of [NaN,Infinity,'50',null]){const model=normalizeFlowModel({backgroundRadius:value,backgroundOpacity:value});assert.equal(model.backgroundRadius,12);assert.equal(model.backgroundOpacity,1);}
});
test('rollover presentation edits only its chosen field and leaves graph geometry and colours intact',()=>{
 const model=createFlowModel(),a=addFlowNode(model,'process',100,100),b=addFlowNode(model,'circle',700,400);addFlowEdge(model,a.id,b.id,{colorMode:'gradient'});
 const before=JSON.stringify(model),next=flowPresentationChange(model,'backgroundTransparency',37);
 assert.equal(next.backgroundOpacity,.63);assert.deepEqual(next.nodes,model.nodes);assert.deepEqual(next.edges,model.edges);assert.equal(JSON.stringify(model),before);
 assert.equal(flowPresentationChange(next,'backgroundRadius',78).backgroundRadius,78);
 assert.equal(flowPresentationChange(next,'autoCrop',true).autoCrop,true);
 assert.equal(flowPresentationChange(next,'cropMarginX',35).cropMarginX,35);assert.deepEqual(flowPresentationChange(next,'unknown',1),next);
});
test('full transparency retains the background colour so it can be restored without touching figures',()=>{
 const model=createFlowModel();model.background='#5d428c';addFlowNode(model,'decision');
 const transparent=flowPresentationChange(model,'backgroundTransparency',100);assert.equal(transparent.backgroundOpacity,0);assert.equal(transparent.background,'#5d428c');
 const restored=flowPresentationChange(transparent,'backgroundTransparency',0);assert.equal(restored.backgroundOpacity,1);assert.deepEqual(restored.nodes,model.nodes);
});
test('only the background rectangle receives opacity and corner radius',()=>{
 const model=createFlowModel(),a=addFlowNode(model,'process'),b=addFlowNode(model,'circle',700,400);addFlowEdge(model,a.id,b.id);model.backgroundRadius=80;model.backgroundOpacity=.4;
 const svg=renderFlowSVG(model,{scope:'background-test'}),bg=svg.match(/<rect[^>]*data-flow-background="true"[^>]*\/>/)![0];
 assert.match(bg,/rx="80"/);assert.match(bg,/fill-opacity="0.4"/);assert.equal((svg.match(/fill-opacity="0.4"/g)||[]).length,1);assert.ok(!/clip-path=|opacity="0.4"[^>]*data-flow-node/.test(svg.replace(bg,'')));
 const other=renderFlowSVG({...model,backgroundRadius:0,backgroundOpacity:1},{scope:'background-test'});assert.equal(svg.replace(bg,''),other.replace(/<rect[^>]*data-flow-background="true"[^>]*\/>/,''));
});
test('crop radius follows the output window rather than clipping the graph',()=>{
 const model=createFlowModel();addFlowNode(model,'process',200,100);Object.assign(model,{autoCrop:true,cropMarginX:0,cropMarginY:0,backgroundRadius:200});
 const box=flowOutputBox(model),bg=renderFlowSVG(model).match(/<rect[^>]*data-flow-background="true"[^>]*\/>/)![0];assert.ok(bg.includes(`x="${box.x}" y="${box.y}"`));assert.ok(bg.includes(`rx="${Math.min(box.width,box.height)/2}"`));assert.ok(!renderFlowSVG(model).includes('<clipPath'));
});
test('transparent and alpha-zero backgrounds disable effective corner rounding',()=>{
 for(const background of ['transparent','none','#0000','#11223300']){assert.equal(flowBackgroundHasColor(background),false);const model={...createFlowModel(),background,backgroundRadius:80};assert.match(renderFlowSVG(model),/rx="0" data-flow-background/);}
 for(const background of ['#abc','#abcd','#123456','#12345680'])assert.equal(flowBackgroundHasColor(background),true);
});
test('presentation settings roundtrip and toolbar offers three distinct accessible controls',()=>{
 const model={...createFlowModel(),autoCrop:true,cropMarginX:35,cropMarginY:20,backgroundOpacity:.25,backgroundRadius:64};assert.deepEqual(normalizeFlowModel(JSON.parse(JSON.stringify(model))),model);
 const html=flowBlockControlsHTML();assert.equal((html.match(/<button /g)||[]).length,3);for(const menu of ['crop','radius','opacity'])assert.ok(html.includes(`data-flow-presentation="${menu}"`));assert.equal((html.match(/aria-haspopup="dialog"/g)||[]).length,3);
});
