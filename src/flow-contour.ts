import type {FlowNode} from './flow-model';
type Point={x:number;y:number};
export const flowShapeType=(node:FlowNode)=>node.type==='image'?(node.image?.mask==='none'?'process':node.image?.mask||'process'):node.type;
/** The same silhouette as the SVG shapes, sampled only for attachment geometry. */
export function flowContour(node:FlowNode):Point[]{
  const w=node.width,h=node.height,type=flowShapeType(node),points:Point[]=[];
  if(type==='decision')return [{x:w/2,y:0},{x:w,y:h/2},{x:w/2,y:h},{x:0,y:h/2}];
  if(type==='data'){const s=Math.min(24,w*.12);return [{x:s,y:0},{x:w,y:0},{x:w-s,y:h},{x:0,y:h}];}
  if(type==='circle')for(let i=0;i<128;i++){const a=i*Math.PI/64;points.push({x:w/2+Math.cos(a)*w/2,y:h/2+Math.sin(a)*h/2});}
  else if(type==='document'){
    points.push({x:0,y:0},{x:w,y:0},{x:w,y:.86*h});
    const q=(a:Point,b:Point,c:Point)=>{for(let i=1;i<=32;i++){const t=i/32,u=1-t;points.push({x:u*u*a.x+2*u*t*b.x+t*t*c.x,y:u*u*a.y+2*u*t*b.y+t*t*c.y});}};
    q({x:w,y:.86*h},{x:.75*w,y:.72*h},{x:w/2,y:.88*h});q({x:w/2,y:.88*h},{x:.25*w,y:1.04*h},{x:0,y:.9*h});
  }else{
    const r=Math.min(type==='terminator'?Math.min(w,h)/2:node.type==='image'&&node.image?.mask==='none'?0:node.radius,w/2,h/2);
    for(const [cx,cy,start] of [[w-r,r,-90],[w-r,h-r,0],[r,h-r,90],[r,r,180]])for(let i=0;i<=16;i++){const a=(start+i*90/16)*Math.PI/180;points.push({x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r});}
  }
  return points;
}
/** Outermost boundary on a parallel ray; the ribbon then overlaps beneath the fill. */
export function flowContourAttachment(node:FlowNode,point:Point,outward:Point):Point{
  const polygon=flowContour(node),p={x:point.x-node.x,y:point.y-node.y};let best=-Infinity;
  for(let i=0;i<polygon.length;i++){
    const a=polygon[i],b=polygon[(i+1)%polygon.length],sx=b.x-a.x,sy=b.y-a.y,den=outward.x*sy-outward.y*sx;
    if(Math.abs(den)<1e-9)continue;
    const ax=a.x-p.x,ay=a.y-p.y,t=(ax*sy-ay*sx)/den,u=(ax*outward.y-ay*outward.x)/den;
    if(u>=-1e-7&&u<=1+1e-7)best=Math.max(best,t);
  }
  if(!Number.isFinite(best))return point;
  const overlap=Math.max(.8,node.strokeWidth/2);
  return {x:point.x+outward.x*(best-overlap),y:point.y+outward.y*(best-overlap)};
}
/** Local contour direction at the join, oriented towards the ribbon. */
export function flowContourTangent(node:FlowNode,point:Point,towards:Point):Point{
  const polygon=flowContour(node);let best=Infinity,tangent={x:0,y:1};
  for(let i=0;i<polygon.length;i++){
    const a={x:polygon[i].x+node.x,y:polygon[i].y+node.y},b=polygon[(i+1)%polygon.length],dx=b.x+node.x-a.x,dy=b.y+node.y-a.y,length=dx*dx+dy*dy;
    if(length<1e-12)continue;
    const t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/length)),distance=(point.x-a.x-t*dx)**2+(point.y-a.y-t*dy)**2;
    if(distance<best){best=distance;const sign=dx*towards.x+dy*towards.y<0?-1:1;tangent={x:dx/Math.sqrt(length)*sign,y:dy/Math.sqrt(length)*sign};}
  }
  return tangent;
}
