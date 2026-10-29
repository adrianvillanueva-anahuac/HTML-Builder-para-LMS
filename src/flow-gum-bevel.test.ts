import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlowModel,normalizeFlowModel,addFlowNode,addFlowEdge,flowNodeTypes} from './flow-model';
import {flowGumGeometry,flowEdgeGeometry,flowSnap} from './flow-geometry';
import {flowContentBounds} from './flow-crop';
import {renderFlowSVG} from './flow-svg';
test('new and unset movement defaults to ten pixel snapping without overwriting saved choices',()=>{
 for(const model of [createFlowModel(),normalizeFlowModel({}),normalizeFlowModel({snapMode:'unknown'})]){assert.equal(model.snapMode,'pixels');assert.equal(model.snapSize,10);assert.equal(flowSnap(17,model),20);}
 for(const snapMode of ['free','grid','pixels']as const){const model=normalizeFlowModel({snapMode,snapSize:7});assert.equal(model.snapMode,snapMode);assert.equal(model.snapSize,7);assert.deepEqual(normalizeFlowModel(JSON.parse(JSON.stringify(model))),model);}
});
test('gum shoulders meet a rectangular figure tangentially rather than at a sharp angle',()=>{
 const model=createFlowModel(),a=addFlowNode(model,'process',100,100),b=addFlowNode(model,'process',700,100),edge=addFlowEdge(model,a.id,b.id,{fromSide:'right',toSide:'left',startArrow:true,startMarker:'gum',endMarker:'gum'})!;
 const gum=flowGumGeometry(edge,a,b)!;assert.equal(gum.bevels.length,4);assert.equal((gum.path.match(/ C /g)||[]).length,4);assert.equal(gum.startWidth,a.height*.75);assert.equal(gum.endWidth,b.height*.75);
 for(const bevel of gum.bevels){const dx=bevel.c1.x-bevel.contact.x,dy=bevel.c1.y-bevel.contact.y;assert.ok(Math.abs(dy)>.01);assert.ok(Math.abs(dx*bevel.tangent.y-dy*bevel.tangent.x)<1e-7);}
});
test('diamond collar embraces both slopes and tapers over a long smooth shoulder like the reference',()=>{
 const model=createFlowModel(),a=addFlowNode(model,'decision',38,20),b=addFlowNode(model,'process',553,47);
 Object.assign(a,{width:134,height:134});Object.assign(b,{width:120,height:80});
 const edge=addFlowEdge(model,a.id,b.id,{fromSide:'right',toSide:'left',route:'straight',startArrow:true,startMarker:'gum',endArrow:false,width:2})!,gum=flowGumGeometry(edge,a,b)!;
 assert.equal(gum.startWidth,100.5);assert.equal(gum.bevels.length,2);
 const [bottom,top]=gum.attachments.start;
 assert.ok(top.y<40&&bottom.y>134,'base reaches well beyond the narrow cardinal tip');
 assert.ok(top.x<125&&bottom.x<125,'both ends of the collar sit along the diamond slopes');
 for(const bevel of gum.bevels){
  const neck=gum.sections.find(section=>section.distance>=gum.startReach)!;assert.ok(neck.point.x>300&&neck.point.x<410,'long taper remains along the actual route');assert.equal(neck.width,2);
  assert.ok(bevel.cut.x<180,'only the seam is rounded; no long Bezier shortcuts the route');
  assert.ok(bevel.c1.x>bevel.contact.x&&bevel.c1.x<bevel.c2.x&&bevel.c2.x<bevel.cut.x,'controls progress away from the figure');
  for(let i=0;i<=50;i++){const t=i/50,u=1-t,y=u*u*u*bevel.contact.y+3*u*u*t*bevel.c1.y+3*u*t*t*bevel.c2.y+t*t*t*bevel.cut.y;assert.ok(y>=Math.min(bevel.contact.y,bevel.cut.y)-1e-6&&y<=Math.max(bevel.contact.y,bevel.cut.y)+1e-6,'no pinching or overshoot across the neck');}
 }
});
test('a manually tightened orthogonal elbow is not shortcut by the broad shoulder',()=>{
 const model=createFlowModel(),a=addFlowNode(model,'process',110,300),b=addFlowNode(model,'decision',860,370);Object.assign(a,{width:170,height:150});Object.assign(b,{width:180,height:100});
 const edge=addFlowEdge(model,a.id,b.id,{route:'orthogonal',fromSide:'right',toSide:'left',bend:{axis:'x',position:320},startArrow:true,startMarker:'gum',endArrow:false})!,before=flowEdgeGeometry(edge,a,b),gum=flowGumGeometry(edge,a,b)!;
 assert.equal(gum.bevels.length,2);assert.ok(gum.bevels.every(bevel=>bevel.cut.x<308),'seam rounding ends before the nearby elbow');assert.ok(gum.sections.filter(section=>section.point.x>=320).every(section=>Math.abs(section.width-gum.waist)<.01),'collar narrows before the turn, retaining the right-angle route');assert.deepEqual(flowEdgeGeometry(edge,a,b),before);
});
test('rounding applies only to enabled gum ends and preserves the connector centreline',()=>{
 const model=createFlowModel(),a=addFlowNode(model,'circle',100,100),b=addFlowNode(model,'decision',700,400),edge=addFlowEdge(model,a.id,b.id,{startArrow:true,startMarker:'gum',endMarker:'arrow'})!;
 const before=flowEdgeGeometry(edge,a,b),one=flowGumGeometry(edge,a,b)!;assert.equal(one.bevels.length,2);assert.deepEqual(flowEdgeGeometry(edge,a,b),before);
 edge.endMarker='gum';assert.equal(flowGumGeometry(edge,a,b)!.bevels.length,4);edge.startArrow=false;assert.equal(flowGumGeometry(edge,a,b)!.bevels.length,2);edge.endArrow=false;assert.equal(flowGumGeometry(edge,a,b),null);
});
test('gum bevels remain finite and touch the contour for all shapes ports and routes',()=>{
 for(const entry of flowNodeTypes)for(const side of ['top','right','bottom','left']as const)for(const route of ['orthogonal','straight','curve']as const){
  const model=createFlowModel(),a=addFlowNode(model,entry.type,100,100),b=addFlowNode(model,entry.type,700,400),edge=addFlowEdge(model,a.id,b.id,{fromSide:side,toSide:side,route,startArrow:true,startMarker:'gum',endMarker:'gum',width:24})!;
  const gum=flowGumGeometry(edge,a,b)!;assert.ok(!/NaN|Infinity/.test(gum.path));assert.ok(gum.bevels.length>=2);
  for(const bevel of gum.bevels){assert.ok(bevel.outline.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));assert.ok(Math.abs(Math.hypot(bevel.tangent.x,bevel.tangent.y)-1)<1e-6);}
 }
});
test('short and overlapping connectors bound the fillets and retain finite geometry',()=>{
 for(const dx of [0,1,20,50])for(const route of ['orthogonal','straight','curve']as const){
  const model=createFlowModel(),a=addFlowNode(model,'process',100,100),b=addFlowNode(model,'decision',100+dx,100),edge=addFlowEdge(model,a.id,b.id,{route,startArrow:true,startMarker:'gum',endMarker:'gum'})!,gum=flowGumGeometry(edge,a,b)!;assert.ok(!/NaN|Infinity/.test(gum.path));assert.ok(gum.outline.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
 }
});
test('cropping includes the full rounded shoulders and keeps figure positions unchanged',()=>{
 const model=createFlowModel(),a=addFlowNode(model,'circle',100,100),b=addFlowNode(model,'document',700,400),edge=addFlowEdge(model,a.id,b.id,{route:'curve',fromSide:'top',toSide:'top',startArrow:true,startMarker:'gum',endMarker:'gum'})!;model.autoCrop=true;model.cropMarginX=0;model.cropMarginY=0;
 const before=JSON.stringify(model.nodes),bounds=flowContentBounds(model)!,gum=flowGumGeometry(edge,a,b)!;
 for(const bevel of gum.bevels)for(const p of bevel.outline){assert.ok(p.x>=bounds.x&&p.x<=bounds.x+bounds.width);assert.ok(p.y>=bounds.y&&p.y<=bounds.y+bounds.height);}assert.equal(JSON.stringify(model.nodes),before);
});
test('bevels combine with every route gradients dash styles and marker sizes in static output',()=>{
 const model=createFlowModel(),a=addFlowNode(model,'process',100,100),b=addFlowNode(model,'circle',700,400),edge=addFlowEdge(model,a.id,b.id,{startArrow:true,startMarker:'gum',endMarker:'circle',colorMode:'gradient',width:8})!;
 for(const route of ['orthogonal','straight','curve']as const)for(const dash of ['solid','dotted','dashed']as const){edge.route=route;edge.dash=dash;const svg=renderFlowSVG(model);assert.match(svg,/<path data-flow-gum="true" d="[^"]* C /);assert.ok(svg.includes('linearGradient'));assert.ok(svg.includes('data-flow-marker="circle"'));assert.ok(!svg.includes('data-flow-bend='));}
});
