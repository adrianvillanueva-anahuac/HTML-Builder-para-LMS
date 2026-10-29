import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlowModel,normalizeFlowModel,addFlowNode,addFlowEdge,type FlowMarker} from './flow-model';
import {flowEdgeGeometry,flowGumGeometry} from './flow-geometry';
import {flowStrokeGeometry,flowMarkerInset} from './flow-path';
import {applyFlowSelectionPatch,duplicateFlowSelection} from './flow-selection';
import {flowContentBounds} from './flow-crop';
import {renderFlowSVG} from './flow-svg';
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
function extreme(){const model=createFlowModel(),a=addFlowNode(model,'process',960,370),b=addFlowNode(model,'terminator',470,510),edge=addFlowEdge(model,a.id,b.id,{route:'curve',fromSide:'bottom',toSide:'top',startArrow:true,startMarker:'gum',endMarker:'gum'})!;return{model,a,b,edge};}
test('legacy connectors receive safe gum defaults; edits roundtrip and duplicate independently',()=>{
 const {model,a,b,edge}=extreme();assert.equal(edge.gumBase,75);assert.equal(edge.gumReach,180);
 applyFlowSelectionPatch(model,{kind:'edge',ids:[edge.id]},{gumBase:40,gumReach:320});const copy=duplicateFlowSelection(model,{kind:'edge',ids:[edge.id]})!;assert.deepEqual(normalizeFlowModel(JSON.parse(JSON.stringify(model))),model);assert.equal(model.edges[1].gumBase,40);assert.equal(model.edges[1].gumReach,320);
 applyFlowSelectionPatch(model,copy,{gumBase:95});assert.equal(edge.gumBase,40);assert.equal(model.edges[1].gumBase,95);
 const clamped=normalizeFlowModel({nodes:[a,b],edges:[{...edge,gumBase:500,gumReach:-5}]});assert.equal(clamped.edges[0].gumBase,95);assert.equal(clamped.edges[0].gumReach,10);
});
test('base and reach change different aspects of the collar without changing endpoints',()=>{
 const {model,a,b,edge}=extreme();Object.assign(a,{x:100,y:100});Object.assign(b,{x:800,y:100});Object.assign(edge,{route:'straight',fromSide:'right',toSide:'left',gumBase:75,gumReach:100});
 const before=flowEdgeGeometry(edge,a,b),g1=flowGumGeometry(edge,a,b)!;edge.gumBase=40;const g2=flowGumGeometry(edge,a,b)!;assert.ok(g2.startWidth<g1.startWidth);assert.equal(g2.startReach,g1.startReach);edge.gumReach=220;const g3=flowGumGeometry(edge,a,b)!;assert.equal(g3.startWidth,g2.startWidth);assert.ok(g3.startReach>g2.startReach);assert.notEqual(g3.path,g2.path);assert.deepEqual(flowEdgeGeometry(edge,a,b),before);assert.equal(model.nodes.length,2);
});
test('extreme S curve stays centered and offsets never fold across the curvature radius',()=>{
 const {a,b,edge}=extreme(),gum=flowGumGeometry(edge,a,b)!;assert.ok(gum.startReach<180||gum.endReach<180);
 for(const section of gum.sections){assert.ok(Number.isFinite(section.width));assert.ok(section.width<=Math.max(gum.waist,section.radius*.9)+1e-6);}
 // The old shoulder cut half the S curve, leaving a second visible thin line.
 for(const bevel of gum.bevels)assert.ok(distance(bevel.contact,bevel.cut)<60,'only a short seam fillet may depart from the swept route');
 const p=gum.polygon,cross=(a:typeof p[0],b:typeof p[0],c:typeof p[0])=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 let crossings=0;for(let i=0;i<p.length;i++)for(let j=i+2;j<p.length;j++){if(i===0&&j===p.length-1)continue;const a=p[i],b=p[(i+1)%p.length],c=p[j],d=p[(j+1)%p.length];if(cross(a,b,c)*cross(a,b,d)<-1e-5&&cross(c,d,a)*cross(c,d,b)<-1e-5)crossings++;}assert.equal(crossings,0,'organic silhouette must not form crossing petals');
});
test('extreme positions and maximum controls produce finite bounded ribbons on all ports',()=>{
 for(const dx of [-500,-30,0,30,500])for(const dy of [-200,0,60,200])for(const fromSide of ['top','right','bottom','left']as const)for(const toSide of ['top','right','bottom','left']as const){
  const {a,b,edge}=extreme();Object.assign(a,{x:550,y:300});Object.assign(b,{x:550+dx,y:300+dy});Object.assign(edge,{fromSide,toSide,gumBase:95,gumReach:1000});const gum=flowGumGeometry(edge,a,b)!;assert.ok(!/NaN|Infinity/.test(gum.path));assert.ok(gum.outline.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));assert.ok(gum.startReach<=gum.sections.at(-1)!.distance*.45+.01);
 }
});
test('arrow circle and square shafts join the rear with tangent stems at all widths and routes',()=>{
 const markers:FlowMarker[]=['arrow','circle','square'];
 for(const route of ['straight','curve','orthogonal']as const)for(const type of markers)for(const width of [1,2,8,24]){
  const {a,b,edge}=extreme();Object.assign(edge,{route,startMarker:type,endMarker:type,width});const geometry=flowEdgeGeometry(edge,a,b),ink=flowStrokeGeometry(edge,geometry),inset=flowMarkerInset(type,width);assert.ok(ink.samples.length>1);assert.ok(!/NaN|Infinity/.test(ink.path));assert.ok(inset>width/2,'round cap cannot protrude through the symbol tip');
  assert.ok(Math.abs(distance(ink.start,geometry.start)-inset)<.05);assert.ok(Math.abs(distance(ink.end,geometry.end)-inset)<.05);assert.equal(ink.trimStart,inset);assert.equal(ink.trimEnd,inset);assert.notEqual(ink.path,geometry.path);
 }
});
test('short connectors suppress shafts that cannot fit between their symbols',()=>{
 const {a,b,edge}=extreme();Object.assign(a,{x:100,y:100});Object.assign(b,{x:290,y:100});Object.assign(edge,{route:'straight',fromSide:'right',toSide:'left',startMarker:'arrow',endMarker:'square',width:24});const ink=flowStrokeGeometry(edge,flowEdgeGeometry(edge,a,b));assert.equal(ink.path,'');assert.equal(ink.samples.length,0);
});
test('mixed gum and ordinary symbols end the ribbon behind the symbol too',()=>{
 const {model,a,b,edge}=extreme();edge.endMarker='arrow';edge.width=24;const geometry=flowEdgeGeometry(edge,a,b),ink=flowStrokeGeometry(edge,geometry),gum=flowGumGeometry(edge,a,b)!;const center={x:(gum.attachments.end[0].x+gum.attachments.end[1].x)/2,y:(gum.attachments.end[0].y+gum.attachments.end[1].y)/2};assert.ok(distance(center,ink.end)<.1);assert.ok(distance(center,geometry.end)>60);
 const svg=renderFlowSVG(model);assert.ok(svg.includes('data-flow-stroke'));assert.ok(svg.includes('data-flow-symbols'));assert.ok(svg.includes('data-flow-gum'));assert.ok(!svg.match(/data-flow-stroke[^>]*marker-end/));
});
test('crop contains organic shoulders and marker stems while exported symbols keep local references',()=>{
 const {model,a,b,edge}=extreme();Object.assign(edge,{width:24,endMarker:'circle',colorMode:'gradient',gumReach:1000,gumBase:95});model.autoCrop=true;const before=JSON.stringify(model.nodes),bounds=flowContentBounds(model)!,gum=flowGumGeometry(edge,a,b)!,ink=flowStrokeGeometry(edge,flowEdgeGeometry(edge,a,b));
 for(const p of [...gum.outline,...ink.samples])assert.ok(p.x>=bounds.x-.01&&p.x<=bounds.x+bounds.width+.01&&p.y>=bounds.y-.01&&p.y<=bounds.y+bounds.height+.01);assert.equal(JSON.stringify(model.nodes),before);
 const svg=renderFlowSVG(model);assert.match(svg,/linearGradient/);assert.match(svg,/data-flow-marker="circle"/);assert.ok(!/fde-|data-flow-bend|NaN|Infinity/.test(svg));
});
