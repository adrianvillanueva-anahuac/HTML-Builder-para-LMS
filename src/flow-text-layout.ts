import type {FlowNode} from './flow-model';
import type {FlowTextRun} from './flow-image-text';
import {flowNodeTextBox,flowNodeTextState} from './flow-node-text';
export type FlowTextChar={text:string;run:FlowTextRun};
let context:CanvasRenderingContext2D|null|undefined;
const widths=new Map<string,number>();
if(typeof document!=='undefined')document.fonts?.ready.then(()=>widths.clear());
/** Use the same font metrics as contenteditable, not a character-count guess. */
export function flowTextWidth(chars:readonly FlowTextChar[],size:number):number{
 if(context===undefined)context=typeof document==='undefined'?null:document.createElement('canvas').getContext('2d');
 const segments:{text:string;run:FlowTextRun}[]=[];
 for(const char of chars){const last=segments.at(-1);if(last?.run===char.run)last.text+=char.text;else segments.push({...char});}
 return segments.reduce((sum,{text,run})=>{
  const font=`${run.italic?'italic':'normal'} ${run.bold?700:400} ${size}px "${run.font}",Arial,sans-serif`,key=font+'|'+text;
  let width=widths.get(key);if(width===undefined){if(context){context.font=font;width=context.measureText(text).width;}else width=Array.from(text).reduce((n,c)=>n+(c===' '? .28:/[ilI.,!|]/.test(c)?.27:/[MW@]/.test(c)?.85:.56),0)*size;
   if(widths.size>12000)widths.clear();widths.set(key,width);}
  return sum+width;
 },0);
}
export function flowTextLayout(node:FlowNode){
 const box=flowNodeTextBox(node),state=flowNodeTextState(node),lines:FlowTextChar[][]=[[]],tokens:FlowTextChar[][]=[];
 for(const run of state.runs)for(const text of run.text){const char={text,run},last=tokens.at(-1);if(text==='\n'||!last||last[0].text==='\n'||/\s/.test(last[0].text)!==/\s/.test(text))tokens.push([char]);else last.push(char);}
 let spaces:FlowTextChar[]=[];
 const push=()=>{lines.push([]);spaces=[];};
 for(const token of tokens){
  if(token[0].text==='\n'){push();continue;}
  if(/^\s$/.test(token[0].text)){spaces.push(...token);continue;}
  let line=lines.at(-1)!;
  if(flowTextWidth(token,node.fontSize)<=box.width){
   if(line.length&&flowTextWidth([...line,...spaces,...token],node.fontSize)>box.width){push();line=lines.at(-1)!;}
   line.push(...spaces,...token);spaces=[];
  }else{
   for(const char of [...spaces,...token]){line=lines.at(-1)!;if(line.length&&flowTextWidth([...line,char],node.fontSize)>box.width){push();line=lines.at(-1)!;}if(char.text!==' '||line.length)line.push(char);}spaces=[];
  }
 }
 return {...state,box,lines,lineHeight:node.fontSize*1.25};
}
export function flowFreeTextHeight(node:FlowNode):number{
 return node.type==='text'?Math.max(node.height,Math.ceil(flowTextLayout(node).lines.length*node.fontSize*1.25/.76+2)):node.height;
}
