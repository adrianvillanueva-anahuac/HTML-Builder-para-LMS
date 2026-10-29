import type {FlowEdge,FlowMarker} from './flow-model';
export type PathPoint={x:number;y:number};
export type FlowPathSegment={kind:'L'|'Q'|'C';points:PathPoint[]};
const mix=(a:PathPoint,b:PathPoint,t:number)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
const distance=(a:PathPoint,b:PathPoint)=>Math.hypot(b.x-a.x,b.y-a.y);
const pos=(p:PathPoint)=>`${Math.round(p.x*100)/100} ${Math.round(p.y*100)/100}`;
export function flowBezier(points:readonly PathPoint[],t:number):PathPoint{let row=[...points];while(row.length>1)row=row.slice(1).map((point,i)=>mix(row[i],point,t));return row[0];}
function split(segment:FlowPathSegment,t:number){let row=segment.points;const left=[row[0]],right=[row.at(-1)!];while(row.length>1){row=row.slice(1).map((point,i)=>mix(row[i],point,t));left.push(row[0]);right.unshift(row.at(-1)!);}return[{kind:segment.kind,points:left},{kind:segment.kind,points:right}];}
export function flowPathSamples(segments:readonly FlowPathSegment[]){const points:PathPoint[]=[];for(const segment of segments){const count=segment.kind==='L'?Math.max(1,Math.ceil(distance(segment.points[0],segment.points.at(-1)!)/6)):128;for(let i=points.length?1:0;i<=count;i++)points.push(flowBezier(segment.points,i/count));}return points;}
/** Marker tips stay on the figure; the shaft joins the rear of the symbol. */
export function flowMarkerInset(marker:FlowMarker,width:number){
 if(marker==='gum')return 0;const scale=Math.max(10,width*3.5)/10;
 return marker==='circle'?(4+Math.sqrt(Math.max(0,16-(width/2/scale)**2)))*scale:8*scale;
}
/** Trim by arc length while retaining the original L/Q/C Bezier primitives. */
export function flowStrokeGeometry<T extends {path:string;segments:FlowPathSegment[];samples:PathPoint[];start:PathPoint;end:PathPoint}>(edge:FlowEdge,geometry:T){
 const trimStart=edge.startArrow?flowMarkerInset(edge.startMarker,edge.width):0,trimEnd=edge.endArrow?flowMarkerInset(edge.endMarker,edge.width):0;
 if(!trimStart&&!trimEnd)return{...geometry,trimStart,trimEnd};
 const measured=geometry.segments.map(segment=>{const count=segment.kind==='L'?1:128,lengths=[0];let previous=segment.points[0];for(let i=1;i<=count;i++){const p=flowBezier(segment.points,i/count);lengths.push(lengths.at(-1)!+distance(previous,p));previous=p;}return{segment,lengths,count,length:lengths.at(-1)!};});
 const total=measured.reduce((sum,item)=>sum+item.length,0),available=Math.max(0,total-trimStart-trimEnd),segments:FlowPathSegment[]=[];let travelled=0;
 const curved=geometry.segments.some(segment=>segment.kind!=='L'),leadStart=curved&&trimStart?Math.min(Math.max(6,edge.width*1.5),available*.2):0,leadEnd=curved&&trimEnd?Math.min(Math.max(6,edge.width*1.5),available*.2):0;
 if(trimStart+trimEnd<total-.001)for(const item of measured){
  const from=Math.max(0,trimStart+leadStart-travelled),to=Math.min(item.length,total-trimEnd-leadEnd-travelled);travelled+=item.length;if(to<=from||item.length<1e-8)continue;
  const tAt=(length:number)=>{if(length<=0)return 0;if(length>=item.length)return 1;let i=1;while(item.lengths[i]<length)i++;return(i-1+(length-item.lengths[i-1])/(item.lengths[i]-item.lengths[i-1]))/item.count;};
  const a=tAt(from),b=tAt(to),head=b<1?split(item.segment,b)[0]:item.segment;segments.push(a>0?split(head,a/b)[1]:head);
 }
 const tangent=(segment:FlowPathSegment,end=false)=>{const p=end?segment.points.at(-1)!:segment.points[0],other=(end?[...segment.points].reverse():segment.points).find(point=>distance(p,point)>1e-8)||p,sign=end?-1:1,length=distance(p,other)||1;return{x:(other.x-p.x)/length*sign,y:(other.y-p.y)/length*sign};};
 if(segments.length&&leadStart){const v=tangent(geometry.segments[0]),cut=segments[0].points[0],t=tangent(segments[0]),join={x:geometry.start.x+v.x*trimStart,y:geometry.start.y+v.y*trimStart};segments.unshift({kind:'C',points:[join,{x:join.x+v.x*leadStart*.55,y:join.y+v.y*leadStart*.55},{x:cut.x-t.x*leadStart*.45,y:cut.y-t.y*leadStart*.45},cut]});}
 if(segments.length&&leadEnd){const v=tangent(geometry.segments.at(-1)!,true),cut=segments.at(-1)!.points.at(-1)!,t=tangent(segments.at(-1)!,true),join={x:geometry.end.x-v.x*trimEnd,y:geometry.end.y-v.y*trimEnd};segments.push({kind:'C',points:[cut,{x:cut.x+t.x*leadEnd*.45,y:cut.y+t.y*leadEnd*.45},{x:join.x-v.x*leadEnd*.55,y:join.y-v.y*leadEnd*.55},join]});}
 const samples=flowPathSamples(segments),start=samples[0]||geometry.start,end=samples.at(-1)||geometry.end;
 return{...geometry,trimStart,trimEnd,segments,samples,path:segments.length?`M ${pos(start)}`+segments.map(segment=>` ${segment.kind} ${segment.points.slice(1).map(pos).join(' ')}`).join(''):'',start,end};
}
