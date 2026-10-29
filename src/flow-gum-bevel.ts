import type {FlowNode} from './flow-model';
import {flowContourTangent} from './flow-contour';
import {flowBezier} from './flow-path';
type Point={x:number;y:number};
const n=(v:number)=>String(Math.round(v*100)/100),pos=(p:Point)=>`${n(p.x)} ${n(p.y)}`;
const distance=(a:Point,b:Point)=>Math.hypot(b.x-a.x,b.y-a.y);
export type FlowGumBevel={contact:Point;cut:Point;c1:Point;c2:Point;index:number;tangent:Point;outline:Point[]};
/** Long, tangent shoulders blend the broad contour collar into the thin route. */
export function flowGumBevel(points:readonly Point[],node:FlowNode,width:number,fraction=.45,limitIndex=points.length-1):FlowGumBevel|null{
 if(points.length<2)return null;
 const lengths=points.slice(1).map((p,i)=>distance(points[i],p)),total=lengths.reduce((a,b)=>a+b,0);
 const reach=Math.min(width*2.3,total*fraction,lengths.slice(0,limitIndex).reduce((a,b)=>a+b,0));
 if(reach<.01)return null;
 let travelled=0;
 for(let index=1;index<points.length;index++){
  const a=points[index-1],b=points[index],length=distance(a,b);if(length<1e-8)continue;
  if(travelled+length<reach){travelled+=length;continue;}
  const t=(reach-travelled)/length,cut={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t},contact=points[0],delta={x:cut.x-contact.x,y:cut.y-contact.y};
  const tangent=flowContourTangent(node,contact,delta),projection=Math.max(0,delta.x*tangent.x+delta.y*tangent.y);
  const shoulder=Math.min(width*.42,reach*.4,Math.max(.15,projection*.5)),tail=Math.min(reach*.4,distance(contact,cut)*.4);
  const c1={x:contact.x+tangent.x*shoulder,y:contact.y+tangent.y*shoulder},c2={x:cut.x-(b.x-a.x)/length*tail,y:cut.y-(b.y-a.y)/length*tail};
  // Bezier control points conservatively bound the fillet for cropped exports.
  return {contact,cut,c1,c2,index,tangent,outline:[contact,c1,c2,cut]};
 }
 return null;
}
type GumEnd={node:FlowNode;width:number;fraction?:number;limitIndex?:number};
export function flowGumBoundary(points:readonly Point[],start?:GumEnd,end?:GumEnd){
 const first=start?flowGumBevel(points,start.node,start.width,start.fraction,start.limitIndex):null,last=end?flowGumBevel([...points].reverse(),end.node,end.width,end.fraction,end.limitIndex):null;
 let path=`M ${pos(points[0])}`;const outline:Point[]=[points[0]];
 if(first){path+=` C ${pos(first.c1)} ${pos(first.c2)} ${pos(first.cut)}`;for(let i=1;i<=16;i++)outline.push(flowBezier([first.contact,first.c1,first.c2,first.cut],i/16));}
 const until=last?points.length-1-last.index:points.length-1;
 for(let i=first?.index??1;i<=until;i++){path+=` L ${pos(points[i])}`;outline.push(points[i]);}
 if(last){path+=` L ${pos(last.cut)} C ${pos(last.c2)} ${pos(last.c1)} ${pos(last.contact)}`;outline.push(last.cut);for(let i=1;i<=16;i++)outline.push(flowBezier([last.cut,last.c2,last.c1,last.contact],i/16));}
 return {path,points:outline,bevels:[first,last].filter((bevel):bevel is FlowGumBevel=>!!bevel)};
}
