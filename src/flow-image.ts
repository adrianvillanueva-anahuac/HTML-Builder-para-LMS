import {imageAdjustments,type ImageAdjustments} from './image-model';
import {normalizeFlowTextRuns,defaultFlowTextLayout,type FlowTextRun} from './flow-image-text';
import type {ImageTextLayout} from './image-model';
export const flowImageMasks=['none','process','circle','decision','terminator','document','data'] as const;
export type FlowImageMask=typeof flowImageMasks[number];
export type FlowImage={src:string;naturalWidth:number;naturalHeight:number;mask:FlowImageMask;zoom:number;offsetX:number;offsetY:number;rotation:number;flipX:boolean;flipY:boolean;adjustments:ImageAdjustments;alpha:boolean|null;textLayout:ImageTextLayout;textRuns:FlowTextRun[];textAlign:'left'|'center'|'right'};
const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const num=(v:unknown,d:number,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):d;
/** Only raster data or HTTP(S) images; never SVG, blob, file, or executable schemes. */
export function flowImageSource(value:unknown):string{
  if(typeof value!=='string'||value.length>12_000_000)return '';
  if(/^data:image\/(?:png|jpeg|webp|gif);base64,[a-z0-9+/]+={0,2}$/i.test(value))return value;
  try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:'';}catch{return '';}
}
export function normalizeFlowImage(value:unknown):FlowImage{
  const v=obj(value);
  return {src:flowImageSource(v.src),naturalWidth:num(v.naturalWidth,400,1,16384),naturalHeight:num(v.naturalHeight,300,1,16384),mask:flowImageMasks.includes(v.mask as FlowImageMask)?v.mask as FlowImageMask:'none',zoom:num(v.zoom,1,.1,8),offsetX:num(v.offsetX,0,-4,4),offsetY:num(v.offsetY,0,-4,4),rotation:num(v.rotation,0,-180,180),flipX:v.flipX===true,flipY:v.flipY===true,adjustments:imageAdjustments(obj(v.adjustments)),alpha:typeof v.alpha==='boolean'?v.alpha:null,textLayout:defaultFlowTextLayout(v.textLayout),textRuns:normalizeFlowTextRuns(v.textRuns),textAlign:v.textAlign==='left'||v.textAlign==='right'?v.textAlign:'center'};
}
export function flowImagePlacement(image:FlowImage,width:number,height:number){
  const fit=image.mask==='none'?Math.min(width/image.naturalWidth,height/image.naturalHeight):Math.max(width/image.naturalWidth,height/image.naturalHeight);
  const w=image.naturalWidth*fit*image.zoom,h=image.naturalHeight*fit*image.zoom;
  return {x:(width-w)/2+image.offsetX*width,y:(height-h)/2+image.offsetY*height,width:w,height:h};
}
/** Resize a crop frame without moving or rescaling the underlying photograph. */
export function flowReframeImage(image:FlowImage,start:{x:number;y:number;width:number;height:number},next:{x:number;y:number;width:number;height:number}):FlowImage{
 const previous=flowImagePlacement(image,start.width,start.height),base=flowImagePlacement({...image,zoom:1},next.width,next.height);
 return normalizeFlowImage({...image,zoom:previous.width/base.width,offsetX:(start.x+start.width/2+image.offsetX*start.width-next.x-next.width/2)/next.width,offsetY:(start.y+start.height/2+image.offsetY*start.height-next.y-next.height/2)/next.height});
}
