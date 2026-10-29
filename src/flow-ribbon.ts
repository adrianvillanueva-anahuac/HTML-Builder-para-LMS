import type {PathPoint} from './flow-path';
const distance=(a:PathPoint,b:PathPoint)=>Math.hypot(b.x-a.x,b.y-a.y);
/** Uniform arc-length frames avoid unstable offsets at sparse samples/cusps. */
export function flowRibbonFrames(source:readonly PathPoint[]){
 const raw=source.filter((p,i)=>!i||distance(p,source[i-1])>1e-6),lengths=[0];for(let i=1;i<raw.length;i++)lengths.push(lengths.at(-1)!+distance(raw[i-1],raw[i]));
 const total=lengths.at(-1)||0,count=Math.max(2,Math.min(1600,Math.ceil(total/3))),points:PathPoint[]=[];let segment=1;
 for(let i=0;i<=count;i++){const s=total*i/count;while(segment<raw.length-1&&lengths[segment]<s)segment++;const a=raw[Math.max(0,segment-1)]||source[0],b=raw[segment]||a,t=(s-(lengths[segment-1]||0))/((lengths[segment]||0)-(lengths[segment-1]||0)||1);points.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}
 return points.map((p,i)=>{
  const a=points[Math.max(0,i-2)],b=points[Math.min(count,i+2)],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy)||1;
  const before=distance(a,p),after=distance(p,b),chord=distance(a,b),cross=Math.abs((p.x-a.x)*(b.y-p.y)-(p.y-a.y)*(b.x-p.x));
  const radius=cross>1e-6?before*after*chord/(2*cross):Infinity;
  return{point:p,distance:total*i/count,tangent:{x:dx/length,y:dy/length},normal:{x:-dy/length,y:dx/length},radius};
 });
}
/** Shorten the taper before curvature can fold either offset back on itself. */
export function flowRibbonReach(frames:ReturnType<typeof flowRibbonFrames>,base:number,waist:number,requested:number,end=false){
 const total=frames.at(-1)!.distance;let reach=Math.max(.01,Math.min(requested,total));
 for(const frame of frames){const s=end?total-frame.distance:frame.distance;if(s<.01||s>=reach)continue;const safe=Math.max(waist/2,frame.radius*.45),ratio=Math.max(0,Math.min(1,(safe-waist/2)/Math.max(.01,(base-waist)/2)));if(ratio<1)reach=Math.min(reach,s/(1-Math.sqrt(ratio)));}
 return Math.max(.01,reach);
}
