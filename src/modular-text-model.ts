import {normalizeFlowTextLayout,type FlowNode,type FlowTextLayout} from './flow-model';
import {moveFlowNodeText} from './flow-node-text';
import {normalizeFlowRichDocument,type FlowRichNode} from './flow-rich-document';
import type {ModularCell} from './modular-model';
export type ModularTextBox={id:string;layout:FlowTextLayout;document:FlowRichNode};
export type ModularTextStyle=Record<string,string>;
/** Empty editor hints are not authored content and never become + info items. */
export function modularHasTextContent(html:string){
 return /<(?:img|svg|video|audio|iframe)\b/i.test(html)||!!html.replace(/<[^>]*>/g,'').replace(/&(?:nbsp|#160|#xA0);/gi,' ').replace(/\u200b/g,'').trim();
}
export function modularTextEntries(cell:ModularCell):{id:string;label:string}[]{
 const ids=[...(cell.textLayout||modularHasTextContent(cell.html)?['primary']:[]),...(cell.textBoxes||[]).map(box=>box.id)];
 return ids.map((id,index)=>({id,label:`Caja de texto ${index+1}`}));
}
const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const keys=new Set(['font-size','font-family','font-weight','font-style','text-decoration','text-align','color','line-height','align-content']);
export function modularTextStyle(raw:unknown):ModularTextStyle{
 const safe=normalizeFlowRichDocument({tag:'div',style:obj(raw)})?.style||{};
 return Object.fromEntries(Object.entries(safe).filter(([key])=>keys.has(key)));
}
export function normalizeModularTextBoxes(raw:unknown):ModularTextBox[]{
 const used=new Set(['primary']);
 return(Array.isArray(raw)?raw:[]).slice(0,19).map((raw,index)=>{
  const b=obj(raw);let id=typeof b.id==='string'&&/^[a-zA-Z][\w-]{0,63}$/.test(b.id)&&!used.has(b.id)?b.id:`text-${index+1}`;
  while(used.has(id))id+='-x';used.add(id);
  return{id,layout:normalizeFlowTextLayout(b.layout),document:normalizeFlowRichDocument(b.document)||{tag:'div'}};
 });
}
/** Exactly the flow editor's drag constraints; font formatting is never transformed. */
export function moveModularTextBox(start:{x:number;y:number;width:number;height:number},handle:string,dx:number,dy:number,width:number,height:number,padding:number,radius:number):FlowTextLayout{
 const inset=Math.max(0,Math.min(width/2-1,height/2-1,Math.max(padding,radius*(1-Math.SQRT1_2))));
 const node:FlowNode={id:'cell',type:'process',x:0,y:0,width,height,radius:inset/(1-Math.SQRT1_2),text:'',fontSize:14,fill:'transparent',stroke:'transparent',strokeWidth:0,textColor:'#333333'};
 const next=moveFlowNodeText(node,start,handle,dx,dy),minX=inset/width,minY=inset/height;
 // Very large padding may leave less space than the generic editor minimum.
 next.width=Math.min(next.width,1-2*minX);next.height=Math.min(next.height,1-2*minY);
 next.x=Math.max(minX,Math.min(1-minX-next.width,next.x));next.y=Math.max(minY,Math.min(1-minY-next.height,next.y));return next;
}
export function addModularTextBox(cell:ModularCell):ModularTextBox|undefined{
 const boxes=normalizeModularTextBoxes(cell.textBoxes);if(boxes.length>=19)return;
 const used=new Set(boxes.map(b=>b.id));let n=1;while(used.has(`text-${n}`))n++;
 const box:ModularTextBox={id:`text-${n}`,layout:{x:.2,y:.16+((n-1)%3)*.2,width:.6,height:.3},document:{tag:'div',style:{'text-align':'center'}}};
 cell.textBoxes=[...boxes,box];return box;
}
