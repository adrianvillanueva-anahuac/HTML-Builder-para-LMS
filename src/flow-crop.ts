import {flowEdgeLabels,type FlowModel,type FlowNode} from './flow-model';
import {flowEdgeGeometry,flowGumGeometry,flowLabelPoint,flowLabelMetrics,type FlowBox} from './flow-geometry';
import {flowStrokeGeometry} from './flow-path';
/** World-coordinate output window. Never mutates figure positions or canvas size. */
export function flowContentBounds(model:FlowModel):FlowBox|null{
  let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
  const point=(x:number,y:number,pad=0)=>{left=Math.min(left,x-pad);top=Math.min(top,y-pad);right=Math.max(right,x+pad);bottom=Math.max(bottom,y+pad);};
  for(const item of [...model.nodes,...model.lanes]){
    const pad='strokeWidth'in item?item.strokeWidth/2:.75;
    point(item.x,item.y,pad);point(item.x+item.width,item.y+item.height,pad);
  }
  const nodes=new Map<string,FlowNode>(model.nodes.map(node=>[node.id,node]));
  for(const edge of model.edges){
    const from=nodes.get(edge.from),to=nodes.get(edge.to);if(!from||!to)continue;
    const geometry=flowEdgeGeometry(edge,from,to),gum=flowGumGeometry(edge,from,to,geometry);
    for(const p of flowStrokeGeometry(edge,geometry).samples)point(p.x,p.y,(gum?gum.waist:edge.width)/2);
    if(gum)for(const p of gum.outline)point(p.x,p.y);
    for(const end of ['start','end']as const){
      const active=end==='start'?edge.startArrow:edge.endArrow,type=end==='start'?edge.startMarker:edge.endMarker;
      if(!active||type==='gum')continue;
      const p=end==='start'?geometry.start:geometry.end,other=end==='start'?geometry.samples[1]:geometry.samples.at(-2);
      if(!other)continue;
      const dx=p.x-other.x,dy=p.y-other.y,length=Math.hypot(dx,dy)||1,v={x:dx/length,y:dy/length},scale=Math.max(10,edge.width*3.5)/10;
      const local=(x:number,y:number)=>point(p.x+v.x*x*scale-v.y*y*scale,p.y+v.y*x*scale+v.x*y*scale);
      if(type==='circle'){point(p.x-v.x*4*scale,p.y-v.y*4*scale,4*scale);}
      else if(type==='square'){for(const x of [-8,0])for(const y of [-4,4])local(x,y);}
      else{local(0,0);local(-8,-4);local(-8,4);}
    }
    for(const label of flowEdgeLabels(edge))if(label.text){const p=flowLabelPoint(geometry.samples,label.position),{width,height}=flowLabelMetrics(edge,label.text);point(p.x-width/2,p.y-height/2);point(p.x+width/2,p.y+height/2);}
  }
  return Number.isFinite(left)?{x:left,y:top,width:Math.max(1,right-left),height:Math.max(1,bottom-top)}:null;
}
export function flowOutputBox(model:FlowModel):FlowBox{
  const content=model.autoCrop?flowContentBounds(model):null;
  return content?{x:content.x-model.cropMarginX,y:content.y-model.cropMarginY,width:content.width+2*model.cropMarginX,height:content.height+2*model.cropMarginY}:{x:0,y:0,width:model.width,height:model.height};
}
