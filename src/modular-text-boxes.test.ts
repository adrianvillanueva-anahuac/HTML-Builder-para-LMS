import test from 'node:test';
import assert from 'node:assert/strict';
import {createModularCell,createModular} from './modular-model';
import {addModularTextBox,normalizeModularTextBoxes,moveModularTextBox,modularTextStyle,modularTextEntries,modularHasTextContent} from './modular-text-model';
import {flowRichHTML} from './flow-rich-document';
test('legacy cells retain their primary HTML and have no imposed geometry',()=>{
 const cell=createModularCell(createModular(1,1));cell.html='<h2>Original</h2>';addModularTextBox(cell);
 assert.equal(cell.html,'<h2>Original</h2>');assert.equal(cell.textLayout,undefined);assert.equal(cell.textBoxes?.length,1);
});

test('an empty rectangle has only an editor suggestion, not a mandatory primary box',()=>{
 const cell=createModularCell(createModular(1,1));assert.deepEqual(modularTextEntries(cell),[]);assert.equal(cell.html,'');
 for(const html of ['','<p><br></p>','<span>&nbsp;\u200b</span>'])assert.equal(modularHasTextContent(html),false);
});

test('all authored boxes are peers; existing HTML, images and styles keep their stable identity',()=>{
 const cell=createModularCell(createModular(1,1));cell.html='<p>Texto existente</p>';const box=addModularTextBox(cell)!;
 assert.deepEqual(modularTextEntries(cell),[{id:'primary',label:'Caja de texto 1'},{id:box.id,label:'Caja de texto 2'}]);
 cell.html='';assert.deepEqual(modularTextEntries(cell),[{id:box.id,label:'Caja de texto 1'}]);
 assert.ok(modularHasTextContent('<img src="https://example.com/image.png">'));assert.equal(box.document.children,undefined);
 assert.ok(!JSON.stringify(box).includes('Nuevo texto'));
});

test('an explicitly added empty box is distinct from the initial suggestion',()=>{
 const cell=createModularCell(createModular(1,1));cell.textLayout={x:.1,y:.35,width:.8,height:.3};assert.equal(modularTextEntries(cell).length,1);
 delete cell.textLayout;assert.deepEqual(modularTextEntries(cell),[]);
});
test('independent boxes retain rich Builder content and relative geometry in a project round trip',()=>{
 const cell=createModularCell(createModular(1,1));addModularTextBox(cell);const b=addModularTextBox(cell)!,a=cell.textBoxes![0];
 a.document={tag:'div',style:{'font-size':'24px','text-align':'right'},children:[{tag:'ol',classes:['list-custom','list-letters'],children:[{tag:'li',children:[{tag:'#text',text:'Lista'}]}]},{tag:'a',href:'https://example.com/',children:[{tag:'#text',text:'Enlace'}]},{tag:'span',classes:['editable-icon','material-symbols-outlined'],children:[{tag:'#text',text:'school'}]},{tag:'img',src:'https://example.com/a.png'}]};b.layout.x=.1;
 const restored=normalizeModularTextBoxes(JSON.parse(JSON.stringify(cell.textBoxes)));assert.deepEqual(restored,cell.textBoxes);
 const html=flowRichHTML(restored[0].document);assert.ok(html.includes('list-letters')&&html.includes('Enlace')&&html.includes('school')&&html.includes('<img'));
 assert.equal(restored[1].layout.x,.1);assert.notEqual(restored[0].id,restored[1].id);
});
test('all handles share the flow editor constraints and keep boxes inside the padded rectangle',()=>{
 for(const [width,height,padding]of [[400,220,12],[80,40,50],[160,120,0],[850,720,50]]){
  for(const handle of ['move','nw','n','ne','e','se','s','sw','w'])for(const dx of [-2000,0,2000])for(const dy of [-2000,0,2000]){
   const b=moveModularTextBox({x:20,y:20,width:width/2,height:height/3},handle,dx,dy,width,height,padding,12),inset=Math.max(0,Math.min(width/2-1,height/2-1,Math.max(padding,12*(1-Math.SQRT1_2))));
   assert.ok(b.x*width>=inset-1e-8&&b.y*height>=inset-1e-8&&(b.x+b.width)*width<=width-inset+1e-8&&(b.y+b.height)*height<=height-inset+1e-8,`${width} ${height} ${handle}`);
  }
 }
});
test('font styles remain independent of resizing and reject geometry and active CSS',()=>{
 const style=modularTextStyle({'font-size':'30px','font-family':'Zilla Slab',color:'#ff5900','text-align':'right',position:'fixed',width:'100vw',height:'999px',transform:'rotate(90deg)','background-color':'url(evil)'});
 assert.deepEqual(style,{'font-size':'30px','font-family':'Zilla Slab',color:'#ff5900','text-align':'right'});
 const before=JSON.stringify(style);moveModularTextBox({x:10,y:10,width:200,height:100},'se',-50,50,400,220,12,12);assert.equal(JSON.stringify(style),before);
});
test('boxes are capped, ids are unique and safe, and hostile rich documents are inert',()=>{
 const boxes=normalizeModularTextBoxes(Array.from({length:50},()=>({id:'primary',layout:{x:9,y:-1,width:50,height:0},document:{tag:'div',children:[{tag:'script',text:'alert(1)'},{tag:'img',src:'javascript:alert(1)'},{tag:'#text',text:'Seguro'}]}})));
 assert.equal(boxes.length,19);assert.equal(new Set(boxes.map(b=>b.id)).size,19);
 for(const b of boxes){assert.notEqual(b.id,'primary');assert.deepEqual(b.layout,{x:0,y:0,width:1,height:.02});assert.ok(!flowRichHTML(b.document).includes('script'));}
});
test('deleting and adding a box does not overwrite another box or its format',()=>{
 const cell=createModularCell(createModular(1,1)),a=addModularTextBox(cell)!,b=addModularTextBox(cell)!;b.document.style={'font-size':'18px'};
 cell.textBoxes=cell.textBoxes!.filter(box=>box.id!==a.id);const c=addModularTextBox(cell)!;assert.notEqual(c.id,b.id);assert.equal(cell.textBoxes!.find(box=>box.id===b.id)!.document.style?.['font-size'],'18px');
 for(let i=0;i<25;i++)addModularTextBox(cell);assert.equal(cell.textBoxes?.length,19);assert.equal(addModularTextBox(cell),undefined);
});
