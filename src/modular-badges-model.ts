import {clamp,type ModularModel} from './modular-model';

export type PerimeterPosition={edge:'top'|'right'|'bottom'|'left';offset:number};
export type PerimeterBadge={shape:'circle'|'rounded'|'hexagon'|'triangle';color:string;strokeColor?:string;strokeWidth?:number;scale:number;position:PerimeterPosition;text:string;html?:string;textStyle?:string;width?:number;height?:number};
export const badgeShapes={circle:'Círculo',rounded:'Rectángulo redondeado',hexagon:'Hexágono',triangle:'Triángulo'};
export function normalizeBadge(value:unknown):PerimeterBadge|undefined {
  if(!value||typeof value!=='object')return;
  const badge=value as Partial<PerimeterBadge>;
  if(!Object.hasOwn(badgeShapes,badge.shape||''))return;
  const strokeColor=/^#[0-9a-f]{6}$/i.test(badge.strokeColor||'')?badge.strokeColor!:undefined;
  const strokeWidth=Number.isFinite(badge.strokeWidth)?clamp(badge.strokeWidth!,0,8):0;
  return {shape:badge.shape!,color:/^#[0-9a-f]{6}$/i.test(badge.color||'')?badge.color!:'#5d428c',
    ...(strokeColor?{strokeColor}:{}),...(strokeWidth>0?{strokeWidth}:{}),
    scale:Number.isFinite(badge.scale)?clamp(badge.scale!,.5,2):1,position:normalizePosition(badge.position),
    text:typeof badge.text==='string'?badge.text:'',...(typeof badge.html==='string'?{html:badge.html}:{}),
    ...(typeof badge.textStyle==='string'?{textStyle:badge.textStyle}:{}),
    ...(Number.isFinite(badge.width)?{width:clamp(badge.width!,16,1200)}:{}),...(Number.isFinite(badge.height)?{height:clamp(badge.height!,16,600)}:{})};
}
export function roundedBadgeGeometry(badge:PerimeterBadge,cellWidth:number){
 const width=Math.min(Math.max(1,cellWidth),badge.width??96*badge.scale),height=badge.height??54*badge.scale,point=perimeterPoint(badge.position,cellWidth,100);
 return{width,height,left:Math.max(width/2,Math.min(cellWidth-width/2,point.x))};
}
export function normalizePosition(value?:Partial<PerimeterPosition>):PerimeterPosition {
  return {edge:['top','right','bottom','left'].includes(value?.edge||'')?value!.edge!:'top',
    offset:Number.isFinite(value?.offset)?clamp(value!.offset!,0,1):.5};
}
export function createBadge(shape:PerimeterBadge['shape']):PerimeterBadge {
  return {shape,color:'#5d428c',scale:1,position:{edge:'top',offset:.5},text:''};
}
// Edge-relative fractions remain aligned on responsive cells of any aspect ratio.
export function perimeterPoint(position:PerimeterPosition,width=1,height=1) {
  const {edge,offset}=normalizePosition(position);
  return {x:edge==='left'?0:edge==='right'?width:offset*width,
    y:edge==='top'?0:edge==='bottom'?height:offset*height};
}
export function projectToPerimeter(x:number,y:number,width:number,height:number):PerimeterPosition {
  width=Math.max(1,width);height=Math.max(1,height);
  x=Number.isFinite(x)?x:width/2;y=Number.isFinite(y)?y:0;
  const px=clamp(x,0,width),py=clamp(y,0,height);
  const candidates:[PerimeterPosition,number][]=[
    [{edge:'top',offset:px/width},Math.hypot(x-px,y)],
    [{edge:'right',offset:py/height},Math.hypot(x-width,y-py)],
    [{edge:'bottom',offset:px/width},Math.hypot(x-px,y-height)],
    [{edge:'left',offset:py/height},Math.hypot(x,y-py)]
  ];
  return candidates.sort((a,b)=>a[1]-b[1])[0][0];
}
export function stepPerimeter(position:PerimeterPosition,delta:number):PerimeterPosition {
  const {edge,offset}=normalizePosition(position),sides=['top','right','bottom','left'] as const;
  const distance=sides.indexOf(edge)+(edge==='bottom'||edge==='left'?1-offset:offset);
  const next=((distance+delta)%4+4)%4,index=Math.floor(next),fraction=next-index;
  return {edge:sides[index],offset:index>=2?1-fraction:fraction};
}
export function alignBadges(model:ModularModel,position:PerimeterPosition) {
  Object.values(model.cells).forEach(cell=>{if(cell.badge)cell.badge.position={...normalizePosition(position)};});
}
export function setAllBadgesColor(model:ModularModel,color:string) {
  if(!/^#[0-9a-f]{6}$/i.test(color))return;
  Object.values(model.cells).forEach(cell=>{if(cell.badge)cell.badge.color=color;});
}
export function setAllBadgesStroke(model:ModularModel,stroke:{color?:string;width?:number}) {
  const validColor=stroke.color&&/^#[0-9a-f]{6}$/i.test(stroke.color)?stroke.color:undefined;
  const validWidth=stroke.width!==undefined&&Number.isFinite(stroke.width)?clamp(stroke.width,0,8):undefined;
  Object.values(model.cells).forEach(cell=>{
    const badge=cell.badge;if(!badge)return;
    if(validColor){
      badge.strokeColor=validColor;
      if(validWidth===undefined&&!badge.strokeWidth)badge.strokeWidth=2;
    }
    if(validWidth!==undefined){
      if(validWidth<=0)delete badge.strokeWidth;
      else{
        badge.strokeWidth=validWidth;
        if(!badge.strokeColor)badge.strokeColor='#5d428c';
      }
    }
  });
}
export function setAllBadgesScale(model:ModularModel,scale:number) {
  const next=clamp(scale,.5,2);
  Object.values(model.cells).forEach(cell=>{
    const badge=cell.badge;if(!badge)return;
    const prev=badge.scale||1;
    if(badge.shape==='rounded'){
      if(Number.isFinite(badge.width))badge.width=clamp(Math.round(badge.width!*(next/prev)),16,1200);
      if(Number.isFinite(badge.height))badge.height=clamp(Math.round(badge.height!*(next/prev)),16,600);
    }
    badge.scale=next;
  });
}
