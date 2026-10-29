import {normalizeFlowModel,duplicateFlowNode,addFlowLane,addFlowEdge,flowClamp, type FlowModel, type FlowNode, type FlowEdge, type FlowLane} from './flow-model';

export type FlowSelectionKind = 'node' | 'edge' | 'lane';
export type FlowSelection = {kind:FlowSelectionKind;ids:string[]};
export type FlowSelectionItem = FlowNode | FlowEdge | FlowLane;
export type FlowSelectionField = {value:unknown;mixed:boolean;count:number};

const collections = {node:'nodes',edge:'edges',lane:'lanes'} as const;
const patchKeys:Record<FlowSelectionKind,ReadonlySet<string>> = {
  node:new Set(['type','x','y','width','height','text','fill','stroke','textColor','strokeWidth','radius','fontSize','image','textRuns','textAlign']),
  edge:new Set(['fromSide','toSide','route','color','colorMode','width','dash','startArrow','endArrow','startMarker','endMarker','bend','label','labelPosition','labelScale','labels','waypoints','gumBase','gumReach']),
  lane:new Set(['title','x','y','width','height','fill','stroke','style','textPosition','textColor','fontFamily','fontSize']),
};
const idsOnly=(ids:readonly string[])=>Array.from(new Set(ids.filter(id=>typeof id==='string'&&id.length>0)));
const itemList=(model:FlowModel,kind:FlowSelectionKind):FlowSelectionItem[]=>model[collections[kind]];
const valuesEqual=(left:unknown,right:unknown):boolean=>{
  if(Object.is(left,right))return true;
  if(!left||!right||typeof left!=='object'||typeof right!=='object')return false;
  if(Array.isArray(left)||Array.isArray(right))return Array.isArray(left)&&Array.isArray(right)&&left.length===right.length&&left.every((value,index)=>valuesEqual(value,right[index]));
  const a=left as Record<string,unknown>,b=right as Record<string,unknown>,keys=Object.keys(a);
  return keys.length===Object.keys(b).length&&keys.every(key=>Object.hasOwn(b,key)&&valuesEqual(a[key],b[key]));
};

/** Shift toggles within one kind. Selecting another kind always starts a new set. */
export function selectFlowItem(current:FlowSelection|null,kind:FlowSelectionKind,id:string,extend=false):FlowSelection|null {
  if(!id)return extend?current:null;
  if(!extend||current?.kind!==kind)return {kind,ids:[id]};
  const ids=idsOnly(current.ids),next=ids.includes(id)?ids.filter(value=>value!==id):[...ids,id];
  return next.length?{kind,ids:next}:null;
}

/** Drop stale identifiers after undo, redo or deletion without changing the model. */
export function reconcileFlowSelection(model:FlowModel,selection:FlowSelection|null):FlowSelection|null {
  if(!selection)return null;
  const available=new Set(itemList(model,selection.kind).map(item=>item.id));
  const ids=idsOnly(selection.ids).filter(id=>available.has(id));
  return ids.length?{kind:selection.kind,ids}:null;
}

/** Items are live model references, ordered by the user's selection. */
export function flowSelectionItems(model:FlowModel,selection:FlowSelection|null):FlowSelectionItem[] {
  if(!selection)return [];
  const items=new Map(itemList(model,selection.kind).map(item=>[item.id,item]));
  return idsOnly(selection.ids).flatMap(id=>{const item=items.get(id);return item?[item]:[];});
}

/** A mixed field has no display value: consumers must not apply a placeholder. */
export function flowSelectionField(model:FlowModel,selection:FlowSelection|null,key:string):FlowSelectionField {
  const items=flowSelectionItems(model,selection),first=(items[0] as unknown as Record<string,unknown>|undefined)?.[key];
  const mixed=items.some(item=>!valuesEqual((item as unknown as Record<string,unknown>)[key],first));
  return {value:mixed?undefined:first,mixed,count:items.length};
}

/**
 * Patch only explicitly supplied, kind-appropriate fields. Missing/undefined
 * values (including mixed-field placeholders) never overwrite another item.
 * Geometry-dependent coordinates/radii may also clamp to keep shapes in bounds.
 * Existing live item references are preserved for pointer gestures.
 */
export function applyFlowSelectionPatch(model:FlowModel,selection:FlowSelection|null,patch:Record<string,unknown>):boolean {
  if(!selection||!patch||typeof patch!=='object'||Array.isArray(patch))return false;
  const items=flowSelectionItems(model,selection);
  if(!items.length)return false;
  const entries=Object.entries(patch).filter(([key,value])=>patchKeys[selection.kind].has(key)&&value!==undefined);
  if(!entries.length)return false;
  const accepted=Object.fromEntries(entries),selectedIds=new Set(items.map(item=>item.id)),collection=collections[selection.kind];
  const candidate={...model,[collection]:itemList(model,selection.kind).map(item=>selectedIds.has(item.id)?{...item,...accepted}:item)};
  const normalized=normalizeFlowModel(candidate),nextItems=new Map(itemList(normalized,selection.kind).map(item=>[item.id,item]));
  const touched=new Set(entries.map(([key])=>key));
  if(selection.kind!=='edge'){
    if(touched.has('width')){touched.add('x');if(selection.kind==='node')touched.add('radius');}
    if(touched.has('height')){touched.add('y');if(selection.kind==='node')touched.add('radius');}
  }
  let changed=false;
  for(const item of items){
    const next=nextItems.get(item.id) as unknown as Record<string,unknown>|undefined;
    if(!next)continue;
    const target=item as unknown as Record<string,unknown>;
    for(const key of touched){
      if(!Object.hasOwn(next,key)||valuesEqual(target[key],next[key]))continue;
      target[key]=next[key];changed=true;
    }
  }
  return changed;
}

/** Nodes remove incident links; lanes are visual organizers, never ownership. */
export function removeFlowSelection(model:FlowModel,selection:FlowSelection|null):boolean {
  if(!selection)return false;
  const ids=new Set(flowSelectionItems(model,selection).map(item=>item.id));
  if(!ids.size)return false;
  if(selection.kind==='node'){
    model.nodes=model.nodes.filter(node=>!ids.has(node.id));
    model.edges=model.edges.filter(edge=>!ids.has(edge.from)&&!ids.has(edge.to));
  }else if(selection.kind==='edge')model.edges=model.edges.filter(edge=>!ids.has(edge.id));
  else model.lanes=model.lanes.filter(lane=>!ids.has(lane.id));
  return true;
}
/** Duplicate only the selected kind; node copies never share nested text/image state. */
export function duplicateFlowSelection(model:FlowModel,selection:FlowSelection|null):FlowSelection|null{
 if(!selection)return null;const items=flowSelectionItems(model,selection),ids:string[]=[];
 for(const item of items){
  if(selection.kind==='node'){const copy=duplicateFlowNode(model,item.id);if(copy)ids.push(copy.id);}
  else if(selection.kind==='edge'){const edge=item as FlowEdge,copy=addFlowEdge(model,edge.from,edge.to,edge);if(copy)ids.push(copy.id);}
  else{const lane=item as FlowLane,copy=addFlowLane(model),id=copy.id;Object.assign(copy,{...lane,id,x:flowClamp(lane.x+28,0,model.width-lane.width),y:flowClamp(lane.y+28,0,model.height-lane.height)});ids.push(id);}
 }
 return ids.length?{kind:selection.kind,ids}:null;
}
