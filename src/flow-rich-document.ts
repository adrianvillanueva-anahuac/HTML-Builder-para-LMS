/** Inert structured content, shared by the live editor and published SVG. */
export type FlowRichNode={tag:string;text?:string;style?:Record<string,string>;classes?:string[];href?:string;src?:string;children?:FlowRichNode[]};
const tags=new Set(['div','p','span','b','strong','i','em','u','a','br','ol','ul','li','img','h1','h2','h3','blockquote']);
const classes=new Set(['list-custom','list-numbers','list-letters','list-disc','list-circle','list-triangle','list-plus','list-minus','list-color-orange','list-color-purple','list-color-gray','material-symbols-outlined','editable-icon','editorial-image','w-1/4','w-1/2','w-3/4','w-full','text-anahuac-orange','text-anahuac-purple','text-gray-600','text-gray-400','inline-block','block','align-middle']);
const escape=(text:string)=>text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const obj=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
export function richURL(value:unknown,image=false){if(typeof value!=='string'||value.length>2000)return '';if(!image&&/^#[\w-]+$/.test(value))return value;try{const url=new URL(value);return (image?['https:','http:']:['https:','http:','mailto:','tel:']).includes(url.protocol)&&!url.username&&!url.password?url.href:'';}catch{return '';}}
function safeStyle(key:string,value:unknown){
 if(typeof value!=='string'||value.length>240||/[<>\\;{}]|url\s*\(|expression/i.test(value))return '';
 if(['color','background-color'].includes(key))return /^(#[a-f\d]{3,8}|rgba?\([\d.,%\s]+\)|transparent|inherit)$/i.test(value)?value:'';
 if(key==='font-family')return /^(?:(?:["']?(?:Roboto|Zilla Slab|Lato|Material Symbols Outlined)["']?)|serif|sans-serif|Arial|Georgia|inherit)(?:\s*,\s*(?:serif|sans-serif|Arial|Georgia))*$/i.test(value)?value:'';
 if(key==='font-weight')return /^(normal|bold|[1-9]00|inherit)$/.test(value)?value:'';
 if(key==='font-style')return /^(normal|italic|inherit)$/.test(value)?value:'';
 if(key==='text-decoration')return /^(none|underline|line-through)(?: (?:underline|line-through))?$/.test(value)?value:'';
 if(key==='text-align')return /^(left|center|right|justify)$/.test(value)?value:'';
 if(key==='align-content')return /^(start|center|end)$/.test(value)?value:'';
 if(key==='display')return /^(block|inline|inline-block)$/.test(value)?value:'';
 if(key==='vertical-align')return /^(middle|baseline|top|bottom)$/.test(value)?value:'';
 if(key==='object-fit')return /^(cover|contain|fill)$/.test(value)?value:'';
 if(key==='transform')return /^rotate\(-?[\d.]+deg\)$/.test(value)?value:'';
 if(key==='box-shadow')return /^[\d.,()\s\-a-z]+$/i.test(value)?value:'';
 if(['font-size','line-height','width','height','max-width','margin','margin-left','margin-right','margin-top','margin-bottom','padding','padding-left','border-radius','text-underline-offset'].includes(key))return /^(?:auto|inherit|(?:-?[\d.]+(?:px|em|rem|%)?)(?:\s+-?[\d.]+(?:px|em|rem|%)?){0,3})$/.test(value)?value:'';
 return '';
}
export function normalizeFlowRichDocument(raw:unknown):FlowRichNode|undefined{
 let count=0,left=10000;
 const read=(value:unknown,depth:number):FlowRichNode|undefined=>{if(++count>700||depth>18)return;const data=obj(value);if(data.tag==='#text'){const text=typeof data.text==='string'?data.text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').slice(0,left):'';left-=text.length;return text?{tag:'#text',text}:undefined;}if(!tags.has(String(data.tag)))return;const style=Object.fromEntries(Object.entries(obj(data.style)).flatMap(([key,value])=>{const safe=safeStyle(key,value);return safe?[[key,safe]]:[];})),names=(Array.isArray(data.classes)?data.classes:[]).filter((name):name is string=>typeof name==='string'&&classes.has(name)),children=(Array.isArray(data.children)?data.children:[]).flatMap(child=>{const node=read(child,depth+1);return node?[node]:[];});const href=richURL(data.href),src=richURL(data.src,true);if(data.tag==='img'&&!src)return;return{tag:String(data.tag),...(Object.keys(style).length?{style}:{}),...(names.length?{classes:names}:{}),...(href?{href}:{}),...(src?{src}:{}),...(children.length?{children}:{})};};
 return read(raw,0);
}
export function readFlowRichDocument(root:HTMLElement):FlowRichNode{
 const read=(node:Node):FlowRichNode|undefined=>{
  if(node.nodeType===Node.TEXT_NODE)return{tag:'#text',text:node.textContent||''};if(!(node instanceof HTMLElement)||['SCRIPT','STYLE','IFRAME','OBJECT','SVG'].includes(node.tagName))return;
  const style:Record<string,string>={};for(const key of node.style)style[key]=node.style.getPropertyValue(key);if(node.tagName==='FONT'){const color=node.getAttribute('color'),face=node.getAttribute('face');if(color)style.color=color;if(face)style['font-family']=face;}
  return{tag:node.tagName==='FONT'?'span':node.tagName.toLowerCase(),style,classes:[...node.classList],href:node.getAttribute('href')||'',src:node.getAttribute('src')||'',children:[...node.childNodes].flatMap(child=>{const value=read(child);return value?[value]:[];})};
 };
 return normalizeFlowRichDocument(read(root))||{tag:'div'};
}
export function flowRichHTML(raw:FlowRichNode):string{
 const render=(node:FlowRichNode):string=>{if(node.tag==='#text')return escape(node.text||'');const style=Object.entries(node.style||{}).map(([key,value])=>key+':'+value).join(';'),attrs=(style?` style="${escape(style)}"`:'')+(node.classes?.length?` class="${node.classes.join(' ')}"`:'')+(node.href?` href="${escape(node.href)}" target="_blank" rel="noopener noreferrer"`:'')+(node.src?` src="${escape(node.src)}" alt=""`:'');return ['br','img'].includes(node.tag)?`<${node.tag}${attrs}/>`:`<${node.tag}${attrs}>${(node.children||[]).map(render).join('')}</${node.tag}>`;};return render(normalizeFlowRichDocument(raw)||{tag:'div'});
}
export function flowRichNeedsHTML(node:FlowRichNode,root=true):boolean{return !!node.style?.['align-content']||['ol','ul','li','img','blockquote','h1','h2','h3'].includes(node.tag)||!!node.classes?.includes('material-symbols-outlined')||(!root&&['font-size','text-align','margin-left','padding-left','display','line-height'].some(key=>!!node.style?.[key]))||(node.children||[]).some(child=>flowRichNeedsHTML(child,false));}
export const flowRichCSS=`.flow-rich-content[style*="align-content"],.flow-rich-content:has(>[style*="align-content"]),.flow-rich-content>[style*="align-content"]{height:100%}.flow-rich-content{box-sizing:border-box;width:100%;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.25}.flow-rich-content :is(p,div){margin:0}.flow-rich-content img{display:block;max-width:100%;height:auto}.flow-rich-content .w-1\\/4{width:25%}.flow-rich-content .w-1\\/2{width:50%}.flow-rich-content .w-3\\/4{width:75%}.flow-rich-content .w-full{width:100%}.flow-rich-content .material-symbols-outlined{font-family:'Material Symbols Outlined';font-weight:normal;font-style:normal;line-height:1;display:inline-block;white-space:nowrap;font-feature-settings:'liga'}.flow-rich-content .text-anahuac-orange{color:#ff5900}.flow-rich-content .text-anahuac-purple{color:#5d428c}.flow-rich-content .text-gray-600{color:#646464}.flow-rich-content .text-gray-400{color:#9ca3af}.flow-rich-content .list-custom,.flow-rich-content .list-custom :is(ul,ol){list-style:none!important;margin:0;padding-left:2em}.flow-rich-content .list-custom li{position:relative;margin:0 0 .5em}.flow-rich-content .list-custom li::before{position:absolute;left:-2em;top:0;width:1.5em;text-align:right;color:#ff5900;font-weight:bold;font-family:'Zilla Slab',serif}.flow-rich-content .list-color-purple li::before{color:#5d428c}.flow-rich-content .list-color-gray li::before{color:#646464}.flow-rich-content .list-numbers{counter-reset:flow-num}.flow-rich-content .list-numbers>li::before{counter-increment:flow-num;content:counter(flow-num,decimal-leading-zero)'.'}.flow-rich-content .list-letters{counter-reset:flow-alpha}.flow-rich-content .list-letters>li::before{counter-increment:flow-alpha;content:counter(flow-alpha,lower-alpha)'.'}.flow-rich-content .list-disc>li::before{content:'•'}.flow-rich-content .list-circle>li::before{content:'○'}.flow-rich-content .list-triangle>li::before{content:'▶'}.flow-rich-content .list-plus>li::before{content:'+'}.flow-rich-content .list-minus>li::before{content:'—'}`;
