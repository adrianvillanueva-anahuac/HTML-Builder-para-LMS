import {tabPalette} from './project-model';

export type FlowColorSwatch={label:string;value:string};
export type FlowColorGroup={name:string;base:string;colors:readonly FlowColorSwatch[]};
export type FlowShapeCombination={id:string;name:string;fill:string;stroke:string;textColor:string};

/** Opaque hexadecimal only: never CSS functions, arbitrary names or alpha channels. */
export function normalizeFlowHex(value:unknown):string|null {
  if(typeof value!=='string')return null;
  const color=value.trim().toLowerCase();
  if(/^#[0-9a-f]{6}$/.test(color))return color;
  if(/^#[0-9a-f]{3}$/.test(color))return '#'+color.slice(1).split('').map(channel=>channel+channel).join('');
  return null;
}

/** Linear interpolation of sRGB channels; used for fixed, reproducible tint steps. */
export function mixFlowHex(base:string,target:string,amount:number):string {
  const a=normalizeFlowHex(base),b=normalizeFlowHex(target);
  if(!a||!b||!Number.isFinite(amount))throw new TypeError('Mezcla de colores hexadecimal inválida.');
  const ratio=Math.max(0,Math.min(1,amount));
  return '#'+[1,3,5].map(index=>Math.round(parseInt(a.slice(index,index+2),16)*(1-ratio)+parseInt(b.slice(index,index+2),16)*ratio).toString(16).padStart(2,'0')).join('');
}

export function flowRelativeLuminance(value:string):number {
  const color=normalizeFlowHex(value);
  if(!color)throw new TypeError('El contraste requiere un color hexadecimal opaco.');
  const channels=[1,3,5].map(index=>{const channel=parseInt(color.slice(index,index+2),16)/255;return channel<=.04045?channel/12.92:((channel+.055)/1.055)**2.4;});
  return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
}

/** Returns zero for unsupported values rather than certifying an unknown contrast. */
export function flowContrastRatio(first:string,second:string):number {
  if(!normalizeFlowHex(first)||!normalizeFlowHex(second))return 0;
  const a=flowRelativeLuminance(first),b=flowRelativeLuminance(second);
  return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
}

const steps=[.2,.4,.6,.8]as const;
const freezeGroup=(group:FlowColorGroup):FlowColorGroup=>Object.freeze({...group,colors:Object.freeze(group.colors.map(color=>Object.freeze(color)))});

// The base tokens come from the same institutional palette used by workspace tabs.
// White and black are neutral endpoints, not extra hue families with duplicate shades.
export const flowColorGroups:readonly FlowColorGroup[]=Object.freeze([
  ...tabPalette.map(({name,colors})=>{
    const base=normalizeFlowHex(colors[0])!;
    const variants:FlowColorSwatch[]=[{label:`${name} · institucional`,value:base},
      ...steps.map(amount=>({label:`${name} · ${amount*100}% más claro`,value:mixFlowHex(base,'#ffffff',amount)})),
      ...steps.map(amount=>({label:`${name} · ${amount*100}% más oscuro`,value:mixFlowHex(base,'#000000',amount)}))];
    const seen=new Set<string>();
    return freezeGroup({name,base,colors:variants.filter(color=>!seen.has(color.value)&&!!seen.add(color.value))});
  }),
  freezeGroup({name:'Neutros',base:'#ffffff',colors:[{label:'Blanco',value:'#ffffff'},{label:'Negro',value:'#000000'}]})
]);

/** Flat, unique allow-list for all new UI choices (no unrestricted color picker). */
export const flowPaletteColors:readonly string[]=Object.freeze([...new Set(flowColorGroups.flatMap(group=>group.colors.map(color=>color.value)))]);
const allowed=new Set(flowPaletteColors);
export function isFlowPaletteColor(value:unknown):boolean {const color=normalizeFlowHex(value);return !!color&&allowed.has(color);}

const color=(name:string,index=0)=>flowColorGroups.find(group=>group.name===name)!.colors[index].value;
const purple=color('Morado'),orange=color('Naranja'),gray=color('Gris oscuro'),silver=color('Gris claro');

/** Text/fill pairs in these presets are verified at a contrast ratio of at least 4.5. */
export const flowShapeCombinations:readonly FlowShapeCombination[]=Object.freeze([
  {id:'morado-institucional',name:'Morado institucional',fill:purple,stroke:color('Morado',5),textColor:'#ffffff'},
  {id:'naranja-institucional',name:'Naranja institucional',fill:orange,stroke:color('Naranja',6),textColor:'#000000'},
  {id:'gris-corporativo',name:'Gris corporativo',fill:gray,stroke:color('Gris oscuro',6),textColor:'#ffffff'},
  {id:'lavanda-suave',name:'Lavanda suave',fill:color('Morado',4),stroke:purple,textColor:color('Morado',6)},
  {id:'naranja-y-morado',name:'Naranja y morado',fill:color('Naranja',4),stroke:orange,textColor:color('Morado',5)},
  {id:'plata-neutra',name:'Plata neutra',fill:silver,stroke:gray,textColor:'#000000'},
  {id:'contraste-dual',name:'Contraste dual',fill:color('Morado',5),stroke:orange,textColor:'#ffffff'},
  {id:'alto-contraste',name:'Alto contraste',fill:'#000000',stroke:orange,textColor:'#ffffff'}
].map(combination=>Object.freeze(combination)));
