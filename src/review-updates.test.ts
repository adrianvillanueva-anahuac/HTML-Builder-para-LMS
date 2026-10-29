import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createFlowModel,addFlowNode,normalizeFlowModel} from './flow-model';
import {flowSnapPosition,resizeFlowBoxProportionally} from './flow-geometry';
import {flowTextLayout,flowFreeTextHeight,flowTextWidth} from './flow-text-layout';
import {imageRotationLayout,rotatedImageFrame} from './image-model';
import {reconcileMediaChecklist} from './media-checklist';
import {parseProject,emptyWorkspace} from './project-model';
test('default canvas remains 1200×720 and margins may reach 100% of each dimension',()=>{
 const m=createFlowModel();assert.equal(m.width,1200);assert.equal(m.height,720);
 const p=normalizeFlowModel({...m,cropMarginX:99999,cropMarginY:99999});assert.equal(p.cropMarginX,1200);assert.equal(p.cropMarginY,720);
});
test('pixel snap aligns the centres of different sized figures',()=>{
 const m=createFlowModel(),a=addFlowNode(m,'process'),b=addFlowNode(m,'circle');
 Object.assign(a,flowSnapPosition(a,330-a.width/2,100,m));Object.assign(b,flowSnapPosition(b,330-b.width/2,400,m));
 assert.equal(a.x+a.width/2,b.x+b.width/2);
});
test('circle resizing locks its original ratio and respects canvas bounds',()=>{
 const m=createFlowModel(),start={x:100,y:120,width:112,height:112};
 for(const [dx,dy] of [[130,10],[-999,-999],[99999,99999],[0,99]]){const b=resizeFlowBoxProportionally(start,'se',dx,dy,m);assert.equal(b.width,b.height);assert.ok(b.x+b.width<=m.width&&b.y+b.height<=m.height);assert.ok(b.width>=40);}
 const oval=resizeFlowBoxProportionally({...start,width:200,height:100},'se',50,20,m);assert.equal(oval.width/oval.height,2);
});
test('shared rich-text layout preserves authored newlines and fits measured lines',()=>{
 const m=createFlowModel(),node=addFlowNode(m,'circle');node.width=180;node.text='Círculos\nde';
 const layout=flowTextLayout(node);assert.equal(layout.lines.map(line=>line.map(c=>c.text).join('')).join('\n'),'Círculos\nde');
 node.text='Una palabra extremadamenteLargaYContinua termina aquí';
 for(const line of flowTextLayout(node).lines)assert.ok(flowTextWidth(line,node.fontSize)<=layout.box.width+.01);
});
test('free text grows downward without truncating lines, but does not shrink authored boxes',()=>{
 const m=createFlowModel(),node=addFlowNode(m,'text');node.width=100;node.text=Array(18).fill('Texto largo').join('\n');
 const required=flowFreeTextHeight(node);assert.ok(required>node.height);node.height=required;
 assert.ok(flowTextLayout(node).box.height>=flowTextLayout(node).lines.length*node.fontSize*1.25);
 node.text='Breve';assert.equal(flowFreeTextHeight(node),required);
});
test('quarter-turn swaps crop ratio and its stage fits entirely without clipping',()=>{
 for(const aspect of [.4,1,2.5])for(const angle of [90,-90,270]){
  const p=imageRotationLayout(aspect,angle);assert.ok(Math.abs(p.aspect-1/aspect)<1e-10);assert.ok(Math.abs(p.width-100*aspect)<1e-10);assert.ok(Math.abs(p.height-100/aspect)<1e-10);
 }
 assert.ok(Math.abs(imageRotationLayout(2,180).aspect-2)<1e-10);
});
test('rotation reduces an image only when its new width exceeds the available space',()=>{
 const fitting=rotatedImageFrame(600,300,90,600);assert.ok(Math.abs(fitting.width-300)<1e-9);assert.equal(fitting.height,600);
 const p=rotatedImageFrame(300,600,90,400);assert.equal(p.width,400);assert.ok(Math.abs(p.height-200)<1e-9);
});
test('new empty diagrams defer task creation while existing tasks keep updating',()=>{
 const deferred={id:'diagram',label:'Diagrama de flujo',hasContent:false,deferNew:true};
 assert.equal(reconcileMediaChecklist(undefined,[deferred]),undefined);
 const pending=reconcileMediaChecklist(undefined,[{...deferred,deferNew:false}])!;assert.equal(pending.length,1);
 assert.equal(reconcileMediaChecklist(pending,[{...deferred,hasContent:true}])![0].done,true);
});
test('dismissed automatic task identities survive project save/reopen',()=>{
 const project={format:'lms-builder-project',version:1,name:'Prueba',activeId:'one',spaces:[{...emptyWorkspace(),id:'one',name:'Página 1',dismissedAutomaticTasks:['media:diagram','button:trigger']}]};
 assert.deepEqual(parseProject(JSON.stringify(project)).spaces[0].dismissedAutomaticTasks,['media:diagram','button:trigger']);
 assert.throws(()=>parseProject(JSON.stringify({...project,spaces:[{...project.spaces[0],dismissedAutomaticTasks:[42]}]})));
});
