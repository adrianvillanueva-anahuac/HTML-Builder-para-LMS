export type ModularCell = { html: string; color: string; radius: number; padding: number; verticalAlign?: 'start'|'center'|'end'; student?:boolean };
export type ModularConnection = { from: string; to: string; direction: 'forward'|'backward'|'both'|'none'; fill: string; stroke: string; dotted: boolean; strokeWidth?:number };
export type ModularModel = { version: 1; rows: number[]; columns: number[]; gap: number; margin: number; overflow: boolean; stroke?: {width:number;color:string}; defaultRadius?:number; cells: Record<string, ModularCell>; connections: ModularConnection[] };
export function removeLastTrack(model:ModularModel,axis:'row'|'column') {
  const tracks=axis==='row'?model.rows:model.columns;
  if(tracks.length<=1)return;
  const index=tracks.length-1;
  Object.keys(model.cells).forEach(key=>{if(Number(key.split(':')[axis==='row'?0:1])===index)removeCell(model,key);});
  tracks.pop();
}
export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
export const modularPalette = [
  {name:'Naranja',value:'#ff5900',text:'#ffffff'},
  {name:'Morado',value:'#5d428c',text:'#ffffff'},
  {name:'Gris oscuro',value:'#646464',text:'#ffffff'},
  {name:'Gris claro',value:'#cdd5dc',text:'#ff5900'},
  {name:'Blanco',value:'#ffffff',text:'#ff5900'},
  {name:'Naranja claro',value:'#fff0e7',text:'#333333'},
  {name:'Morado claro',value:'#f3eef9',text:'#333333'},
  {name:'Gris suave',value:'#f2f3f5',text:'#333333'},
];
export function modularTextColor(color:string) {
  return modularPalette.find(entry=>entry.value===color.toLowerCase())?.text || '#333333';
}
export function createModular(rows: number, columns: number): ModularModel {
  return {version:1, rows:Array(Math.round(clamp(rows,1,10))).fill(120), columns:Array(Math.round(clamp(columns,1,10))).fill(1), gap:20, margin:0, overflow:false, cells:{}, connections:[]};
}
export function neighbors(model: ModularModel): [string,string][] {
  const result: [string,string][]=[];
  model.rows.forEach((_,r)=>model.columns.forEach((_,c)=>{
    const key=`${r}:${c}`;
    if(!model.cells[key]) return;
    for(const next of [`${r}:${c+1}`,`${r+1}:${c}`]) if(model.cells[next]) result.push([key,next]);
  }));
  return result;
}
export function removeCell(model: ModularModel, key: string) {
  delete model.cells[key];
  model.connections=model.connections.filter(edge=>edge.from!==key && edge.to!==key);
}
export function resizeColumns(columns: number[], index: number, delta: number, available: number) {
  if(index<0 || index>=columns.length-1 || available<=0) return [...columns];
  const total=columns.reduce((a,b)=>a+b,0);
  const pair=columns[index]+columns[index+1];
  const min=Math.min(pair/3,40/available*total);
  const left=clamp(columns[index]+delta/available*total,min,pair-min);
  return columns.map((v,i)=>i===index?left:i===index+1?pair-left:v);
}
