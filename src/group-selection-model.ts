import {isPageTemplateType} from './references';

export function isGroupPage(el:HTMLElement):boolean {
  if(el.parentElement?.id!=='canvas')return false;
  const type=el.dataset.type;
  // Older page templates have no type. A typed box/tab with a dropzone is
  // still one selectable block, not a page whose children may be split up.
  return type ? type==='pagina_completa'||isPageTemplateType(type) : !!el.querySelector(':scope > .lms-dropzone');
}

export function groupDragStarted(x:number,y:number,nextX:number,nextY:number):boolean {
  return Math.hypot(nextX-x,nextY-y)>5;
}

export function groupToolsPosition(left:number,right:number,top:number,minTop:number,maxBottom:number,viewportLeft:number,viewportRight:number,width:number) {
  const half=width/2+8;
  return {
    top:Math.max(minTop,Math.min(maxBottom-44,top-46)),
    center:Math.max(viewportLeft+half,Math.min(viewportRight-half,(left+right)/2)),
  };
}
