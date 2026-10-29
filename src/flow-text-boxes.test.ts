import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlowModel,addFlowNode,normalizeFlowModel,flowNodeTypes} from './flow-model';
import {flowTextNode,flowNodeTextArea,flowNodeTextBox,moveFlowNodeText,addFlowTextBox} from './flow-node-text';
import {renderFlowSVG} from './flow-svg';
import {normalizeFlowImage} from './flow-image';
import {duplicateFlowSelection} from './flow-selection';

test('legacy text retains its layout until explicitly moved',()=>{
 const m=createFlowModel(),node=addFlowNode(m,'terminator');node.width=455;node.height=235;
 const box=flowNodeTextBox(node);assert.equal(box.width,455*.76);assert.equal(node.textLayout,undefined);
 assert.deepEqual(flowNodeTextBox(normalizeFlowModel(m).nodes[0]),box);
});
test('all eight handles and moving stay in the safe figure area without scaling fonts',()=>{
 for(const {type}of flowNodeTypes){
  const m=createFlowModel(),node=addFlowNode(m,type);node.width=455;node.height=235;
  if(node.image)node.image=normalizeFlowImage({...node.image,src:'https://example.com/a.png',mask:'circle'});
  const start=flowNodeTextBox(node),a=flowNodeTextArea(node),font=node.fontSize;
  for(const handle of ['move','nw','n','ne','e','se','s','sw','w'])for(const dx of [-1000,0,1000])for(const dy of [-1000,0,1000]){
   node.textLayout=moveFlowNodeText(node,start,handle,dx,dy);const b=flowNodeTextBox(node);
   assert.ok(b.x>=a.x-1e-8&&b.y>=a.y-1e-8&&b.x+b.width<=a.x+a.width+1e-8&&b.y+b.height<=a.y+a.height+1e-8,`${type} ${handle}`);
   assert.equal(node.fontSize,font);assert.ok(b.width>0&&b.height>0);
  }
 }
});
test('additional boxes have independent rich content, geometry, font and alignment',()=>{
 const m=createFlowModel(),n=addFlowNode(m,'process'),a=addFlowTextBox(n)!,b=addFlowTextBox(n)!;
 a.text='Primero';a.textRuns=[];a.fontSize=24;a.textAlign='left';a.richText={tag:'div',children:[{tag:'strong',children:[{tag:'#text',text:'Primero'}]}]};
 b.text='Segundo';b.textRuns=[];b.layout.x=.2;
 const restored=normalizeFlowModel(m).nodes[0];
 assert.equal(restored.text,'Proceso');assert.equal(restored.textBoxes?.length,2);
 assert.equal(flowTextNode(restored,a.id)?.fontSize,24);assert.equal(flowTextNode(restored,a.id)?.textAlign,'left');
 assert.equal(flowTextNode(restored,b.id)?.text,'Segundo');assert.equal(flowTextNode(restored,b.id)?.textLayout?.x,.2);
 const svg=renderFlowSVG(m,{interactive:true,textEditingId:n.id,textEditingBoxId:a.id});
 assert.ok(svg.includes('Segundo'));assert.ok(svg.includes('Proceso'));assert.ok(!svg.includes('<strong>Primero</strong>'));
 const output=renderFlowSVG(normalizeFlowModel(m));assert.ok(output.includes('Primero')&&output.includes('Segundo'));
});
test('normalized boxes reject unsafe ids/styles, clamp geometry and cap their count',()=>{
 const m=createFlowModel(),n=addFlowNode(m,'process');
 Object.assign(n,{textLayout:{x:9,y:-1,width:8,height:0},textBoxes:Array.from({length:40},()=>({id:'primary',text:'safe',layout:{x:NaN,y:Infinity,width:-9,height:100},fontSize:999,textColor:'url(evil)',richText:{tag:'script',text:'alert(1)'}}))});
 const out=normalizeFlowModel(m).nodes[0];assert.equal(out.textBoxes?.length,19);assert.equal(new Set(out.textBoxes?.map(b=>b.id)).size,19);
 assert.deepEqual(out.textLayout,{x:0,y:0,width:1,height:.02});
 for(const b of out.textBoxes!){assert.notEqual(b.id,'primary');assert.equal(b.fontSize,72);assert.equal(b.textColor,n.textColor);assert.equal(b.richText,undefined);assert.ok(b.layout.x>=0&&b.layout.x+b.layout.width<=1);}
});
test('duplicate and resize preserve relative text placement without aliasing original boxes',()=>{
 const m=createFlowModel(),n=addFlowNode(m,'circle');n.textLayout={x:.3,y:.3,width:.3,height:.3};addFlowTextBox(n);
 const selection=duplicateFlowSelection(m,{kind:'node',ids:[n.id]});assert.ok(selection);const duplicate=m.nodes.find(node=>node.id!==n.id)!;
 assert.deepEqual(duplicate.textBoxes,n.textBoxes);duplicate.textBoxes![0].text='Copia';assert.notEqual(duplicate.textBoxes![0].text,n.textBoxes![0].text);
 const before=flowNodeTextBox(n);n.width*=2;n.height*=2;const after=flowNodeTextBox(n);assert.equal(after.width,before.width*2);assert.equal(n.fontSize,18);
});
test('removing and re-adding boxes never reuses an occupied id',()=>{
 const m=createFlowModel(),n=addFlowNode(m,'data'),a=addFlowTextBox(n)!,b=addFlowTextBox(n)!;
 n.textBoxes=n.textBoxes?.filter(box=>box.id!==a.id);const c=addFlowTextBox(n)!;assert.notEqual(c.id,b.id);
 for(let i=0;i<25;i++)addFlowTextBox(n);assert.equal(n.textBoxes?.length,19);assert.equal(addFlowTextBox(n),undefined);
});
