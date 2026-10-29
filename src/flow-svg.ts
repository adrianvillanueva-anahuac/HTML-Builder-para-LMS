import { normalizeFlowModel,flowBackgroundHasColor,flowEdgeLabels, type FlowModel, type FlowNode, type FlowSide, type FlowLane, type FlowMarker, type FlowEdge } from './flow-model';
import {flowAnchor,flowEdgeGeometry,flowGumGeometry,flowLabelPoint,flowLabelMetrics} from './flow-geometry';
import {flowStrokeGeometry} from './flow-path';
import {flowImageSVG} from './flow-image-svg';
import {flowOutputBox} from './flow-crop';
import {flowImagePlacement} from './flow-image';
import {flowImageTextSVG} from './flow-image-text-svg';
import {flowTextNode} from './flow-node-text';

export type FlowSVGOptions = {
  interactive?: boolean; selectedNodeId?: string; selectedEdgeId?: string; selectedLaneId?: string;
  selectedNodeIds?: readonly string[]; selectedEdgeIds?: readonly string[]; selectedLaneIds?: readonly string[];
  connecting?: boolean; scope?: string;
  imageEditingId?:string;
  textEditingId?:string;
  textEditingBoxId?:string;
  connectionPreview?:{from:string;fromSide:FlowSide;point:{x:number;y:number};to?:string;toSide?:FlowSide};
};
type Point = { x: number; y: number };
type Cardinal = Exclude<FlowSide, 'auto'>;
const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const n = (value: number) => String(Math.round(value * 100) / 100);

type RGBA = readonly [number, number, number, number];
function rgba(color: string): RGBA | null {
  if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)) return null;
  let digits = color.slice(1);
  if (digits.length < 5) digits = digits.split('').map(character => character + character).join('');
  return [parseInt(digits.slice(0, 2), 16), parseInt(digits.slice(2, 4), 16), parseInt(digits.slice(4, 6), 16), digits.length === 8 ? parseInt(digits.slice(6, 8), 16) : 255];
}
export function flowConnectorColor(node: FlowNode): string {
  // Transparent / absent borders do not make the connector disappear.
  if (node.strokeWidth > 0 && (rgba(node.stroke)?.[3] || 0) > 0) return node.stroke;
  if ((rgba(node.fill)?.[3] || 0) > 0) return node.fill;
  return '#5d428c';
}
function interpolateColor(from: string, to: string, fraction: number): string {
  const first = rgba(from)!, last = rgba(to)!, ratio = Math.max(0, Math.min(1, fraction));
  const values = first.map((value, index) => Math.round(value + (last[index] - value) * ratio));
  return `#${values.slice(0, values[3] === 255 ? 3 : 4).map(value => value.toString(16).padStart(2, '0')).join('')}`;
}
function gradientPosition(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x, dy = end.y - start.y, lengthSquared = dx * dx + dy * dy;
  return lengthSquared ? ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared : .5;
}
function selection(singular?: string, plural: readonly string[] = []): Set<string> {
  const values = new Set(plural);
  if (singular) values.add(singular);
  return values;
}

function wrapText(text: string, width: number, fontSize: number, maxLines: number): string[] {
  const capacity = Math.max(1, Math.floor(width / (fontSize * .56))), lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = '';
    for (const word of paragraph.trim().split(/\s+/).filter(Boolean)) {
      if (line && line.length + word.length + 1 > capacity) { lines.push(line); line = ''; }
      let remaining = word;
      while (remaining.length > capacity) {
        if (line) { lines.push(line); line = ''; }
        lines.push(remaining.slice(0, capacity)); remaining = remaining.slice(capacity);
      }
      line = line ? `${line} ${remaining}` : remaining;
    }
    lines.push(line);
  }
  if (lines.length <= maxLines) return lines;
  const result = lines.slice(0, maxLines);
  result[maxLines - 1] = `${result[maxLines - 1].slice(0, Math.max(1, capacity - 1))}…`;
  return result;
}
function textSVG(text: string, x: number, y: number, width: number, height: number, fontSize: number, color: string, weight = 400): string {
  const lineHeight = fontSize * 1.25, lines = wrapText(text, width, fontSize, Math.max(1, Math.floor(height / lineHeight)));
  const start = y - (lines.length - 1) * lineHeight / 2;
  return `<text x="${n(x)}" y="${n(start)}" text-anchor="middle" dominant-baseline="middle" fill="${color}" font-size="${n(fontSize)}" font-weight="${weight}" pointer-events="none">${lines.map((line, index) => `<tspan x="${n(x)}" y="${n(start + index * lineHeight)}">${escape(line)}</tspan>`).join('')}</text>`;
}
function shapeSVG(node: FlowNode): string {
  const w = node.width, h = node.height;
  const style = `fill="${node.fill}" stroke="${node.stroke}" stroke-width="${n(node.strokeWidth)}" stroke-linejoin="round"`;
  switch (node.type) {
    case 'decision': return `<polygon points="${n(w / 2)},0 ${n(w)},${n(h / 2)} ${n(w / 2)},${n(h)} 0,${n(h / 2)}" ${style}/>`;
    case 'circle': return `<ellipse cx="${n(w / 2)}" cy="${n(h / 2)}" rx="${n(w / 2)}" ry="${n(h / 2)}" ${style}/>`;
    case 'terminator': return `<rect width="${n(w)}" height="${n(h)}" rx="${n(Math.min(w, h) / 2)}" ${style}/>`;
    case 'document': return `<path d="M 0 0 H ${n(w)} V ${n(h * .86)} Q ${n(w * .75)} ${n(h * .72)} ${n(w / 2)} ${n(h * .88)} Q ${n(w * .25)} ${n(h * 1.04)} 0 ${n(h * .9)} Z" ${style}/>`;
    case 'data': { const slant = Math.min(24, w * .12); return `<polygon points="${n(slant)},0 ${n(w)},0 ${n(w - slant)},${n(h)} 0,${n(h)}" ${style}/>`; }
    default: return `<rect width="${n(w)}" height="${n(h)}" rx="${n(node.radius)}" ${style}/>`;
  }
}
function laneSVG(lane:FlowLane,interactive:boolean,selected:boolean):{svg:string;handles:string}{
  const {x,y,width:w,height:h}=lane,vertical=lane.textPosition==='left'||lane.textPosition==='right';
  const header=lane.textPosition==='bottom'?{x,y:y+h-44,w,h:44}:lane.textPosition==='left'?{x,y,w:44,h}:lane.textPosition==='right'?{x:x+w-44,y,w:44,h}:{x,y,w,h:44};
  const radius=lane.style==='rounded'?18:4,border=selected?'#ff5900':lane.stroke;
  const fill=lane.style==='outline'?'none':lane.fill;
  const divider=vertical?`M ${n(lane.textPosition==='left'?x+44:x+w-44)} ${n(y)} V ${n(y+h)}`:`M ${n(x)} ${n(lane.textPosition==='bottom'?y+h-44:y+44)} H ${n(x+w)}`;
  const cx=header.x+header.w/2,cy=header.y+header.h/2;
  const font=lane.fontFamily==='Zilla Slab'?"'Zilla Slab',Georgia,serif":lane.fontFamily==='Lato'?'Lato,Arial,sans-serif':'Roboto,Arial,sans-serif';
  const titles=`<g font-family="${font}"${vertical?` transform="rotate(${lane.textPosition==='left'?-90:90} ${n(cx)} ${n(cy)})"`:''}>${textSVG(lane.title,cx,cy,vertical?h-24:w-24,36,lane.fontSize,lane.textColor,600)}</g>`;
  const positions=[['nw',x,y],['n',x+w/2,y],['ne',x+w,y],['e',x+w,y+h/2],['se',x+w,y+h],['s',x+w/2,y+h],['sw',x,y+h],['w',x,y+h/2]]as const;
  const handles=interactive&&selected?positions.map(([side,cx,cy])=>`<circle data-flow-lane-resize="${lane.id}" data-handle="${side}" cx="${n(cx)}" cy="${n(cy)}" r="7" fill="#fff" stroke="#ff5900" stroke-width="2" style="cursor:${side==='n'||side==='s'?'ns':side==='e'||side==='w'?'ew':side==='nw'||side==='se'?'nwse':'nesw'}-resize"><title>Redimensionar carril · ${side}</title></circle>`).join(''):'';
  return {svg:`<g data-flow-lane="${lane.id}" data-lane-style="${lane.style}"${interactive?' style="cursor:move"':''}><rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${radius}" fill="${fill}" stroke="${lane.style==='band'&&!selected?'none':border}" stroke-width="${selected?3:1.5}"${selected?' stroke-dasharray="7 4"':lane.style==='outline'?' stroke-dasharray="8 5"':''}/><rect x="${n(header.x+1)}" y="${n(header.y+1)}" width="${n(Math.max(0,header.w-2))}" height="${n(Math.max(0,header.h-2))}" rx="${lane.style==='rounded'?14:2}" fill="${lane.style==='outline'?lane.fill:lane.stroke}" fill-opacity="${lane.style==='outline'?1:lane.style==='rounded'?0.2:0.08}"/><path d="${divider}" stroke="${lane.stroke}" stroke-width="${lane.style==='band'?4:1}"/>${titles}</g>`,handles};
}
function hash(value: string): string {
  let result = 2166136261;
  for (let index = 0; index < value.length; index++) result = Math.imul(result ^ value.charCodeAt(index), 16777619);
  return (result >>> 0).toString(36);
}

/** No HTML, scripts or event handlers. Image references are normalized raster/HTTP(S). */
export function renderFlowSVG(source: FlowModel, options: FlowSVGOptions = {}): string {
  const model = normalizeFlowModel(source), interactive = options.interactive === true;
  const output=flowOutputBox(model),view=interactive?{x:0,y:0,width:model.width,height:model.height}:output;
  const selectedNodes = selection(options.selectedNodeId, options.selectedNodeIds), selectedEdges = selection(options.selectedEdgeId, options.selectedEdgeIds), selectedLanes = selection(options.selectedLaneId, options.selectedLaneIds);
  const rawScope = options.scope || JSON.stringify(model);
  const scope = `flow-${(options.scope || 'diagram').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 36) || 'diagram'}-${hash(rawScope)}`;
  const titleId = `${scope}-title`, descriptionId = `${scope}-description`, gridId = `${scope}-grid`;
  const nodes = new Map(model.nodes.map(node => [node.id, node]));
  const draft=interactive?options.connectionPreview:undefined;
  let draftSVG='';
  if(draft&&nodes.has(draft.from)){
    const from=nodes.get(draft.from)!,target=draft.to?nodes.get(draft.to):undefined;
    const to=target||{...from,type:'process' as const,x:draft.point.x-.5,y:draft.point.y-.5,width:1,height:1};
    const edge:FlowEdge={id:'connection-draft',from:from.id,to:to.id,fromSide:draft.fromSide,toSide:draft.toSide||'auto',route:'orthogonal',colorMode:'solid',color:'#ff5900',width:2,dash:'dashed',startArrow:false,endArrow:true,startMarker:'arrow',endMarker:'arrow',bend:null,label:''};
    const geometry=flowEdgeGeometry(edge,from,to);
    draftSVG=`<g data-flow-connection-preview="true" pointer-events="none" aria-hidden="true"><path d="${geometry.path}" fill="none" stroke="#ff5900" stroke-width="3" stroke-dasharray="8 5" stroke-linecap="round"/><circle cx="${n(geometry.end.x)}" cy="${n(geometry.end.y)}" r="5" fill="#ff5900"/></g>`;
  }
  const description = [
    model.lanes.length ? `Áreas: ${model.lanes.map(lane => lane.title).join('; ')}.` : '',
    model.nodes.length ? `Figuras: ${model.nodes.map(node => node.text).join('; ')}.` : 'Diagrama sin figuras.',
    model.edges.length ? `Conexiones: ${model.edges.map(edge => {const labels=flowEdgeLabels(edge).map(label=>label.text).filter(Boolean).join('; ');return `${nodes.get(edge.from)!.text} → ${nodes.get(edge.to)!.text}${labels?` (${labels})`:''}`;}).join('; ')}.` : '',
  ].filter(Boolean).join(' ');
  const edgeViews = model.edges.map(edge => {
    const from = nodes.get(edge.from)!, to = nodes.get(edge.to)!, geometry = flowEdgeGeometry(edge, from, to), gradient = edge.colorMode === 'gradient';
    const fromColor = gradient ? flowConnectorColor(from) : edge.color, toColor = gradient ? flowConnectorColor(to) : edge.color;
    return { edge, geometry,ink:flowStrokeGeometry(edge,geometry), gradient, fromColor, toColor,gum:flowGumGeometry(edge,from,to,geometry),
      gradientId: `${scope}-gradient-${edge.id}`, startMarkerId: `${scope}-arrow-start-${edge.id}`, endMarkerId: `${scope}-arrow-end-${edge.id}`,
      labelColor: gradient ? interpolateColor(fromColor, toColor, gradientPosition(geometry.label, geometry.start, geometry.end)) : edge.color };
  });
  const marker = (id:string,color:string,type:FlowMarker,width:number) => {
    const size=Math.max(10,width*3.5),shape=type==='circle'?`<circle cx="5" cy="5" r="4" fill="${color}"/>`:type==='square'?`<rect x="1" y="1" width="8" height="8" fill="${color}"/>`:`<path d="M 1 1 L 9 5 L 1 9 Z" fill="${color}"/>`;
    return `<marker id="${id}" data-flow-marker="${type}" viewBox="0 0 10 10" markerWidth="${n(size)}" markerHeight="${n(size)}" refX="9" refY="5" orient="auto-start-reverse" markerUnits="userSpaceOnUse">${shape}</marker>`;
  };
  const definitions = edgeViews.map(view => `${view.gradient ? `<linearGradient id="${view.gradientId}" gradientUnits="userSpaceOnUse" x1="${n(view.geometry.start.x)}" y1="${n(view.geometry.start.y)}" x2="${n(view.geometry.end.x)}" y2="${n(view.geometry.end.y)}"><stop offset="0%" stop-color="${view.fromColor}"/><stop offset="100%" stop-color="${view.toColor}"/></linearGradient>` : ''}${view.edge.startArrow&&view.edge.startMarker!=='gum' ? marker(view.startMarkerId, view.fromColor,view.edge.startMarker,view.edge.width) : ''}${view.edge.endArrow&&view.edge.endMarker!=='gum' ? marker(view.endMarkerId, view.toColor,view.edge.endMarker,view.edge.width) : ''}`).join('');
  const laneViews=model.lanes.map(lane=>laneSVG(lane,interactive,interactive&&selectedLanes.has(lane.id)));
  const lanes=laneViews.map(view=>view.svg).join(''),laneHandles=laneViews.map(view=>view.handles).join(''),edgeHandles:string[]=[],edgeLabels:string[]=[];
  const edges = edgeViews.map(({ edge, geometry,ink, gradient, gradientId, startMarkerId, endMarkerId, labelColor,gum }) => {
    const selected = interactive && selectedEdges.has(edge.id);
    const dashScale=(gum?gum.waist:edge.width)/2;
    const dash = edge.dash === 'dashed' ? ` stroke-dasharray="${n(9*dashScale)} ${n(6*dashScale)}"` : edge.dash === 'dotted' ? ` stroke-dasharray="${n(dashScale)} ${n(6*dashScale)}"` : '';
    const paint=gradient?`url(#${gradientId})`:edge.color;
    if(selected)for(const handle of geometry.bendHandles){const vertical=handle.axis==='x',length=Math.min(96,Math.max(32,handle.length-12)),x=handle.x+(vertical?18:0),y=handle.y+(vertical?0:18),w=vertical?10:length,h=vertical?length:10;edgeHandles.push(`<g><path d="M ${n(handle.x)} ${n(handle.y)} L ${n(x)} ${n(y)}" stroke="#ff5900" stroke-opacity=".4" pointer-events="none"/><rect data-flow-bend="${edge.id}" data-run="${handle.index}" data-position="${n(handle.position)}" data-axis="${handle.axis}" x="${n(x-w/2)}" y="${n(y-h/2)}" width="${n(w)}" height="${n(h)}" rx="5" fill="#fff" fill-opacity=".9" stroke="#ff5900" stroke-width="1.5" style="cursor:${vertical?'ew':'ns'}-resize"><title>Arrastra para ajustar este tramo y sus dobleces</title></rect></g>`);}
    const labels=flowEdgeLabels(edge).filter(label=>label.text).map(label=>{const point=flowLabelPoint(geometry.samples,label.position),{width,height,fontSize,padding,radius}=flowLabelMetrics(edge,label.text);return `<g${interactive?` data-flow-label="${edge.id}" data-label-id="${label.id}" role="button" tabindex="0" aria-label="Mover etiqueta: ${escape(label.text)}" style="cursor:grab"`:''}><rect x="${n(point.x-width/2)}" y="${n(point.y-height/2)}" width="${n(width)}" height="${n(height)}" rx="${n(radius)}" fill="${model.background==='transparent'||model.background==='none'?'#ffffff':model.background}" fill-opacity=".9"/>${textSVG(label.text,point.x,point.y,width-padding,height, fontSize,labelColor,500)}</g>`;}).join('');
    edgeLabels.push(labels);
    const symbols=edge.startArrow&&edge.startMarker!=='gum'||edge.endArrow&&edge.endMarker!=='gum'?`<path data-flow-symbols="true" d="${geometry.path}" fill="none" stroke="none" pointer-events="none"${edge.startArrow&&edge.startMarker!=='gum'?` marker-start="url(#${startMarkerId})"`:''}${edge.endArrow&&edge.endMarker!=='gum'?` marker-end="url(#${endMarkerId})"`:''}/>`:'';
    return `<g data-flow-edge="${edge.id}"${interactive ? ' style="cursor:pointer"' : ''}>${interactive ? `<path d="${geometry.path}" fill="none" stroke="transparent" stroke-width="${n(Math.max(16,edge.width+8))}" pointer-events="stroke"/><path data-flow-delete-highlight="true" d="${geometry.path}" fill="none" stroke="#e23d36" stroke-opacity=".45" stroke-width="${n(edge.width+12)}" stroke-linecap="round" pointer-events="none" visibility="hidden"/>` : ''}${selected ? `<path d="${ink.path}" fill="none" stroke="#ffb88f" stroke-width="${n(edge.width + 6)}" stroke-linecap="round" pointer-events="none"/>` : ''}${gum?`<path data-flow-gum="true" d="${gum.path}" fill="${paint}"${selected?' stroke="#ffb88f" stroke-width="1.5"':''}/>`:''}<path data-flow-stroke="true" d="${ink.path}" fill="none" stroke="${paint}" stroke-width="${n(gum?gum.waist:edge.width)}" stroke-linecap="round" stroke-linejoin="round"${dash}/>${symbols}</g>`;
  }).join('');
  const shapes = model.nodes.map(node => {
    const selected = interactive && selectedNodes.has(node.id);
    const ports = interactive ? (['top', 'right', 'bottom', 'left'] as Cardinal[]).map(side => {
      const point = flowAnchor({ ...node, x: 0, y: 0 }, side);
      const incident=edgeViews.filter(view=>view.edge.from===node.id&&view.geometry.fromSide===side||view.edge.to===node.id&&view.geometry.toSide===side),angle=side==='right'?0:side==='bottom'?Math.PI/2:side==='left'?Math.PI:-Math.PI/2;
      const removers=incident.map((view,index)=>{const count=Math.min(5,incident.length-Math.floor(index/5)*5),a=angle+(count>1?(index%5/(count-1)-.5)*2:0),r=26+Math.floor(index/5)*21,x=point.x+Math.cos(a)*r,y=point.y+Math.sin(a)*r;return `<g data-flow-disconnect="${view.edge.id}" data-flow-disconnect-node="${node.id}" role="button" tabindex="${selected?0:-1}" aria-disabled="${!selected}" aria-label="Eliminar conexión ${escape(view.edge.label||`${nodes.get(view.edge.from)!.text} → ${nodes.get(view.edge.to)!.text}`)}" style="cursor:${selected?'pointer':'default'}"><title>${selected?'Eliminar esta conexión':'Selecciona la figura para eliminar esta conexión'}</title><circle cx="${n(x)}" cy="${n(y)}" r="9" fill="#fff" stroke="#d43d36" stroke-width="1.5"/><path d="M ${n(x-4)} ${n(y)} H ${n(x+4)}" stroke="#d43d36" stroke-width="2" pointer-events="none"/></g>`;}).join('');
      return `<g><g data-flow-port="${node.id}" data-side="${side}" style="cursor:crosshair"><title>Arrastra para conectar</title><circle cx="${n(point.x)}" cy="${n(point.y)}" r="12" fill="transparent"/><circle cx="${n(point.x)}" cy="${n(point.y)}" r="7" fill="#ffffff" stroke="#ff5900" stroke-width="2"/></g>${removers}</g>`;
    }).join('') : '';
    const imageEditing=selected&&node.type==='image'&&options.imageEditingId===node.id;
    let imageControls='';
    if(imageEditing){
      const image=node.image!,p=flowImagePlacement(image,node.width,node.height),cx=node.width/2+image.offsetX*node.width,cy=node.height/2+image.offsetY*node.height;
      const corners=[[-p.width/2,-p.height/2],[p.width/2,-p.height/2],[p.width/2,p.height/2],[-p.width/2,p.height/2]];
      const photoGizmo=`<g transform="translate(${n(cx)} ${n(cy)}) rotate(${n(image.rotation)})"><rect data-flow-image-pan="${node.id}" x="${n(-p.width/2)}" y="${n(-p.height/2)}" width="${n(p.width)}" height="${n(p.height)}" fill="transparent" stroke="#2583cc" stroke-dasharray="5 4" style="cursor:grab"/>${corners.map(([x,y])=>`<circle data-flow-image-scale="${node.id}" cx="${n(x+Math.sign(x)*12)}" cy="${n(y+Math.sign(y)*12)}" r="6" fill="#2583cc" stroke="#fff" stroke-width="2" style="cursor:nwse-resize"><title>Escalar fotografía</title></circle>`).join('')}</g>`;
      const cropGizmo=(['nw','n','ne','e','se','s','sw','w']as const).map(handle=>{const x=handle.includes('w')?0:handle.includes('e')?node.width:node.width/2,y=handle.includes('n')?0:handle.includes('s')?node.height:node.height/2;return `<rect data-flow-image-crop="${node.id}" data-handle="${handle}" x="${n(x-5)}" y="${n(y-5)}" width="10" height="10" rx="2" fill="#fff" stroke="#ff5900" stroke-width="2" style="cursor:${handle==='n'||handle==='s'?'ns':handle==='e'||handle==='w'?'ew':handle==='nw'||handle==='se'?'nwse':'nesw'}-resize"><title>Recortar marco</title></rect>`;}).join('');
      imageControls=`<rect data-flow-image-pan="${node.id}" width="${n(node.width)}" height="${n(node.height)}" fill="transparent" style="cursor:grab"/>${photoGizmo}${cropGizmo}`;
    }
    const caption=['primary',...(node.textBoxes||[]).map(box=>box.id)].map(boxId=>`<g${interactive?` data-text-box-id="${boxId}"`:''}>${flowImageTextSVG(flowTextNode(node,boxId)!,`${scope}-image-${node.id}-clip`,interactive,selected,interactive&&options.textEditingId===node.id&&(options.textEditingBoxId||'primary')===boxId)}</g>`).join('');
    const dropTarget=draft?.to===node.id?`<rect data-flow-connection-target="${node.id}" x="-8" y="-8" width="${n(node.width+16)}" height="${n(node.height+16)}" rx="8" fill="none" stroke="#ff5900" stroke-width="3" pointer-events="none"/>`:'';
    const portGroup=interactive&&!imageEditing&&options.textEditingId!==node.id?`<g class="fde-node-ports${selected||options.connecting?' is-visible':''}">${ports}</g>`:'';
    return `<g data-flow-node="${node.id}" role="group" aria-label="${escape(node.text||'Imagen')}" transform="translate(${n(node.x)} ${n(node.y)})"${interactive ? ` tabindex="0" style="cursor:${options.connecting?'crosshair':'move'}"` : ''}>${node.type==='image'?flowImageSVG(node,`${scope}-image-${node.id}`,shapeSVG,imageEditing):shapeSVG(node)}${node.type!=='image'?caption:''}${selected ? `<rect x="-5" y="-5" width="${n(node.width + 10)}" height="${n(node.height + 10)}" rx="5" fill="none" stroke="#ff5900" stroke-width="1.5" stroke-dasharray="6 4" pointer-events="none"/>${!imageEditing?`<rect data-flow-resize="${node.id}" x="${n(node.width - 6)}" y="${n(node.height - 6)}" width="12" height="12" rx="2" fill="#ffffff" stroke="#ff5900" stroke-width="2" style="cursor:nwse-resize"/>`:''}` : ''}${dropTarget}${imageControls}${portGroup}${node.type==='image'?caption:''}</g>`;
  }).join('');
  const cropGuide=interactive&&model.autoCrop&&(model.nodes.length||model.lanes.length)?`<rect data-flow-crop-guide="true" x="${n(output.x)}" y="${n(output.y)}" width="${n(output.width)}" height="${n(output.height)}" fill="none" stroke="#ff5900" stroke-width="1.5" stroke-dasharray="8 5" pointer-events="none" aria-hidden="true"/>`:'';
  const backgroundRadius=flowBackgroundHasColor(model.background)?Math.min(model.backgroundRadius,view.width/2,view.height/2):0;
  const background=`<rect${view.x||view.y?` x="${n(view.x)}" y="${n(view.y)}"`:''} width="${n(view.width)}" height="${n(view.height)}" fill="${model.background}" fill-opacity="${n(model.backgroundOpacity)}" rx="${n(backgroundRadius)}" data-flow-background="true"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n(view.x)} ${n(view.y)} ${n(view.width)} ${n(view.height)}" width="${n(view.width)}" height="${n(view.height)}" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="${titleId}" aria-describedby="${descriptionId}" data-flow-canvas="true" style="display:block;width:100%;height:auto;font-family:Roboto,Arial,sans-serif;${interactive ? 'touch-action:none;user-select:none;' : ''}"><title id="${titleId}">${escape(model.title || 'Diagrama de flujo')}</title><desc id="${descriptionId}">${escape(description)}</desc><defs>${definitions}${interactive && model.grid ? `<pattern id="${gridId}" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#cdd5dc"/></pattern>` : ''}</defs>${background}${interactive && model.grid ? `<rect width="${n(model.width)}" height="${n(model.height)}" fill="url(#${gridId})" pointer-events="none"/>` : ''}${lanes}${edges}${draftSVG}${shapes}${cropGuide}${laneHandles}${edgeHandles.join('')}${edgeLabels.join('')}</svg>`;
}
