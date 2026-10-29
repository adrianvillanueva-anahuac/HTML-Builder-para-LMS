import {normalizeFlowTextLayout,type FlowNode,type FlowTextLayout,type FlowTextBox} from './flow-model';
import {flowImageTextBox,flowImageTextArea,normalizeFlowTextRuns} from './flow-image-text';
import {resizeCrop} from './image-model';
/** Extra captions use the same renderer and the same Builder tools as the original. */
export function flowTextNode(node:FlowNode,boxId='primary'):FlowNode|undefined{
 if(boxId==='primary')return node;
 const box=node.textBoxes?.find(box=>box.id===boxId);if(!box)return;
 return {...node,image:undefined,textBoxes:undefined,text:box.text,textRuns:box.textRuns,textAlign:box.textAlign,textColor:box.textColor,fontSize:box.fontSize,richText:box.richText,textLayout:box.layout};
}
/** One rich-text engine for image captions, free text and figure labels. */
export function flowNodeTextState(node:FlowNode){
 const stored=node.image?.textRuns||node.textRuns||[];
 return {runs:stored.map(run=>run.text).join('')===node.text?stored:normalizeFlowTextRuns([{text:node.text}]),align:node.image?.textAlign||node.textAlign||'center'};
}
export function flowNodeTextBox(node:FlowNode){
 if(node.textLayout){const b=node.textLayout;return{x:b.x*node.width,y:b.y*node.height,width:b.width*node.width,height:b.height*node.height};}
 if(node.image)return flowImageTextBox(node);
 const padding=node.type==='decision'?.25:node.type==='circle'?.22:.12;
 const width=Math.max(10,node.width*(1-2*padding)),height=Math.max(12,node.height*(1-2*padding));
 return{x:(node.width-width)/2,y:node.height*(node.type==='document'?.43:.5)-height/2,width,height};
}
/** A rectangle inscribed in each silhouette keeps all four text corners inside. */
export function flowNodeTextArea(node:FlowNode){
 if(node.image)return flowImageTextArea(node);
 const w=node.width,h=node.height,type=node.type;
 let x=0,y=0,width=w,height=h;
 if(type==='decision'){x=w/4;y=h/4;width=w/2;height=h/2;}
 else if(type==='circle'){x=w*(1-Math.SQRT1_2)/2;y=h*(1-Math.SQRT1_2)/2;width=w-2*x;height=h-2*y;}
 else if(type==='data'){x=Math.min(24,w*.12);width=w-2*x;}
 else if(type==='document')height=h*.84;
 else if(type!=='text'){x=y=(type==='terminator'?Math.min(w,h)/2:node.radius)*(1-Math.SQRT1_2);width=w-2*x;height=h-2*y;}
 return{x,y,width:Math.max(1,width),height:Math.max(1,height)};
}
export function moveFlowNodeText(owner:FlowNode,box:{x:number;y:number;width:number;height:number},handle:string,dx:number,dy:number):FlowTextLayout{
 const a=flowNodeTextArea(owner),width=Math.min(1,box.width/a.width),height=Math.min(1,box.height/a.height);
 const rect={x:Math.max(0,Math.min(1-width,(box.x-a.x)/a.width)),y:Math.max(0,Math.min(1-height,(box.y-a.y)/a.height)),width,height};
 const moved=resizeCrop(rect,handle,dx/a.width,dy/a.height,Math.min(.1,16/a.width),Math.min(.1,12/a.height));
 return normalizeFlowTextLayout({x:(a.x+moved.x*a.width)/owner.width,y:(a.y+moved.y*a.height)/owner.height,width:moved.width*a.width/owner.width,height:moved.height*a.height/owner.height});
}
export function addFlowTextBox(node:FlowNode):FlowTextBox|undefined{
 if((node.textBoxes?.length||0)>=19)return;
 const used=new Set(node.textBoxes?.map(box=>box.id));let n=1;while(used.has(`text-${n}`))n++;
 const a=flowNodeTextArea(node),height=Math.min(a.height,Math.max(node.fontSize*1.5,a.height*.3)),width=a.width*.65;
 const box={id:`text-${n}`,text:'Nuevo texto',layout:normalizeFlowTextLayout({x:(a.x+(a.width-width)/2)/node.width,y:(a.y+Math.min(a.height-height,((n-1)%3)*a.height*.3))/node.height,width:width/node.width,height:height/node.height}),fontSize:node.fontSize,textColor:node.textColor,textAlign:'center' as const,textRuns:normalizeFlowTextRuns([{text:'Nuevo texto'}])};
 (node.textBoxes??=[]).push(box);return box;
}
