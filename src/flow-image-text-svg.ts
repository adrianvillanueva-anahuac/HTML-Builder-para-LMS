import type {FlowNode} from './flow-model';
import type {FlowTextRun} from './flow-image-text';
import {flowTextLayout} from './flow-text-layout';
import {flowRichCSS,flowRichHTML} from './flow-rich-document';
const escape=(v:string)=>v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const n=(v:number)=>String(Math.round(v*100)/100);
export function flowImageTextSVG(node:FlowNode,clipId:string,interactive:boolean,selected:boolean,editing:boolean){
 if(!node.text&&!node.richText)return '';
 const {box,align,lines,lineHeight}=flowTextLayout(node),maxLines=Math.max(1,Math.floor(box.height/lineHeight));
 if(lines.length>maxLines){lines.length=maxLines;const last=lines.at(-1)!;if(last.length)last[last.length-1]={...last.at(-1)!,text:'…'};}
 const anchor=align==='left'?'start':align==='right'?'end':'middle',x=box.x+(align==='left'?0:align==='right'?box.width:box.width/2),start=box.y+box.height/2-(lines.length-1)*lineHeight/2;
 const svg=node.richText?`<foreignObject x="${n(box.x)}" y="${n(box.y)}" width="${n(box.width)}" height="${n(box.height)}"><div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;width:100%;height:100%;overflow:hidden;font:${node.fontSize}px/1.25 Roboto,Arial,sans-serif;color:${node.textColor};text-align:${align}"><style>${flowRichCSS}</style><div class="flow-rich-content">${flowRichHTML(node.richText)}</div></div></foreignObject>`:lines.map((line,index)=>{
  const segments:{text:string;run:FlowTextRun}[]=[];for(const char of line){const last=segments.at(-1);if(last&&last.run===char.run)last.text+=char.text;else segments.push({...char});}
  return `<text x="${n(x)}" y="${n(start+index*lineHeight)}" text-anchor="${anchor}" dominant-baseline="middle" font-size="${n(node.fontSize)}">${segments.map(({text,run:r})=>{const span=`<tspan fill="${r.color||node.textColor}" font-family="${r.font==='Zilla Slab'?"'Zilla Slab',Georgia,serif":r.font+',Arial,sans-serif'}" font-weight="${r.bold?700:400}" font-style="${r.italic?'italic':'normal'}" text-decoration="${r.underline?'underline':'none'}">${escape(text)}</tspan>`;return r.href?`<a href="${escape(r.href)}" target="_blank" rel="noopener noreferrer">${span}</a>`:span;}).join('')}</text>`;
 }).join('');
 const handles=interactive&&node.image&&selected&&!editing?(['nw','n','ne','e','se','s','sw','w']as const).map(handle=>{const cx=box.x+(handle.includes('w')?0:handle.includes('e')?box.width:box.width/2),cy=box.y+(handle.includes('n')?0:handle.includes('s')?box.height:box.height/2);return `<rect data-flow-text-resize="${node.id}" data-handle="${handle}" x="${n(cx-4)}" y="${n(cy-4)}" width="8" height="8" fill="#fff" stroke="#5d428c" style="cursor:${handle==='n'||handle==='s'?'ns':handle==='e'||handle==='w'?'ew':handle==='nw'||handle==='se'?'nwse':'nesw'}-resize"/>`;}).join(''):'';
 return `<g${interactive?node.image?` data-flow-image-text="${node.id}" style="cursor:move"`:` data-flow-node-text="${node.id}"`:''}>${!editing?`<g${node.image?` clip-path="url(#${clipId})"`:''}>${interactive&&node.image?`<rect x="${n(box.x)}" y="${n(box.y)}" width="${n(box.width)}" height="${n(box.height)}" fill="transparent"/>`:''}${svg}</g>`:''}${interactive&&node.image&&selected&&!editing?`<rect x="${n(box.x)}" y="${n(box.y)}" width="${n(box.width)}" height="${n(box.height)}" fill="none" stroke="#5d428c" stroke-dasharray="3 3" pointer-events="none"/>`:''}${handles}</g>`;
}
