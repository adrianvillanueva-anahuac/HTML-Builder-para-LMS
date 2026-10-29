import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlowModel,normalizeFlowModel,addFlowNode,addFlowLane,addFlowEdge} from './flow-model';
import {flowContentBounds,flowOutputBox} from './flow-crop';
import {flowSnapPosition,flowEdgeGeometry,flowAnchor} from './flow-geometry';
import {renderFlowSVG} from './flow-svg';
test('legacy diagrams retain full canvas and independent ten-pixel crop defaults',()=>{
 const m=normalizeFlowModel({width:900,height:500});assert.equal(m.autoCrop,false);assert.equal(m.cropMarginX,10);assert.equal(m.cropMarginY,10);assert.deepEqual(flowOutputBox(m),{x:0,y:0,width:900,height:500});
});
test('empty crop is stable and never produces a zero viewBox',()=>{
 const m=createFlowModel();m.autoCrop=true;assert.equal(flowContentBounds(m),null);assert.deepEqual(flowOutputBox(m),{x:0,y:0,width:1200,height:720});assert.ok(!renderFlowSVG(m,{interactive:true}).includes('data-flow-crop-guide'));
});
test('content crop includes stroke, independent margins and does not mutate geometry',()=>{
 const m=createFlowModel(),node=addFlowNode(m,'process',200,100);Object.assign(node,{width:180,height:80,strokeWidth:4});m.autoCrop=true;
 const before=JSON.stringify(m.nodes);assert.deepEqual(flowContentBounds(m),{x:198,y:98,width:184,height:84});assert.deepEqual(flowOutputBox(m),{x:188,y:88,width:204,height:104});
 m.cropMarginX=35;m.cropMarginY=0;assert.deepEqual(flowOutputBox(m),{x:163,y:98,width:254,height:84});assert.equal(JSON.stringify(m.nodes),before);
 m.autoCrop=false;assert.deepEqual(flowOutputBox(m),{x:0,y:0,width:1200,height:720});assert.equal(JSON.stringify(m.nodes),before);
});
test('crop settings are normalized and survive a project roundtrip',()=>{
 const m=normalizeFlowModel({autoCrop:true,cropMarginX:999,cropMarginY:-50});assert.equal(m.cropMarginX,999);assert.equal(m.cropMarginY,0);assert.deepEqual(normalizeFlowModel(JSON.parse(JSON.stringify(m))),m);
 const invalid=normalizeFlowModel({autoCrop:'yes',cropMarginX:Infinity,cropMarginY:'20'});assert.equal(invalid.autoCrop,false);assert.equal(invalid.cropMarginX,10);assert.equal(invalid.cropMarginY,10);
});
test('static output uses content viewBox; editor retains world coordinates and a guide',()=>{
 const m=createFlowModel();addFlowNode(m,'circle',200,100);m.autoCrop=true;
 const box=flowOutputBox(m),svg=renderFlowSVG(m),editor=renderFlowSVG(m,{interactive:true});assert.ok(svg.includes(`viewBox="${box.x} ${box.y} ${box.width} ${box.height}"`));assert.ok(!svg.includes('data-flow-crop-guide'));assert.ok(editor.includes('viewBox="0 0 1200 720"'));assert.ok(editor.includes('data-flow-crop-guide="true"'));assert.ok(!svg.includes('data-flow-resize'));
});
test('lanes and connector detours are included, not just figures',()=>{
 const m=createFlowModel(),a=addFlowNode(m,'process',250,200),b=addFlowNode(m,'decision',600,400),lane=addFlowLane(m);Object.assign(lane,{x:150,y:100,width:800,height:520});
 const edge=addFlowEdge(m,a.id,b.id,{fromSide:'right',toSide:'right',bend:{axis:'x',position:1100},label:'Ruta de aprobación',width:24,endMarker:'square'})!;m.autoCrop=true;
 const box=flowContentBounds(m)!;assert.ok(box.x<=149.25);assert.ok(box.y<=99.25);assert.ok(box.x+box.width>=1112);assert.ok(box.y+box.height>=620.75);
 const geometry=flowEdgeGeometry(edge,a,b);for(const p of geometry.samples){assert.ok(p.x>=box.x&&p.x<=box.x+box.width);assert.ok(p.y>=box.y&&p.y<=box.y+box.height);}
});
test('gum curves, gradient and labels remain inside the cropped output',()=>{
 const m=createFlowModel(),a=addFlowNode(m,'circle',200,250),b=addFlowNode(m,'decision',700,250),edge=addFlowEdge(m,a.id,b.id,{fromSide:'top',toSide:'top',route:'curve',startArrow:true,startMarker:'gum',endMarker:'gum',colorMode:'gradient',label:'Continuar'})!;m.autoCrop=true;
 const bounds=flowContentBounds(m)!,geometry=flowEdgeGeometry(edge,a,b);assert.ok(bounds.y<200);assert.ok(bounds.width>500);
 const svg=renderFlowSVG(m);assert.ok(svg.includes('data-flow-gum'));assert.ok(svg.includes('linearGradient'));assert.ok(geometry.label.y>=bounds.y&&geometry.label.y<=bounds.y+bounds.height);
});
test('crop may extend outside original canvas to preserve margins and borders',()=>{
 const m=createFlowModel();addFlowNode(m,'process',0,0);m.autoCrop=true;const box=flowOutputBox(m);assert.equal(box.x,-11);assert.equal(box.y,-11);assert.ok(renderFlowSVG(m).includes('<rect x="-11" y="-11"'));
});
test('grid and pixel modes snap centres of odd-sized shapes while free remains unsnapped',()=>{
 const m=createFlowModel(),node=addFlowNode(m,'circle',83.5,97.5);node.width=113;node.height=77;m.snapMode='grid';const p=flowSnapPosition(node,104,116,m);assert.equal((p.x+node.width/2)%20,0);assert.equal((p.y+node.height/2)%20,0);
 m.snapMode='free';assert.deepEqual(flowSnapPosition(node,104.25,116.75,m),{x:104.25,y:116.75});m.snapMode='pixels';m.snapSize=7;const pixels=flowSnapPosition(node,104,116,m);assert.equal((pixels.x+node.width/2)%7,0);assert.equal((pixels.y+node.height/2)%7,0);
});
test('moving a grid figure or orthogonal bend never snaps the actual centre anchor away',()=>{
 const m=createFlowModel(),a=addFlowNode(m,'circle',83,97),b=addFlowNode(m,'decision',600,350);m.snapMode='grid';Object.assign(a,flowSnapPosition(a,146,175,m));const edge=addFlowEdge(m,a.id,b.id,{fromSide:'right',toSide:'left',bend:{axis:'x',position:420}})!;
 for(const position of [80,240,560,1000]){edge.bend={axis:'x',position};const g=flowEdgeGeometry(edge,a,b);assert.deepEqual(g.start,flowAnchor(a,'right'));assert.deepEqual(g.end,flowAnchor(b,'left'));assert.equal(g.start.y,a.y+a.height/2);assert.equal(g.end.y,b.y+b.height/2);}
});
