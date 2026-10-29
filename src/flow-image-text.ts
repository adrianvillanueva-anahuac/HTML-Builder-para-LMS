import {imageTextLayout,transformImageText,type ImageTextLayout} from './image-model';
import type {FlowNode} from './flow-model';
import {flowImagePlacement} from './flow-image';
export type FlowTextRun={text:string;bold:boolean;italic:boolean;underline:boolean;font:'Roboto'|'Zilla Slab'|'Lato';color:string;href:string};
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
export const flowTextLink=(value:unknown)=>{try{if(typeof value!=='string'||value.length>2000)return '';if(/^#[\w-]+$/.test(value))return value;const url=new URL(value);return ['https:','http:','mailto:','tel:'].includes(url.protocol)&&!url.username&&!url.password?url.href:'';}catch{return '';}};
export function normalizeFlowTextRuns(value:unknown):FlowTextRun[]{
 let left=1000;return (Array.isArray(value)?value:[]).slice(0,500).flatMap(raw=>{const v=object(raw),text=typeof v.text==='string'?v.text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').slice(0,left):'';left-=text.length;
 return text?[{text,bold:v.bold===true,italic:v.italic===true,underline:v.underline===true,font:((['Roboto','Zilla Slab','Lato'].includes(String(v.font)))?v.font:'Roboto')as FlowTextRun['font'],color:typeof v.color==='string'&&/^#(?:[a-f\d]{3}|[a-f\d]{6})$/i.test(v.color)?v.color:'',href:flowTextLink(v.href)}]:[];});
}
/** Inscribed caption area stays within the mask and the visible image frame. */
export function flowImageTextArea(node:FlowNode){
 const image=node.image!,w=node.width,h=node.height,mask=image.mask;
 let x=0,y=0,width=w,height=h;
 if(mask==='circle'){x=w*(1-Math.SQRT1_2)/2;y=h*(1-Math.SQRT1_2)/2;width=w-2*x;height=h-2*y;}
 else if(mask==='decision'){x=w/4;y=h/4;width=w/2;height=h/2;}
 else if(mask==='data'){x=Math.min(24,w*.12);width=w-2*x;}
 else if(mask==='document')height=h*.72;
 else if(mask==='terminator'||mask==='process'){const inset=(mask==='terminator'?Math.min(w,h)/2:node.radius)*(1-Math.SQRT1_2);x=inset;y=inset;width=w-2*x;height=h-2*y;}
 else if(!image.rotation){const p=flowImagePlacement(image,w,h);x=Math.max(0,p.x);y=Math.max(0,p.y);width=Math.max(1,Math.min(w,p.x+p.width)-x);height=Math.max(1,Math.min(h,p.y+p.height)-y);}
 return {x,y,width:Math.max(1,width),height:Math.max(1,height)};
}
export function flowImageTextBox(node:FlowNode){
 const a=flowImageTextArea(node),layout=node.image!.textLayout,margin=layout.margin/100,availableW=a.width*(1-2*margin),availableH=a.height*(1-2*margin),width=availableW*layout.width/100,height=availableH*(layout.height??40)/100;
 return{x:a.x+a.width*margin+(availableW-width)*layout.x/100,y:a.y+a.height*margin+(availableH-height)*layout.y/100,width,height};
}
export function moveFlowImageText(node:FlowNode,start:ImageTextLayout,handle:string,dx:number,dy:number):ImageTextLayout{
 const area=flowImageTextArea(node),box=flowImageTextBox({...node,image:{...node.image!,textLayout:start}});
 return transformImageText(start,{x:(box.x-area.x)/area.width,y:(box.y-area.y)/area.height,width:box.width/area.width,height:box.height/area.height},handle,dx/area.width,dy/area.height,Math.min(.1,16/area.width),Math.min(.1,12/area.height));
}
export const defaultFlowTextLayout=(value:unknown)=>imageTextLayout({width:90,height:40,...object(value)});
