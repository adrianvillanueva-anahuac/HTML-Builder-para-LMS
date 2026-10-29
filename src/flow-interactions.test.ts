import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlowModel,addFlowNode,addFlowEdge,normalizeFlowModel,flowEdgeLabels} from './flow-model';
import {flowEdgeGeometry,flowLabelPoint,flowLabelPosition,moveFlowEdgeRun,flowLabelMetrics} from './flow-geometry';
import {renderFlowSVG} from './flow-svg';
import {flowOutputBox} from './flow-crop';
import {duplicateFlowSelection,applyFlowSelectionPatch} from './flow-selection';
function sample(){const model=createFlowModel(),a=addFlowNode(model,'process',100,120),b=addFlowNode(model,'decision',740,460),edge=addFlowEdge(model,a.id,b.id,{label:'sí',fromSide:'right',toSide:'top'})!;return{model,a,b,edge};}
test('legacy labels retain their text and midpoint while extra labels are bounded and idempotent',()=>{
 const {model,edge}=sample();Object.assign(edge,{labelPosition:2,labels:[{id:'primary',text:'otra',position:-2},{id:'bad"',text:'<script>',position:NaN}]});
 const normalized=normalizeFlowModel(model),labels=flowEdgeLabels(normalized.edges[0]);assert.equal(labels[0].text,'sí');assert.equal(labels[0].position,1);assert.equal(labels[1].position,0);assert.equal(labels[2].position,.5);assert.equal(new Set(labels.map(l=>l.id)).size,3);assert.deepEqual(normalizeFlowModel(normalized),normalized);
 const {edge:legacy}=sample();assert.deepEqual(flowEdgeLabels(legacy),[{id:'primary',text:'sí',position:.5}]);
});
test('label dragging projects to arc length on straight orthogonal and curved connectors',()=>{
 const {a,b,edge}=sample();for(const route of ['straight','orthogonal','curve']as const){edge.route=route;const geometry=flowEdgeGeometry(edge,a,b);for(const t of [0,.1,.25,.72,1]){const point=flowLabelPoint(geometry.samples,t);assert.ok(Math.abs(flowLabelPosition(geometry.samples,point)-t)<.0001);}}
 assert.deepEqual(flowLabelPoint([],0),{x:0,y:0});assert.equal(flowLabelPosition([],{x:5,y:8}),.5);
});
test('every orthogonal run has a movable handle and moving any run keeps ports attached',()=>{
 const {a,b,edge}=sample(),geometry=flowEdgeGeometry(edge,a,b);assert.ok(geometry.bendHandles.length>=3);
 for(const handle of geometry.bendHandles){const changed={...edge,waypoints:moveFlowEdgeRun(edge,a,b,handle.index,handle.position+60)},next=flowEdgeGeometry(changed,a,b);assert.notEqual(next.path,geometry.path);assert.deepEqual(next.start,geometry.start);assert.deepEqual(next.end,geometry.end);for(let i=1;i<next.controlPoints.length;i++){const p=next.controlPoints[i-1],q=next.controlPoints[i];assert.ok(p.x===q.x||p.y===q.y);}assert.ok(!next.path.includes('NaN'));}
});
test('all port pairs keep manual runs orthogonal when endpoint figures move',()=>{
 for(const fromSide of ['top','right','bottom','left']as const)for(const toSide of ['top','right','bottom','left']as const){const {a,b,edge}=sample();Object.assign(edge,{fromSide,toSide});const geometry=flowEdgeGeometry(edge,a,b);for(const handle of geometry.bendHandles){const changed={...edge,waypoints:moveFlowEdgeRun(edge,a,b,handle.index,handle.position+40)},next=flowEdgeGeometry(changed,{...a,x:a.x+30,y:a.y+20},{...b,x:b.x-60,y:b.y+40});for(let i=1;i<next.controlPoints.length;i++){const p=next.controlPoints[i-1],q=next.controlPoints[i];assert.ok(p.x===q.x||p.y===q.y);}}}
});
test('label and routing state deep-copy independently and normalize unsafe waypoints',()=>{
 const {model,a,b,edge}=sample();edge.labels=[{id:'second',text:'no',position:.8}];edge.waypoints=moveFlowEdgeRun(edge,a,b,1,520);const copy=duplicateFlowSelection(model,{kind:'edge',ids:[edge.id]})!,other=model.edges.find(e=>e.id===copy.ids[0])!;other.labels![0].text='changed';other.waypoints![0].x=5;assert.equal(edge.labels[0].text,'no');assert.notEqual(other.waypoints![0].x,edge.waypoints[0].x);
 edge.waypoints=[{x:Infinity,y:1},{x:-500,y:1e8}];assert.deepEqual(normalizeFlowModel(model).edges[0].waypoints,[{x:0,y:720}]);
});
test('all labels export safely at their own positions and crop includes each label',()=>{
 const {model,edge}=sample();model.autoCrop=true;edge.labels=[{id:'second',text:'Etiqueta <larga> & distinta',position:1}];edge.labelPosition=0;const svg=renderFlowSVG(model),box=flowOutputBox(model);assert.ok(svg.includes('Etiqueta &lt;larga&gt; &amp; distinta'));assert.ok(svg.includes('sí'));assert.ok(!svg.includes('data-flow-label='));assert.ok(box.width>700);assert.ok(!svg.includes('data-flow-disconnect'));
});
test('editor renders long run handles and one minus per incident endpoint without polluting export',()=>{
 const {model,a,edge}=sample();edge.labels=[{id:'second',text:'no',position:.7}];const svg=renderFlowSVG(model,{interactive:true,selectedEdgeId:edge.id,selectedNodeId:a.id}),plain=renderFlowSVG(model);assert.equal((svg.match(/data-flow-disconnect=/g)||[]).length,2);assert.equal((svg.match(/data-flow-label=/g)||[]).length,2);assert.ok((svg.match(/data-flow-bend=/g)||[]).length>=3);assert.ok(svg.includes('data-run='));assert.ok(svg.includes('data-flow-delete-highlight'));assert.ok(!plain.includes('data-flow-bend=')&&!plain.includes('data-flow-delete-highlight'));
});
test('label scale migrates at 100 percent, bounds invalid values and survives duplication',()=>{
 const {model,edge}=sample();assert.equal(edge.labelScale,100);
 for(const [raw,expected]of [[undefined,100],[NaN,100],[Infinity,100],[-1,50],[999,300],[175,175]]as const){edge.labelScale=raw;assert.equal(normalizeFlowModel(model).edges[0].labelScale,expected);}
 edge.labelScale=175;const copy=duplicateFlowSelection(model,{kind:'edge',ids:[edge.id]})!;assert.equal(model.edges.find(e=>e.id===copy.ids[0])!.labelScale,175);
 assert.equal(applyFlowSelectionPatch(model,{kind:'edge',ids:model.edges.map(e=>e.id)},{labelScale:150}),true);assert.ok(model.edges.every(e=>e.labelScale===150));
});
test('scaling all labels changes text and background metrics without changing their anchors or connector',()=>{
 const {model,edge,a,b}=sample();edge.labels=[{id:'other',text:'No',position:.8}];const original=flowEdgeGeometry(edge,a,b),small=flowLabelMetrics(edge,edge.label);edge.labelScale=200;const large=flowLabelMetrics(edge,edge.label);
 for(const key of ['width','height','fontSize','padding','radius']as const)assert.equal(large[key],small[key]*2);
 assert.deepEqual(flowEdgeGeometry(edge,a,b),original);assert.equal(edge.labels[0].position,.8);
 const svg=renderFlowSVG(model);assert.equal((svg.match(/font-size="26"/g)||[]).length,2);assert.equal((svg.match(/height="48"/g)||[]).length,2);
});
test('crop includes the full scaled label and preview minus buttons activate only on selected figures',()=>{
 const {model,edge,a}=sample();edge.label='Etiqueta bastante larga para ampliar los límites';edge.labelPosition=1;model.autoCrop=true;const before=flowOutputBox(model);edge.labelScale=300;const after=flowOutputBox(model);assert.ok(after.x+after.width>before.x+before.width);
 const hover=renderFlowSVG(model,{interactive:true}),selected=renderFlowSVG(model,{interactive:true,selectedNodeId:a.id});assert.equal((hover.match(/aria-disabled="true"/g)||[]).length,2);assert.equal((hover.match(/aria-disabled="false"/g)||[]).length,0);assert.equal((selected.match(/aria-disabled="false"/g)||[]).length,1);assert.equal((selected.match(/aria-disabled="true"/g)||[]).length,1);assert.ok(!renderFlowSVG(model).includes('aria-disabled'));
});
