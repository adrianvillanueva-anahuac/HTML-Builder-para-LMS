export type CropRect={x:number;y:number;width:number;height:number};
export type ImageAdjustments={hue:number;contrast:number;brightness:number;saturation:number;tintHue:number;tint:number};
export type ImageTextLayout={margin:number;x:number;y:number;width:number;height?:number;size:number};
export const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,Number.isFinite(value)?value:min));
const number=(value:unknown,fallback:number,min:number,max:number)=>clamp(value==null?fallback:Number(value),min,max);
export const fullCrop:CropRect={x:0,y:0,width:1,height:1};
export function normalizeCrop(value:Partial<CropRect>={}):CropRect{
  const width=number(value.width,1,.02,1),height=number(value.height,1,.02,1);
  return {x:number(value.x,0,0,1-width),y:number(value.y,0,0,1-height),width,height};
}
export function resizeCrop(crop:CropRect,handle:string,dx:number,dy:number,minX=.02,minY=.02):CropRect{
  let left=crop.x,right=left+crop.width,top=crop.y,bottom=top+crop.height;
  if(handle==='move')return {...crop,x:clamp(left+dx,0,1-crop.width),y:clamp(top+dy,0,1-crop.height)};
  if(handle.includes('w'))left=clamp(left+dx,0,right-minX);
  if(handle.includes('e'))right=clamp(right+dx,left+minX,1);
  if(handle.includes('n'))top=clamp(top+dy,0,bottom-minY);
  if(handle.includes('s'))bottom=clamp(bottom+dy,top+minY,1);
  return normalizeCrop({x:left,y:top,width:right-left,height:bottom-top});
}
export function cropForAspect(natural:number,target:number,x=.5,y=.5):CropRect{
  if(!(natural>0&&target>0))return {...fullCrop};
  const width=Math.min(1,target/natural),height=Math.min(1,natural/target);
  return normalizeCrop({x:(1-width)*x,y:(1-height)*y,width,height});
}
export function imageAdjustments(value:Partial<ImageAdjustments>={}):ImageAdjustments{
  return {hue:number(value.hue,0,-180,180),contrast:number(value.contrast,100,0,200),brightness:number(value.brightness,100,0,200),saturation:number(value.saturation,100,0,200),tintHue:number(value.tintHue,270,0,360),tint:number(value.tint,0,0,100)};
}
export function imageTextLayout(value:Partial<ImageTextLayout>={}):ImageTextLayout{
  const layout:ImageTextLayout={margin:number(value.margin,5,0,25),x:number(value.x,50,0,100),y:number(value.y,50,0,100),width:number(value.width,100,10,100),size:number(value.size,28,10,72)};
  // Old projects keep automatic text height until the box is manipulated.
  if(value.height!=null)layout.height=number(value.height,100,2,100);
  return layout;
}
export function transformImageText(layout:ImageTextLayout,rect:CropRect,handle:string,dx:number,dy:number,minWidth=.1,minHeight=.02):ImageTextLayout{
  const next=resizeCrop(rect,handle,dx,dy,minWidth,minHeight);
  return imageTextLayout({...layout,margin:0,x:next.width<1-1e-6?next.x/(1-next.width)*100:0,y:next.height<1-1e-6?next.y/(1-next.height)*100:0,width:next.width*100,height:next.height*100});
}
export function imageFilter(value:ImageAdjustments){return `hue-rotate(${value.hue}deg) contrast(${value.contrast}%) brightness(${value.brightness}%) saturate(${value.saturation}%)`;}
