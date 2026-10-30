import {normalizeFlowTextLayout,type FlowTextLayout} from './flow-model';
export type ModularOverflowPanel={x:number;y:number;width:number;height:number;radius:number;fill:string;opacity:number;blur:number;dim:number;style:'normal'|'dialogue'|'thought'|'hologram'};
export type ModularOverflow={enabled:boolean;boxIds:string[];button:{x:number;y:number};panel:ModularOverflowPanel;textLayouts?:Record<string,FlowTextLayout>};
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const number=(v:unknown,fallback:number,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
export function defaultOverflowPanel():ModularOverflowPanel{return{x:.5,y:.35,width:380,height:260,radius:16,fill:'#ffffff',opacity:1,blur:0,dim:0,style:'normal'};}
export function normalizeModularOverflow(raw:unknown,ids:string[]=['primary']):ModularOverflow{
 const value=object(raw),button=object(value.button),p=object(value.panel),d=defaultOverflowPanel();
 const textLayouts=Object.fromEntries(Object.entries(object(value.textLayouts)).filter(([id])=>ids.includes(id)).map(([id,layout])=>[id,normalizeFlowTextLayout(layout)]));
 return{enabled:value.enabled===true,boxIds:[...new Set((Array.isArray(value.boxIds)?value.boxIds:ids).filter((id):id is string=>typeof id==='string'&&ids.includes(id)))],button:{x:number(button.x,.5,0,1),y:number(button.y,.5,0,1)},panel:{x:number(p.x,d.x,0,1),y:number(p.y,d.y,0,1),width:number(p.width,d.width,200,960),height:number(p.height,d.height,120,1200),radius:number(p.radius,d.radius,0,100),fill:typeof p.fill==='string'&&/^#[a-f\d]{6}$/i.test(p.fill)?p.fill:d.fill,opacity:number(p.opacity,d.opacity,0,1),blur:number(p.blur,d.blur,0,24),dim:number(p.dim,d.dim,0,.85),style:['normal','dialogue','thought','hologram'].includes(String(p.style))?p.style as ModularOverflowPanel['style']:d.style},...(Object.keys(textLayouts).length?{textLayouts}:{})};
}
/** Button center stays in its own rectangle, including at the four corners. */
export function moveOverflowButton(x:number,y:number,width:number,height:number,buttonWidth:number,buttonHeight:number){
 const bx=Math.min(.5,buttonWidth/Math.max(1,width)/2),by=Math.min(.5,buttonHeight/Math.max(1,height)/2);
 return{x:Math.max(bx,Math.min(1-bx,x)),y:Math.max(by,Math.min(1-by,y))};
}
