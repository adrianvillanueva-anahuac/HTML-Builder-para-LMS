import {flowClamp,type FlowModel,type FlowNode,type FlowEdge,type FlowSide} from './flow-model';
import {flowShapeType,flowContourAttachment} from './flow-contour';
import {flowGumBoundary} from './flow-gum-bevel';
import {flowStrokeGeometry,type FlowPathSegment} from './flow-path';
import {flowRibbonFrames,flowRibbonReach} from './flow-ribbon';
export type FlowPoint={x:number;y:number};
type Cardinal=Exclude<FlowSide,'auto'>;
export type FlowBox={x:number;y:number;width:number;height:number};
export type FlowResizeHandle='n'|'ne'|'e'|'se'|'s'|'sw'|'w'|'nw';
const num=(value:number)=>String(Math.round(value*100)/100);
const pos=(point:FlowPoint)=>`${num(point.x)} ${num(point.y)}`;
const horizontal=(side:Cardinal)=>side==='left'||side==='right';
const vector:Record<Cardinal,FlowPoint>={top:{x:0,y:-1},right:{x:1,y:0},bottom:{x:0,y:1},left:{x:-1,y:0}};
export function flowSnap(value:number,model:Pick<FlowModel,'snapMode'|'snapSize'>):number{
  const step=model.snapMode==='grid'?20:model.snapMode==='pixels'?model.snapSize:0;
  return step?Math.round(value/step)*step:value;
}
/** Both snapped modes use centres, so different-sized figures share an axis. */
export function flowSnapPosition(box:FlowBox,x:number,y:number,model:Pick<FlowModel,'snapMode'|'snapSize'>){
  const cx=model.snapMode!=='free'?box.width/2:0,cy=model.snapMode!=='free'?box.height/2:0;
  return {x:flowSnap(x+cx,model)-cx,y:flowSnap(y+cy,model)-cy};
}
export function resizeFlowBoxProportionally(start:FlowBox,handle:FlowResizeHandle,dx:number,dy:number,model:FlowModel):FlowBox{
  const box=resizeFlowBox(start,handle,dx,dy,model,40,32),ratio=start.width/start.height;
  const desired=Math.abs(box.width-start.width)>=Math.abs((box.height-start.height)*ratio)?box.width:box.height*ratio;
  const maxWidth=handle.includes('w')?start.x+start.width:model.width-start.x;
  const maxHeight=handle.includes('n')?start.y+start.height:model.height-start.y;
  const width=flowClamp(desired,Math.max(40,32*ratio),Math.min(maxWidth,maxHeight*ratio)),height=width/ratio;
  return{x:handle.includes('w')?start.x+start.width-width:start.x,y:handle.includes('n')?start.y+start.height-height:start.y,width,height};
}
export function resizeFlowBox(start:FlowBox,handle:FlowResizeHandle,dx:number,dy:number,model:FlowModel,minWidth=80,minHeight=80):FlowBox{
  let left=start.x,top=start.y,right=start.x+start.width,bottom=start.y+start.height;
  if(handle.includes('w'))left=flowClamp(flowSnap(start.x+dx,model),0,right-minWidth);
  if(handle.includes('e'))right=flowClamp(flowSnap(right+dx,model),left+minWidth,model.width);
  if(handle.includes('n'))top=flowClamp(flowSnap(start.y+dy,model),0,bottom-minHeight);
  if(handle.includes('s'))bottom=flowClamp(flowSnap(bottom+dy,model),top+minHeight,model.height);
  return{x:left,y:top,width:right-left,height:bottom-top};
}
function autoSide(node:FlowNode,other:FlowNode):Cardinal{
  const dx=other.x+other.width/2-node.x-node.width/2,dy=other.y+other.height/2-node.y-node.height/2;
  return Math.abs(dx)/node.width>Math.abs(dy)/node.height?dx>=0?'right':'left':dy>=0?'bottom':'top';
}
export function flowAnchor(node:FlowNode,side:Cardinal):FlowPoint{
  const c={x:node.x+node.width/2,y:node.y+node.height/2},v=vector[side];
  const inset=flowShapeType(node)==='data'&&horizontal(side)?Math.min(24,node.width*.12)/2:0;
  if(flowShapeType(node)==='document'&&side==='bottom')return{x:c.x,y:node.y+node.height*.88};
  return{x:c.x+v.x*(node.width/2-inset),y:c.y+v.y*node.height/2};
}
const extend=(point:FlowPoint,side:Cardinal,distance:number):FlowPoint=>({x:point.x+vector[side].x*distance,y:point.y+vector[side].y*distance});
const lerp=(a:FlowPoint,b:FlowPoint,t:number):FlowPoint=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
/** A tight elbow must keep its route: finish the collar before the turn. */
function collarRoom(points:readonly FlowPoint[]){
  const first=points[0],next=points[1]||first,dx=next.x-first.x,dy=next.y-first.y,initial=Math.hypot(dx,dy)||1;
  let distance=0;
  for(let i=1;i<points.length;i++){
    const x=points[i].x-points[i-1].x,y=points[i].y-points[i-1].y,length=Math.hypot(x,y);
    if(length>.0001&&(x*dx+y*dy)/(length*initial)<.995)return{distance:Math.max(.01,distance),index:i-1};
    distance+=length;
  }
  return{distance,index:points.length-1};
}
function pathBuilder(start:FlowPoint){
  let path=`M ${pos(start)}`,current=start;const samples:FlowPoint[]=[start],segments:FlowPathSegment[]=[];
  return{line(to:FlowPoint){const from=current;segments.push({kind:'L',points:[from,to]});const count=Math.max(1,Math.min(80,Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)/6)));for(let i=1;i<=count;i++)samples.push(lerp(from,to,i/count));path+=` L ${pos(to)}`;current=to;},
    quadratic(control:FlowPoint,to:FlowPoint){const from=current;segments.push({kind:'Q',points:[from,control,to]});for(let i=1;i<=16;i++){const t=i/16;samples.push(lerp(lerp(from,control,t),lerp(control,to,t),t));}path+=` Q ${pos(control)} ${pos(to)}`;current=to;},
    cubic(c1:FlowPoint,c2:FlowPoint,to:FlowPoint){const from=current;segments.push({kind:'C',points:[from,c1,c2,to]});for(let i=1;i<=128;i++){const t=i/128;samples.push(lerp(lerp(lerp(from,c1,t),lerp(c1,c2,t),t),lerp(lerp(c1,c2,t),lerp(c2,to,t),t),t));}path+=` C ${pos(c1)} ${pos(c2)} ${pos(to)}`;current=to;},
    result:()=>({path,segments,samples:samples.filter((p,i,all)=>!i||Math.hypot(p.x-all[i-1].x,p.y-all[i-1].y)>.0001)})};
}
function rounded(points:FlowPoint[]){
  const list=points.filter((p,i)=>!i||p.x!==points[i-1].x||p.y!==points[i-1].y),builder=pathBuilder(list[0]);
  for(let i=1;i<list.length-1;i++){
    const prev=list[i-1],p=list[i],next=list[i+1],before=Math.hypot(p.x-prev.x,p.y-prev.y),after=Math.hypot(next.x-p.x,next.y-p.y),r=Math.min(12,before/2,after/2);
    builder.line({x:p.x+(prev.x-p.x)*r/before,y:p.y+(prev.y-p.y)*r/before});
    builder.quadratic(p,{x:p.x+(next.x-p.x)*r/after,y:p.y+(next.y-p.y)*r/after});
  }
  builder.line(list[list.length-1]);return builder.result();
}
/** Scale text, background and hit area together; crop and SVG share these metrics. */
export function flowLabelMetrics(edge:Pick<FlowEdge,'labelScale'>,text:string){
  const scale=flowClamp(typeof edge.labelScale==='number'&&Number.isFinite(edge.labelScale)?edge.labelScale:100,50,300)/100;
  return{width:Math.min(280,Math.max(34,text.length*7.5+18))*scale,height:24*scale,fontSize:13*scale,padding:10*scale,radius:5*scale};
}
export function flowLabelPoint(samples:readonly FlowPoint[],fraction=.5):FlowPoint{
  const lengths=samples.slice(1).map((p,i)=>Math.hypot(p.x-samples[i].x,p.y-samples[i].y));
  let remaining=lengths.reduce((a,b)=>a+b,0)*flowClamp(fraction,0,1);
  for(let i=0;i<lengths.length;i++){if(remaining<=lengths[i])return lerp(samples[i],samples[i+1],lengths[i]?remaining/lengths[i]:0);remaining-=lengths[i];}
  return samples.at(-1)||{x:0,y:0};
}
/** Project onto the visible sampled curve, not its bounding box. */
export function flowLabelPosition(samples:readonly FlowPoint[],point:FlowPoint):number{
  let total=0,best=Infinity,at=0;
  for(let i=1;i<samples.length;i++){
    const a=samples[i-1],b=samples[i],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);
    if(!length)continue;
    const t=flowClamp(((point.x-a.x)*dx+(point.y-a.y)*dy)/(length*length),0,1),p=lerp(a,b,t),distance=Math.hypot(p.x-point.x,p.y-point.y);
    if(distance<best){best=distance;at=total+t*length;}total+=length;
  }
  return total?at/total:.5;
}
function simplify(points:FlowPoint[]):FlowPoint[]{
  const result:FlowPoint[]=[];
  for(const point of points){
    if(result.length&&Math.hypot(point.x-result.at(-1)!.x,point.y-result.at(-1)!.y)<.001)continue;
    while(result.length>1){const a=result.at(-2)!,b=result.at(-1)!,u={x:b.x-a.x,y:b.y-a.y},v={x:point.x-b.x,y:point.y-b.y};if(Math.abs(u.x*v.y-u.y*v.x)>.001||u.x*v.x+u.y*v.y<=0)break;result.pop();}result.push({...point});
  }
  return result;
}
/** Geometry and interaction handles share the same route, including rounded corners. */
export function flowEdgeGeometry(edge:FlowEdge,from:FlowNode,to:FlowNode){
  const fromSide=edge.fromSide==='auto'?autoSide(from,to):edge.fromSide,toSide=edge.toSide==='auto'?autoSide(to,from):edge.toSide;
  const start=flowAnchor(from,fromSide),end=flowAnchor(to,toSide);
  let built:ReturnType<ReturnType<typeof pathBuilder>['result']>,bendHandle:{x:number;y:number;axis:'x'|'y'}|undefined,controlPoints:FlowPoint[]=[];
  if(edge.route==='straight'){const b=pathBuilder(start);b.line(end);built=b.result();}
  else if(edge.route==='curve'){
    const distance=Math.max(40,Math.min(200,Math.hypot(start.x-end.x,start.y-end.y)*.45)),b=pathBuilder(start);
    b.cubic(extend(start,fromSide,distance),extend(end,toSide,distance),end);built=b.result();
  }else{
    const first=extend(start,fromSide,26),last=extend(end,toSide,26);
    let axis:'x'|'y'=horizontal(fromSide)?'x':'y';
    if(horizontal(fromSide)&&horizontal(toSide)&&Math.abs(first.y-last.y)<1)axis='y';
    if(!horizontal(fromSide)&&!horizontal(toSide)&&Math.abs(first.x-last.x)<1)axis='x';
    axis=edge.bend?.axis||axis;
    let position=(first[axis]+last[axis])/2;
    if(axis==='x'&&horizontal(fromSide)&&fromSide===toSide)position=fromSide==='right'?Math.max(first.x,last.x)+26:Math.min(first.x,last.x)-26;
    if(axis==='y'&&!horizontal(fromSide)&&fromSide===toSide)position=fromSide==='bottom'?Math.max(first.y,last.y)+26:Math.min(first.y,last.y)-26;
    position=edge.bend?.position??position;
    const bends=axis==='x'?[{x:position,y:first.y},{x:position,y:last.y}]:[{x:first.x,y:position},{x:last.x,y:position}];
    controlPoints=simplify([start,first,...bends,last,end]);
    if(edge.waypoints?.length){
      const inner=edge.waypoints.map(p=>({...p}));
      inner[0][horizontal(fromSide)?'y':'x']=start[horizontal(fromSide)?'y':'x'];
      inner.at(-1)![horizontal(toSide)?'y':'x']=end[horizontal(toSide)?'y':'x'];
      const repaired=[start];
      for(const p of [...inner,end]){const prev=repaired.at(-1)!;if(Math.abs(prev.x-p.x)>.001&&Math.abs(prev.y-p.y)>.001)repaired.push({x:p.x,y:prev.y});repaired.push(p);}
      controlPoints=simplify(repaired);
    }
    built=rounded(controlPoints);bendHandle={x:(bends[0].x+bends[1].x)/2,y:(bends[0].y+bends[1].y)/2,axis};
  }
  const bendHandles=controlPoints.slice(1).flatMap((p,index)=>{const a=controlPoints[index],length=Math.hypot(p.x-a.x,p.y-a.y);if(length<8)return[];const axis:'x'|'y'=Math.abs(p.x-a.x)<.001?'x':'y';return[{index,axis,x:(a.x+p.x)/2,y:(a.y+p.y)/2,position:a[axis],length}];});
  return{...built,start,end,fromSide,toSide,label:flowLabelPoint(built.samples),bendHandle,bendHandles,controlPoints};
}
/** Move one run without detaching either port; end runs gain a short fixed collar. */
export function moveFlowEdgeRun(edge:FlowEdge,from:FlowNode,to:FlowNode,index:number,position:number):FlowPoint[]{
  const geometry=flowEdgeGeometry(edge,from,to),points=geometry.controlPoints.map(p=>({...p})),a=points[index],b=points[index+1];
  if(!a||!b)return edge.waypoints||[];
  const axis:'x'|'y'=Math.abs(b.x-a.x)<.001?'x':'y',replacement:FlowPoint[]=[];
  if(index===0){const stub=extend(a,geometry.fromSide,26);replacement.push(a,stub,{...stub,[axis]:position});}else replacement.push({...a,[axis]:position});
  if(index+1===points.length-1){const stub=extend(b,geometry.toSide,26);replacement.push({...stub,[axis]:position},stub,b);}else replacement.push({...b,[axis]:position});
  return simplify([...points.slice(0,index),...replacement,...points.slice(index+2)]).slice(1,-1);
}
/** A swept ribbon follows the exact sampled route, narrowing towards its centre. */
export function flowGumGeometry(edge:FlowEdge,from:FlowNode,to:FlowNode,geometry=flowEdgeGeometry(edge,from,to)){
  const wideStart=edge.startArrow&&edge.startMarker==='gum',wideEnd=edge.endArrow&&edge.endMarker==='gum';
  if(!wideStart&&!wideEnd)return null;
  geometry=flowStrokeGeometry(edge,geometry);if(!geometry.path)return null;
  const ratio=(edge.gumBase??75)/100;
  const startWidth=wideStart?(horizontal(geometry.fromSide)?from.height:from.width)*ratio:edge.width;
  const endWidth=wideEnd?(horizontal(geometry.toSide)?to.height:to.width)*ratio:edge.width;
  const waist=Math.min(edge.width,wideStart?startWidth*.2:Infinity,wideEnd?endWidth*.2:Infinity);
  const points=geometry.samples.length>1?geometry.samples:[geometry.start,geometry.end];
  const frames=flowRibbonFrames(points),total=frames.at(-1)!.distance||1,fraction=wideStart&&wideEnd?.45:.8;
  const startRoom=edge.route==='orthogonal'?collarRoom(points):{distance:total,index:points.length-1};
  const endRoom=edge.route==='orthogonal'?collarRoom([...points].reverse()):{distance:total,index:points.length-1};
  const startReach=flowRibbonReach(frames,startWidth,waist,Math.min(edge.gumReach??180,total*fraction,startRoom.distance));
  const endReach=flowRibbonReach(frames,endWidth,waist,Math.min(edge.gumReach??180,total*fraction,endRoom.distance),true);
  const profile=(distance:number,reach:number)=>Math.max(0,1-distance/reach)**2;
  const left:FlowPoint[]=[],right:FlowPoint[]=[],sections=frames.map(frame=>{
    const width=Math.min(waist+(wideStart?(startWidth-waist)*profile(frame.distance,startReach):0)+(wideEnd?(endWidth-waist)*profile(total-frame.distance,endReach):0),Math.max(waist,frame.radius*.9));
    const p=frame.point,n=frame.normal;left.push({x:p.x+n.x*width/2,y:p.y+n.y*width/2});right.push({x:p.x-n.x*width/2,y:p.y-n.y*width/2});return{...frame,width};
  });
  // Blend contour depth along the whole taper; a small tangent fillet only rounds
  // the seam. Long free Beziers must never shortcut the actual connector route.
  for(const [enabled,node,side,isEnd]of [[wideStart,from,geometry.fromSide,false],[wideEnd,to,geometry.toSide,true]]as const){
    if(!enabled)continue;const index=isEnd?left.length-1:0,reach=isEnd?endReach:startReach;
    for(const boundary of [left,right]){const root=boundary[index],contact=flowContourAttachment(node,root,vector[side]),dx=contact.x-root.x,dy=contact.y-root.y;
      for(let i=0;i<boundary.length;i++){const weight=profile(isEnd?total-frames[i].distance:frames[i].distance,reach);boundary[i]={x:boundary[i].x+dx*weight,y:boundary[i].y+dy*weight};}
    }
  }
  const cap=(node:FlowNode,a:FlowPoint,b:FlowPoint,side:Cardinal)=>Array.from({length:15},(_,i)=>flowContourAttachment(node,lerp(a,b,(i+1)/16),vector[side]));
  const endCap=wideEnd?cap(to,left.at(-1)!,right.at(-1)!,geometry.toSide):[],startCap=wideStart?cap(from,right[0],left[0],geometry.fromSide):[];
  const filletIndex=(reach:number,width:number)=>Math.max(1,frames.findIndex(frame=>frame.distance>=Math.min(22,reach*.18,width*.3,total*.1)));
  const start=wideStart?{node:from,width:startWidth,fraction,limitIndex:filletIndex(startReach,startWidth)}:undefined,end=wideEnd?{node:to,width:endWidth,fraction,limitIndex:filletIndex(endReach,endWidth)}:undefined;
  const leftEdge=flowGumBoundary(left,start,end),rightEdge=flowGumBoundary([...right].reverse(),end,start),bevels=[...leftEdge.bevels,...rightEdge.bevels];
  const caps=(cap:FlowPoint[])=>cap.map(point=>` L ${pos(point)}`).join('');
  return{path:`${leftEdge.path}${caps(endCap)}${rightEdge.path.replace(/^M /,' L ')}${caps(startCap)} Z`,startWidth,endWidth,waist,startReach,endReach,sections,polygon:[...leftEdge.points,...endCap,...rightEdge.points,...startCap],outline:[...left,...right,...bevels.flatMap(bevel=>bevel.outline)],bevels,attachments:{start:[left[0],right[0]],end:[left.at(-1)!,right.at(-1)!]}};
}
