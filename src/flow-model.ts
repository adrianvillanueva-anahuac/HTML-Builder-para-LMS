import {normalizeFlowImage,type FlowImage} from './flow-image';
import {normalizeFlowTextRuns,type FlowTextRun} from './flow-image-text';
import {normalizeFlowRichDocument,type FlowRichNode} from './flow-rich-document';
export type FlowNodeType = 'process' | 'decision' | 'terminator' | 'circle' | 'document' | 'data' | 'text' | 'image';
export type FlowSide = 'auto' | 'top' | 'right' | 'bottom' | 'left';
export type FlowMarker = 'arrow' | 'circle' | 'square' | 'gum';
export type FlowLaneStyle = 'classic' | 'rounded' | 'outline' | 'band';
export type FlowFont = 'Roboto' | 'Zilla Slab' | 'Lato';
export const flowFonts:readonly (readonly [FlowFont,string])[]=[['Roboto','Roboto · texto'],['Zilla Slab','Zilla Slab · títulos'],['Lato','Lato · alterna']];
/** Fractions of the figure, independent of zoom and of the font size. */
export type FlowTextLayout={x:number;y:number;width:number;height:number};
export type FlowTextBox={id:string;text:string;layout:FlowTextLayout;fontSize:number;textColor:string;textAlign:'left'|'center'|'right';textRuns:FlowTextRun[];richText?:FlowRichNode};
export type FlowNode = {
  id: string; type: FlowNodeType; x: number; y: number; width: number; height: number;
  text: string; fill: string; stroke: string; textColor: string; strokeWidth: number; radius: number; fontSize: number;
  image?:FlowImage;
  textRuns?:FlowTextRun[];textAlign?:'left'|'center'|'right';richText?:FlowRichNode;
  textLayout?:FlowTextLayout;textBoxes?:FlowTextBox[];
};
export type FlowEdgeLabel={id:string;text:string;position:number};
export type FlowEdge = {
  id: string; from: string; to: string; fromSide: FlowSide; toSide: FlowSide;
  route: 'orthogonal' | 'straight' | 'curve'; colorMode: 'solid' | 'gradient'; color: string; width: number;
  dash: 'solid' | 'dashed' | 'dotted'; startArrow: boolean; endArrow: boolean; label: string;
  startMarker:FlowMarker; endMarker:FlowMarker; bend:{axis:'x'|'y';position:number}|null;
  gumBase?:number;gumReach?:number;
  labelPosition?:number;labelScale?:number;labels?:FlowEdgeLabel[];waypoints?:{x:number;y:number}[];
};
/** The original label remains the primary label for backward compatibility. */
export function flowEdgeLabels(edge:FlowEdge):FlowEdgeLabel[]{return[{id:'primary',text:edge.label,position:edge.labelPosition??.5},...(edge.labels||[])];}
export type FlowLane = { id: string; title: string; x: number; y: number; width: number; height: number; fill: string; stroke: string;style:FlowLaneStyle;textPosition:'top'|'bottom'|'left'|'right';textColor:string;fontFamily:FlowFont;fontSize:number };
export type FlowModel = {
  version: 1; title: string; width: number; height: number; background: string; grid: boolean;
  backgroundRadius:number;backgroundOpacity:number;
  nodes: FlowNode[]; edges: FlowEdge[]; lanes: FlowLane[];
  snapMode:'free'|'grid'|'pixels';snapSize:number;
  autoCrop:boolean;cropMarginX:number;cropMarginY:number;
};

export const flowNodeTypes: readonly { type: FlowNodeType; label: string; icon: string }[] = [
  { type: 'process', label: 'Proceso', icon: 'crop_square' },
  { type: 'decision', label: 'Decisión', icon: 'diamond' },
  { type: 'terminator', label: 'Inicio / fin', icon: 'radio_button_unchecked' },
  { type: 'circle', label: 'Círculo', icon: 'circle' },
  { type: 'document', label: 'Documento', icon: 'description' },
  { type: 'data', label: 'Datos', icon: 'input' },
  { type: 'text', label: 'Texto libre', icon: 'title' },
  { type: 'image', label: 'Imagen', icon: 'image' },
];

export const flowClamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
export function flowBackgroundHasColor(color:string):boolean{
  return /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(color)&&!(color.length===5&&color.endsWith('0'))&&!(color.length===9&&color.endsWith('00'));
}
const object = (raw: unknown): Record<string, unknown> => raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
const number = (value: unknown, fallback: number, min: number, max: number) => flowClamp(typeof value === 'number' ? value : fallback, min, max);
const plain = (value: unknown, fallback = '', limit = 1000) => typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, limit) : fallback;
const color = (value: unknown, fallback: string, transparent = false) => typeof value === 'string' && (/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value) || (transparent && (value === 'transparent' || value === 'none'))) ? value.toLowerCase() : fallback;
const side = (value: unknown): FlowSide => ['auto', 'top', 'right', 'bottom', 'left'].includes(String(value)) ? value as FlowSide : 'auto';
const kind = (value: unknown): FlowNodeType => flowNodeTypes.some(item => item.type === value) ? value as FlowNodeType : 'process';
const list = (value: unknown, limit: number) => Array.isArray(value) ? value.slice(0, limit) : [];
const safeId = (value: unknown) => typeof value === 'string' && /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(value);
function persistedId(value: unknown, prefix: string, used: Set<string>): string {
  let candidate = safeId(value) && !used.has(value as string) ? value as string : `${prefix}-${used.size + 1}`;
  while (used.has(candidate)) candidate += '-x';
  used.add(candidate);
  return candidate;
}
let sequence = 0;
function freshId(model: FlowModel, prefix: string): string {
  const used = new Set([...model.nodes, ...model.edges, ...model.lanes].map(item => item.id));
  let id: string;
  do {
    const random = typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : `${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    id = `${prefix}-${random}`;
  } while (used.has(id));
  return id;
}

export function createFlowModel(): FlowModel {
  return { version: 1, title: 'Diagrama de flujo', width: 1200, height: 720, background: '#ffffff',backgroundRadius:12,backgroundOpacity:1, grid: true, nodes: [], edges: [], lanes: [],snapMode:'pixels',snapSize:10,autoCrop:false,cropMarginX:10,cropMarginY:10 };
}

export function normalizeFlowTextLayout(raw:unknown):FlowTextLayout{
  const value=object(raw),width=number(value.width,.5,.02,1),height=number(value.height,.25,.02,1);
  return {x:number(value.x,(1-width)/2,0,1-width),y:number(value.y,(1-height)/2,0,1-height),width,height};
}
function normalizeNode(raw: unknown, model: FlowModel, id: string): FlowNode {
  const data = object(raw), type = kind(data.type);
  const width = number(data.width, type === 'circle' ? 112 : 180, 40, model.width);
  const height = number(data.height, type === 'decision' ? 120 : type === 'circle' ? 112 : 80, 32, model.height);
  const textIds=new Set<string>(['primary']);
  return {
    id, type, x: number(data.x, 80, 0, model.width - width), y: number(data.y, 80, 0, model.height - height), width, height,
    text: plain(data.text, type === 'image'?'':type === 'text' ? 'Escribe tu texto' : type === 'terminator' ? 'Inicio / fin' : flowNodeTypes.find(item => item.type === type)!.label),
    fill: color(data.fill, type === 'text'||type==='image' ? 'transparent' : '#f3eef9', true), stroke: color(data.stroke, type === 'text' ? 'transparent' : '#5d428c', true),
    textColor: color(data.textColor, '#253649'), strokeWidth: number(data.strokeWidth, type === 'text'||type==='image' ? 0 : 2, 0, 12),
    radius: number(data.radius, 12, 0, Math.min(width, height) / 2), fontSize: number(data.fontSize, 18, 8, 72),
    ...(type==='image'?{image:normalizeFlowImage(data.image)}:{}),
    ...(type!=='image'?{textRuns:normalizeFlowTextRuns(data.textRuns),textAlign:data.textAlign==='left'||data.textAlign==='right'?data.textAlign:'center' as const}:{}),
    ...(normalizeFlowRichDocument(data.richText)?{richText:normalizeFlowRichDocument(data.richText)}:{}),
    ...(data.textLayout?{textLayout:normalizeFlowTextLayout(data.textLayout)}:{}),
    ...(Array.isArray(data.textBoxes)?{textBoxes:list(data.textBoxes,19).map(raw=>{const box=object(raw),richText=normalizeFlowRichDocument(box.richText);return{id:persistedId(box.id,'text',textIds),text:plain(box.text),layout:normalizeFlowTextLayout(box.layout),fontSize:number(box.fontSize,number(data.fontSize,18,8,72),8,72),textColor:color(box.textColor,color(data.textColor,'#253649')),textAlign:box.textAlign==='left'||box.textAlign==='right'?box.textAlign:'center',textRuns:normalizeFlowTextRuns(box.textRuns),...(richText?{richText}:{})};})}:{}),
  };
}
function normalizeEdge(raw: unknown, id: string, from: string, to: string,model:FlowModel): FlowEdge {
  const data = object(raw);
  const marker=(value:unknown):FlowMarker=>['arrow','circle','square','gum'].includes(String(value))?value as FlowMarker:'arrow';
  const bend=object(data.bend);
  const labelIds=new Set<string>(['primary']);
  const labelPosition=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?flowClamp(value,0,1):.5;
  const labels=list(data.labels,19).map(raw=>{const label=object(raw);return{id:persistedId(label.id,'label',labelIds),text:plain(label.text,'',200),position:labelPosition(label.position)};});
  return {
    id, from, to, fromSide: side(data.fromSide), toSide: side(data.toSide),
    route: data.route === 'straight' || data.route === 'curve' ? data.route : 'orthogonal',
    colorMode: data.colorMode === 'gradient' ? 'gradient' : 'solid',
    color: color(data.color, '#5d428c'), width: number(data.width, 2, 1, 24),
    dash: data.dash === 'dashed' || data.dash === 'dotted' ? data.dash : 'solid',
    startArrow: data.startArrow === true, endArrow: data.endArrow !== false, label: plain(data.label, '', 200),
    startMarker:marker(data.startMarker),endMarker:marker(data.endMarker),
    gumBase:number(data.gumBase,75,5,95),gumReach:number(data.gumReach,180,10,1000),
    labelPosition:labelPosition(data.labelPosition),labels,
    labelScale:typeof data.labelScale==='number'&&Number.isFinite(data.labelScale)?flowClamp(data.labelScale,50,300):100,
    waypoints:list(data.waypoints,64).filter(raw=>{const p=object(raw);return typeof p.x==='number'&&Number.isFinite(p.x)&&typeof p.y==='number'&&Number.isFinite(p.y);}).map(raw=>{const p=object(raw);return{x:number(p.x,0,0,model.width),y:number(p.y,0,0,model.height)};}),
    bend:(bend.axis==='x'||bend.axis==='y')&&typeof bend.position==='number'&&Number.isFinite(bend.position)?{axis:bend.axis,position:flowClamp(bend.position,0,bend.axis==='x'?model.width:model.height)}:null,
  };
}

/** Persisted diagrams are treated as data, never as markup or SVG attributes. */
export function normalizeFlowModel(raw: unknown): FlowModel {
  const source = object(raw), model = createFlowModel(), used = new Set<string>();
  model.title = plain(source.title, model.title, 180);
  model.width = number(source.width, model.width, 320, 4000);
  model.height = number(source.height, model.height, 240, 3000);
  model.background = color(source.background, model.background,true);
  model.backgroundRadius=number(typeof source.backgroundRadius==='number'&&Number.isFinite(source.backgroundRadius)?source.backgroundRadius:12,12,0,200);
  model.backgroundOpacity=number(typeof source.backgroundOpacity==='number'&&Number.isFinite(source.backgroundOpacity)?source.backgroundOpacity:1,1,0,1);
  model.grid = source.grid !== false;
  model.snapMode=source.snapMode==='grid'||source.snapMode==='free'?source.snapMode:'pixels';
  model.snapSize=Math.round(number(source.snapSize,10,1,100));
  model.autoCrop=source.autoCrop===true;
  const margin=(value:unknown,max:number)=>Math.round(number(typeof value==='number'&&Number.isFinite(value)?value:10,10,0,max));
  model.cropMarginX=margin(source.cropMarginX,model.width);
  model.cropMarginY=margin(source.cropMarginY,model.height);
  const nodeIds = new Map<string, string>();
  for (const value of list(source.nodes, 250)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const entry = object(value), id = persistedId(entry.id, 'node', used);
    model.nodes.push(normalizeNode(entry, model, id));
    if (typeof entry.id === 'string' && !nodeIds.has(entry.id)) nodeIds.set(entry.id, id);
  }
  for (const value of list(source.lanes, 20)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const entry = object(value), width = number(entry.width, 280, 80, model.width), height = number(entry.height, model.height - 80, 80, model.height);
    model.lanes.push({ id: persistedId(entry.id, 'lane', used), title: plain(entry.title, 'Área / responsable', 180),
      x: number(entry.x, 40, 0, model.width - width), y: number(entry.y, 40, 0, model.height - height), width, height,
      fill: color(entry.fill, '#f3eef9', true), stroke: color(entry.stroke, '#cdd5dc', true),
      style:['classic','rounded','outline','band'].includes(String(entry.style))?entry.style as FlowLaneStyle:'classic',
      textPosition:['top','bottom','left','right'].includes(String(entry.textPosition))?entry.textPosition as FlowLane['textPosition']:'top',
      textColor:color(entry.textColor,'#5d428c'),fontFamily:flowFonts.some(([font])=>font===entry.fontFamily)?entry.fontFamily as FlowFont:'Roboto',fontSize:number(entry.fontSize,17,8,48) });
  }
  for (const value of list(source.edges, 1000)) {
    const entry = object(value), from = typeof entry.from === 'string' ? nodeIds.get(entry.from) : undefined, to = typeof entry.to === 'string' ? nodeIds.get(entry.to) : undefined;
    if (!from || !to || from === to) continue;
    model.edges.push(normalizeEdge(entry, persistedId(entry.id, 'edge', used), from, to,model));
  }
  return model;
}

export function addFlowNode(model: FlowModel, type: FlowNodeType, x?: number, y?: number): FlowNode {
  const offset = model.nodes.length % 12 * 24;
  const node = normalizeNode({ type, x: x ?? 80 + offset, y: y ?? 80 + offset }, model, freshId(model, 'node'));
  model.nodes.push(node);
  return node;
}
export function duplicateFlowNode(model: FlowModel, id: string): FlowNode | null {
  const source = model.nodes.find(node => node.id === id);
  if (!source) return null;
  const copy = normalizeNode({ ...source, x: source.x + 28, y: source.y + 28 }, model, freshId(model, 'node'));
  model.nodes.push(copy);
  return copy;
}
export function removeFlowNode(model: FlowModel, id: string): void {
  model.nodes = model.nodes.filter(node => node.id !== id);
  model.edges = model.edges.filter(edge => edge.from !== id && edge.to !== id);
}
export function addFlowEdge(model: FlowModel, from: string, to: string, options: Partial<FlowEdge> = {}): FlowEdge | null {
  if (from === to || !model.nodes.some(node => node.id === from) || !model.nodes.some(node => node.id === to)) return null;
  const edge = normalizeEdge(options, freshId(model, 'edge'), from, to,model);
  model.edges.push(edge);
  return edge;
}
export function addFlowLane(model: FlowModel): FlowLane {
  const width = Math.min(300, model.width), height = Math.max(80, model.height - 80);
  const lane: FlowLane = { id: freshId(model, 'lane'), title: `Área ${model.lanes.length + 1}`, x: flowClamp(40 + model.lanes.length * 30, 0, model.width - width), y: 40, width, height, fill: '#f3eef9', stroke: '#cdd5dc',style:'classic',textPosition:'top',textColor:'#5d428c',fontFamily:'Roboto',fontSize:17 };
  model.lanes.push(lane);
  return lane;
}
